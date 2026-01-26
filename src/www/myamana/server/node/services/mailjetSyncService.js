/**
 * Service de synchronisation des donateurs ACDLP vers Mailjet
 * 
 * Ce service gère la synchronisation quotidienne des donateurs
 * de l'association "Au Coeur de la Précarité" vers Mailjet.
 */

const MAILJET_LIST_ID = 2426772; // Liste "Base Complète" ACDLP
const MAILJET_API_URL = 'https://api.mailjet.com/v3/REST';

/**
 * Récupère les credentials Mailjet
 * @returns {string} Basic auth header
 */
const getMailjetAuth = () => {
  const apiKey = process.env.MJ_APIKEY_PUBLIC;
  const apiSecret = process.env.MJ_APIKEY_PRIVATE;
  
  if (!apiKey || !apiSecret) {
    throw new Error('Variables MJ_APIKEY_PUBLIC et MJ_APIKEY_PRIVATE requises');
  }
  
  const encoded = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  return `Basic ${encoded}`;
};

/**
 * Mapping des types d'amana vers les propriétés Mailjet
 */
const AMANA_MAPPING = {
  'Fidya': 'fidya',
  'maal': 'maal',
  'Zakat El Maal': 'maal',
  'fitr': 'fitr',
  'Zakat El Fitr': 'fitr',
  'Aid El Adha': 'adha',
  'Adha': 'adha',
  'Fonds Spécifiques': 'drive',
  'Kaffara': 'kaffara',
  'Fonds Généraux': 'generaux',
};

/**
 * Mapping des types de don vers les propriétés Mailjet
 */
const TYPE_MAPPING = {
  'Ponctuel': 'ponctuel',
  'ponctuel': 'ponctuel',
  'mensuel': 'mensuel',
  'Mensuel': 'mensuel',
  'quotidien': 'quotidien',
  'Quotidien': 'quotidien',
};

/**
 * Récupère le nom de propriété Mailjet pour une amana
 * @param {string} amana - Type d'amana
 * @returns {string} Nom de la propriété Mailjet
 */
const getAmanaProperty = (amana) => {
  return AMANA_MAPPING[amana] || 'generaux';
};

/**
 * Récupère le nom de propriété Mailjet pour un type de don
 * @param {string} type - Type de don
 * @returns {string} Nom de la propriété Mailjet
 */
const getTypeProperty = (type) => {
  return TYPE_MAPPING[type] || 'ponctuel';
};

/**
 * Formate une date pour Mailjet
 * Mailjet attend un format datetime ISO 8601 complet
 * @param {Date|string} date 
 * @returns {string} Date formatée ISO 8601 (ex: 2025-12-13T12:00:00Z)
 */
const formatDateForMailjet = (date) => {
  const d = new Date(date);
  return d.toISOString();
};

/**
 * Crée un contact dans Mailjet
 * @param {string} email 
 * @param {string} prenom 
 * @returns {Promise<{success: boolean, exists: boolean, error?: string}>}
 */
