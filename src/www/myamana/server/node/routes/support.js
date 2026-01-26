/**
 * Routes Support - Gestion des tickets
 * 
 * Endpoints pour créer et gérer les tickets support
 * avec intégration Trello et envoi d'emails via Mailjet.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const logger = require('../config/logger');
const trelloService = require('../services/trelloService');
const mailService = require('../services/mailService');
const { authMiddleware } = require('./auth');

// Configuration multer pour les pièces jointes
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Mo max
  },
  fileFilter: (req, file, cb) => {
    // Types autorisés
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'), false);
    }
  }
});

/**
 * POST /api/support/ticket
 * Crée un nouveau ticket support
 * 
 * Body (multipart/form-data):
 * - category: 'bug' | 'recu_fiscal' | 'question'
 * - message: string
 * - email: string
 * - asso: string (optionnel)
 * - attachment: File (optionnel)
 */
router.post('/support/ticket', upload.single('attachment'), async (req, res) => {
  try {
    const { category, message, email, asso } = req.body;

    // Validation
    if (!category || !message || !email) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis manquants (category, message, email)'
      });
    }

    const validCategories = ['bug', 'recu_fiscal', 'question', 'donateur'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Catégorie invalide'
      });
    }

    if (message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Le message doit contenir au moins 10 caractères'
      });
    }

    // Préparer les données du ticket
    const ticketData = {
      category,
      message: message.trim(),
      email: email.trim().toLowerCase(),
      asso: asso || ''
    };

    // Ajouter la pièce jointe si présente
    if (req.file) {
      ticketData.attachment = req.file.buffer;
      ticketData.attachmentName = req.file.originalname;
    }

    logger.info('Création ticket support', {
      category,
      email: ticketData.email,
      asso: ticketData.asso,
      hasAttachment: !!req.file
    });

    // Créer la carte Trello
    const result = await trelloService.createTicketCard(ticketData);

    // Envoyer un email de confirmation au demandeur
    try {
      await sendConfirmationEmail(ticketData, result.cardId);
    } catch (emailError) {
      logger.error('Erreur envoi email confirmation', { error: emailError.message });
      // On ne fait pas échouer le ticket pour l'email
    }

    res.status(201).json({
      success: true,
      message: 'Ticket créé avec succès',
      ticketId: result.cardId
    });

  } catch (error) {
    logger.error('Erreur création ticket', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du ticket'
    });
  }
});

/**
 * GET /api/support/tickets
 * Récupère la liste des tickets (pour l'interface back-office)
 */
router.get('/support/tickets', async (req, res) => {
  try {
    const tickets = await trelloService.getAllActiveTickets();

    // Transformer les données pour l'interface
    const formattedTickets = tickets.map(card => ({
      id: card.id,
      title: card.name,
      description: card.desc,
      labels: card.labels,
      members: card.members,
      lastActivity: card.dateLastActivity,
      url: card.shortUrl,
      attachments: card.attachments?.length || 0,
      status: card.status // 'new' ou 'waiting'
    }));

    // Compter les nouveaux tickets
    const newCount = formattedTickets.filter(t => t.status === 'new').length;

    res.json({
      success: true,
      tickets: formattedTickets,
      total: formattedTickets.length,
      newCount: newCount
    });

  } catch (error) {
    logger.error('Erreur récupération tickets', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tickets'
    });
  }
});

/**
 * GET /api/support/tickets/:ticketId
 * Récupère un ticket avec son fil de discussion (commentaires)
 */
router.get('/support/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    const card = await trelloService.getCardWithComments(ticketId);

    // Parser les infos du ticket
    const emailMatch = card.desc?.match(/\*\*Email:\*\*\s*(\S+)/);
    const assoMatch = card.name?.match(/\[([^\]]+)\]/);

    res.json({
      success: true,
      ticket: {
        id: card.id,
        title: card.name,
        description: card.desc,
        email: emailMatch ? emailMatch[1] : null,
        asso: assoMatch ? assoMatch[1] : null,
        labels: card.labels,
        members: card.members,
        lastActivity: card.dateLastActivity,
        url: card.shortUrl,
        attachments: card.attachments || [],
        comments: card.comments || []
      }
    });

  } catch (error) {
    logger.error('Erreur récupération ticket', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du ticket'
    });
  }
});

/**
 * POST /api/support/tickets/:ticketId/reply
 * Répond à un ticket (envoie email + ajoute commentaire Trello)
 */
router.post('/support/tickets/:ticketId/reply', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { email, subject, message, agentName } = req.body;

    if (!email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Email et message requis'
      });
    }

    logger.info('Réponse ticket', { ticketId, email });

    // Envoyer l'email de réponse
    await sendReplyEmail(email, subject, message, agentName);

    // Ajouter un commentaire dans Trello
    const commentText = `📧 **Réponse envoyée à ${email}**\n\n${message}\n\n---\n*Par ${agentName || 'Support MyAmana'}*`;
    await trelloService.addCommentToCard(ticketId, commentText);

    // Déplacer la carte vers la colonne "En attente de réponse"
    const waitingListId = process.env.TRELLO_LIST_ID_WAITING;
    if (waitingListId) {
      await trelloService.moveCard(ticketId, waitingListId);
      logger.info('Carte déplacée vers liste attente', { ticketId });
    }

    res.json({
      success: true,
      message: 'Réponse envoyée avec succès'
    });

  } catch (error) {
    logger.error('Erreur réponse ticket', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la réponse'
    });
  }
});

