const express = require('express');
// Middleware d'authentification commenté comme vous le souhaitez
const { authMiddleware } = require('./auth');
const db = require('../services/bdd');
const pdfService = require('../services/pdfService');
const { sendTemplateEmail } = require('../services/mailService');
const stripeService = require('../services/stripeService');
const logger = require('../config/logger');

// Service pour l'API INSEE
const inseeService = require('../services/inseeService');

const router = express.Router();

// Vérifie que les informations minimales de l'association sont complètes
// Utilisé côté cantine pour bloquer l'accès tant que les champs requis ne sont pas remplis
router.get('/canteInfosCompleted', authMiddleware, async (req, res) => {
  try {
    const siren = req.user.siren;
    if (!siren) {
      return res.status(400).json({ isComplete: false, missingFields: ['SIREN manquant'], message: "Identifiant d'association manquant" });
    }

    // Récupérer les champs requis depuis la table Assos
    const rows = await db.select(
      'SELECT nom, adresse, code_postal, ville, email, tel FROM Assos WHERE siren = ? LIMIT 1',
      [siren],
      'remote'
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ isComplete: false, missingFields: ['Association introuvable'], message: "Association introuvable" });
    }

    const asso = rows[0] || {};
    const required = [
      { key: 'nom', label: 'Nom de l\'association' },
      { key: 'adresse', label: 'Adresse' },
      { key: 'code_postal', label: 'Code postal' },
      { key: 'ville', label: 'Ville' },
      { key: 'email', label: 'Email' },
      { key: 'tel', label: 'Téléphone' }
    ];

    const missingFields = required
      .filter(({ key }) => {
        const v = (asso[key] ?? '').toString().trim();
        return v.length === 0;
      })
      .map(({ label }) => label);

    const isComplete = missingFields.length === 0;
    const message = isComplete
      ? 'Les informations de la cantine sont complètes.'
      : `Informations manquantes: ${missingFields.join(', ')}`;

    return res.status(200).json({ isComplete, missingFields, message });
  } catch (err) {
    console.error('[canteInfosCompleted] Error:', err);
    return res.status(500).json({ isComplete: false, missingFields: [], message: 'Erreur serveur lors de la vérification des informations.' });
  }
});


/**
 * Route pour récupérer les informations d'une entreprise par son SIREN
 * Utilise la fonction getLegalName existante dans inseeService
 */
