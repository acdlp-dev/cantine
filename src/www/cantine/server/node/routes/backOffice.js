const express = require('express');
// Middleware d'authentification commenté comme vous le souhaitez
const { authMiddleware } = require('./auth');
const db = require('../services/bdd');
const { sendTemplateEmail } = require('../services/mailService');
const logger = require('../config/logger');

// Service pour l'API RNA
const rnaService = require('../services/rnaService');

const router = express.Router();

// Vérifie que les informations minimales de l'association sont complètes
// Utilisé côté cantine pour bloquer l'accès tant que les champs requis ne sont pas remplis
router.get('/canteInfosCompleted', authMiddleware, async (req, res) => {
  try {
    const rna = req.user.rna || req.user.siren; // Fallback temporaire pour anciens JWT
    if (!rna) {
      return res.status(400).json({ isComplete: false, missingFields: ['RNA manquant'], message: "Identifiant d'association manquant" });
    }

    // Récupérer les champs requis depuis la table asso_users
    const rows = await db.select(
      'SELECT nom, adresse, code_postal, ville, email, tel FROM asso_users WHERE rna = ? LIMIT 1',
      [rna],
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


// Route pour récupérer les infos de l'association
router.get('/getInfosAsso', authMiddleware, async (req, res) => {
  try {
    const rna = req.user.rna || req.user.siren; // Fallback temporaire pour anciens JWT
    if (!rna) {
      return res.status(400).json({ message: 'RNA manquant.' });
    }

    // Requête SQL pour récupérer les informations de l'association (cantine = sous-ensemble minimal)
    const sql = `
      SELECT rna, nom, adresse, code_postal, ville, tel, email
      FROM asso_users
      WHERE rna = ?
      LIMIT 1
    `;

    const results = await db.select(sql, [rna], 'remote');

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
    const rna = req.user?.rna || formData.rna;
    if (!rna) {
      return res.status(400).json({ message: 'RNA manquant.' });
    }

    const updatePayload = {
      nom: formData.association_name ?? null,
      adresse: formData.address ?? null,
      ville: formData.city ?? null,
      code_postal: formData.postal_code ?? null,
      tel: formData.phone ?? null,
      email: formData.email ?? null
    };

    // Sanitize: remove undefined to avoid MySQL bind errors; keep nulls if explicitly intended
    const sanitizedPayload = Object.keys(updatePayload).reduce((acc, key) => {
      const value = updatePayload[key];
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {});

    await db.update(
      'asso_users',
      sanitizedPayload,
      'rna = ?',
      [rna],
      'remote'
    );

    return res.status(200).json({
      message: 'Informations de l\'association mises à jour avec succès.',
      success: true
    });

  }
  catch (err) {
    console.error('[Info Asso Error]:', err);
    return res.status(500).json({ message: 'Erreur lors de la l\'update des infos de l\'asso' });
  }
});

module.exports = router;
