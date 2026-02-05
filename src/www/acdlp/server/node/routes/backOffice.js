const express = require('express');
// Middleware d'authentification commenté comme vous le souhaitez
const { authMiddleware } = require('./auth');
const db = require('../services/bdd');
const { sendTemplateEmail } = require('../services/mailService');
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

      updatePayload = {
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
        signataire_prenom: formData.fiscal_receipt_first_name,
        signataire_nom: formData.fiscal_receipt_last_name,
        signataire_role: formData.fiscal_receipt_status,
        benevoles_resp_email: formData.benevoles_resp_email
      };
    }

    // Sanitize: remove undefined to avoid MySQL bind errors; keep nulls if explicitly intended
    const sanitizedPayload = Object.keys(updatePayload).reduce((acc, key) => {
      const value = updatePayload[key];
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {});

    // Perform update
    await db.update(
      'Assos',
      sanitizedPayload,
      'siren = ?',
      [siren],
      'remote'
    );

    return res.status(200).json({
      message: `Informations de l'association mises à jour avec succès (${source}).`,
      success: true
    });

  }
  catch (err) {
    console.error('[Info Asso Error]:', err);
    return res.status(500).json({ message: 'Erreur lors de la l\'update des infos de l\'asso' });
  }
});

module.exports = router;
