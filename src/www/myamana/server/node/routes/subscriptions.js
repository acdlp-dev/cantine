const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { getStripeInstance } = require('../services/stripeService');
const db = require('../services/bdd');
const { sendTemplateEmail } = require('../services/mailService');

/**
 * Récupère le secret webhook Stripe d'une association via sa clé publique
 * @param {string} pubKey - Clé publique Stripe (stripe_publishable_key)
 * @returns {Promise<{webhookSecret: string, asso: string} | null>}
 */
async function getWebhookSecretByPubKey(pubKey) {
  if (!pubKey) return null;
  try {
    const rows = await db.select(
      'SELECT uri, stripe_webhook_secret_key FROM Assos WHERE stripe_publishable_key = ?',
      [pubKey],
      'remote'
    );
    if (!rows || rows.length === 0) return null;
    return {
      webhookSecret: rows[0].stripe_webhook_secret_key,
      asso: rows[0].uri
    };
  } catch (err) {
    console.error('Erreur récupération webhook secret:', err);
    return null;
  }
}

// Templates email (échec prélèvement)
const TEMPLATE_SEPA_ERROR = 4418906;
const TEMPLATE_CB_EXPIRED = 3764388;
const TEMPLATE_INSUFFISANT = 3967370;
const TEMPLATE_SEPA_LIMIT_EXCEEDED = 4418906; // Utilise le même template que SEPA_ERROR pour l'instant
const TEMPLATE_SEPA_DISPUTE = 4418906; // Utilise le même template que SEPA_ERROR pour l'instant

// IDs des templates d'email
const EMAIL_TEMPLATES = {
  SUSPENSION: 6757667,
  ANNULATION: 6757689,
  REPRISE: 6757681,
  MODIFICATION: 6757581
};

// Codes d'erreur SEPA Stripe avec leurs descriptions
const SEPA_ERROR_CODES = {
  // Erreurs de limite
  'charge_exceeds_source_limit': {
    message: 'Le montant du paiement dépasse la limite hebdomadaire de volume de paiement du compte',
    template: TEMPLATE_SEPA_LIMIT_EXCEEDED,
    isFatal: false, // Peut être réessayé plus tard
  },
  'charge_exceeds_weekly_limit': {
    message: 'Le montant du paiement dépasse la limite du volume de transactions du compte',
    template: TEMPLATE_SEPA_LIMIT_EXCEEDED,
    isFatal: false,
  },
  // Erreurs de fonds
  'insufficient_funds': {
    message: 'Fonds insuffisants sur le compte bancaire',
    template: TEMPLATE_INSUFFISANT,
    isFatal: false,
  },
  // Erreurs SEPA spécifiques
  'debit_not_authorized': {
    message: 'Le prélèvement n\'a pas été autorisé par le titulaire du compte',
    template: TEMPLATE_SEPA_ERROR,
    isFatal: true,
  },
  'account_closed': {
    message: 'Le compte bancaire est fermé',
    template: TEMPLATE_SEPA_ERROR,
    isFatal: true,
  },
  'bank_account_restricted': {
    message: 'Le compte bancaire est restreint',
    template: TEMPLATE_SEPA_ERROR,
    isFatal: true,
  },
  'invalid_account_number': {
    message: 'Le numéro de compte est invalide',
    template: TEMPLATE_SEPA_ERROR,
    isFatal: true,
  },
  'invalid_currency': {
    message: 'La devise n\'est pas acceptée par ce compte',
    template: TEMPLATE_SEPA_ERROR,
    isFatal: true,
  },
  'no_account': {
    message: 'Le compte bancaire n\'existe pas',
    template: TEMPLATE_SEPA_ERROR,
    isFatal: true,
  },
  'sepa_direct_debit_incomplete': {
    message: 'Le mandat SEPA est incomplet',
    template: TEMPLATE_SEPA_ERROR,
    isFatal: true,
  },
  // Erreur générique
  'generic_decline': {
    message: 'Le prélèvement a été refusé par la banque',
    template: TEMPLATE_SEPA_ERROR,
    isFatal: false,
  },
};

// Fonction pour récupérer les informations du donateur à partir du stripe_sub_id
const getDonorInfoBySubscriptionId = async (subscriptionId) => {
  try {
    const rows = await db.select(
      `SELECT email, prenom, nom, montant, asso, moyen, last4, occurence, recurrence, resumeDate FROM Personnes WHERE stripe_sub_id = ?`,
      [subscriptionId],
      'remote'
    );

    if (!rows || rows.length === 0) {
      throw new Error('Donateur non trouvé');
    }

    return rows[0];
  } catch (error) {
    console.error('[Erreur DB]:', error);
    throw error;
  }
};

// Fonction pour récupérer le nom et l'email de l'association à partir de son URI
const getAssoInfoByUri = async (assoUri) => {
  try {
    const rows = await db.select(
      `SELECT nom, email FROM Assos WHERE uri = ?`,
      [assoUri],
      'remote'
    );

    if (!rows || rows.length === 0) {
      console.warn(`Association avec URI '${assoUri}' non trouvée`);
      return { nom: assoUri, email: null }; // Retourne l'URI si le nom n'est pas trouvé
    }

    return { nom: rows[0].nom, email: rows[0].email };
  } catch (error) {
    console.error('[Erreur DB lors de la récupération des informations de l\'association]:', error);
    return { nom: assoUri, email: null }; // En cas d'erreur, retourne l'URI
  }
};