const createContact = async (email, prenom) => {
  const auth = getMailjetAuth();
  
  try {
    const response = await fetch(`${MAILJET_API_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify({
        Email: email,
        Name: prenom || email.split('@')[0]
      })
    });

    if (response.ok) {
      return { success: true, exists: false };
    } else if (response.status === 400) {
      // Contact existe déjà - c'est OK
      return { success: true, exists: true };
    } else {
      const errorData = await response.text();
      return { success: false, exists: false, error: errorData };
    }
  } catch (error) {
    return { success: false, exists: false, error: error.message };
  }
};

/**
 * Met à jour les propriétés d'un contact
 * @param {string} email 
 * @param {Array<{Name: string, Value: string}>} properties 
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const updateContactProperties = async (email, properties) => {
  const auth = getMailjetAuth();
  
  try {
    const response = await fetch(`${MAILJET_API_URL}/contactdata/${encodeURIComponent(email)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify({ Data: properties })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.text();
      return { success: false, error: errorData };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Ajoute un contact à la liste ACDLP
 * @param {string} email 
 * @returns {Promise<{success: boolean, alreadyInList: boolean, error?: string}>}
 */
const addContactToList = async (email) => {
  const auth = getMailjetAuth();
  
  try {
    const response = await fetch(`${MAILJET_API_URL}/listrecipient`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify({
        ContactAlt: email,
        ListID: MAILJET_LIST_ID
      })
    });

    if (response.ok) {
      return { success: true, alreadyInList: false };
    } else if (response.status === 400) {
      // Déjà dans la liste - c'est OK
      return { success: true, alreadyInList: true };
    } else {
      const errorData = await response.text();
      return { success: false, alreadyInList: false, error: errorData };
    }
  } catch (error) {
    return { success: false, alreadyInList: false, error: error.message };
  }
};

/**
 * Synchronise un donateur vers Mailjet
 * @param {object} donateur - Données du donateur
 * @param {string} donateur.email
 * @param {string} donateur.prenom
 * @param {string} donateur.amana
 * @param {string} donateur.type
 * @param {string} donateur.moyen
 * @param {string} donateur.source
 * @param {string} donateur.subId
 * @param {string} donateur.cusId
 * @param {Date|string} donateur.ajout
 * @returns {Promise<{success: boolean, action: string, error?: string}>}
 */
const syncDonateur = async (donateur) => {
  const { email, prenom, amana, type, moyen, source, subId, cusId, ajout } = donateur;

  if (!email) {
    return { success: false, action: 'skip', error: 'Email manquant' };
  }

  const dateFormatted = formatDateForMailjet(ajout);

  // 1. Créer le contact
  const createResult = await createContact(email, prenom);
  if (!createResult.success) {
    return { success: false, action: 'create_failed', error: createResult.error };
  }

  // 2. Préparer les propriétés
  const properties = [];

  // Propriété amana (fidya, maal, fitr, etc.) = date du don
  const amanaProp = getAmanaProperty(amana);
  properties.push({ Name: amanaProp, Value: dateFormatted });

  // Propriété type (ponctuel, mensuel, quotidien) = date du don
  const typeProp = getTypeProperty(type);
  properties.push({ Name: typeProp, Value: dateFormatted });

  // Autres propriétés
  if (moyen) properties.push({ Name: 'moyen', Value: moyen });
  if (source) properties.push({ Name: 'source', Value: source });
  if (subId) properties.push({ Name: 'subid_mensuel', Value: subId });
  if (cusId) properties.push({ Name: 'cusId', Value: cusId });

  // 3. Mettre à jour les propriétés
  const updateResult = await updateContactProperties(email, properties);
  if (!updateResult.success) {
    return { success: false, action: 'update_failed', error: updateResult.error };
  }

  // 4. Ajouter à la liste
  const listResult = await addContactToList(email);
  if (!listResult.success) {
    return { success: false, action: 'list_failed', error: listResult.error };
  }

  // Déterminer l'action effectuée
  const action = createResult.exists ? 'updated' : 'created';
  return { success: true, action };
};

/**
 * Synchronise une liste de donateurs
 * @param {Array} donateurs - Liste des donateurs à synchroniser
 * @returns {Promise<{total: number, created: number, updated: number, errors: number, details: Array}>}
 */
const syncDonateurs = async (donateurs) => {
  const results = {
    total: donateurs.length,
    created: 0,
    updated: 0,
    errors: 0,
    details: []
  };

  for (const donateur of donateurs) {
    const result = await syncDonateur(donateur);
    
    results.details.push({
      email: donateur.email,
      ...result
    });

    if (result.success) {
      if (result.action === 'created') {
        results.created++;
      } else {
        results.updated++;
      }
    } else {
      results.errors++;
    }

    // Petit délai pour éviter le rate limiting Mailjet
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
};

module.exports = {
  syncDonateur,
  syncDonateurs,
  createContact,
  updateContactProperties,
  addContactToList,
  getAmanaProperty,
  getTypeProperty,
  MAILJET_LIST_ID
};