router.get('/api/sirene/:siren', authMiddleware, async (req, res) => {
  const { siren } = req.params;

  try {
    // Validation basique du SIREN
    if (!siren || siren.length !== 9 || !/^\d+$/.test(siren)) {
      return res.status(400).json({ error: 'Le numéro SIREN doit contenir exactement 9 chiffres' });
    }

    // Utilisation de la fonction getLegalName existante
    const companyName = await inseeService.getLegalName(siren);
    res.json({
      success: true,
      denomination: companyName
    });
  } catch (error) {
    console.error(`Erreur lors de la récupération du nom légal pour ${siren}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour créer un don hors ligne
router.get('/getInfosAsso', authMiddleware, async (req, res) => {
  try {
    // const { siren } = req.body;
    const siren = req.user.siren; // Récupération du SIREN depuis la requête ou le token JWT
    if (!siren) {
      return res.status(400).json({ message: 'SIREN manquant.' });
    }

    // Requête SQL pour récupérer les informations de l'association
    const sql = `
      SELECT 
        *
      FROM 
        Assos
      WHERE 
        siren = ?
    `;

    const results = await db.select(sql, [siren], 'remote');

    if (results.length === 0) {
      return res.status(404).json({ message: 'Association non trouvée.' });
    }

    return res.status(200).json({
      data: results[0]
    });

  } catch (err) {
    console.error('[Info Asso Error]:', err);
    return res.status(500).json({ message: 'Erreur lors de la génération du reçu fiscal.' });
  }
});



router.post('/updateInfosAsso', authMiddleware, async (req, res) => {
  try {
    const formData = req.body || {};

    // Identify association via JWT, do not rely on body for security
    const siren = req.user?.siren || formData.siren;
    if (!siren) {
      return res.status(400).json({ message: 'SIREN manquant.' });
    }

    // Determine update source: 'infos' (identity/contact) vs 'configuration' (full settings)
    const source = formData.source || formData._source || (formData.cantineOk ? 'infos' : 'configuration');

    // Variables pour le seeding Stripe
    let shouldSeedStripe = false;
    let oldStripeSecretKey = null;
    let newStripeSecretKey = null;
    let assoUri = null;

    // Build payload based on source
    let updatePayload;
    if (source === 'infos') {
      // Only identity/contact fields from the Infos page
      updatePayload = {
        nom: formData.association_name ?? null,
        surnom: formData.nickname ?? '',
        type: formData.type ?? null,
        adresse: formData.address ?? null,
        ville: formData.city ?? null,
        code_postal: formData.postal_code ?? null,
        tel: formData.phone ?? null,
        email: formData.email ?? null
      };
    } else {
      // Full configuration update from the Configuration page
      
      // Récupérer les anciennes clés Stripe avant la mise à jour
      const existingKeys = await stripeService.getExistingStripeKeys(siren);
      oldStripeSecretKey = existingKeys.secretKey;
      newStripeSecretKey = formData.stripeSecretKey;
      assoUri = await stripeService.getAssoUri(siren);
      
      // Déterminer si on doit créer les prices Stripe
      // Cas 1: Première saisie (anciennes clés vides, nouvelles remplies)
      // Cas 2: Changement de clés (anciennes != nouvelles)
      if (newStripeSecretKey && newStripeSecretKey.trim() !== '') {
        if (!oldStripeSecretKey || oldStripeSecretKey.trim() === '') {
          // Première saisie des clés
          shouldSeedStripe = true;
          logger.info(`[updateInfosAsso] Première saisie des clés Stripe pour ${siren}`);
        } else if (oldStripeSecretKey !== newStripeSecretKey) {
          // Changement de clés
          shouldSeedStripe = true;
          logger.info(`[updateInfosAsso] Changement de clés Stripe détecté pour ${siren}`);
        }
      }
      
      updatePayload = {
        stripe_publishable_key: formData.stripePublicKey,
        stripe_secret_key: formData.stripeSecretKey,
        nom: formData.association_name,
        surnom: formData.nickname,
        type: formData.type,
        isMosquee: formData.is_cultural === 'yes' ? 'oui' : (formData.is_cultural === 'no' ? 'non' : undefined),
        qualite: formData.quality,
        objet: formData.purpose,
        site: formData.website,
        codeCouleur: formData.color,
        adresse: formData.address,
        ville: formData.city,
        code_postal: formData.postal_code,
        tel: formData.phone,
        email: formData.email,
        adresseCheque: formData.same_address === 'yes' ? formData.address : formData.check_address,
        villeCheque: formData.same_address === 'yes' ? formData.city : formData.check_city,
        code_postalCheque: formData.same_address === 'yes' ? formData.postal_code : formData.check_postal_code,
        expediteur: formData.email_sender,
        signataire_prenom: formData.fiscal_receipt_first_name,
        signataire_nom: formData.fiscal_receipt_last_name,
        signataire_role: formData.fiscal_receipt_status,
        iban_general: formData.iban,
        bic_general: formData.bic,
        paypal_email: formData.has_paypal === 'yes' ? formData.paypal_email : (formData.has_paypal === 'no' ? null : undefined),
        iban_zakat: formData.has_zakat === 'yes' ? formData.zakat_iban : (formData.has_zakat === 'no' ? null : undefined),
        bic_zakat: formData.has_zakat === 'yes' ? formData.zakat_bic : (formData.has_zakat === 'no' ? null : undefined),
        paypal_email_zakat: formData.hasPaypalZakat === 'yes' ? formData.paypal_email_zakat : (formData.hasPaypalZakat === 'no' ? null : undefined)
      };
    }

    // Sanitize: remove undefined to avoid MySQL bind errors; keep nulls if explicitly intended
    const sanitizedPayload = Object.keys(updatePayload).reduce((acc, key) => {
      const value = updatePayload[key];
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {});

    // Mask sensitive values in logs
    const logSafeData = { ...sanitizedPayload };
    if (logSafeData.stripe_secret_key) logSafeData.stripe_secret_key = '********';

    // Perform update
    await db.update(
      'Assos',
      sanitizedPayload,
      'siren = ?',
      [siren],
      'remote'
    );

    // Seeding Stripe: créer Product + 1000 Prices si nécessaire
    let stripeSeedResult = null;
    if (shouldSeedStripe && assoUri && newStripeSecretKey) {
      logger.info(`[updateInfosAsso] Lancement du seeding Stripe pour ${assoUri}`);
      stripeSeedResult = await stripeService.seedPricesForAsso(assoUri, newStripeSecretKey);
      
      if (stripeSeedResult.success) {
        logger.info(`[updateInfosAsso] Seeding terminé: ${stripeSeedResult.pricesCreated} prices créés`);
      } else {
        logger.error(`[updateInfosAsso] Erreur seeding: ${stripeSeedResult.error}`);
      }
    }

    return res.status(200).json({
      message: `Informations de l'association mises à jour avec succès (${source}).`,
      success: true,
      stripeSeed: stripeSeedResult ? {
        triggered: true,
        success: stripeSeedResult.success,
        productName: stripeSeedResult.productName,
        pricesCreated: stripeSeedResult.pricesCreated,
        error: stripeSeedResult.error
      } : { triggered: false }
    });

  }
  catch (err) {
    console.error('[Info Asso Error]:', err);
    return res.status(500).json({ message: 'Erreur lors de la l\'update des infos de l\'asso' });
  }
});