// Fonction pour formater la date au format français (DD/MM/YYYY)
const formatDateFR = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

/**
 * Création d'un abonnement Stripe (don mensuel)
 * Body attendu : asso, paymentMethodId, paymentMethodType (optionnel: 'card' ou 'sepa_debit'), email, firstName, lastName, amount (en €), campaign, billingDay (1-28 optionnel)
 * Retourne : subscriptionId, clientSecret (PI initial), status
 */
router.post('/create-subscription', async (req, res) => {
  const {
    asso,
    paymentMethodId,
    paymentMethodType = 'card', // 'card' par défaut, peut être 'sepa_debit'
    email,
    firstName,
    lastName,
    amount,
    campaign,
    billingDay,
    productId,
  } = req.body || {};

  console.log('[create-subscription] Requête reçue:', {
    asso,
    paymentMethodId,
    paymentMethodType,
    email,
    firstName,
    lastName,
    amount,
    campaign,
    billingDay,
    productId,
  });

  try {
    if (!asso || !paymentMethodId || !email || !amount) {
      return res.status(400).json({ message: 'Paramètres manquants (asso, paymentMethodId, email, amount).' });
    }

    const unitAmount = Math.round(Number(amount) * 100);
    if (!unitAmount || unitAmount <= 0) {
      return res.status(400).json({ message: 'Montant invalide pour l’abonnement.' });
    }

    const stripe = await getStripeInstance(asso);

    // 1) Récupérer ou créer le customer à partir de l'email
    let customerId = null;
    try {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing?.data?.length) {
        customerId = existing.data[0].id;
      }
    } catch (listErr) {
      console.warn('[create-subscription] Liste des customers impossible:', listErr?.message);
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: `${firstName || ''} ${lastName || ''}`.trim(),
      });
      customerId = customer.id;
    }

    // 2) Attacher le PM et le définir par défaut
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 3) Récupérer last4 et le type de moyen de paiement pour la DB
    let last4 = null;
    let moyen = 'Stripe'; // Valeur par défaut
    try {
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (pm?.type === 'sepa_debit') {
        last4 = pm?.sepa_debit?.last4 || null;
        moyen = 'IBAN';
      } else {
        last4 = pm?.card?.last4 || null;
        moyen = 'CB';
      }
    } catch (pmErr) {
      console.warn('[create-subscription] Impossible de récupérer last4:', pmErr?.message);
    }

    // 4) Calcul ancrage de facturation (optionnel)
    let billingCycleAnchor = null;
    if (billingDay) {
      const now = new Date();
      const today = now.getDate();
      const billingDayNum = Number(billingDay);

      // Créer la date d'ancrage à minuit pour éviter les problèmes de timing
      const anchorDate = new Date(now.getFullYear(), now.getMonth(), billingDayNum, 0, 0, 0, 0);

      // Si le jour de facturation est aujourd'hui ou dans le passé, passer au mois suivant
      // On utilise <= pour inclure le jour actuel (évite les erreurs "timestamp in the past")
      if (billingDayNum <= today) {
        anchorDate.setMonth(anchorDate.getMonth() + 1);
      }

      // Ajouter quelques minutes de marge pour être sûr que c'est dans le futur
      anchorDate.setHours(0, 5, 0, 0); // 00:05:00 du jour cible

      billingCycleAnchor = Math.floor(anchorDate.getTime() / 1000);
      console.log('[create-subscription] billingCycleAnchor calculé:', new Date(billingCycleAnchor * 1000).toISOString());
    }

    // 5) Créer le prix pour la subscription
    let usedProductId = productId;

    if (!usedProductId) {
      // Créer un nouveau produit si aucun productId n'est fourni
      console.log('[create-subscription] Création d\'un nouveau produit Stripe car productId non fourni');
      const product = await stripe.products.create({
        name: campaign || 'Don mensuel',
        metadata: {
          asso: asso || '',
          campagne: campaign || '',
        },
      });
      usedProductId = product.id;

      // Sauvegarder le productId dans Assos_Campagnes pour éviter de recréer le produit
      if (campaign) {
        try {
          await db.query(
            `UPDATE Assos_Campagnes a
             JOIN Campagnes c ON a.id_campagnes = c.id
             JOIN Assos asso ON a.id_assos = asso.id
             SET a.id_product = ?
             WHERE c.nom = ? AND asso.uri = ? AND a.type = 'mensuel'`,
            [usedProductId, campaign, asso],
            'remote'
          );
          console.log('[create-subscription] ProductId sauvegardé dans Assos_Campagnes:', usedProductId);
        } catch (dbErr) {
          console.error('[create-subscription] Erreur lors de la sauvegarde du productId:', dbErr);
          // On ne bloque pas la création de l'abonnement si la sauvegarde échoue
        }
      }
    } else {
      console.log('[create-subscription] Utilisation du productId existant:', usedProductId);
    }

    // Rechercher un prix existant pour ce produit et ce montant
    let priceId = null;
    try {
      const existingPrices = await stripe.prices.list({
        product: usedProductId,
        currency: 'eur',
        type: 'recurring',
        limit: 100,
      });

      // Chercher un prix avec le même montant
      const matchingPrice = existingPrices.data.find(
        p => p.unit_amount === unitAmount && p.recurring?.interval === 'month' && p.active
      );

      if (matchingPrice) {
        priceId = matchingPrice.id;
        console.log('[create-subscription] Réutilisation du price existant:', priceId);
      }
    } catch (priceListErr) {
      console.warn('[create-subscription] Impossible de lister les prices:', priceListErr?.message);
    }

    // Créer un nouveau prix seulement si aucun n'existe
    if (!priceId) {
      console.log('[create-subscription] Création d\'un nouveau price pour le montant:', unitAmount);
      const price = await stripe.prices.create({
        currency: 'eur',
        product: usedProductId,
        unit_amount: unitAmount,
        recurring: { interval: 'month' },
        nickname: 'mensuel',
      });
      priceId = price.id;
    }

    // Créer la subscription avec le price_id
    const subscriptionPayload = {
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      proration_behavior: 'none',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        email,
        prenom: firstName || '',
        nom: lastName || '',
        asso: asso || '',
        campagne: campaign || '',
        occurence: 'mensuel',
        payment_type: paymentMethodType,
      },
    };

    // Pour SEPA, on utilise 'allow_incomplete' car le paiement prend quelques jours
    // Pour CB, on utilise 'default_incomplete' pour exiger la confirmation immédiate
    if (paymentMethodType === 'sepa_debit') {
      subscriptionPayload.payment_behavior = 'allow_incomplete';
      // Pour SEPA, définir les paramètres de paiement
      subscriptionPayload.payment_settings = {
        payment_method_types: ['sepa_debit'],
        save_default_payment_method: 'on_subscription',
      };
    } else {
      subscriptionPayload.payment_behavior = 'default_incomplete';
    }

    if (billingCycleAnchor) {
      subscriptionPayload.billing_cycle_anchor = billingCycleAnchor;
    }

    const subscription = await stripe.subscriptions.create(subscriptionPayload);
    const latestInvoice = subscription?.latest_invoice;
    const clientSecret = latestInvoice?.payment_intent?.client_secret;

    // 6) Enregistrer l'abonnement dans la table Personnes (si dispo)
    const personneData = {
      email,
      prenom: firstName || '',
      nom: lastName || '',
      montant: unitAmount / 100,
      asso,
      moyen: moyen, // 'CB' ou 'IBAN' selon le type de paiement
      occurence: 'mensuel',
      statut: subscription?.status || 'incomplete',
      stripe_sub_id: subscription?.id || null,
      last4,
    };
    try {
      await db.insert('Personnes', personneData, 'remote');
    } catch (dbErr) {
      console.error('[create-subscription] Erreur INSERT Personnes:', dbErr);
      // on ne bloque pas la réponse au client
    }

    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret,
      status: subscription.status,
    });
  } catch (error) {
    console.error('[create-subscription] Erreur:', error);
    return res.status(500).json({ message: 'Erreur lors de la création de l’abonnement.', error: error.message });
  }
});

