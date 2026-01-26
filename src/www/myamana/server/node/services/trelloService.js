/**
 * Service Trello - Gestion des tickets support
 * 
 * Crée des cartes Trello à partir des tickets support
 * et gère les commentaires pour le suivi des réponses.
 */

const axios = require('axios');
const FormData = require('form-data');
const logger = require('../config/logger');

// Configuration Trello
const TRELLO_API_URL = 'https://api.trello.com/1';
const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;
const TRELLO_LIST_ID = process.env.TRELLO_LIST_ID;

// Membres par catégorie (peut être une liste séparée par des virgules)
const MEMBERS_BY_CATEGORY = {
  bug: process.env.TRELLO_MEMBERS_TECHNIQUE || process.env.TRELLO_MEMBER_TECHNIQUE,
  recu_fiscal: process.env.TRELLO_MEMBERS_ADMIN || process.env.TRELLO_MEMBER_ADMIN,
  question: process.env.TRELLO_MEMBERS_GENERAL || process.env.TRELLO_MEMBER_GENERAL,
  donateur: process.env.TRELLO_MEMBERS_DONATEUR || process.env.TRELLO_MEMBERS_ADMIN || process.env.TRELLO_MEMBER_ADMIN
};

// Labels par catégorie (couleurs Trello)
const LABELS_BY_CATEGORY = {
  bug: 'red',
  recu_fiscal: 'blue',
  question: 'green',
  donateur: 'purple'
};

const CATEGORY_NAMES = {
  bug: '🐛 Bug technique',
  recu_fiscal: '📄 Reçu fiscal',
  question: '❓ Question',
  donateur: '👤 Question donateur'
};

/**
 * Génère un ID de ticket court et unique
 * Format: #YYMMDD-XXX (ex: #241219-A3F)
 */
const generateTicketId = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `#${yy}${mm}${dd}-${random}`;
};

/**
 * Vérifie que les credentials Trello sont configurés
 */
const checkCredentials = () => {
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
    throw new Error('Credentials Trello manquants (TRELLO_API_KEY ou TRELLO_TOKEN)');
  }
  if (!TRELLO_LIST_ID) {
    throw new Error('TRELLO_LIST_ID non configuré');
  }
};

/**
 * Crée les paramètres d'authentification pour les requêtes Trello
 */
const getAuthParams = () => ({
  key: TRELLO_API_KEY,
  token: TRELLO_TOKEN
});

/**
 * Récupère ou crée un label pour une catégorie
 */
const getOrCreateLabel = async (category) => {
  try {
    // Récupérer les labels existants du board
    const response = await axios.get(`${TRELLO_API_URL}/boards/${TRELLO_BOARD_ID}/labels`, {
      params: getAuthParams()
    });

    const color = LABELS_BY_CATEGORY[category];
    const existingLabel = response.data.find(l => l.color === color);

    if (existingLabel) {
      return existingLabel.id;
    }

    // Créer le label s'il n'existe pas
    const newLabel = await axios.post(`${TRELLO_API_URL}/labels`, {
      ...getAuthParams(),
      name: CATEGORY_NAMES[category],
      color: color,
      idBoard: TRELLO_BOARD_ID
    });

    return newLabel.data.id;
  } catch (error) {
    logger.error('Erreur récupération/création label Trello', { error: error.message });
    return null;
  }
};

/**
 * Crée une carte Trello pour un ticket support
 * 
 * @param {Object} ticket - Les données du ticket
 * @param {string} ticket.category - Catégorie (bug, recu_fiscal, question)
 * @param {string} ticket.message - Message du ticket
 * @param {string} ticket.email - Email de contact
 * @param {string} ticket.asso - Nom de l'association
 * @param {Buffer} ticket.attachment - Pièce jointe (optionnel)
 * @param {string} ticket.attachmentName - Nom du fichier (optionnel)
 * @returns {Object} - Résultat de la création
 */