/**
 * GET /api/support/my-tickets
 * Récupère les tickets de l'association connectée (filtré par email)
 */
router.get('/support/my-tickets', authMiddleware, async (req, res) => {
  try {
    // Récupérer le nom de l'asso depuis le JWT/cookie
    const assoName = req.user?.nameAsso;
    const assoEmail = req.user?.email;
    
    logger.info('Récupération mes tickets', { assoName, assoEmail });
    
    if (!assoName && !assoEmail) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié'
      });
    }

    // Récupérer tous les tickets actifs
    const allTickets = await trelloService.getAllActiveTickets();
    
    logger.info('Tickets actifs trouvés', { count: allTickets.length });
    
    // Récupérer aussi les tickets résolus pour cette asso
    const resolvedListId = process.env.TRELLO_LIST_ID_RESOLVED;
    let resolvedTickets = [];
    if (resolvedListId) {
      const resolved = await trelloService.getTickets(resolvedListId);
      resolvedTickets = resolved.map(card => ({ ...card, status: 'resolved' }));
    }

    const allWithResolved = [...allTickets, ...resolvedTickets];

    // Filtrer par nom de l'asso (dans le titre de la carte) OU par email
    const myTickets = allWithResolved.filter(card => {
      // Extraire le nom de l'asso du titre [NomAsso]
      const assoMatch = card.name?.match(/\[([^\]]+)\]/);
      const ticketAssoName = assoMatch ? assoMatch[1] : null;
      
      // Extraire l'email de la description
      const emailMatch = card.desc?.match(/\*\*Email:\*\*\s*(\S+)/);
      const ticketEmail = emailMatch ? emailMatch[1].toLowerCase() : null;
      
      // Match si le nom de l'asso correspond OU si l'email correspond
      const nameMatch = assoName && ticketAssoName && 
        ticketAssoName.toLowerCase().includes(assoName.toLowerCase().substring(0, 20));
      const emailMatches = ticketEmail === assoEmail?.toLowerCase();
      
      return nameMatch || emailMatches;
    });
    
    logger.info('Mes tickets filtrés', { count: myTickets.length, assoName });

    // Transformer les données
    const formattedTickets = myTickets.map(card => {
      const emailMatch = card.desc?.match(/\*\*Email:\*\*\s*(\S+)/);
      const assoMatch = card.name?.match(/\[([^\]]+)\]/);
      
      return {
        id: card.id,
        title: card.name,
        description: card.desc,
        email: emailMatch ? emailMatch[1] : null,
        asso: assoMatch ? assoMatch[1] : null,
        labels: card.labels,
        lastActivity: card.dateLastActivity,
        url: card.shortUrl,
        attachments: card.attachments?.length || 0,
        status: card.status
      };
    });

    // Trier par date (plus récent en premier)
    formattedTickets.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    res.json({
      success: true,
      tickets: formattedTickets,
      total: formattedTickets.length
    });

  } catch (error) {
    logger.error('Erreur récupération mes tickets', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tickets'
    });
  }
});

/**
 * POST /api/support/tickets/:ticketId/asso-reply
 * Réponse de l'association à un ticket (ajoute commentaire + notifie admin)
 */
router.post('/support/tickets/:ticketId/asso-reply', authMiddleware, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, assoName, assoEmail } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message requis'
      });
    }

    logger.info('Réponse asso au ticket', { ticketId, assoEmail });

    // Ajouter un commentaire dans Trello
    const commentText = `💬 **Réponse de ${assoName || 'l\'association'}**\n\n${message}\n\n---\n*${assoEmail || ''}*`;
    await trelloService.addCommentToCard(ticketId, commentText);

    // Remettre la carte dans la liste "Nouveaux" pour signaler une nouvelle réponse
    const newListId = process.env.TRELLO_LIST_ID;
    if (newListId) {
      await trelloService.moveCard(ticketId, newListId);
    }

    // Notifier l'admin par email (optionnel)
    try {
      await sendAdminNotificationEmail(ticketId, assoName, message);
    } catch (emailError) {
      logger.error('Erreur notification admin', { error: emailError.message });
    }

    res.json({
      success: true,
      message: 'Réponse envoyée avec succès'
    });

  } catch (error) {
    logger.error('Erreur réponse asso', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de la réponse'
    });
  }
});

/**
 * POST /api/support/tickets/:ticketId/resolve
 * Marque un ticket comme résolu (déplace vers colonne Résolu)
 */