/**
 * Webhook Stripe pour les abonnements (factures récurrentes / statut de subscription)
 * Sécurisé par vérification de signature
 * URL: /api/stripe/subscription-webhook?pub_key=pk_live_xxx
 */
router.post('/stripe/subscription-webhook', async (req, res) => {
  let event;

  // Récupérer la pub_key depuis les query params pour identifier l'asso
  const pubKey = req.query.pub_key;

  if (!pubKey) {
    console.error('❌ Webhook Subscription: pub_key manquante dans l\'URL');
    return res.status(400).json({ error: 'pub_key manquante' });
  }

  // Récupérer le secret webhook de l'asso
  const assoData = await getWebhookSecretByPubKey(pubKey);

  if (!assoData || !assoData.webhookSecret) {
    console.error('❌ Webhook Subscription: asso non trouvée ou webhook secret non configuré pour pub_key:', pubKey);
    return res.status(400).json({ error: 'Association non trouvée ou webhook secret non configuré' });
  }

  const signature = req.headers['stripe-signature'];

  if (!signature) {
    console.error('❌ Webhook Subscription: signature manquante');
    return res.status(400).json({ error: 'Signature manquante' });
  }

  try {
    // Le body est déjà raw grâce au middleware express.raw() dans server.js
    event = Stripe.webhooks.constructEvent(
      req.body,
      signature,
      assoData.webhookSecret
    );
    console.log(`✅ Webhook Subscription: signature vérifiée pour l'asso ${assoData.asso}`);
  } catch (err) {
    console.error('❌ Webhook Subscription: signature invalide -', err.message);
    return res.status(400).json({ error: `Signature invalide: ${err.message}` });
  }

  const type = event?.type;

  try {
    console.log('========== 📩 Webhook Subscription reçu ==========');
    console.log('Type d\'événement:', type);
    console.log('Event ID:', event?.id);

    // Helper pour mettre à jour Personnes
    const updatePerson = async (subscriptionId, fields) => {
      if (!subscriptionId) return;
      try {
        await db.update('Personnes', fields, 'stripe_sub_id = ?', [subscriptionId], 'remote');
      } catch (err) {
        console.error('[subscription-webhook] Erreur UPDATE Personnes:', err);
      }
    };

    // Helper pour récupérer la personne (email/prénom/nom/montant/asso) via sub_id
    const getPersonBySub = async (subscriptionId) => {
      if (!subscriptionId) return null;
      try {
        const rows = await db.select(
          'SELECT email, prenom, nom, montant, asso FROM Personnes WHERE stripe_sub_id = ? LIMIT 1',
          [subscriptionId],
          'remote'
        );
        return rows?.[0] || null;
      } catch (err) {
        console.error('[subscription-webhook] Erreur SELECT Personnes:', err);
        return null;
      }
    };

    // Mapping simple des statuts Stripe -> statuts internes
    const mapStatus = (stripeStatus) => {
      switch (stripeStatus) {
        case 'active':
        case 'trialing':
          return 'actif';
        case 'paused':
          return 'pause';
        case 'past_due':
        case 'unpaid':
        case 'incomplete':
        case 'incomplete_expired':
          return 'past_due';
        case 'canceled':
          return 'annule';
        default:
          return stripeStatus || 'inconnu';
      }
    };

    if (type === 'invoice.payment_succeeded' || type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      const amountPaid = invoice.amount_paid ? invoice.amount_paid / 100 : null;
      const customerId = invoice.customer || null;
      const line = invoice.lines?.data?.[0];
      const productId = line?.price?.product || null;
      const priceId = line?.price?.id || null;
      const lastError = invoice.last_payment_error || {};
      const pmType = lastError?.payment_method?.type || lastError?.payment_method_type || line?.payment_method_details?.type || null;

      if (type === 'invoice.payment_succeeded') {
        const paidAt =
          (invoice.status_transitions?.paid_at && new Date(invoice.status_transitions.paid_at * 1000)) ||
          new Date();
        await updatePerson(subscriptionId, {
          statut: 'actif',
          dernierPaiement: paidAt,
          montant: amountPaid,
          stripe_cus_id: customerId,
          product_id: productId,
          price_id: priceId,
          error_date: null,
          error_code: null,
          error_decline_code: null,
          error_message: null,
        });
      } else {
        // invoice.payment_failed
        await updatePerson(subscriptionId, {
          statut: 'past_due',
          stripe_cus_id: customerId,
          product_id: productId,
          price_id: priceId,
          error_date: new Date(),
          error_code: lastError.code || invoice.failure_code || null,
          error_decline_code: lastError.decline_code || null,
          error_message: lastError.message || invoice.failure_message || null,
        });

        // Envoyer un email d'échec si possible
        const person = await getPersonBySub(subscriptionId);
        if (person?.email) {
          let templateId = TEMPLATE_SEPA_ERROR; // défaut
          let errorDescription = null;
          const code = (lastError.code || '').toLowerCase();
          const decline = (lastError.decline_code || '').toLowerCase();

          // Vérifier si c'est une erreur SEPA connue
          const sepaErrorInfo = SEPA_ERROR_CODES[code] || SEPA_ERROR_CODES[decline];

          if (sepaErrorInfo) {
            // Erreur SEPA spécifique trouvée
            templateId = sepaErrorInfo.template;
            errorDescription = sepaErrorInfo.message;
            console.log(`[subscription-webhook] Erreur SEPA détectée: ${code || decline} - ${errorDescription}`);
          } else if (code.includes('insufficient_funds') || decline.includes('insufficient_funds')) {
            templateId = TEMPLATE_INSUFFISANT;
            errorDescription = 'Fonds insuffisants sur le compte';
          } else if (code === 'expired_card' || decline === 'expired_card') {
            templateId = TEMPLATE_CB_EXPIRED;
            errorDescription = 'Carte bancaire expirée';
          } else if (pmType === 'card' && (code === 'card_declined' || decline === 'do_not_honor')) {
            templateId = TEMPLATE_INSUFFISANT;
            errorDescription = 'Paiement refusé par la banque';
          } else if (pmType === 'sepa_debit') {
            templateId = TEMPLATE_SEPA_ERROR;
            errorDescription = 'Erreur lors du prélèvement SEPA';
          }

          // Log détaillé pour le debugging
          console.log(`[subscription-webhook] Échec paiement - Type: ${pmType}, Code: ${code}, Decline: ${decline}, Description: ${errorDescription}`);

          // Mettre à jour la description de l'erreur dans la DB
          if (errorDescription) {
            await updatePerson(subscriptionId, {
              error_message: errorDescription,
            });
          }

          try {
            await sendTemplateEmail(
              person.email,
              templateId,
              {
                prenom: person.prenom || '',
                nom: person.nom || '',
                montant: person.montant || amountPaid || 0,
                asso: person.asso || '',
              },
              'Échec de votre prélèvement mensuel'
            );
          } catch (mailErr) {
            console.error('[subscription-webhook] Erreur envoi email échec:', mailErr);
          }
        }

        // Tracer l'échec dans Dons_Mensuel_Failed
        try {
          const assoForFail = person?.asso || null;
          await db.insert(
            'Dons_Mensuel_Failed',
            {
              asso: assoForFail,
              error_code: lastError.code || invoice.failure_code || null,
              error_decline_code: lastError.decline_code || null,
              error_message: lastError.message || invoice.failure_message || null,
              error_mail_sent: null,
              tracking: null,
              stripe_cus_id: customerId,
              stripe_sub_id: subscriptionId,
              ajout: new Date(),
              dernierPaiement: null,
              montant: amountPaid,
              recurrence: 'mensuel',
              moyen: 'Stripe',
              prenom: person?.prenom || '',
              nom: person?.nom || '',
              email: person?.email || '',
              source: 'site',
            },
            'remote'
          );
        } catch (failDbErr) {
          console.error('[subscription-webhook] Erreur insert Dons_Mensuel_Failed:', failDbErr);
        }
      }
    }

    if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const subscriptionId = sub.id;
      const status = mapStatus(sub.status);
      const customerId = sub.customer || null;
      const item = sub.items?.data?.[0];
      const productId = item?.price?.product || null;
      const priceId = item?.price?.id || null;
      const amount = item?.price?.unit_amount ? item.price.unit_amount / 100 : null;

      await updatePerson(subscriptionId, {
        statut: status,
        stripe_cus_id: customerId,
        product_id: productId,
        price_id: priceId,
        montant: amount,
      });
    }

    // Gestion des événements PaymentIntent (utile pour SEPA où le statut passe par 'processing')
    if (type === 'payment_intent.processing') {
      const paymentIntent = event.data.object;
      console.log(`[subscription-webhook] PaymentIntent ${paymentIntent.id} en cours de traitement (processing)`);
      // Pour SEPA, le paiement reste en 'processing' pendant quelques jours
      // Pas d'action spécifique à ce stade, on attend le résultat final
    }

    if (type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      console.log(`[subscription-webhook] PaymentIntent ${paymentIntent.id} réussi`);
      // Le paiement a réussi - géré généralement via invoice.payment_succeeded
    }

    if (type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const lastError = paymentIntent.last_payment_error || {};
      const code = lastError.code || '';
      const declineCode = lastError.decline_code || '';
      const message = lastError.message || '';

      console.log(`[subscription-webhook] PaymentIntent ${paymentIntent.id} échoué - Code: ${code}, Decline: ${declineCode}, Message: ${message}`);

      // Vérifier si c'est une erreur SEPA connue
      const sepaErrorInfo = SEPA_ERROR_CODES[code] || SEPA_ERROR_CODES[declineCode];
      if (sepaErrorInfo) {
        console.log(`[subscription-webhook] Erreur SEPA identifiée: ${sepaErrorInfo.message} (Fatal: ${sepaErrorInfo.isFatal})`);
      }
    }

    // Gestion des litiges (disputes) - cas du test FR5720041010050500013M02608
    if (type === 'charge.dispute.created') {
      const dispute = event.data.object;
      const chargeId = dispute.charge;
      const reason = dispute.reason;
      const amount = dispute.amount ? dispute.amount / 100 : null;
      const status = dispute.status;

      console.log(`[subscription-webhook] ⚠️ LITIGE créé - Charge: ${chargeId}, Raison: ${reason}, Montant: ${amount}€, Statut: ${status}`);

      // Récupérer les métadonnées de la charge pour identifier la souscription
      try {
        // Notifier l'équipe d'un litige (à implémenter selon vos besoins)
        // Pour l'instant, on log simplement l'événement
        console.log(`[subscription-webhook] Détails du litige:`, {
          id: dispute.id,
          reason: reason,
          amount: amount,
          currency: dispute.currency,
          status: status,
          created: new Date(dispute.created * 1000).toISOString(),
        });
      } catch (disputeErr) {
        console.error('[subscription-webhook] Erreur lors du traitement du litige:', disputeErr);
      }
    }

    if (type === 'charge.dispute.closed') {
      const dispute = event.data.object;
      const status = dispute.status; // 'won', 'lost', 'warning_closed', etc.
      console.log(`[subscription-webhook] Litige fermé - Statut final: ${status}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur webhook subscription Stripe:', err);
    res.sendStatus(500);
  }
});

router.post('/cancel-subscription', async (req, res) => {
  const { asso, subscriptionId } = req.body;
  console.log("demande de cancel de l'asso " + asso + " pour le donateur " + subscriptionId);

  try {
    // Récupère l'instance Stripe
    const stripeInstance = await getStripeInstance(asso);

    // Annule la souscription
    const canceledSubscription = await stripeInstance.subscriptions.del(subscriptionId);

    // Si l'opération Stripe a réussi, envoyer l'email
    if (canceledSubscription && canceledSubscription.status === 'canceled') {
      // Récupère les informations du donateur pour l'email
      try {
        const donorInfo = await getDonorInfoBySubscriptionId(subscriptionId);
        
        // Récupère les informations de l'association
        const assoUri = donorInfo.asso || asso;
        const assoInfo = await getAssoInfoByUri(assoUri);
        
        // Prépare les variables pour le template d'email
        const emailVariables = {
          prenom: donorInfo.prenom || '',
          montant: donorInfo.montant || '',
          asso: assoInfo.nom
        };

        // Envoie l'email de confirmation d'annulation
        await sendTemplateEmail(
          donorInfo.email,
          EMAIL_TEMPLATES.ANNULATION,
          emailVariables,
          'Confirmation d\'annulation de votre don récurrent',
          assoInfo.email // Utiliser l'email de l'asso comme adresse de réponse
        );
        
        console.log(`Email d'annulation envoyé à ${donorInfo.email}`);
      } catch (emailError) {
        console.error('[Erreur lors de l\'envoi de l\'email d\'annulation]:', emailError);
        // On continue même si l'envoi de l'email échoue
      }
    }

    res.status(200).json({
      message: 'Souscription annulée avec succès.',
      subscription: canceledSubscription,
    });
  } catch (error) {
    console.error('[Erreur Stripe]:', error);
    res.status(500).json({ message: 'Erreur lors de l\'annulation de la souscription.', error: error.message });
  }
});

