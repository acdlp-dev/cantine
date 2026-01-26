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

router.get('/getDonsPonctuelBackoffice', authMiddleware, async (req, res) => {
  try {
    // Récupération de l'association depuis le token JWT
    const asso = req.user.uri;
    const { year, statut, search, limit = 10000 } = req.query;

    // Convertir la limite explicitement en nombre entier
    const limitNumber = parseInt(limit, 10) || 10000;

    // Construction de la requête SQL avec filtres, y compris le filtre sur l'association
    let query = 'SELECT * FROM Dons_Ponctuels WHERE asso = ?';
    const queryParams = [asso]; // Commencer avec le paramètre de l'association

    // Filtre par année
    if (year && year !== 'toutes') {
      query += ' AND YEAR(ajout) = ?';
      queryParams.push(year);
    }

    // Filtre par statut
    if (statut && statut !== 'tous') {
      query += ' AND statut = ?';
      queryParams.push(statut);
    }

    // Recherche globale dans les principaux champs
    if (search) {
      query += ' AND (email LIKE ? OR nom LIKE ? OR prenom LIKE ? OR amana LIKE ? OR email LIKE ? OR montant LIKE ? OR type LIKE ? OR moyen LIKE ?)';
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    // Comptage total des résultats (pour la pagination frontend)
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.select(countQuery, queryParams, 'remote');
    const total = countResult[0]?.total || 0;

    // Ajouter l'ordre et la limite
    query += ` ORDER BY ajout DESC LIMIT ${limitNumber}`;

    console.log("Requête SQL:", query);

    const results = await db.select(query, queryParams, 'remote');

    if (results.length === 0) {
      console.log("Aucun don trouvé");
      return res.status(200).json({ results: [], total: 0 });
    }

    console.log(`${results.length} dons trouvés sur un total de ${total}`);
    return res.status(200).json({ results, total });
  } catch (err) {
    console.error(`[Dons Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});



// Ajouter cette route à votre fichier backOffice.js

// Route pour obtenir les détails d'un don spécifique par son ID
router.get('/getDonsPonctuelBackoffice/detail/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const asso = req.user.uri;
    // Vérifier si l'ID est fourni
    if (!id) {
      return res.status(400).json({ message: 'ID du don non spécifié.' });
    }

    // Construire la requête pour obtenir les détails d'un don spécifique
    const query = 'SELECT * FROM Dons_Ponctuels WHERE id = ? and asso = ?';

    const results = await db.select(query, [id, asso], 'remote');

    if (!results || results.length === 0) {
      console.log(`Aucun don trouvé avec l'ID: ${id}`);
      return res.status(404).json({ message: 'Don non trouvé.' });
    }

    return res.status(200).json({ result: results[0] });
  } catch (err) {
    console.error(`[Don Detail Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Route pour obtenir les abonnements (table Personnes)
router.get('/getAbonnementsBackoffice', authMiddleware, async (req, res) => {
  try {
    // Récupération des paramètres de filtrage
    const { year, statut, search, limit = 10000 } = req.query;

    const asso = req.user.uri; // Récupération de l'association depuis le token JWT

    // Convertir la limite explicitement en nombre entier
    const limitNumber = parseInt(limit, 10) || 10000;

    // Construction de la requête SQL avec filtres
    let query = 'SELECT * FROM Personnes WHERE asso = ?';
    const queryParams = [asso];

    // Filtre par année
    if (year && year !== 'toutes') {
      query += ' AND YEAR(ajout) = ?';
      queryParams.push(year);
    }

    // Filtre par statut
    if (statut && statut !== 'tous') {
      query += ' AND statut = ?';
      queryParams.push(statut);
    }

    // Recherche globale dans les principaux champs
    if (search) {
      query += ' AND (email LIKE ? OR nom LIKE ? OR prenom LIKE ? OR occurence LIKE ? OR montant LIKE ? OR moyen LIKE ? OR statut LIKE ?)';
      const searchParam = `%${search}%`;
      queryParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    // Comptage total des résultats (pour la pagination frontend)
    const countQuery = query.replace('SELECT dernierPaiement, email, stripe_sub_id, nom, prenom, montant, occurence, moyen, statut, recu', 'SELECT COUNT(*) as total');
    const countResult = await db.select(countQuery, queryParams, 'remote');
    const total = countResult[0]?.total || 0;

    // Ajouter l'ordre et la limite
    query += ' ORDER BY dernierPaiement DESC LIMIT ' + limitNumber;

    console.log("Requête SQL abonnements:", query);

    const results = await db.select(query, queryParams, 'remote');

    if (results.length === 0) {
      console.log("Aucun abonnement trouvé");
      return res.status(200).json({ results: [], total: 0 });
    }

    console.log(`${results.length} abonnements trouvés sur un total de ${total}`);
    return res.status(200).json({ results, total });
  } catch (err) {
    console.error(`[Abonnements Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

// Route pour obtenir les détails d'un abonnement spécifique par son ID
router.get('/getAbonnementsBackoffice/detail/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const asso = req.user.uri; // Récupération de l'association depuis le token JWT
    // Vérifier si l'ID est fourni
    if (!id) {
      return res.status(400).json({ message: 'ID de l\'abonnement non spécifié.' });
    }

    // Construire la requête pour obtenir les détails d'un abonnement spécifique
    const query = 'SELECT * FROM Personnes WHERE stripe_sub_id = ? and asso = ?';

    const results = await db.select(query, [id, asso], 'remote');

    if (!results || results.length === 0) {
      console.log(`Aucun abonnement trouvé avec l'ID: ${id}`);
      return res.status(404).json({ message: 'Abonnement non trouvé.' });
    }

    console.log(`Abonnement trouvé avec l'ID: ${id}`);
    return res.status(200).json({ result: results[0] });
  } catch (err) {
    console.error(`[Abonnement Detail Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});


// Dans routes/backOffice.js
router.get('/getcampagnes', authMiddleware, async (req, res) => {
  try {
    const id_assos = req.user.id; // Récupération de l'association depuis le token JWT
    const query = `
        SELECT 
            c.id, 
            c.nom, 
            c.type AS campaign_type,
            a.objectif, 
            a.type AS asso_type, 
            a.statut
        FROM Campagnes c
        INNER JOIN Assos_Campagnes a ON c.id = a.id_campagnes
        WHERE a.id_assos = ?
        GROUP BY c.id, c.nom, c.type, a.objectif, a.type, a.statut
        ORDER BY c.id DESC;
      `;

    const results = await db.select(query, [id_assos], 'remote');

    const campaigns = results.map(row => ({
      id: row.id,
      nom: row.nom,
      type: row.campaign_type,
      objectif: row.objectif,
      asso_type: row.asso_type,
      statut: row.statut
    }));


    res.json({
      results: campaigns
    });
  } catch (err) {
    console.error('[Route getcampagnes] Erreur:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération des campagnes',
      error: err.message
    });
  }
});


// Route pour mettre à jour le statut d'une campagne (actif/inactif)
router.patch('/updateCampaignStatus/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut } = req.body;
    const id_assos = req.user.id; // Récupération de l'association depuis le token JWT

    if (!id) {
      return res.status(400).json({
        error: 'ID de la campagne non spécifié'
      });
    }

    if (!statut || (statut !== 'actif' && statut !== 'inactif')) {
      return res.status(400).json({
        error: 'Statut invalide. Les statuts autorisés sont "actif" et "inactif"'
      });
    }

    console.log(`Mise à jour du statut de la campagne ${id} en "${statut}"`);

    // Mise à jour du statut dans la table Assos_Campagnes avec la nouvelle structure
    await db.update(
      'Assos_Campagnes',
      { statut: statut },
      'id_campagnes = ? AND id_assos = ?',
      [id, id_assos],
      'remote'
    );

    // Requête pour récupérer les informations mises à jour de la campagne
    const selectQuery = `
      SELECT 
        c.id, 
        c.nom, 
        c.type AS campaign_type,
        a.objectif, 
        a.type AS asso_type, 
        a.statut
      FROM Campagnes c
      INNER JOIN Assos_Campagnes a ON c.id = a.id_campagnes
      WHERE c.id = ? AND a.id_assos = ?
    `;

    const results = await db.select(selectQuery, [id, id_assos], 'remote');

    if (!results || results.length === 0) {
      return res.status(404).json({
        error: 'Campagne non trouvée après la mise à jour'
      });
    }

    const updatedCampaign = {
      id: results[0].id,
      nom: results[0].nom,
      type: results[0].campaign_type,
      objectif: results[0].objectif,
      statut: results[0].statut
    };

    return res.json({
      message: `Statut de la campagne mis à jour avec succès en "${statut}"`,
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de la campagne:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la mise à jour du statut de la campagne'
    });
  }
});

// Route pour mettre à jour une campagne (nom et objectif)
router.patch('/updateCampaign/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { nom, objectif } = req.body;
    const id_assos = req.user.id; // Récupération de l'association depuis le token JWT

    if (!id) {
      return res.status(400).json({
        error: 'ID de la campagne non spécifié'
      });
    }

    // Vérification des données obligatoires
    if (!nom || !objectif) {
      return res.status(400).json({
        error: 'Nom et objectif sont obligatoires'
      });
    }

    console.log(`Mise à jour de la campagne ${id} - Nom: ${nom}, Objectif: ${objectif}`);

    await db.update(
      'Campagnes',
      { nom: nom },
      'id = ?',
      [id],
      'remote'
    );

    await db.update(
      'Assos_Campagnes',
      { objectif: objectif },
      'id_campagnes = ? AND id_assos = ?',
      [id, id_assos],
      'remote'
    );



    // Récupération des données mises à jour
    const selectQuery = `
      SELECT 
        c.id, 
        c.nom, 
        c.type AS campaign_type,
        a.objectif, 
        a.type AS asso_type, 
        a.statut
      FROM Campagnes c
      INNER JOIN Assos_Campagnes a ON c.id = a.id_campagnes
      WHERE c.id = ? AND a.id_assos = ?
    `;

    const results = await db.select(selectQuery, [id, id_assos], 'remote');

    if (!results || results.length === 0) {
      return res.status(404).json({
        error: 'Campagne non trouvée après la mise à jour'
      });
    }

    const updatedCampaign = {
      id: results[0].id,
      nom: results[0].nom,
      type: results[0].campaign_type,
      objectif: results[0].objectif,
      statut: results[0].statut
    };

    return res.json({
      message: 'Campagne mise à jour avec succès',
      campaign: updatedCampaign
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de la campagne:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la mise à jour de la campagne'
    });
  }
});

router.post('/createCampaign', authMiddleware, async (req, res) => {
  try {
    // Récupérer les données du corps de la requête (req.body) au lieu de req.query
    const { nom, type, objectif } = req.body;
    const id_assos = req.user.id; // Récupération de l'association depuis le token JWT
    // Vérifier que les données nécessaires sont présentes
    if (!nom || !type || !objectif) {
      return res.status(400).json({
        message: 'Données manquantes: nom, type et objectif sont requis',
        error: 'MISSING_DATA'
      });
    }

    console.log('Création de campagne avec les données:', { nom, type, objectif });

    // Insérer la campagne dans la table Campagnes
    await db.insert('Campagnes', {
      nom: nom,
      type: type,
    }, 'remote');

    // Récupérer l'ID de la campagne nouvellement créée
    const results = await db.select('SELECT id FROM Campagnes WHERE nom = ?', [nom], 'remote');

    if (!results || results.length === 0) {
      throw new Error('Impossible de récupérer l\'ID de la campagne créée');
    }

    // Insérer dans la table d'association
    await db.insert('Assos_Campagnes', {
      id_assos: id_assos,
      id_campagnes: results[0].id,
      objectif: objectif,
      type: type,
      statut: 'actif',
      debut: new Date()
    }, 'remote');

    // Retourner une réponse avec les données de la campagne créée
    return res.status(200).json({
      message: 'Campagne créée avec succès',
      campaign: {
        id: results[0].id,
        nom: nom,
        type: type,
        objectif: objectif,
        statut: 'actif'
      }
    });
  } catch (err) {
    console.error(`[createCampaign] Erreur: ${err.message}`, err);
    return res.status(500).json({
      message: 'Erreur lors de la création de la campagne',
      error: err.message
    });
  }
});
// Récupérer le montant total des dons du mois en cours
router.post('/getDonsByMonth', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.body;
    const asso = req.user.uri; // Récupération de l'association depuis le token JWT
    if (!month || !year) {
      return res.status(400).json({
        error: 'Les paramètres month et year sont requis'
      });
    }

    // Requête SQL pour obtenir la somme des montants des dons du mois en cours
    const query = `
        SELECT SUM(montant) as total 
        FROM Dons_Ponctuels 
        WHERE MONTH(ajout) = ? 
        AND YEAR(ajout) = ?
        AND asso = ?
      `;

    const results = await db.select(query, [month, year, asso], 'remote');

    // Si aucun résultat, retourner 0
    if (!results || results.length === 0 || results[0].total === null) {
      return res.json({ total: 0 });
    }

    return res.json({ total: results[0].total });

  } catch (error) {
    console.error('Erreur lors de la récupération des dons mensuels:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des dons mensuels' });
  }
});

// Route pour récupérer les dons d'une campagne spécifique
router.get('/getCampaignDonations/:id', authMiddleware, async (req, res) => {
  try {
    const { campaignName } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'ID de campagne non spécifié'
      });
    }

    const asso = req.user.uri; // Récupération de l'association depuis le token JWT

    // Requête SQL pour récupérer les dons de la campagne
    const query = `
      SELECT ajout, nom, prenom, email, montant, lien_recu, stripe_cus_id, nomArbre, tel
      FROM Dons_Ponctuels 
      WHERE amana = ?
      AND asso = ?
      ORDER BY dp.ajout DESC
    `;

    const donations = await db.select(query, [campaignName, asso], 'remote');

    return res.json({
      donations: donations || []
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des dons:', error);
    res.status(500).json({
      error: 'Erreur serveur lors de la récupération des dons'
    });
  }
});

// Route pour récupérer le montant total collecté pour une campagne spécifique par son nom
router.get('/getCampaignCollectedAmount/:name', authMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const asso = req.user.uri;
    if (!name) {
      return res.status(400).json({
        error: 'Nom de campagne non spécifié'
      });
    }


    // Requête SQL pour calculer la somme des dons pour cette campagne en utilisant le nom
    const query = `
      SELECT SUM(montant) as total_collecte
      FROM Dons_Ponctuels
      WHERE amana = ?
      AND asso = ?
    `;

    const results = await db.select(query, [name, asso], 'remote');

    let montantCollecte = 0;

    if (results && results.length > 0 && results[0].total_collecte !== null) {
      montantCollecte = results[0].total_collecte;
    }

    return res.json({
      name: name,
      montant_collecte: montantCollecte
    });

  } catch (error) {
    console.error('Erreur lors du calcul du montant collecté:', error);
    res.status(500).json({
      error: 'Erreur serveur lors du calcul du montant collecté'
    });
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
router.post('/createHl', authMiddleware, async (req, res) => {
  try {
    const assoUri = req.user.uri; // Récupération de l'association depuis le token JWT
    const logoUrl = req.user.logoUrl; // Récupération du logo de l'association depuis le token JWT

    const {
      asso = assoUri,
      tracking = 'Hors Ligne',
      nom,
      prenom,
      montant,
      adresse,
      code_postal,
      ville,
      pays,
      email,
      campagne,
      moyen,
      dateDon,
      siren = '',
      raison = '',
      tel = '',
    } = req.body;

    // Validation des champs obligatoires
    if (!nom || !prenom || !email || !montant || !adresse || !code_postal || !ville || !pays || !moyen || !campagne) {
      return res.status(400).json({
        message: 'Tous les champs marqués comme obligatoires doivent être remplis',
        erreurCode: 'true'
      });
    }

    // Construction de l'objet de données à insérer
    const donData = {
      asso,
      tracking,
      nom,
      prenom,
      montant,
      adresse,
      code_postal,
      ville,
      pays,
      email,
      source: 'Hors Ligne',
      amana: campagne,
      demande_recu: 'true',
      moyen,
      siren,
      raison,
      tel,
      lien_recu: '', // Initialement vide, sera mis à jour après génération du PDF
      ajout: dateDon ? new Date(dateDon) : new Date(),
      statut: 'actif'
    };

    // Insertion dans la base de données
    console.log('[createHl] Insertion d\'un nouveau don hors ligne:', donData);
    const insertResult = await db.insert('Dons_Ponctuels', donData, 'remote');
    const donId = insertResult.insertId;

    // Date actuelle pour le reçu fiscal
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('fr-FR');

    // Récupérer les informations de l'association
    const assoInfo = await pdfService.getAssoInfo(assoUri);

    // Préparer les données pour la génération du PDF avec toutes les informations nécessaires
    const dataRecu = {
      asso: assoUri.toLowerCase().replace(/ /g, '-'), // Convertir en format URI
      prenom: prenom || '',
      nom: nom || '',
      adresse: adresse || '',
      ville: ville || '',
      codePostal: code_postal || '',
      montant: montant,
      date: dateStr,
      moyen: moyen,
      id_don: donId,
      type: 'ponctuel',
      dateT: currentDate,
      // Informations de l'association
      nomAsso: assoInfo.nom,
      adresseAsso: assoInfo.adresse,
      cpAsso: assoInfo.code_postal,
      villeAsso: assoInfo.ville,
      typeAsso: assoInfo.type,
      signataire_prenom: assoInfo.signataire_prenom,
      signataire_nom: assoInfo.signataire_nom,
      signataire_role: assoInfo.signataire_role,
      signataire_signature: assoInfo.signataire_signature,
      logoUrl: assoInfo.logoUrl,
      // Informations entreprise si SIREN fourni
      raisonSociale: raison,
      siren: siren
    };

    // Génération du reçu fiscal
    const result = await pdfService.generateRecuFiscal(dataRecu);
    console.log('[createHl] Résultat de la génération du reçu fiscal:', result);
    const filename = result ? result.filename : null;

    // Mise à jour du don avec le lien du reçu fiscal
    if (filename) {
      await db.update(
        'Dons_Ponctuels',
        { lien_recu: filename },
        'id = ?',
        [donId],
        'remote'
      );
    }

    // Envoi de l'email de confirmation
    const nameAsso = req.user.nameAsso || asso; // Récupération du nom de l'association
    const templateId = 5165298; // ID du template Mailjet
    const baseUrl = process.env.URL_ORIGIN || 'https://myamana.fr';
    const fullUrl = `${baseUrl}/api/getRecuFiscal/${donId}`;
    const lien_recu = `Vous trouverez votre reçu fiscal en cliquant <a href="${fullUrl}">ici</a>.`;
    const variables = {
      prenom,
      montant,
      campagne,
      asso: nameAsso,
      lien_recu
    };

    await sendTemplateEmail(email, templateId, variables, "Confirmation de votre don hors ligne");

    // Envoyer la réponse
    return res.json({
      message: 'Don hors ligne enregistré avec succès',
      emailDonateur: email,
      erreurCode: 'false',
      id_don: donId
    });

  } catch (err) {
    console.error('[createHl] Erreur lors de l\'insertion du don hors ligne:', err);
    return res.status(500).json({
      message: 'Erreur lors de l\'enregistrement du don hors ligne',
      error: err.message,
      erreurCode: 'true'
    });
  }
});


// Route pour récupérer le montant total des dons par association
router.get('/getTotalDonAsso', authMiddleware, async (req, res) => {
  try {
    // const { asso } = req.query;
    const asso = req.user.uri; // Récupération de l'association depuis le token JWT
    // Requête SQL pour calculer la somme totale des dons pour l'association spécifiée
    const query = `
      SELECT SUM(montant) as total_dons
      FROM Dons_Ponctuels
      WHERE asso = ?
    `;


    const results = await db.select(query, [asso], 'remote');

    // Si aucun résultat ou total null, retourner 0
    let totalDons = 0;
    if (results && results.length > 0 && results[0].total_dons !== null) {
      totalDons = results[0].total_dons;
    }

    return res.status(200).json({
      success: true,
      asso: asso,
      totalDons: totalDons
    });

  } catch (err) {
    console.error(`[getTotalDonsByAsso] Erreur: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du total des dons',
      error: err.message
    });
  }
});



// Route pour récupérer le nombre d'abonnment de l'association
router.get('/getNombreDonateurs', authMiddleware, async (req, res) => {
  try {
    const asso = req.user.uri; // Récupération de l'association depuis le token JWT
    const query = `
      SELECT COUNT(*) as totalNombreDonateurs
      FROM Personnes
      WHERE (statut = 'actif' OR statut = 'pending')
      AND asso = ?
    `;

    const results = await db.select(query, [asso], 'remote');

    if (results && results.length > 0) {
      return res.status(200).json({
        success: true,
        totalNombreDonateurs: results[0].totalNombreDonateurs
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Aucun donateur trouvé'
      });
    }
  } catch (err) {
    console.error(`[getNombreDonateurs] Erreur: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du nombre de donateurs',
      error: err.message
    });
  }
}
);

// Route pour récupérer le nombre de nouveaux abonnement ce mois
router.get('/getNouveauxAbonnements', authMiddleware, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() retourne 0-11
    const asso = req.user.uri; // Récupération de l'association depuis le token JWT
    const query = `
      SELECT COUNT(*) as nouveauxDonateursMonthly
      FROM Personnes
      WHERE YEAR(ajout) = ?
      AND MONTH(ajout) = ?
      AND (statut = 'actif' OR statut = 'pending')
      AND asso = ?
    `;

    const results = await db.select(query, [currentYear, currentMonth, asso], 'remote');

    if (results && results.length > 0) {
      return res.status(200).json({
        success: true,
        nouveauxDonateursMonthly: results[0].nouveauxDonateursMonthly
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Aucun nouvel abonnement trouvé'
      });
    }
  } catch (err) {
    console.error(`[getNouveauxAbonnements] Erreur: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du nombre de nouveaux abonnements',
      error: err.message
    });
  }
});

// Route pour récupérer les derniers abonnements
router.get('/getDerniersAbonnements', authMiddleware, async (req, res) => {
  try {
    const asso = req.user.uri; // Récupération de l'association depuis le token JWT
    const query = `
      SELECT prenom, nom, ajout, montant, occurence
      FROM Personnes
      WHERE statut = 'actif'
      AND asso = ?
      ORDER BY ajout DESC
      LIMIT 5
    `;

    const results = await db.select(query, [asso], 'remote');

    return res.status(200).json({
      success: true,
      abonnements: results
    });

  } catch (err) {
    console.error(`[getDerniersAbonnements] Erreur: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des derniers abonnements',
      error: err.message
    });
  }
});


// Route pour obtenir l'évolution des dons sur une période donnée
router.get('/getEvolutionDons', authMiddleware, async (req, res) => {
  try {
    const { periode = '30j' } = req.query;
    let dateDebut;
    const dateFin = new Date();
    const asso = req.user.uri; // Récupération de l'association depuis le token JWT
    // Déterminer la période
    if (periode === '7j') {
      dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - 7);
    } else if (periode === '30j') {
      dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - 30);
    } else if (periode === 'annee') {
      dateDebut = new Date();
      dateDebut.setFullYear(dateDebut.getFullYear() - 1);
    } else {
      // Par défaut, 30 jours
      dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - 30);
    }

    let query;
    let groupBy;

    if (periode === '7j' || periode === '30j') {
      // Grouper par jour pour les périodes courtes
      query = `
        SELECT 
          DATE(ajout) as date, 
          SUM(montant) as total
        FROM Dons_Ponctuels
        WHERE ajout BETWEEN ? AND ?
        AND asso = ?
        AND statut = 'actif'
        GROUP BY DATE(ajout)
        ORDER BY DATE(ajout) ASC
      `;
      groupBy = 'jour';
    } else {
      // Grouper par mois pour la période annuelle
      query = `
        SELECT 
          CONCAT(YEAR(ajout), '-', MONTH(ajout)) as date, 
          SUM(montant) as total
        FROM Dons_Ponctuels
        WHERE ajout BETWEEN ? AND ?
        AND asso = ?
        AND statut = 'actif'
        GROUP BY YEAR(ajout), MONTH(ajout)
        ORDER BY YEAR(ajout) ASC, MONTH(ajout) ASC
      `;
      groupBy = 'mois';
    }

    const results = await db.select(query, [dateDebut, dateFin, asso], 'remote');

    return res.status(200).json({
      success: true,
      periode: periode,
      groupBy: groupBy,
      donnees: results
    });

  } catch (err) {
    console.error(`[getEvolutionDons] Erreur: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des données d\'évolution des dons',
      error: err.message
    });
  }
});




/**
 * Récupère les statistiques des reçus fiscaux

*/
router.post('/getRecusStats', authMiddleware, async (req, res) => {
  try {

    const asso = req.user.uri;

    // Récupération de l'année dernière pour les statistiques
    const lastYear = new Date().getFullYear() - 1;

    // Requête SQL pour obtenir le nombre total de reçus et leur montant
    const totalQuery = `
      SELECT 
        COUNT(*) as totalCount,
        SUM(montant) as totalAmount
      FROM 
        (
          SELECT montant FROM Dons_Ponctuels 
          WHERE lien_recu LIKE '%pdf%' 
          AND asso = ?
          
          UNION ALL
          
          SELECT cumul_2023 as montant FROM Personnes 
          WHERE recu_2023 LIKE '%pdf%' 
          AND cumul_2023 > 0
          AND asso = ?
          
          UNION ALL
          
          SELECT cumul_2024 as montant FROM Personnes 
          WHERE recu_2024 LIKE '%pdf%' 
          AND cumul_2024 > 0
          AND asso = ?
        ) as all_recus
    `;

    // Requête SQL pour obtenir les reçus de l'année dernière
    const lastYearQuery = `
      SELECT 
        COUNT(*) as lastYearCount,
        SUM(montant) as lastYearAmount
      FROM 
        (
          SELECT montant, ajout FROM Dons_Ponctuels 
          WHERE lien_recu LIKE '%pdf%' 
          AND YEAR(ajout) = ?
          AND asso = ?
          
          UNION ALL
          
          SELECT cumul_2023 as montant, '2023-12-31' as ajout FROM Personnes 
          WHERE recu_2023 LIKE '%pdf%' 
          AND cumul_2023 > 0
          AND '2023' = ?
          AND asso = ?
          
          UNION ALL
          
          SELECT cumul_2024 as montant, '2024-12-31' as ajout FROM Personnes 
          WHERE recu_2024 LIKE '%pdf%' 
          AND cumul_2024 > 0
          AND '2024' = ?
          AND asso = ?
        ) as year_recus
      WHERE 
        YEAR(ajout) = ?
    `;

    // Requête SQL pour obtenir les statistiques par année
    const yearlyQuery = `
      SELECT 
        year, 
        SUM(count) as count, 
        SUM(amount) as amount 
      FROM (
        SELECT 
          YEAR(ajout) as year, 
          COUNT(*) as count, 
          SUM(montant) as amount 
        FROM 
          Dons_Ponctuels 
        WHERE 
          lien_recu LIKE '%pdf%' 
          AND asso = ?
        GROUP BY 
          YEAR(ajout)
          
        UNION ALL
          
        SELECT 
          '2023' as year, 
          COUNT(*) as count, 
          SUM(cumul_2023) as amount 
        FROM 
          Personnes 
        WHERE 
          recu_2023 LIKE '%pdf%' 
          AND cumul_2023 > 0
          AND asso = ?
          
        UNION ALL
          
        SELECT 
          '2024' as year, 
          COUNT(*) as count, 
          SUM(cumul_2024) as amount 
        FROM 
          Personnes 
        WHERE 
          recu_2024 LIKE '%pdf%' 
          AND cumul_2024 > 0
          AND asso = ?
      ) as yearly_stats
      GROUP BY 
        year
      ORDER BY 
        year DESC
    `;

    // Exécution des requêtes SQL avec l'association en paramètre
    const [totalStats] = await db.select(totalQuery, [asso, asso, asso], 'remote');
    const [lastYearStats] = await db.select(lastYearQuery, [lastYear, asso, lastYear, asso, lastYear, asso, lastYear], 'remote');
    const yearlyStats = await db.select(yearlyQuery, [asso, asso, asso], 'remote');

    // Constitution de l'objet de statistiques
    const stats = {
      totalCount: totalStats.totalCount || 0,
      totalAmount: totalStats.totalAmount || 0,
      lastYearCount: lastYearStats.lastYearCount || 0,
      lastYearAmount: lastYearStats.lastYearAmount || 0,
      // ponctuelCount: typeStats.ponctuelCount || 0,
      // ponctuelAmount: typeStats.ponctuelAmount || 0,
      // mensuelCount: typeStats.mensuelCount || 0,
      // mensuelAmount: typeStats.mensuelAmount || 0,
      yearlyStats: yearlyStats
    };

    return res.json({
      stats: stats,
      success: true
    });
  } catch (err) {
    console.error('[Recus Stats Error]:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des statistiques.' });
  }
});


