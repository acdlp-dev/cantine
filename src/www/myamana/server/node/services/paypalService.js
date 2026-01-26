const db = require('./bdd'); // Service de connexion MySQL

/**
 * Récupère les informations d'identification PayPal à partir de la base de données
 * @param {string} identifier - Identifiant ou paramètre utilisé pour récupérer les informations.
 * @returns {Promise<Object>} - Objet contenant les informations d'identification PayPal.
 */
async function getPaypalCredentials(identifier) {
  try {
    const query = 'SELECT paypal_email FROM Assos WHERE uri = ?';
    const results = await db.select(query, [identifier], 'remote');
    if (results.length === 0) {
      throw new Error(`Aucune information PayPal trouvée pour l'identifiant : ${identifier}`);
    }
    const paypalEmail = results[0].paypal_email;
    if (!paypalEmail || typeof paypalEmail !== 'string') {
      throw new Error("Email PayPal invalide ou manquant.");
    }
    
    return {
      paypalEmail
    };
  } catch (error) {
    console.error('[Erreur lors de la récupération des informations PayPal]:', error);
    throw error;
  }
}

module.exports = {
  getPaypalCredentials,
};
