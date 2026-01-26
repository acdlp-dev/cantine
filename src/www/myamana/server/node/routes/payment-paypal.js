const express = require('express');
const router = express.Router();
const { getPaypalCredentials } = require('../services/paypalService');
const bdd = require("../services/bdd");
const { sendTemplateEmail } = require('../services/mailService');

/**
 * Endpoint pour récupérer les informations d'identification PayPal
 * Cette route est publique (pas besoin d'authentification)
 */
router.post('/get-paypal-credentials', async (req, res) => {
  const { asso } = req.body;

  if (!asso) {
    return res.status(400).json({ error: 'Association non spécifiée.' });
  }

  try {
    const credentials = await getPaypalCredentials(asso);
    res.json({ paypalEmail: credentials.paypalEmail });
  } catch (err) {
    console.error('Erreur PayPal:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des informations PayPal.' });
  }
});

/**
 * Webhook PayPal - Plan A (email)
 */
router.post("/paypal/webhook", async (req, res) => {
  try {
    console.log("========== 📩 Nouveau webhook PayPal reçu ==========");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body brut:", JSON.stringify(req.body, null, 2));

    const event = req.body;
    console.log("Event type détecté:", event?.event_type);

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      try {
        const resource = event.resource;
        console.log("➡️  Resource brut:", JSON.stringify(resource, null, 2));

        const montant = parseFloat(resource.amount.value);
        const devise = resource.amount.currency_code;

        // ⚠️ Dans l'objet webhook, l'email du donateur est parfois dans payer.payer_info
        const emailDonateur = resource.payer?.email_address || resource.payer_info?.email || null;
        const transactionId = resource.id;

        // Log du custom_id => contient notre tracking UUID (généré côté front)
        if (resource.custom_id) {
          console.log("👉 Voici l'uuid renvoyé par le front:", resource.custom_id);
        }

        // Nouvelle logique : récupérer l'uri encodée dans invoice_id
        const [uri] = resource.invoice_id?.split(":") || [];
        console.log("🆔 Invoice_id complet:", resource.invoice_id);
        console.log("➡️  URI extrait:", uri);

        console.log("Traitement d'un paiement webhook PayPal (uri):", uri, {
          montant,
          devise,
          emailDonateur,
          transactionId
        });

        if (uri) {
          const asso = await bdd.select(
            "SELECT id, paypal_email FROM Assos WHERE uri = ? LIMIT 1",
            [uri],
            'remote'
          );

          if (asso.length > 0) {
            const emailAsso = asso[0].paypal_email;
            console.log("✅ Association trouvée:", asso[0]);
            console.log("Préparation INSERT don PayPal...");
            try {

              await bdd.insert(
                "Dons_Ponctuels",
                {
                  asso: uri,
                  montant,
                  email: emailDonateur,
                  moyen: "Paypal",
                  source: "site",
                  tracking: transactionId,
                  payment_status: "completed"
                },
                'remote'
              );
              console.log("✅ Don PayPal inséré en DB pour asso (uri)", uri, "transaction:", transactionId);

              // 🔄 Mise à jour des infos donateur après insertion
              try {
                const sqlUpdate = `
                  UPDATE Dons_Ponctuels d
                  JOIN Stripe_Ponctuel_Cus_Intent s ON s.tracking = ?
                  SET
                    d.nom = s.nom,
                    d.prenom = s.prenom,
                    d.email = s.email,
                    d.amana = s.amana,
                    d.siren = s.siren,
                    d.raison = s.raison
                  WHERE d.tracking = ?
                `;
                await bdd.query(sqlUpdate, [resource.custom_id, transactionId], 'remote');
                console.log("🔄 Don ponctuel mis à jour à partir de Stripe_Ponctuel_Cus_Intent. UUID front:", resource.custom_id, "Transaction:", transactionId);
              } catch (updErr) {
                console.error("❌ Erreur lors de l'UPDATE Dons_Ponctuels depuis Stripe_Ponctuel_Cus_Intent:", updErr);
              }
            } catch (dbErr) {
              console.error("❌ Erreur lors de l'INSERT dans Dons_Ponctuels:", dbErr);
            }
          } else {
            console.warn("⚠️ Aucune asso trouvée pour l'uri:", uri);
          }
        } else {
          console.warn("⚠️ Webhook PayPal sans uri/invoice_id utilisable:", resource);
        }
      } catch (err) {
        console.error("❌ Erreur lors du traitement du webhook PayPal:", err);
      }
    }
    else if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
      try {
        const resource = event.resource;
        console.log("❌ Paiement PayPal refusé (DENIED)");
        const montant = parseFloat(resource.amount.value);
        const devise = resource.amount.currency_code;
        const emailDonateur = resource.payer?.email_address || resource.payer_info?.email || null;
        const transactionId = resource.id;
        const [uri] = resource.invoice_id?.split(":") || [];
        console.log("🆔 Invoice_id:", resource.invoice_id, " => URI:", uri);

        if (uri) {
          await bdd.insert(
            "Dons_Ponctuels",
            {
              asso: uri,
              montant,
              email: emailDonateur,
              moyen: "Paypal",
              source: "site",
              tracking: transactionId,
              payment_status: "failed"
            },
            'remote'
          );
          console.log("✅ Don refusé inséré en DB avec payment_status=failed", transactionId);
        }
      } catch (errDenied) {
        console.error("Erreur lors du traitement du webhook PayPal DENIED:", errDenied);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erreur Webhook PayPal:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