router.post('/pause-subscription', async (req, res) => {
  const { asso, subscriptionId, resumeDate } = req.body;
  console.log("demande de pause de l'asso " + asso + " pour le donateur " + subscriptionId);

  try {
    // Récupère l'instance Stripe
    const stripeInstance = await getStripeInstance(asso);

    // Parse la date de reprise (format YYYY-MM-DD)
    const [year, month, day] = resumeDate.split('-');
    const resumeDateObj = new Date(year, month - 1, day);
    const timestampReprise = Math.floor(resumeDateObj.getTime() / 1000);

    // Récupère les informations du donateur avant la mise à jour
    const donorInfo = await getDonorInfoBySubscriptionId(subscriptionId);
    
    // Met en pause la souscription
    const pausedSubscription = await stripeInstance.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'void', // Annule la facture courante sans prorata
        resumes_at: timestampReprise
      },
      proration_behavior: 'none' // Désactive le prorata lors de la reprise
    });

    // Vérifie que l'opération Stripe a réussi
    if (pausedSubscription && pausedSubscription.pause_collection && pausedSubscription.pause_collection.resumes_at === timestampReprise) {
      // Met à jour le statut dans la base de données
      await db.update(
        'Personnes',
        { statut: 'pause', resumeDate: resumeDateObj },
        'stripe_sub_id = ?',
        [subscriptionId],
        'remote'
      );

      // Envoie l'email de confirmation si l'opération Stripe a réussi
      try {
        // Récupère les informations de l'association
        const assoUri = donorInfo.asso || asso;
        const assoInfo = await getAssoInfoByUri(assoUri);
        
        // Prépare les variables pour le template d'email
        const emailVariables = {
          prenom: donorInfo.prenom || '',
          montant: donorInfo.montant || '',
          asso: assoInfo.nom,
          date_reprise: formatDateFR(resumeDateObj)
        };

        // Envoie l'email de confirmation de suspension
        await sendTemplateEmail(
          donorInfo.email,
          EMAIL_TEMPLATES.SUSPENSION,
          emailVariables,
          'Confirmation de suspension de votre don récurrent',
          assoInfo.email // Utiliser l'email de l'asso comme adresse de réponse
        );
        
        console.log(`Email de suspension envoyé à ${donorInfo.email}`);
      } catch (emailError) {
        console.error('[Erreur lors de l\'envoi de l\'email de suspension]:', emailError);
        // On continue même si l'envoi de l'email échoue
      }
    }

    res.status(200).json({
      message: 'Souscription mise en pause avec succès. Reprise prévue le ' + resumeDate,
      subscription: pausedSubscription,
    });
  } catch (error) {
    console.error('[Erreur Stripe]:', error);
    res.status(500).json({ message: 'Erreur lors de la mise en pause de la souscription.', error: error.message });
  }
});

