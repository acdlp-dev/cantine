const express = require('express');
const { authMiddleware } = require('./auth'); // Import du middleware
const db = require('../services/bdd');

const router = express.Router();

/**
 * Route pour enregistrer les données de paiement PayPal
 * Cette route est publique (pas besoin d'authentification)
 */
router.post('/paypal-donations/save', async (req, res) => {
  const donationData = req.body;
  console.log("Enregistrement des données de don PayPal:", donationData);

  try {
    // Insérer les données dans la table Dons_Ponctuels
    const result = await db.insert(
      'Dons_Ponctuels',
      {
        asso: donationData.asso,
        montant: donationData.amount,
        type: 'ponctuel',
        moyen: 'Paypal',
        nom: donationData.lastname || '',
        prenom: donationData.firstname || '',
        tel: donationData.phone || '',
        email: donationData.email,
        source: 'site',
        amana: donationData.campagne,
        tracking: donationData.paypalTransactionId || ''
      },
      'remote'
    );

    // Retourner l'ID du don créé
    return res.status(200).json({ 
      success: true, 
      donationId: result.insertId,
      message: 'Données de don PayPal enregistrées avec succès.' 
    });
  } catch (err) {
    console.error(`[PayPal Donations Save Error]: ${err.message}`, err);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'enregistrement des données de don PayPal.' 
    });
  }
});

/**
 * Route pour enregistrer les données du formulaire de don
 * Cette route est publique (pas besoin d'authentification)
 */
router.post('/donations/save', async (req, res) => {
  const donationData = req.body;
  console.log("Enregistrement des données de don:", donationData);

  try {
    const isMonthly = donationData.origin === 'mensuel';

    // Vérifier que les données requises sont présentes
    if (!donationData.email || !donationData.amount || !donationData.campagne || !donationData.asso) {
      return res.status(400).json({
        success: false,
        message: 'Données incomplètes. Email, montant, campagne et association sont requis.'
      });
    }
    // Générer un UUID maison pour le tracking
    const { v4: uuidv4 } = require('uuid');
    const trackingId = uuidv4();

    const tableName = isMonthly ? 'Stripe_Mensuel_Cus_Intent' : 'Stripe_Ponctuel_Cus_Intent';

    const payload = {
      asso: donationData.asso,
      montant: donationData.amount,
      amana: donationData.campagne,
      nom: donationData.lastname,
      prenom: donationData.firstname,
      email: donationData.email,
      tracking: trackingId,
      siren: donationData.siren || null,
      raison: donationData.raison || null,
      adresse: donationData.address || null,
      ville: donationData.city || null,
      code_postal: donationData.postal_code || null,
      pays: donationData.country || 'France'
    };

    const result = await db.insert(
      tableName,
      payload,
      'remote'
    );

    // Retourner l'ID du don et le tracking UUID généré
    return res.status(200).json({
      success: true,
      donationId: result.insertId,
      tracking: trackingId,
      message: 'Données de don enregistrées avec succès.'
    });
  } catch (err) {
    console.error(`[Donations Save Error]: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement des données de don.'
    });
  }
});

/**
 * Route pour enregistrer les dons hors ligne (SEPA/Chèque)
 * Cette route est publique (pas besoin d'authentification)
 */
router.post('/offline-donations/save', async (req, res) => {
  const donationData = req.body;
  console.log("Enregistrement des données de don hors ligne:", donationData);

  try {
    // Vérifier que les données requises sont présentes
    if (!donationData.email || !donationData.amount || !donationData.campagne || !donationData.asso || !donationData.paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Données incomplètes. Email, montant, campagne, association et moyen de paiement sont requis.'
      });
    }

    // Générer un UUID pour le tracking
    const { v4: uuidv4 } = require('uuid');
    const trackingId = uuidv4();

    // Insérer les données dans la table Dons_Ponctuels
    const result = await db.insert(
      'Dons_Ponctuels',
      {
        asso: donationData.asso,
        montant: donationData.amount,
        type: 'ponctuel',
        moyen: donationData.paymentMethod === 'sepa' ? 'Virement' : 'Chèque',
        nom: donationData.lastname || '',
        prenom: donationData.firstname || '',
        tel: donationData.phone || '',
        email: donationData.email,
        source: 'site',
        amana: donationData.campagne,
        tracking: trackingId,
        statut: 'en attente',
        siren: donationData.siren || null,
        raison: donationData.raison || null,
        adresse: donationData.address || null,
        ville: donationData.city || null,
        code_postal: donationData.postal_code || null,
        pays: donationData.country || 'France'
      },
      'remote'
    );

    // Retourner l'ID du don et le tracking UUID généré
    return res.status(200).json({
      success: true,
      donationId: result.insertId,
      tracking: trackingId,
      message: 'Données de don hors ligne enregistrées avec succès.'
    });
  } catch (err) {
    console.error(`[Offline Donations Save Error]: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement des données de don hors ligne.'
    });
  }
});

router.post('/dons', authMiddleware, async (req, res) => {
  const { email, viewAsEmail } = req.body;
  const userRole = req.user.role;
  
  // Si l'utilisateur est admin ET qu'il veut voir un autre email
  let targetEmail = email;
  if (userRole === 'admin' && viewAsEmail) {
    targetEmail = viewAsEmail;
    console.log(`[ADMIN VIEW] ${req.user.email} consulte les dons de ${viewAsEmail}`);
  } else {
    console.log("Demande de liste de dons pour " + email);
  }

  try {
    const results = await db.select('SELECT * FROM Dons_Ponctuels WHERE email = ? order by ajout desc', [targetEmail], 'remote');
    if (results.length === 0) {
      return res.status(404).json({ message: 'Email not found.' });
    }
    return res.status(200).json({ results });
  } catch (err) {
    console.error(`[Dons Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/getSubscriptionsByEmail', authMiddleware, async (req, res) => {
  const { email, viewAsEmail } = req.body;
  const userRole = req.user.role;
  
  // Si l'utilisateur est admin ET qu'il veut voir un autre email
  let targetEmail = email;
  if (userRole === 'admin' && viewAsEmail) {
    targetEmail = viewAsEmail;
    console.log(`[ADMIN VIEW] ${req.user.email} consulte les souscriptions de ${viewAsEmail}`);
  } else {
    console.log("Demande de liste des souscriptions pour " + email);
  }

  try {
    const results = await db.select('SELECT * FROM Personnes WHERE email = ? order by statut asc', [targetEmail], 'remote');
    if (results.length === 0) {
      return res.status(404).json({ message: 'Email not found.' });
    }
    return res.status(200).json({ results });
  } catch (err) {
    console.error(`[Dons Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
