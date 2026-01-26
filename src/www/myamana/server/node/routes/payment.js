const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { getStripeInstance } = require('../services/stripeService');
const { sendTemplateEmail } = require('../services/mailService');
const db = require('../services/bdd');

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

/**
 * Crée un nouveau client Stripe pour chaque don
 * @param {Stripe} stripeInstance - Instance Stripe
 * @param {Object} donorData - Données du donateur
 * @returns {Promise<string>} - ID du nouveau client Stripe
 */
async function createStripeCustomer(stripeInstance, donorData) {
  try {
    const customer = await stripeInstance.customers.create({
      email: donorData.email,
      name: `${donorData.prenom} ${donorData.nom}`,
      phone: donorData.tel || undefined,
      address: {
        line1: donorData.adresse || 'Non spécifiée',
        city: donorData.ville || 'Non spécifiée',
        postal_code: donorData.code_postal || '00000',
        country: donorData.pays || 'FR'
      },
      metadata: {
        asso: donorData.asso,
        type: 'donateur_ponctuel',
        created_at: new Date().toISOString()
      }
    });

    console.log(`✅ Nouveau client Stripe créé: ${customer.id} pour ${donorData.email}`);
    return customer.id;
  } catch (error) {
    console.error('❌ Erreur création client Stripe:', error);
    // En cas d'erreur, générer un ID fallback pour ne pas bloquer le paiement
    return `fallback_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}


router.post('/create-payment-intent', async (req, res) => {
  const { asso, amount, donationData } = req.body;
  const stripeInstance = await getStripeInstance(asso);


  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Montant invalide pour le paiement.' });
  }

  // Validation de l'email avec une expression régulière stricte RFC 5322
  const emailRegex = /^(?=.{1,64}@.{1,255}$)([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!donationData?.email || !emailRegex.test(donationData.email)) {
    return res.status(400).json({
      error: 'Adresse email invalide. Veuillez utiliser un format valide (ex: exemple@domaine.com)'
    });
  }

  try {
    // 1. Créer systématiquement un nouveau client Stripe
    const customerId = await createStripeCustomer(stripeInstance, donationData);

    // 2. Créer le PaymentIntent avec le client
    const campagneDescription = donationData?.campagne || 'Non spécifiée';
    const paymentDescription = `Don Ponctuel - ${campagneDescription}`;

    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      payment_method_types: ['card'],
      customer: customerId,
      description: paymentDescription, // ✅ Ajout de la description personnalisée
      metadata: {
        // Informations du don pour le webhook
        asso: asso,
        nom: donationData?.nom || '',
        prenom: donationData?.prenom || '',
        email: donationData?.email || '',
        campagne: donationData?.campagne || '',
        siren: donationData?.siren || '',
        raison: donationData?.raison || '',
        adresse: donationData?.adresse || '',
        ville: donationData?.ville || '',
        code_postal: donationData?.code_postal || '',
        pays: donationData?.pays || 'France',
        recu: donationData?.recu || false,
        type: donationData?.type || 'ponctuel',
        stripe_customer_id: customerId
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      customerId: customerId
    });
  } catch (err) {
    console.error('Erreur Stripe:', err);

    if (err.type === 'StripeCardError') {
      // Erreur de carte (ex: refusée)
      res.status(402).json({ error: err.message });
    } else if (err.type === 'StripeInvalidRequestError') {
      // Mauvaise requête (paramètres invalides)
      res.status(400).json({ error: 'Requête invalide. Vérifiez vos paramètres.' });
    } else {
      // Autres erreurs
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  }
});

/**
 * Envoi direct d'un email de confirmation (fallback si webhook absent)
 */
router.post('/send-donation-email', async (req, res) => {
  const { email, prenom, montant, asso, campagne, templateId, subject } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Email manquant' });
  }

  try {
    // Utiliser le template et le sujet personnalisés si fournis, sinon utiliser les valeurs par défaut
    const finalTemplateId = templateId || 6857507;
    const finalSubject = subject || 'Confirmation de votre don';

    await sendTemplateEmail(
      email,
      finalTemplateId,
      {
        prenom: prenom || '',
        montant: montant || 0,
        asso: asso || '',
        campagne: campagne || ''
      },
      finalSubject
    );
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur lors de l\'envoi direct de l\'email de don:', err);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
  }
});

/**
 * Webhook Stripe pour recevoir les événements de paiement
 * Sécurisé par vérification de signature
 * URL: /api/stripe/webhook?pub_key=pk_live_xxx
 */
router.post('/stripe/webhook', async (req, res) => {
  let event;

  // Récupérer la pub_key depuis les query params pour identifier l'asso
  const pubKey = req.query.pub_key;

  if (!pubKey) {
    console.error('❌ Webhook Stripe: pub_key manquante dans l\'URL');
    return res.status(400).json({ error: 'pub_key manquante' });
  }

  // Récupérer le secret webhook de l'asso
  const assoData = await getWebhookSecretByPubKey(pubKey);

  if (!assoData || !assoData.webhookSecret) {
    console.error('❌ Webhook Stripe: asso non trouvée ou webhook secret non configuré pour pub_key:', pubKey);
    return res.status(400).json({ error: 'Association non trouvée ou webhook secret non configuré' });
  }

  const signature = req.headers['stripe-signature'];

  if (!signature) {
    console.error('❌ Webhook Stripe: signature manquante');
    return res.status(400).json({ error: 'Signature manquante' });
  }

  try {
    // Le body est déjà raw grâce au middleware express.raw() dans server.js
    event = Stripe.webhooks.constructEvent(
      req.body,
      signature,
      assoData.webhookSecret
    );
    console.log(`✅ Webhook Stripe: signature vérifiée pour l'asso ${assoData.asso}`);
  } catch (err) {
    console.error('❌ Webhook Stripe: signature invalide -', err.message);
    return res.status(400).json({ error: `Signature invalide: ${err.message}` });
  }

  try {
    console.log('========== 📩 Webhook Stripe reçu ==========');
    console.log('Type d\'événement:', event.type);
    console.log('Event ID:', event.id);
    
    if (event.type === 'payment_intent.succeeded') {
      const stripeData = event.data.object;

      console.log('Paiement réussi - PaymentIntent ID:', stripeData.id);
      console.log('Montant:', stripeData.amount / 100, 'EUR');
      console.log('Metadata:', JSON.stringify(stripeData.metadata));

      // Extraire l'ID client des métadonnées ou directement depuis l'objet
      const customerId = stripeData.metadata?.stripe_customer_id || stripeData.customer;
      console.log('Client Stripe associé:', customerId);

      // Préparer les données du don pour l'insertion en BDD
      const donData = {
        asso: stripeData.metadata.asso || '',
        montant: stripeData.amount / 100,
        nom: stripeData.metadata.nom || '',
        prenom: stripeData.metadata.prenom || '',
        email: stripeData.metadata.email || '',
        amana: stripeData.metadata.campagne || '',
        siren: stripeData.metadata.siren || null,
        raison: stripeData.metadata.raison || null,
        adresse: stripeData.metadata.adresse || null,
        ville: stripeData.metadata.ville || null,
        code_postal: stripeData.metadata.code_postal || null,
        pays: stripeData.metadata.pays || 'France',
        demande_recu: stripeData.metadata.recu ? 'true' : 'false',
        moyen: 'CB',
        source: 'site',
        type: stripeData.metadata.type || 'ponctuel',
        tracking: stripeData.id,
        statut: 'completed',
        stripe_cus_id: customerId // ✅ Ajout de l'ID client Stripe
      };

      // Enregistrer le don dans la table Dons_Ponctuels
      try {
        await db.insert('Dons_Ponctuels', donData, 'remote');
        console.log('Don Stripe enregistré en BDD avec customer ID:', {
          id: stripeData.id,
          customer_id: customerId,
          montant: donData.montant,
          email: donData.email
        });
      } catch (dbErr) {
        console.error('Erreur lors de l\'INSERT dans Dons_Ponctuels:', dbErr);
        // On répond quand même 200 pour éviter que Stripe retry indéfiniment
      }
    }
    
    // Répondre 200 pour que Stripe sache qu'on a bien reçu le webhook
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Erreur webhook Stripe:', err);
    res.sendStatus(500);
  }
});

module.exports = router;
