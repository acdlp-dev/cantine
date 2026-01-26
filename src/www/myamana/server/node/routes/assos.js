const express = require('express');
const db = require('../services/bdd');

const router = express.Router();

router.get('/assos/config/:asso', async (req, res) => {
    const asso = req.params.asso;
    console.log("Demande de liste de dons pour " + asso);

  try {
    const results = await db.select(
      'SELECT nom AS name_asso, surnom AS surname_asso, objet, site, ty_page AS ty_link, site_ponctuel_error AS error_link, logoUrl AS logo_url, codeCouleur AS code_couleur, adresse, adresseCheque, code_postal, code_postalCheque, ville, villeCheque, paypal_email, paypal_email_zakat, paypal_client_id, iban_general, iban_zakat, bic_general, bic_zakat, recu AS recu_asso, demande_adresse, demande_pro, email AS emailAsso FROM Assos WHERE uri = ? order by ajout desc', 
      [asso], 'remote'
    );
    if (results.length === 0) {
      return res.status(404).json({ message: 'Asso not found.' });
    }

    const campagnes = await db.select(
      `SELECT c.nom, a.statut, c.type, c.step1, c.prix, a.id_product
       FROM Assos_Campagnes a
       JOIN Campagnes c ON a.id_campagnes = c.id
       JOIN Assos asso ON a.id_assos = asso.id
       WHERE asso.uri = ?
       AND c.type <> 'challenge'
       AND a.statut IN ('actif', 'marketing')`,
      [asso], 'remote'
    );

    const response = {
      ...results[0],
      campagnes
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error(`[Dons Error]: ${err.message}`, err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

module.exports = router;