/**
 * Récupère la liste des reçus fiscaux avec filtres et pagination
 */
router.post('/getRecusList', authMiddleware, async (req, res) => {
  try {

    const { email } = req.body;
    const asso = req.user.uri; // Récupération de l'association depuis le token JWT
    const sql = `
        SELECT
          id,
          sum(cumul_2024) as amount,
          ajout as date,
          occurence as donType,
          recu_2024 AS pdfLink
        FROM
        Personnes
        WHERE 
        recu_2024 IS NOT NULL AND recu_2024 <> '' and cumul_2024 <> '0'
        and cumul_2024 <> '0' and cumul_2024 <> '' and cumul_2024 is not null
        and asso = ?
        AND email = ?
    
        UNION ALL
    
        SELECT 
          id,
          sum(cumul_2023) as amount,
          ajout as date,
          occurence as donType,
          recu_2023 AS pdfLink
        FROM
        Personnes
        WHERE 
        recu_2023 IS NOT NULL AND recu_2023 <> '' 
        and cumul_2023 <> '0' and cumul_2023 <> '' and cumul_2023 is not null
        and asso = ?
        AND email = ?

        UNION ALL
        SELECT 
          id,
          montant as amount,
          ajout as date,
          type as donType,
          lien_recu AS pdfLink
        FROM
        Dons_Ponctuels
        WHERE 
        lien_recu IS NOT NULL AND lien_recu <> '' 
        and asso = ?
        AND email = ?
        ORDER BY date DESC;

        `;

    // Exécution de la requête
    const results = await db.select(sql, [email, email, email], 'remote');

    if (results.length === 0) {
      return res.status(404).json({
        message: 'Aucun reçu fiscal trouvé.',
        data: [],
        total: 0
      });
    }

    // Retourner les résultats
    return res.status(200).json({
      data: results,
      total: results.length,
    });
  } catch (err) {
    console.error('[Recus List Error]:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des reçus fiscaux.' });
  }
});


/**
 * Récupère les informations d'une association
 * Utilisé pour le backoffice
 */
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