router.post('/modify-resume-date', async (req, res) => {
  const { asso, subscriptionId, resumeDate } = req.body;
  console.log("demande de modification de la date de reprise de l'asso " + asso + " pour le donateur " + subscriptionId + " à la date " + resumeDate);

  try {
    // Récupère l'instance Stripe
    const stripeInstance = await getStripeInstance(asso);

    // Parse la date de reprise (format YYYY-MM-DD)
    const [year, month, day] = resumeDate.split('-');
    const resumeDateObj = new Date(year, month - 1, day);
    const timestampReprise = Math.floor(resumeDateObj.getTime() / 1000);

    // Récupère les informations du donateur avant la mise à jour
    const donorInfo = await getDonorInfoBySubscriptionId(subscriptionId);

    // Met à jour la date de reprise de la souscription
    const updatedSubscription = await stripeInstance.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'void', // Annule la facture courante sans prorata
        resumes_at: timestampReprise
      },
      proration_behavior: 'none' // Désactive le prorata lors de la reprise
    });

    // Vérifie que l'opération Stripe a réussi
    if (updatedSubscription && updatedSubscription.pause_collection && updatedSubscription.pause_collection.resumes_at === timestampReprise) {
      // Met à jour la date de reprise dans la base de données
      await db.update(
        'Personnes',
        { resumeDate: resumeDateObj },
        'stripe_sub_id = ?',
        [subscriptionId],
        'remote'
      );

      // Envoie l'email de confirmation si l'opération Stripe a réussi
      try {
        // Récupère les informations de l'association
        const assoUri = donorInfo.asso || asso;
        const assoInfo = await getAssoInfoByUri(assoUri);
        
        // Prépare les variables pour le template d'email
        const emailVariables = {
          prenom: donorInfo.prenom || '',
          montant: donorInfo.montant || '',
          asso: assoInfo.nom,
          date_reprise: formatDateFR(resumeDateObj),
          recurrence: donorInfo.recurrence || '',
          moyen: donorInfo.moyen || '',
          last_4: donorInfo.last4 || ''
        };

        // Envoie l'email de confirmation de modification de la date de reprise
        await sendTemplateEmail(
          donorInfo.email,
          EMAIL_TEMPLATES.REPRISE,
          emailVariables,
          'Confirmation de modification de la date de reprise de votre don',
          assoInfo.email // Utiliser l'email de l'asso comme adresse de réponse
        );
        
        console.log(`Email de modification de la date de reprise envoyé à ${donorInfo.email}`);
      } catch (emailError) {
        console.error('[Erreur lors de l\'envoi de l\'email de modification de la date de reprise]:', emailError);
        // On continue même si l'envoi de l'email échoue
      }
    }

    res.status(200).json({
      message: 'Date de reprise modifiée avec succès. Reprise prévue le ' + resumeDate,
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error('[Erreur Stripe]:', error);
    res.status(500).json({ message: 'Erreur lors de la modification de la date de reprise.', error: error.message });
  }
});