router.post('/support/tickets/:ticketId/resolve', async (req, res) => {
  try {
    const { ticketId } = req.params;

    logger.info('Résolution ticket', { ticketId });

    // Déplacer la carte vers la colonne "Résolu"
    const resolvedListId = process.env.TRELLO_LIST_ID_RESOLVED;
    if (resolvedListId) {
      await trelloService.moveCard(ticketId, resolvedListId);
      logger.info('Carte déplacée vers liste résolu', { ticketId });
    } else {
      // Fallback: archiver si pas de liste configurée
      await trelloService.archiveCard(ticketId);
    }

    res.json({
      success: true,
      message: 'Ticket marqué comme résolu'
    });

  } catch (error) {
    logger.error('Erreur résolution ticket', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la résolution du ticket'
    });
  }
});

/**
 * Envoie un email de confirmation lors de la création d'un ticket
 */
async function sendConfirmationEmail(ticket, ticketId) {
  const baseUrl = process.env.ADMIN_BASE_URL || 'https://v2.myamana.fr';
  const assistanceUrl = `${baseUrl}/backoffice/assistance`;
  
  const categoryNames = {
    bug: 'Bug / Incident technique',
    recu_fiscal: 'Reçus fiscaux',
    question: 'Question sur MyAmana',
    donateur: 'Questions sur un donateur'
  };

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #ff8a66; padding: 30px; text-align: center;">
        <img src="https://v2.myamana.fr/assets/images/myamana_logo.png" alt="MyAmana" style="height: 50px; margin-bottom: 15px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Demande reçue ✓</h1>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <p>Bonjour,</p>
        
        <p>Nous avons bien reçu votre demande de support concernant : <strong>${categoryNames[ticket.category]}</strong></p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ff8a66;">
          <p style="margin: 0; color: #374151;">${ticket.message.substring(0, 200)}${ticket.message.length > 200 ? '...' : ''}</p>
        </div>
        
        <p>Notre équipe reviendra vers vous dans les plus brefs délais.</p>
        
        <p>Vous pouvez suivre l'avancement de votre demande et répondre directement depuis votre espace :</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${assistanceUrl}" style="background: #ff8a66; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            📋 Suivre ma demande
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Référence : ${ticketId}<br>
          Association : ${ticket.asso || 'Non renseignée'}
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          L'équipe MyAmana<br>
          <a href="https://home.myamana.fr" style="color: #ff8a66;">home.myamana.fr</a>
        </p>
      </div>
    </div>
  `;

  if (mailService.sendEmail) {
    await mailService.sendEmail({
      to: ticket.email,
      subject: `[MyAmana] Votre demande a bien été reçue`,
      html: htmlContent
    });
  }
}

/**
 * Envoie un email de réponse à un ticket
 */
async function sendReplyEmail(email, subject, message, agentName) {
  const baseUrl = process.env.ADMIN_BASE_URL || 'https://v2.myamana.fr';
  const assistanceUrl = `${baseUrl}/backoffice/assistance`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #ff8a66; padding: 30px; text-align: center;">
        <img src="https://v2.myamana.fr/assets/images/myamana_logo.png" alt="MyAmana" style="height: 50px; margin-bottom: 15px;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Réponse du support MyAmana</h1>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <p>Bonjour,</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ff8a66;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        
        <p>Vous pouvez répondre directement depuis votre espace association :</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${assistanceUrl}" style="background: #ff8a66; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            💬 Répondre au ticket
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          ${agentName || 'L\'équipe MyAmana'}<br>
          <a href="https://home.myamana.fr" style="color: #ff8a66;">home.myamana.fr</a>
        </p>
      </div>
    </div>
  `;

  if (mailService.sendEmail) {
    await mailService.sendEmail({
      to: email,
      subject: subject || '[MyAmana] Réponse à votre demande',
      html: htmlContent
    });
  }
}

/**
 * Envoie une notification à l'admin quand une asso répond
 */
async function sendAdminNotificationEmail(ticketId, assoName, message) {
  const adminUrl = `${process.env.ADMIN_BASE_URL || 'https://v2.myamana.fr'}/backoffice/support`;
  const adminEmail = process.env.SUPPORT_ADMIN_EMAIL || 'support@myamana.fr';
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: #ff8a66; padding: 30px; text-align: center;">
        <img src="https://v2.myamana.fr/assets/images/myamana_logo.png" alt="MyAmana" style="height: 50px; margin-bottom: 15px;">
        <h1 style="color: white; margin: 0; font-size: 20px;">📩 Nouvelle réponse sur un ticket</h1>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <p><strong>${assoName || 'Une association'}</strong> a répondu à un ticket :</p>
        
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ff8a66;">
          ${message.replace(/\n/g, '<br>')}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${adminUrl}" style="background: #ff8a66; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Voir le ticket
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 12px; text-align: center;">
          Notification automatique - <a href="https://home.myamana.fr" style="color: #ff8a66;">Support MyAmana</a>
        </p>
      </div>
    </div>
  `;

  if (mailService.sendEmail) {
    await mailService.sendEmail({
      to: adminEmail,
      subject: `[Support] Nouvelle réponse de ${assoName || 'une association'}`,
      html: htmlContent
    });
  }
}

module.exports = router;