// Route pour vérifier si l'onboarding a été complété
router.get('/isOnboardingCompleted', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    
    // Récuperer l'ID de l'utilisateur à partir de son email
    const userQuery = 'SELECT id FROM users WHERE email = ?';
    const userResults = await db.select(userQuery, [email], 'remote');
    
    if (!userResults || userResults.length === 0) {
      console.log(`Aucun utilisateur trouvé avec l'email: ${email}`);
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const userId = userResults[0].id;
    // Construire la requête pour vérifier si l'onboarding est complété
    const query = 'SELECT * FROM onboarding_backoffice WHERE user_id = ?';

    const results = await db.select(query, [userId], 'remote');
    
    if (!results || results.length === 0) {
      console.log(`Aucun utilisateur trouvé avec l'ID: ${userId}`);
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    return res.status(200).json({ result: results[0] });
  } catch (err) {
    console.error(`[isOnboardingCompleted Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Route pour compléter l'onboarding et sauvegarder les choix
router.post('/completeOnboarding', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    const { donations, cantine, suiviVehicule, benevolat, isOnboarded, tutorielDone } = req.body;

    // Récuperer l'ID de l'utilisateur à partir de son email
    const userQuery = 'SELECT id FROM users WHERE email = ?';
    const userResults = await db.select(userQuery, [email], 'remote');
    
    if (!userResults || userResults.length === 0) {
      console.log(`Aucun utilisateur trouvé avec l'email: ${email}`);
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const userId = userResults[0].id;
    
    // Préparer l'objet de mise à jour
    const updateData = {
      donations: donations ? 1 : 0,
      suiviVehicule: suiviVehicule ? 1 : 0,
      benevolat: benevolat ? 1 : 0,
      isOnboarded: isOnboarded ? 1 : 0
    };
    
    // Ajouter tutorielDone à la mise à jour s'il est fourni
    if (tutorielDone !== undefined) {
      updateData.tutorielDone = tutorielDone ? 1 : 0;
    }
    
    // Mettre à jour les choix d'onboarding dans la base de données
    await db.update(
      'onboarding_backoffice',
      updateData,
      'user_id = ?',
      [userId],
      'remote'
    );

    // Récupérer les données mises à jour
    const query = 'SELECT * FROM onboarding_backoffice WHERE user_id = ?';
    const results = await db.select(query, [userId], 'remote');
    
    if (!results || results.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Onboarding complété avec succès',
      result: results[0] 
    });
  } catch (err) {
    console.error(`[completeOnboarding Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Route pour vérifier si le tutoriel a été complété
router.get('/hasSeenGuidedTour', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    
    // Récuperer l'ID de l'utilisateur à partir de son email
    const userQuery = 'SELECT id FROM users WHERE email = ?';
    const userResults = await db.select(userQuery, [email], 'remote');

    if (!userResults || userResults.length === 0) {
      console.log(`Aucun utilisateur trouvé avec l'email: ${email}`);
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const userId = userResults[0].id;
    // Construire la requête pour vérifier si le tutoriel est complété
    const query = 'SELECT tutorielDone FROM onboarding_backoffice WHERE user_id = ?';

    const results = await db.select(query, [userId], 'remote');
    
    if (!results || results.length === 0) {
      console.log(`Aucune entrée d'onboarding trouvée pour l'utilisateur: ${userId}`);
      return res.status(200).json({ result: { hasSeenTour: false } });
    }

    return res.status(200).json({ 
      result: { 
        hasSeenTour: results[0].tutorielDone === 1 
      } 
    });
  } catch (err) {
    console.error(`[hasSeenGuidedTour Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Route pour marquer le tutoriel comme vu
router.post('/markGuidedTourAsSeen', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    
    // Récuperer l'ID de l'utilisateur à partir de son email
    const userQuery = 'SELECT id FROM users WHERE email = ?';
    const userResults = await db.select(userQuery, [email], 'remote');
    
    if (!userResults || userResults.length === 0) {
      console.log(`Aucun utilisateur trouvé avec l'email: ${email}`);
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const userId = userResults[0].id;
    
    // Mettre à jour l'état du tutoriel dans la base de données
    await db.update(
      'onboarding_backoffice',
      { tutorielDone: 1 },
      'user_id = ?',
      [userId],
      'remote'
    );

    return res.status(200).json({ 
      success: true,
      message: 'Visite guidée marquée comme vue'
    });
  } catch (err) {
    console.error(`[markGuidedTourAsSeen Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Route pour réinitialiser l'état du tutoriel
router.post('/resetGuidedTour', authMiddleware, async (req, res) => {
  try {
    const email = req.user.email;
    
    // Récuperer l'ID de l'utilisateur à partir de son email
    const userQuery = 'SELECT id FROM users WHERE email = ?';
    const userResults = await db.select(userQuery, [email], 'remote');
    
    if (!userResults || userResults.length === 0) {
      console.log(`Aucun utilisateur trouvé avec l'email: ${email}`);
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const userId = userResults[0].id;
    
    // Réinitialiser l'état du tutoriel dans la base de données
    await db.update(
      'onboarding_backoffice',
      { tutorielDone: 0 },
      'user_id = ?',
      [userId],
      'remote'
    );

    return res.status(200).json({ 
      success: true,
      message: 'Visite guidée réinitialisée'
    });
  } catch (err) {
    console.error(`[resetGuidedTour Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