const createTicketCard = async (ticket) => {
  checkCredentials();

  const { category, message, email, asso, attachment, attachmentName } = ticket;

  // Générer un ID de ticket
  const ticketId = generateTicketId();
  
  // Construire le titre de la carte
  const categoryName = CATEGORY_NAMES[category] || '❓ Autre';
  const assoDisplay = asso ? `[${asso}]` : '[Asso inconnue]';
  const cardName = `${ticketId} ${assoDisplay} ${categoryName}`;

  // URL de l'interface admin support
  const adminBaseUrl = process.env.ADMIN_BASE_URL || 'https://v2.myamana.fr';
  const adminSupportUrl = `${adminBaseUrl}/backoffice/support`;

  // Construire la description
  const description = `## 📧 Contact
**Email:** ${email}
**Association:** ${asso || 'Non renseignée'}

---

## 📝 Message

${message}

---

## 🔗 Lien Admin
👉 [Gérer ce ticket dans l'admin](${adminSupportUrl})

---

*Ticket créé le ${new Date().toLocaleString('fr-FR')}*`;

  try {
    // Créer la carte
    const cardParams = {
      ...getAuthParams(),
      idList: TRELLO_LIST_ID,
      name: cardName,
      desc: description,
      pos: 'top'
    };

    // Ajouter le label si possible
    const labelId = await getOrCreateLabel(category);
    if (labelId) {
      cardParams.idLabels = labelId;
    }

    // Ajouter les membres assignés (peut être une liste séparée par des virgules)
    const memberIds = MEMBERS_BY_CATEGORY[category];
    if (memberIds) {
      // Supporte plusieurs membres séparés par des virgules
      cardParams.idMembers = memberIds.split(',').map(id => id.trim()).join(',');
    }

    logger.info('Création carte Trello', { category, email, asso });

    const response = await axios.post(`${TRELLO_API_URL}/cards`, cardParams);
    const card = response.data;

    logger.info('Carte Trello créée', { cardId: card.id, cardUrl: card.url });

    // Ajouter la pièce jointe si présente
    if (attachment && attachmentName) {
      await addAttachmentToCard(card.id, attachment, attachmentName);
    }

    return {
      success: true,
      cardId: card.id,
      cardUrl: card.url,
      shortUrl: card.shortUrl
    };

  } catch (error) {
    logger.error('Erreur création carte Trello', { 
      error: error.message,
      response: error.response?.data 
    });
    throw new Error(`Erreur Trello: ${error.message}`);
  }
};

/**
 * Ajoute une pièce jointe à une carte
 */
const addAttachmentToCard = async (cardId, fileBuffer, fileName) => {
  try {
    const form = new FormData();
    form.append('key', TRELLO_API_KEY);
    form.append('token', TRELLO_TOKEN);
    form.append('file', fileBuffer, { filename: fileName });

    await axios.post(`${TRELLO_API_URL}/cards/${cardId}/attachments`, form, {
      headers: form.getHeaders()
    });

    logger.info('Pièce jointe ajoutée à la carte', { cardId, fileName });
  } catch (error) {
    logger.error('Erreur ajout pièce jointe Trello', { error: error.message });
    // On ne fait pas échouer la création du ticket pour une pièce jointe
  }
};

/**
 * Ajoute un commentaire à une carte (pour les réponses)
 */
const addCommentToCard = async (cardId, comment) => {
  checkCredentials();

  try {
    await axios.post(`${TRELLO_API_URL}/cards/${cardId}/actions/comments`, {
      ...getAuthParams(),
      text: comment
    });

    logger.info('Commentaire ajouté à la carte', { cardId });
    return { success: true };
  } catch (error) {
    logger.error('Erreur ajout commentaire Trello', { error: error.message });
    throw new Error(`Erreur Trello: ${error.message}`);
  }
};

/**
 * Récupère les cartes d'une liste (tickets)
 */
