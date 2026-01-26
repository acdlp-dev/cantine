const express = require('express');
const { authMiddleware } = require('./auth'); // Import du middleware
const db = require('../services/bdd');
const pdfService = require('../services/pdfService');
const path = require('path');
const fs = require('fs');

const router = express.Router();

router.post('/recusPonctuels', authMiddleware, async (req, res) => {
  const { email } = req.body;
  console.log("Demande de liste de recus pour " + email);

  try {
    const results = await db.select('SELECT * FROM Dons_Ponctuels WHERE email = ? and length(lien_recu) > 1 order by ajout desc', [email], 'remote');
    if (results.length === 0) {
      return res.status(404).json({ message: 'Email not found.' });
    }
    return res.status(200).json({ results });
  } catch (err) {
    console.error(`[Dons Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

router.post('/recusMensuels', authMiddleware, async (req, res) => {
  const { email } = req.body;
  console.log("Demande de liste de recus pour " + email);

  try {
    const sql = `
    SELECT
      asso,
      '2024' as 'year',
      recu_2024 AS recu,
      sum(cumul_2024) as montant
    FROM
    Personnes
    WHERE 
    recu_2024 IS NOT NULL AND recu_2024 <> '' and cumul_2024 <> '0'
    and cumul_2024 <> '0' and cumul_2024 <> '' and cumul_2024 is not null
    and email = ?
    group by asso

    UNION ALL

    SELECT 
      asso,
      '2023' as 'year',
      recu_2023 AS recu,
      sum(cumul_2023) as montant
    FROM
    Personnes
    WHERE 
    recu_2023 IS NOT NULL AND recu_2023 <> '' 
    and cumul_2023 <> '0' and cumul_2023 <> '' and cumul_2023 is not null
    and email = ?
    group by asso;
    `;
    const results = await db.select(sql, [email, email], 'remote');

    if (results.length === 0) {
      return res.status(404).json({ message: 'Email not found.' });
    }
    return res.status(200).json({ results });
  } catch (err) {
    console.error(`[Dons Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

/**
 * Route pour générer un reçu fiscal en PDF
 * @route POST /generateRecuFiscal
 * @param {string} asso - Identifiant de l'association
 * @param {string} prenom - Prénom du donateur
 * @param {string} nom - Nom du donateur
 * @param {string} adresse - Adresse du donateur
 * @param {string} raisonSociale - Raison sociale (pour les entreprises)
 * @param {string} siren - Numéro SIREN (pour les entreprises)
 * @param {string} ville - Ville du donateur
 * @param {string} codePostal - Code postal du donateur
 * @param {number} montant - Montant du don
 * @param {string} date - Date du don
 * @param {string} moyen - Moyen de paiement
 * @returns {Object} Informations sur le reçu fiscal généré
 */
router.post('/generateRecuFiscal', authMiddleware, async (req, res) => {
  try {
    const {
      asso,
      prenom,
      nom,
      adresse,
      raisonSociale,
      siren,
      ville,
      codePostal,
      montant,
      date,
      dateT,
      moyen,
      id_don, // Nouveau paramètre pour l'ID du don
      type // Ajout du paramètre type pour le chemin du répertoire
    } = req.body;

    console.log(`Demande de génération de reçu fiscal pour ${prenom} ${nom} (${asso})`);

    // Vérifier que tous les champs obligatoires sont présents
    if (!asso || !prenom || !nom || !adresse || !ville || !codePostal || !montant || !date || !moyen || !type) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être renseignés'
      });
    }

    console.log(`Demande de génération de reçu fiscal pour ${prenom} ${nom} (${asso})`);

    // Récupérer les informations de l'association
    const assoInfo = await pdfService.getAssoInfo(asso);

    // Préparer les données pour la génération du PDF
    const pdfData = {
      asso,
      prenom,
      nom,
      adresse,
      raisonSociale,
      siren,
      ville,
      codePostal,
      montant,
      date,
      dateT,
      moyen,
      type, // Ajout du type pour le chemin du répertoire
      nomAsso: assoInfo.nom,
      adresseAsso: assoInfo.adresse,
      cpAsso: assoInfo.code_postal,
      villeAsso: assoInfo.ville,
      typeAsso: assoInfo.type,
      signataire_prenom: assoInfo.signataire_prenom,
      signataire_nom: assoInfo.signataire_nom,
      signataire_role: assoInfo.signataire_role,
      signataire_signature: assoInfo.signataire_signature,
      logoUrl: assoInfo.logoUrl
    };

    console.log(`Appel de la fonction pdfService.generateRecuFiscal pour ${prenom} ${nom} (${asso})`);

    // Générer le PDF
    const result = await pdfService.generateRecuFiscal(pdfData);

    // Enregistrer le lien du reçu dans la base de données si nécessaire
    // (Cette partie peut être adaptée selon les besoins)

    try {
      if (id_don) {
        // Construire l'URL complète pour le reçu fiscal basée sur l'ID du don
        const baseUrl = process.env.URL_ORIGIN || 'https://myamana.fr';
        const fullUrl = `${baseUrl}/api/getRecuFiscal/${id_don}`;

        // Mettre à jour la colonne lien_recu de la table Dons_Ponctuels avec le nom du fichier PDF
        const updateResult = await db.update(
          'Dons_Ponctuels',
          { lien_recu: result.filename },
          'id = ?',
          [id_don],
          'remote'
        );

        console.log(`Reçu fiscal associé au don ${id_don}: ${fullUrl}`);
      } else {
        // Insérer dans la table Recus_Fiscaux comme avant
        const insertResult = await db.insert('Dons_Ponctuels', {
          email: req.user.email, // Email de l'utilisateur authentifié
          asso: asso,
          prenom: prenom,
          nom: nom,
          montant: montant,
          lien_recu: result.filename,
        }, 'remote');

        console.log(`Reçu fiscal enregistré dans la base de données: ${result.filename}`);
      }
    } catch (dbErr) {
      console.error(`Erreur lors de l'enregistrement du reçu fiscal dans la base de données: ${dbErr.message}`, dbErr);
      // On continue même si l'enregistrement en base échoue
    }

    // Construire l'URL de téléchargement basée sur l'ID du don
    const downloadUrl = `/api/getRecuFiscal/${id_don || insertResult.insertId}`;

    // Retourner le résultat
    return res.status(200).json({
      success: true,
      message: 'Reçu fiscal généré avec succès',
      filename: result.filename,
      downloadUrl: downloadUrl
    });
  } catch (err) {
    console.error(`[Reçu Fiscal Error]: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération du reçu fiscal',
      error: err.message
    });
  }
});

/**
 * Route pour récupérer un reçu fiscal en PDF
 * @route GET /getRecuFiscal/:id_don
 * @param {string} id_don - ID du don pour lequel récupérer le reçu fiscal
 * @returns {File} Le fichier PDF demandé
 */
router.get('/getRecuFiscal/:id_don', authMiddleware, async (req, res) => {
  try {
    const { id_don } = req.params;
    const { email, role } = req.user;

    console.log(`Demande de récupération du reçu fiscal pour le don ${id_don} par ${email} (role: ${role})`);

    let results;

    // Les admins peuvent accéder à tous les reçus fiscaux
    if (role === 'admin') {
      console.log(`[ADMIN ACCESS] ${email} accède au reçu fiscal du don ${id_don}`);
      
      // Récupérer le don sans vérifier l'email
      results = await db.select(
        'SELECT * FROM Dons_Ponctuels WHERE id = ?',
        [id_don],
        'remote'
      );

      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Don non trouvé'
        });
      }
    } else {
      // Pour les utilisateurs normaux, vérifier que l'email correspond
      results = await db.select(
        'SELECT * FROM Dons_Ponctuels WHERE id = ? AND email = ?',
        [id_don, email],
        'remote'
      );

      if (results.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à accéder à ce reçu fiscal'
        });
      }
    }

    // Récupérer les informations sur le reçu fiscal
    const recuInfo = results[0];
    const asso = recuInfo.asso;
    const type = recuInfo.type;

    
    // Extraire le nom du fichier à partir du lien_recu
    const filename = recuInfo.lien_recu.split('/').pop();
    
    if (!filename) {
      return res.status(404).json({
        success: false,
        message: 'Aucun reçu fiscal n\'est disponible pour ce don'
      });
    }

    // Construire le chemin du fichier
    const filePath = path.join(__dirname, '../pdf/recuFiscal/',asso,'/',type,'/', filename);
    console.log(`Lancement du téléchargement cible ${filePath}`);

    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `Le reçu fiscal demandé ${filePath} n'existe pas`
      });
    }

    // Envoyer le fichier
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Utiliser un stream pour envoyer le fichier
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error(`[Reçu Fiscal Error]: ${err.message}`, err);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du reçu fiscal',
      error: err.message
    });
  }
});

module.exports = router;
