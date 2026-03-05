const axios = require('axios');

/**
 * Recupere le nom d'une association via son numero RNA
 * en utilisant l'API OpenDataSoft (pas d'authentification requise)
 * @param {string} rna - Numero RNA (format: W + 9 chiffres)
 * @returns {Promise<{title: string, position: string}>}
 */
async function getAssociationInfo(rna) {
  try {
    console.log(`\n ******Request API RNA OpenDataSoft ** ${new Date().toLocaleString()} ***** \n`);

    const url = `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/ref-france-association-repertoire-national/records?where=id%3D%22${encodeURIComponent(rna)}%22&limit=1`;
    const response = await axios.get(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.data.results || response.data.results.length === 0) {
      throw new Error(`Aucune association trouvee pour le RNA ${rna}`);
    }

    const record = response.data.results[0];
    const title = record.title;
    const position = record.position; // "Active" ou "Dissoute"

    console.log(`Association trouvee: ${title} (Statut: ${position})`);
    return { title, position };
  } catch (error) {
    console.error('[Erreur lors de la recuperation des infos RNA]:', error.message);
    throw error;
  }
}

module.exports = {
  getAssociationInfo,
};