const getTickets = async (listId = TRELLO_LIST_ID) => {
  checkCredentials();

  try {
    const response = await axios.get(`${TRELLO_API_URL}/lists/${listId}/cards`, {
      params: {
        ...getAuthParams(),
        fields: 'id,name,desc,labels,idMembers,dateLastActivity,shortUrl,idList',
        attachments: 'true',
        members: 'true'
      }
    });

    return response.data;
  } catch (error) {
    logger.error('Erreur récupération tickets Trello', { error: error.message });
    throw new Error(`Erreur Trello: ${error.message}`);
  }
};

/**
 * Récupère les cartes de plusieurs listes (nouveaux + en attente)
 */
const getAllActiveTickets = async () => {
  checkCredentials();

  const newListId = TRELLO_LIST_ID;
  const waitingListId = process.env.TRELLO_LIST_ID_WAITING;

  try {
    // Récupérer les nouveaux tickets
    const newTickets = await getTickets(newListId);
    const formattedNew = newTickets.map(card => ({ ...card, status: 'new' }));

    // Récupérer les tickets en attente de réponse (si la liste est configurée)
    let waitingTickets = [];
    if (waitingListId) {
      const waiting = await getTickets(waitingListId);
      waitingTickets = waiting.map(card => ({ ...card, status: 'waiting' }));
    }

    // Combiner et trier par date d'activité (plus récent en premier)
    const allTickets = [...formattedNew, ...waitingTickets];
    allTickets.sort((a, b) => new Date(b.dateLastActivity) - new Date(a.dateLastActivity));

    return allTickets;
  } catch (error) {
    logger.error('Erreur récupération tous les tickets', { error: error.message });
    throw new Error(`Erreur Trello: ${error.message}`);
  }
};

/**
 * Déplace une carte vers une autre liste (changement de statut)
 */
const moveCard = async (cardId, newListId) => {
  checkCredentials();

  try {
    await axios.put(`${TRELLO_API_URL}/cards/${cardId}`, {
      ...getAuthParams(),
      idList: newListId
    });

    logger.info('Carte déplacée', { cardId, newListId });
    return { success: true };
  } catch (error) {
    logger.error('Erreur déplacement carte Trello', { error: error.message });
    throw new Error(`Erreur Trello: ${error.message}`);
  }
};

/**
 * Archive une carte (marquer comme résolu)
 */
const archiveCard = async (cardId) => {
  checkCredentials();

  try {
    await axios.put(`${TRELLO_API_URL}/cards/${cardId}`, {
      ...getAuthParams(),
      closed: true
    });

    logger.info('Carte archivée (ticket résolu)', { cardId });
    return { success: true };
  } catch (error) {
    logger.error('Erreur archivage carte Trello', { error: error.message });
    throw new Error(`Erreur Trello: ${error.message}`);
  }
};

/**
 * Récupère les détails d'une carte avec ses commentaires (fil de discussion)
 */
const getCardWithComments = async (cardId) => {
  checkCredentials();

  try {
    // Récupérer la carte
    const cardResponse = await axios.get(`${TRELLO_API_URL}/cards/${cardId}`, {
      params: {
        ...getAuthParams(),
        fields: 'id,name,desc,labels,idMembers,dateLastActivity,shortUrl',
        attachments: 'true',
        members: 'true'
      }
    });

    // Récupérer les commentaires (actions de type commentCard)
    const actionsResponse = await axios.get(`${TRELLO_API_URL}/cards/${cardId}/actions`, {
      params: {
        ...getAuthParams(),
        filter: 'commentCard'
      }
    });

    const card = cardResponse.data;
    const comments = actionsResponse.data.map(action => ({
      id: action.id,
      text: action.data.text,
      date: action.date,
      author: action.memberCreator?.fullName || 'Inconnu'
    }));

    return {
      ...card,
      comments: comments.reverse() // Plus ancien en premier
    };

  } catch (error) {
    logger.error('Erreur récupération carte avec commentaires', { error: error.message });
    throw new Error(`Erreur Trello: ${error.message}`);
  }
};

module.exports = {
  createTicketCard,
  addCommentToCard,
  addAttachmentToCard,
  getTickets,
  getAllActiveTickets,
  getCardWithComments,
  moveCard,
  archiveCard,
  CATEGORY_NAMES
};

