const axios = require('axios');

/**
 * Script de test pour l'API de génération de reçu fiscal
 * 
 * ATTENTION: Ce script est destiné à être utilisé en développement uniquement.
 * Il ne gère pas l'authentification requise en production.
 * 
 * En production, toutes les routes nécessitent une authentification via le middleware authMiddleware.
 * Pour tester en production, vous devez être authentifié et envoyer le cookie auth_token avec vos requêtes.
 * 
 * Pour tester avec Postman, consultez le guide dans docs/postman-test-guide.md
 */

// URL de l'API
const API_URL = 'http://localhost:4242/api/generateRecuFiscal';

// Données de test
const testData = {
  asso: 'au-coeur-de-la-precarite', // Remplacer par l'identifiant d'une association existante
  prenom: 'Jean',
  nom: 'Dupont',
  adresse: '123 Rue de la Paix',
  raisonSociale: '', // Laisser vide pour un particulier
  siren: '', // Laisser vide pour un particulier
  ville: 'Paris',
  codePostal: '75001',
  montant: 100,
  date: '01/04/2025',
  moyen: 'Carte bancaire',
  // id_don: 12345 // Décommentez et remplacez par un ID valide pour mettre à jour un don existant
};

// En production, vous devriez inclure un token d'authentification
// const authToken = 'votre-token-jwt';
// const config = {
//   headers: {
//     'Authorization': `Bearer ${authToken}`
//   }
// };

// Fonction pour tester l'API de génération de reçu fiscal
async function testGenerateRecuFiscal() {
  try {
    console.log('Envoi de la requête à l\'API...');
    console.log('Données envoyées:', JSON.stringify(testData, null, 2));
    
    // En production, utilisez: const response = await axios.post(API_URL, testData, config);
    const response = await axios.post(API_URL, testData);
    
    console.log('\nRéponse de l\'API:');
    console.log('Status:', response.status);
    console.log('Données:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\nReçu fiscal généré avec succès!');
      console.log('Fichier:', response.data.filename);
      console.log('URL de téléchargement:', response.data.downloadUrl);
      
      // Tester la récupération du PDF
      console.log('\nTest de récupération du PDF...');
      console.log(`GET ${response.data.downloadUrl}`);
      console.log('Note: Cette requête nécessite également une authentification en production.');
    } else {
      console.error('\nErreur lors de la génération du reçu fiscal');
    }
  } catch (error) {
    console.error('\nErreur lors de l\'appel à l\'API:');
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'état
      // qui n'est pas dans la plage 2xx
      console.error('Status:', error.response.status);
      console.error('Données:', error.response.data);
      
      if (error.response.status === 401) {
        console.error('\nErreur d\'authentification: Vous devez être authentifié pour accéder à cette API.');
        console.error('En production, incluez un token JWT valide dans l\'en-tête Authorization.');
      }
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      console.error('Aucune réponse reçue du serveur');
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      console.error('Erreur:', error.message);
    }
  }
}

// Exécuter le test
testGenerateRecuFiscal();

/**
 * Pour exécuter ce script:
 * 1. Assurez-vous que le serveur Node.js est en cours d'exécution
 * 2. Exécutez la commande: node test-recu-fiscal.js
 * 
 * Note: En production, vous devez être authentifié pour utiliser ces API.
 * Ce script est destiné à être utilisé en développement uniquement.
 */
