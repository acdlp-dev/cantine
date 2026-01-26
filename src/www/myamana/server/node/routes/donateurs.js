const express = require('express');
const inseeService = require('../services/inseeService');
const router = express.Router();

// Définition de la route POST pour récupérer la dénomination légale via le numéro SIREN
router.get('/legalName/:siren', async (req, res) => {
  const siren = req.params.siren;

  if (!siren) {
    return res.status(400).json({ error: 'Le champ siren est requis' });
  }

  try {
    const legalName = await inseeService.getLegalName(siren);
    res.json({ legalName: legalName });
  } catch (error) {
    console.error('Erreur lors de la récupération de la dénomination légale:', error.message);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

module.exports = router;
