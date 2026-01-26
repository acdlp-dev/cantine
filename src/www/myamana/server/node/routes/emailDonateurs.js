const express = require('express');
const router = express.Router();
const { select, insert, update } = require('../services/bdd');
const { sendTemplateEmail } = require('../services/mailService');

const EMAILS_PER_DAY = 12000;

// Fonction pour formater le nom de l'association
const formatAssoName = (asso) => {
    // Supprimer les tirets et mettre une majuscule au début
    return asso.replace(/-/g, ' ').charAt(0).toUpperCase() + asso.replace(/-/g, ' ').slice(1);
};

// Initialiser la campagne d'envoi
router.get('/init-campaign-2024', async (req, res) => {
    try {
        // Récupérer la liste des donateurs
        const sql = "select * from Dons_Ponctuels p where year(p.ajout) = ? and p.asso not in (?) and length(p.email) > 1 group by asso, email";
        const params = ['2024', 'acmp'];
        const donateurs = await select(sql, params, 'remote');

        // Initialiser l'état d'envoi pour chaque donateur
        for (const donateur of donateurs) {
            try {
                await insert('EmailSendingState', {
                    campaign: 'donateurs2024',
                    email: donateur.email,
                    asso: donateur.asso,
                    status: 'pending'
                }, 'remote');
            } catch (error) {
                // Ignorer les erreurs de doublon (unique key violation)
                if (!error.message.includes('Duplicate entry')) {
                    throw error;
                }
            }
        }

        res.json({
            status: 'success',
            message: `Campagne initialisée avec ${donateurs.length} emails`
        });
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la campagne:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'initialisation de la campagne',
            details: error.message
        });
    }
});

// Envoyer le lot d'emails du jour
router.get('/send-emails-2024', async (req, res) => {
    try {
        // Vérifier si des emails ont déjà été envoyés aujourd'hui
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sentToday = await select(
            "SELECT COUNT(*) as count FROM EmailSendingState WHERE campaign = ? AND sent_date >= ? AND status = 'sent'",
            ['donateurs2024', today],
            'remote'
        );

        if (sentToday[0].count >= EMAILS_PER_DAY) {
            return res.json({
                status: 'waiting',
                message: 'La limite quotidienne a été atteinte. Reprise demain.',
                nextSendDate: new Date(today.setDate(today.getDate() + 1))
            });
        }

        // Calculer la limite d'emails pour aujourd'hui
        const limit = EMAILS_PER_DAY - sentToday[0].count;
        
        // Récupérer le prochain lot d'emails à envoyer
        const pendingEmails = await select(
            `SELECT * FROM EmailSendingState WHERE campaign = ? AND status = 'pending' LIMIT ${limit}`,
            ['donateurs2024'],
            'remote'
        );

        // Compteurs pour le suivi
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Envoi des emails
        for (const email of pendingEmails) {
            try {
                const assoFormatted = formatAssoName(email.asso);
                const variables = {
                    prenom: email.email.split('@')[0], // On utilise la première partie de l'email comme prénom par défaut
                    asso: assoFormatted
                };

                const subject = `${assoFormatted} : Votre nouvel espace donateur`;

                await sendTemplateEmail(
                    email.email,
                    6722430,
                    variables,
                    subject,
                    email.email_asso // Utiliser l'email de l'asso comme adresse de réponse
                );

                // Mettre à jour le statut comme envoyé
                await update(
                    'EmailSendingState',
                    {
                        status: 'sent',
                        sent_date: new Date()
                    },
                    'email = ? AND campaign = ?',
                    [email.email, 'donateurs2024'],
                    'remote'
                );

                successCount++;
            } catch (error) {
                errorCount++;
                errors.push({
                    email: email.email,
                    error: error.message
                });

                // Mettre à jour le statut comme erreur
                await update(
                    'EmailSendingState',
                    {
                        status: 'error',
                        error_message: error.message,
                        sent_date: new Date()
                    },
                    'email = ? AND campaign = ?',
                    [email.email, 'donateurs2024'],
                    'remote'
                );
            }
        }

        // Obtenir les statistiques globales
        const stats = await select(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
            FROM EmailSendingState 
            WHERE campaign = ?`,
            ['donateurs2024'],
            'remote'
        );

        // Envoi de la réponse avec les statistiques
        res.json({
            status: stats[0].pending === 0 ? 'completed' : 'in_progress',
            processedToday: successCount + errorCount,
            totalStats: {
                total: stats[0].total,
                sent: stats[0].sent,
                pending: stats[0].pending,
                errors: stats[0].errors
            },
            todayResults: {
                successCount,
                errorCount,
                errors
            },
            nextBatchDate: stats[0].pending === 0 ? null : new Date(today.setDate(today.getDate() + 1))
        });

    } catch (error) {
        console.error('Erreur lors de l\'envoi des emails:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'envoi des emails',
            details: error.message
        });
    }
});

module.exports = router;
