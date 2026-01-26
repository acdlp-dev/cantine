const axios = require('axios'); // Utilisation d'axios pour les requêtes HTTP

/**
 * Récupère la dénomination légale d'une entreprise via l'API INSEE SIRENE
/**
 * Récupère la dénomination légale d'une entreprise via l'API INSEE SIRENE V3.11
 * @param {string} siren - Numéro SIREN de l'entreprise
 * @returns {Promise<string>} - Dénomination légale de l'entreprise
 */
async function getLegalName(siren) {
  try {
    const apiKey = process.env.SIRENE_API_KEY;
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error("Clé API INSEE invalide ou manquante dans les variables d'environnement.");
    }

    console.log(`\n ******Request API Sirene V3.11 ** ${new Date().toLocaleString()} ***** \n`);

    const url = `https://api.insee.fr/api-sirene/3.11/siren/${siren}`;
    const response = await axios.get(url, {
      headers: {
        'X-INSEE-Api-Key-Integration': apiKey,
        'Accept': 'application/json',
      },
    });

    const denomination = response.data.uniteLegale.periodesUniteLegale[0].denominationUniteLegale;
    console.log(`Dénomination légale récupérée: ${denomination}`);
    return denomination;
  } catch (error) {
    console.error('[Erreur lors de la récupération de la dénomination légale]:', error);
    throw error;
  }
}

module.exports = {
  getLegalName,
};