router.post('/get-stripe-public-key', async (req, res) => {
  const { asso } = req.body;

  try {
    // Récupère la clé publique depuis la table Assos
    const rows = await db.select(
      `SELECT stripe_publishable_key from Assos where uri = ?`,
      [asso], 'remote'
    );

    if (!rows || rows.length === 0) {
      throw new Error('Association non trouvée');
    }

    const publicKey = rows[0].stripe_publishable_key;
    if (!publicKey) {
      throw new Error('Clé publique Stripe non configurée pour cette association');
    }

    res.status(200).json({ publicKey });
  } catch (error) {
    console.error('[Erreur]:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération de la clé publique Stripe.',
      error: error.message
    });
  }
});

router.post('/modify-subscription', async (req, res) => {
  const { asso, subscriptionId, amount, billingDay, paymentMethod, email, firstName, lastName, occurrence } = req.body;
  console.log("Demande de modification de l'abonnement " + subscriptionId + " pour l'asso " + asso );

  try {
    // Récupère l'instance Stripe
    const stripeInstance = await getStripeInstance(asso);

    let stripeUpdateParams = {};
    let dbUpdateParams = {};
    let emailVariables = {
      prenom: firstName || '',
      montant: '',
      asso: asso || '',
      occurrence: occurrence || 'mensuel',
      moyen: '',
      last_4: ''
    };
    let hasChanges = false;

    let updatedSubscription;

    // Récupérer la souscription actuelle
    const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);

    // Vérifier si le montant a réellement changé
    if (amount !== undefined) {
      const currentAmount = subscription.items.data[0].price.unit_amount / 100;
      console.log("Montant reçu:", amount, "Montant actuel:", currentAmount);

      // Convertir les deux montants en nombres pour une comparaison sûre
      const newAmount = Number(amount);
      const existingAmount = Number(currentAmount);

      if (!isNaN(newAmount) && !isNaN(existingAmount) && newAmount !== existingAmount) {
        console.log("Modification du montant de", existingAmount, "€ à", newAmount, "€");

        // Récupérer le product_id actuel
        const currentProductId = subscription.items.data[0].price.product;

        // Rechercher un price_id existant dans la table Prices
        const personnes = await db.select(
          'SELECT occurence FROM Personnes WHERE asso = ? AND stripe_sub_id = ?',
          [asso, subscriptionId ],
          'remote'
        );

        // Rechercher un price_id existant dans la table Prices
        const priceRows = await db.select(
          'SELECT price_id FROM Prices WHERE asso = ? AND montant = ? AND product_id = ? AND nickname = ?',
          [asso, newAmount, currentProductId, personnes[0].occurence],
          'remote'
        );

        console.log("Recherche de price pour asso:", asso, "montant:", newAmount, "product_id:", currentProductId, "occurrence:", personnes[0].occurence);

        const subscriptionItemId = subscription.items.data[0].id;

        if (priceRows && priceRows.length > 0) {
          // Utiliser le price_id existant
          console.log("Utilisation d'un price_id existant:", priceRows[0].price_id);
          await stripeInstance.subscriptionItems.update(
            subscriptionItemId,
            {
              price: priceRows[0].price_id,
              proration_behavior: 'none' // Désactive le prorata lors de la modification du montant
            }
          );
        } else {
          // Créer un nouveau prix si aucun n'existe
          console.log("Création d'un nouveau price_id pour le montant", newAmount);
          await stripeInstance.subscriptionItems.update(
            subscriptionItemId,
            {
              price_data: {
                currency: 'eur',
                product: subscription.items.data[0].price.product,
                unit_amount: newAmount * 100,
                recurring: {
                  interval: occurrence === 'quotidien' ? 'day' : 'month'
                }
              },
              proration_behavior: 'none' // Désactive le prorata lors de la modification du montant
            }
          );
        }
        dbUpdateParams.montant = newAmount;
        emailVariables.montant = newAmount;
        hasChanges = true;
      } else {
        console.log("Le montant n'a pas changé, ignoré");
      }
    }

    // Si le jour de prélèvement a été modifié
    if (billingDay !== undefined) {
      console.log("Demande de modification de récurrence " + billingDay);

      // Calculer la prochaine date de prélèvement
      const nextBillingDate = getNextBillingDate(billingDay);
      const timestampNextBilling = Math.floor(nextBillingDate.getTime() / 1000);

      // Mettre à jour la souscription avec trial_end pour définir la prochaine date de facturation
      await stripeInstance.subscriptions.update(
        subscriptionId,
        {
          trial_end: timestampNextBilling,
          proration_behavior: 'none'
        }
      );

      console.log("Nouvelle date de prélèvement définie au:", nextBillingDate.toLocaleDateString());
      dbUpdateParams.recurrence = billingDay.toString();
      hasChanges = true;
    }

    // Si un nouveau moyen de paiement est fourni
    if (paymentMethod) {
      console.log("Demande de modification de méthode de paiement " + paymentMethod);
      
      // Récupérer le customer_id de la souscription
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
      const customerId = subscription.customer;
      
      // Attacher le moyen de paiement au client
      console.log("Attachement du moyen de paiement au client", customerId);
      await stripeInstance.paymentMethods.attach(
        paymentMethod,
        { customer: customerId }
      );

      // Récupérer les détails du moyen de paiement
      const paymentMethodDetails = await stripeInstance.paymentMethods.retrieve(paymentMethod);
      console.log("Détails du moyen de paiement:", paymentMethodDetails);

      // Déterminer le type de moyen de paiement et les détails
      let moyen, brand, last4;
      if (paymentMethodDetails.type === 'card') {
        moyen = 'CB';
        brand = paymentMethodDetails.card.brand;
        last4 = paymentMethodDetails.card.last4;
      } else if (paymentMethodDetails.type === 'sepa_debit') {
        moyen = 'IBAN';
        brand = 'sepa';
        last4 = paymentMethodDetails.sepa_debit.last4;
      }

      // Mettre à jour la base de données avec les nouvelles informations
      dbUpdateParams = {
        ...dbUpdateParams,
        moyen,
        brand,
        last4
      };
      
      emailVariables.moyen = moyen;
      emailVariables.last_4 = last4;
      
      // Mettre à jour la souscription avec le nouveau moyen de paiement
      await stripeInstance.subscriptions.update(
        subscriptionId,
        {
          default_payment_method: paymentMethod,
          proration_behavior: 'none' // Désactive le prorata lors de la modification du moyen de paiement
        }
      );
      
      hasChanges = true;
    }

    // Récupérer la souscription mise à jour
    updatedSubscription = await stripeInstance.subscriptions.retrieve(subscriptionId);

    // Vérifie que l'opération Stripe a réussi
    if (updatedSubscription) {
      // Met à jour la base de données uniquement si des modifications sont nécessaires
      if (Object.keys(dbUpdateParams).length > 0) {
        await db.update(
          'Personnes',
          dbUpdateParams,
          'stripe_sub_id = ?',
          [subscriptionId],
          'remote'
        );
      }

      // Si des modifications ont été effectuées, envoyer un email de confirmation
      if (hasChanges) {
        try {
          // Récupérer les informations à jour du donateur depuis la base de données
          const donorInfo = await getDonorInfoBySubscriptionId(subscriptionId);
          
          // Récupère les informations de l'association
          const assoUri = donorInfo.asso || asso;
          const assoInfo = await getAssoInfoByUri(assoUri);
          
          // Prépare les variables pour le template d'email en utilisant les données à jour de la base
          const emailVariables = {
            prenom: donorInfo.prenom || firstName || '',
            montant: donorInfo.montant || '',
            asso: assoInfo.nom,
            recurrence: donorInfo.recurrence || '',
            moyen: donorInfo.moyen || '',
            last_4: donorInfo.last4 || ''
          };

          // Envoie l'email de confirmation de modification
          await sendTemplateEmail(
            email || donorInfo.email,
            EMAIL_TEMPLATES.MODIFICATION,
            emailVariables,
            'Confirmation de modification de votre don récurrent',
            assoInfo.email // Utiliser l'email de l'asso comme adresse de réponse
          );
          
          console.log(`Email de modification envoyé à ${email || donorInfo.email}`);
        } catch (emailError) {
          console.error('[Erreur lors de l\'envoi de l\'email de modification]:', emailError);
          // On continue même si l'envoi de l'email échoue
        }
      }
    }

    res.status(200).json({
      message: 'Souscription modifiée avec succès.',
      subscription: updatedSubscription,
    });

    // Fonction utilitaire pour calculer la prochaine date de prélèvement
    function getNextBillingDate(day) {
      const now = new Date();
      let nextBillingDate = new Date(now.getFullYear(), now.getMonth(), day);

      // Si le jour spécifié est déjà passé ce mois-ci, on passe au mois suivant
      if (nextBillingDate < now) {
        nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, day);
      }

      return nextBillingDate;
    }
  } catch (error) {
    console.error('[Erreur Stripe]:', error);
    res.status(500).json({
      message: 'Erreur lors de la modification de la souscription.',
      error: error.message
    });
  }
});

module.exports = router;
