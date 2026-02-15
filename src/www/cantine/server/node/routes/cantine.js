const express = require('express');
// Middleware d'authentification
const { authMiddleware } = require('./auth');
const db = require('../services/bdd');
const { sendTemplateEmail } = require('../services/mailService');

const router = express.Router();

// Proxy endpoint for geocoding (server-side) to avoid browser CORS/rate-limit issues
router.get('/geocode', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) return res.status(400).json({ message: 'q parameter required' });
        const fetch = require('node-fetch');
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', String(q));
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '1');

        const resp = await fetch(url.toString(), { headers: { 'User-Agent': 'acdlp/1.0 (contact@macdlp.com)' } });
        const json = await resp.json();
        return res.status(200).json(json);
    } catch (err) {
        console.error('[Geocode proxy error]', err);
        return res.status(500).json({ message: 'Geocode error' });
    }
});

router.get('/getCommandesAssosCantine', authMiddleware, async (req, res) => {
    try {
        const email = req.user.email;

        // Construction de la requête SQL pour récupérer les commandes de cantine
        let query = 'SELECT id, ajout, livraison, repas_quantite, colis_quantite, asso, statut, zone FROM Commandes WHERE email = ?';
        const queryParams = [email];

        // Optionally apply date range filters from query params (expects ISO yyyy-mm-dd)
        const { dateFrom, dateTo, limit } = req.query || {};
        if (dateFrom && dateTo) {
            // include both bounds
            query += ' AND livraison >= ? AND livraison <= ?';
            queryParams.push(dateFrom, dateTo);
        } else if (dateFrom) {
            query += ' AND livraison >= ?';
            queryParams.push(dateFrom);
        } else if (dateTo) {
            query += ' AND livraison <= ?';
            queryParams.push(dateTo);
        }

        // Sanitize/handle limit: default 1000, allow client to request up to 10000
        let safeLimit = 1000;
        if (limit) {
            const l = parseInt(limit, 10);
            if (!isNaN(l) && l > 0) {
                safeLimit = Math.min(l, 10000);
            }
        }

        // Ajouter l'ordre et la limite (triés par date de livraison décroissante)
        query += ` ORDER BY livraison DESC LIMIT ${safeLimit}`;

        const results = await db.select(query, queryParams, 'remote');

        if (!results || results.length === 0) {
            return res.status(200).json({ results: [], total: 0 });
        }

        // Return results and a total count (here total equals returned rows; client does client-side paging)
        return res.status(200).json({ results, total: results.length });
    } catch (err) {
        console.error(`[Cantine Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

router.get('/getQuantiteCantine', authMiddleware, async (req, res) => {
    try {
        const date = req.query.date;

        if (!date || date.trim() === '') {
            return res.status(400).json({
                message: 'Date is required',
                total: 0
            });
        }

        // 1. Récupérer le quota EXACT pour cette date (nouvelle logique par jour)
        const quotaQuery = 'SELECT repas_quantite FROM Quotas2 WHERE date_jour = ?';
        const quotaResults = await db.select(quotaQuery, [date], 'remote');

        if (quotaResults.length === 0) {
            return res.status(200).json({
                total: 0,
                date: date,
                message: 'Aucun quota défini pour ce jour'
            });
        }

        const quotaRepas = quotaResults[0].repas_quantite || 0;

        // 2. Calculer les repas déjà commandés pour cette date
        const commandesQuery = 'SELECT SUM(repas_quantite) as total_commandes FROM Commandes WHERE livraison = ? and statut != "blocked"';
        const commandesResults = await db.select(commandesQuery, [date], 'remote');

        const repasCommandes = commandesResults && commandesResults[0] ? (commandesResults[0].total_commandes || 0) : 0;

        // 3. Calculer les repas disponibles
        const repasDisponibles = quotaRepas - repasCommandes;

        // For compatibility, also return computed dayOfWeek (1..7)
        const dOW = (new Date(date)).getDay() + 1;
        return res.status(200).json({
            total: Math.max(0, repasDisponibles), // S'assurer que c'est >= 0
            date: date,
            dayOfWeek: dOW,
            quota: quotaRepas,
            commandes: repasCommandes,
            disponibles: Math.max(0, repasDisponibles)
        });

    } catch (err) {
        console.error(`[Cantine Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});


// ----------------------------------------------------
// QUOTAS (liste et mise à jour)
// ----------------------------------------------------
// Renvoyer les quotas (backoffice) avec filtre date (par défaut: semaine courante)
router.get('/quotas', authMiddleware, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query || {};

        let query = 'SELECT id, date_jour, jour, day_of_week, repas_quantite, colis_quantite, creneau_debut, creneau_fin FROM Quotas2';
        const params = [];

        if (dateFrom && dateTo) {
            query += ' WHERE date_jour >= ? AND date_jour <= ?';
            params.push(dateFrom, dateTo);
        } else if (dateFrom) {
            query += ' WHERE date_jour >= ?';
            params.push(dateFrom);
        } else if (dateTo) {
            query += ' WHERE date_jour <= ?';
            params.push(dateTo);
        } else {
            // par défaut, semaine courante (lundi..dimanche)
            const today = new Date();
            const day = today.getDay(); // 0..6 (0 dim)
            const daysSinceMonday = (day + 6) % 7; // 0..6
            const monday = new Date(today);
            monday.setDate(today.getDate() - daysSinceMonday);
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            const fmtDate = d => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${dd}`;
            };
            query += ' WHERE date_jour >= ? AND date_jour <= ?';
            params.push(fmtDate(monday), fmtDate(sunday));
        }

        query += ' ORDER BY date_jour ASC';

        const results = await db.select(query, params, 'remote');
        return res.status(200).json(results || []);
    } catch (err) {
        console.error(`[Quotas GET Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// ----------------------------------------------------
// MENUS (table Menus)
// ----------------------------------------------------
// Endpoint public pour afficher le menu de la semaine (sans authentification)
router.get('/menuAsso', async (req, res) => {
    try {
        // Récupérer les menus de la semaine courante par défaut
        const today = new Date();
        // compute Monday
        const day = today.getDay(); // 0 (Sun) .. 6 (Sat)
        const daysSinceMonday = (day + 6) % 7; // 0..6
        const monday = new Date(today);
        monday.setDate(today.getDate() - daysSinceMonday);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const fmtDate = d => {
            const y = d.getFullYear();
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const dayN = d.getDate().toString().padStart(2, '0');
            return `${y}-${m}-${dayN}`;
        };

        const query = 'SELECT id, date_ajout, menu_date, auteur_id, titre, allergenes FROM Menus WHERE menu_date BETWEEN ? AND ? ORDER BY menu_date ASC';
        const params = [fmtDate(monday), fmtDate(sunday)];

        const rows = await db.select(query, params, 'remote');
        const results = (rows || []).map(r => ({
            id: r.id,
            date_ajout: r.date_ajout,
            menu_date: r.menu_date || null,
            auteur_id: r.auteur_id,
            titre: r.titre,
            allergenes: r.allergenes ? JSON.parse(r.allergenes) : null
        }));

        return res.status(200).json(results);
    } catch (err) {
        console.error(`[Menu Public GET Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// Renvoyer toutes les entrées de menus (admin avec authentification)
router.get('/menus', authMiddleware, async (req, res) => {
    try {
        // dateFrom / dateTo expected as ISO yyyy-mm-dd strings
        const { dateFrom, dateTo } = req.query || {};

        let query = 'SELECT id, date_ajout, menu_date, auteur_id, titre, allergenes FROM Menus';
        const params = [];

        if (dateFrom && dateTo) {
            query += ' WHERE COALESCE(menu_date, DATE(date_ajout)) >= ? AND COALESCE(menu_date, DATE(date_ajout)) <= ?';
            params.push(dateFrom, dateTo);
        } else if (dateFrom) {
            query += ' WHERE COALESCE(menu_date, DATE(date_ajout)) >= ?';
            params.push(dateFrom);
        } else if (dateTo) {
            query += ' WHERE COALESCE(menu_date, DATE(date_ajout)) <= ?';
            params.push(dateTo);
        } else {
            // default: return menus for the current week (Monday..Sunday)
            const today = new Date();
            // compute Monday
            const day = today.getDay(); // 0 (Sun) .. 6 (Sat)
            const daysSinceMonday = (day + 6) % 7; // 0..6
            const monday = new Date(today);
            monday.setDate(today.getDate() - daysSinceMonday);
            monday.setHours(0, 0, 0, 0);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);
            const fmtDate = d => {
                const y = d.getFullYear();
                const m = (d.getMonth() + 1).toString().padStart(2, '0');
                const dayN = d.getDate().toString().padStart(2, '0');
                return `${y}-${m}-${dayN}`;
            };
            query += ' WHERE COALESCE(menu_date, DATE(date_ajout)) >= ? AND COALESCE(menu_date, DATE(date_ajout)) <= ?';
            params.push(fmtDate(monday), fmtDate(sunday));
        }

        query += ' ORDER BY COALESCE(menu_date, date_ajout) DESC';

        const rows = await db.select(query, params, 'remote');
        const results = (rows || []).map(r => ({ id: r.id, date_ajout: r.date_ajout, menu_date: r.menu_date || null, auteur_id: r.auteur_id, titre: r.titre, allergenes: r.allergenes ? JSON.parse(r.allergenes) : null }));
        return res.status(200).json(results);
    } catch (err) {
        console.error(`[Menus GET Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});


router.post('/addCommandeCantine', authMiddleware, async (req, res) => {
    try {

        const asso = req.user.nameAsso;
        const email = req.user.email;
        // Plus tard : const asso = req.user.asso;

        const { dateCommande, quantitePlats, zoneDistribution } = req.body;

        // Validation des champs requis
        if (!dateCommande || !quantitePlats || !zoneDistribution) {
            return res.status(400).json({
                message: 'Date de livraison, quantité de plats et zone de distribution sont requis.'
            });
        }

        // Validation de la quantité
        if (quantitePlats <= 0) {
            return res.status(400).json({
                message: 'La quantité doit être supérieure à 0.'
            });
        }

        const result = await db.insert('Commandes', {
            ajout: new Date().toISOString().split('T')[0],
            asso: asso,
            livraison: dateCommande,
            email: email,
            repas_quantite: parseInt(quantitePlats),
            colis_quantite: 0,
            total_quantite: parseInt(quantitePlats),
            moyen: 'web',
            total_prix: 0,
            type: 'cantine',
            statut: 'en_attente',
            zone: zoneDistribution,
        }, 'remote');

        // Envoi de l'email de confirmation
        const nameAsso = req.user.nameAsso || asso; // Récupération du nom de l'association
        const templateId = 7726824; // ID du template Mailjet
        const baseUrl = process.env.URL_ORIGIN || 'https://cantine.acdlp.com';
        jourRecup = dateCommande;
        creneau = 'avant 20h00';
        nbRepas = String(quantitePlats);
        const variables = {
            jourRecup,
            creneau,
            nbRepas
        };
        const subject = `Nouvelle commande cantine #${result.insertId} pour ${nameAsso}`;
        await sendTemplateEmail(email, templateId, variables, subject);

        return res.status(201).json({
            message: 'Commande ajoutée avec succès.',
            id: result.insertId,
            commande: {
                id: result.insertId,
                livraison: dateCommande,
                quantite: quantitePlats,
                zone: zoneDistribution,
                statut: 'en_attente'
            }
        });

    } catch (err) {
        console.error(`[Cantine Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Route pour annuler une commande (changer statut en 'annulee')
router.put('/annulerCommande/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const email = req.user.email;

        // Récupérer la commande pour vérifier propriété et date de livraison
        const query = 'SELECT id, livraison, email, repas_quantite FROM Commandes WHERE id = ? AND email = ? LIMIT 1';
        const rows = await db.select(query, [id, email], 'remote');
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Commande introuvable' });
        }
        const commande = rows[0];
        const livraisonDate = new Date(commande.livraison);
        const today = new Date();
        livraisonDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (livraisonDate < today) {
            return res.status(400).json({ message: 'Impossible d\'annuler : la date de livraison est déjà passée.' });
        }

        // Mettre à jour le statut
        const updateResult = await db.update('Commandes', { statut: 'annulee' }, 'id = ?', [id], 'remote');

        // Email d'annulation (template 7755508)
        try {
            const templateId = 7755508;
            const formatDateFR = (dStr) => {
                if (!dStr) return '';
                // Normaliser yyyy-mm-dd
                let iso = dStr;
                if (iso.includes('T')) iso = iso.split('T')[0];
                const [y, m, d] = iso.split('-');
                return `${d}/${m}/${y}`;
            };
            const jourRecup = commande.livraison;
            // Récupérer l'amende éventuelle (compensationCantine)
            let compensationCantine = '0';
            try {
                const amRows = await db.select('SELECT ob.amende FROM users u INNER JOIN onboarding_backoffice ob ON u.id = ob.user_id WHERE u.email = ? LIMIT 1', [email], 'remote');
                if (amRows && amRows[0] && amRows[0].amende !== null && amRows[0].amende !== undefined) {
                    compensationCantine = String(amRows[0].amende);
                }
            } catch (amErr) {
                console.error('[Cantine annulerCommande] Erreur récupération amende:', amErr);
            }
            const variables = {
                nbRepas: String(commande.repas_quantite || 0),
                jourRecup,
                numeroCommande: String(commande.id),
                compensationCantine,
            };
            const subject = `Annulation commande cantine #${commande.id}`;
            await sendTemplateEmail(email, templateId, variables, subject);
            console.log(`[Cantine] Email annulation envoyé pour commande ${commande.id} à ${email}`);
        } catch (emailErr) {
            console.error('[Cantine] Erreur envoi email annulation:', emailErr);
            // Ne pas bloquer la réponse
        }
        return res.status(200).json({ message: 'Commande annulée', result: updateResult });
    } catch (err) {
        console.error('[Annulation Commande Error]:', err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Modifier la quantité d'une commande (respect des quotas et délai: jusqu'à la veille)
router.put('/modifierCommande/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { repas_quantite } = req.body || {};
        const email = req.user.email;

        if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
        const newQty = parseInt(repas_quantite, 10);
        if (!newQty || newQty < 1) {
            return res.status(400).json({ message: 'Quantité invalide (min 1). Utilisez Annuler pour 0.' });
        }

        // Charger la commande et vérifier propriété
        const rows = await db.select('SELECT id, livraison, email, repas_quantite, statut FROM Commandes WHERE id = ? AND email = ? LIMIT 1', [id, email], 'remote');
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Commande introuvable' });
        }
        const commande = rows[0];

        // Délai: modification autorisée jusqu'à la veille
        const livraisonDate = new Date(commande.livraison);
        const today = new Date();
        const cutoff = new Date(today);
        // Comparaison jour: on autorise si aujourd'hui < livraison - 1 jour
        const livraisonMinusOne = new Date(livraisonDate);
        livraisonMinusOne.setDate(livraisonDate.getDate() - 1);
        livraisonDate.setHours(0, 0, 0, 0);
        cutoff.setHours(0, 0, 0, 0);
        livraisonMinusOne.setHours(0, 0, 0, 0);
        if (!(cutoff < livraisonMinusOne)) {
            return res.status(400).json({ message: 'Modification impossible : la veille de la livraison est passée.' });
        }

        // Calcul du quota et de la capacité restante pour cette date (quota par jour)
        let livraisonDateStr = commande.livraison;
        if (typeof livraisonDateStr === 'string' && livraisonDateStr.includes('T')) {
            livraisonDateStr = livraisonDateStr.split('T')[0];
        } else if (livraisonDateStr instanceof Date) {
            const y = livraisonDateStr.getFullYear();
            const m = String(livraisonDateStr.getMonth() + 1).padStart(2, '0');
            const dd = String(livraisonDateStr.getDate()).padStart(2, '0');
            livraisonDateStr = `${y}-${m}-${dd}`;
        }
        const quotaRows = await db.select('SELECT repas_quantite FROM Quotas2 WHERE date_jour = ? LIMIT 1', [livraisonDateStr], 'remote');
        const quotaRepas = (quotaRows && quotaRows[0]) ? (quotaRows[0].repas_quantite || 0) : 0;

        // Somme des commandes actives ce jour (statuts consommant de la capacité)
        const totalTakenRows = await db.select("SELECT COALESCE(SUM(repas_quantite),0) as total FROM Commandes WHERE livraison = ? AND statut IN ('a_preparer','en_attente','a_deposer')", [commande.livraison], 'remote');
        const totalTaken = (totalTakenRows && totalTakenRows[0]) ? (totalTakenRows[0].total || 0) : 0;

        // Capacité disponible pour augmenter = quota - (totalTaken - quantité actuelle)
        const currentQty = Number(commande.repas_quantite) || 0;
        const availableForIncrease = Math.max(0, quotaRepas - Math.max(0, totalTaken - currentQty));
        const maxAllowed = currentQty + availableForIncrease;

        if (newQty > maxAllowed) {
            return res.status(400).json({ message: `Quantité maximale autorisée: ${maxAllowed}` });
        }

        // Mettre à jour la commande
        await db.update('Commandes', { repas_quantite: newQty, total_quantite: newQty }, 'id = ?', [id], 'remote');

        // Email modification (template 7726731) - nouvelle quantité seulement
        try {
            const templateId = 7726731;
            const formatDateFR = (dStr) => {
                if (!dStr) return '';
                let iso = dStr;
                if (iso.includes('T')) iso = iso.split('T')[0];
                const [y, m, d] = iso.split('-');
                return `${d}/${m}/${y}`;
            };
            const jourRecup = commande.livraison;
            // Récupérer amende (compensationCantine)
            let compensationCantine = '0';
            try {
                const amRows = await db.select('SELECT ob.amende FROM users u INNER JOIN onboarding_backoffice ob ON u.id = ob.user_id WHERE u.email = ? LIMIT 1', [email], 'remote');
                if (amRows && amRows[0] && amRows[0].amende !== null && amRows[0].amende !== undefined) {
                    compensationCantine = String(amRows[0].amende);
                }
            } catch (amErr) {
                console.error('[Cantine modifierCommande] Erreur récupération amende:', amErr);
            }
            const variables = {
                nbRepas: String(newQty),
                jourRecup,
                numeroCommande: String(commande.id),
                compensationCantine,
            };
            const subject = `Modification commande cantine #${commande.id}`;
            await sendTemplateEmail(email, templateId, variables, subject);
            console.log(`[Cantine] Email modification envoyé pour commande ${commande.id} à ${email}`);
        } catch (emailErr) {
            console.error('[Cantine] Erreur envoi email modification:', emailErr);
        }
        return res.status(200).json({ message: 'Commande mise à jour', id, repas_quantite: newQty });
    } catch (err) {
        console.error('[ModifierCommande Error]:', err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// ----------------------------------
// Rappel J-1 des commandes (à appeler via cron vers 10h00)
// ----------------------------------
router.post('/rappelCantineJMoinsUn', authMiddleware, async (req, res) => {
    try {
        // Date cible: demain (J+1)
        const today = new Date();
        const target = new Date(today);
        target.setDate(today.getDate() + 1);
        const y = target.getFullYear();
        const m = String(target.getMonth() + 1).padStart(2, '0');
        const d = String(target.getDate()).padStart(2, '0');
        const isoTarget = `${y}-${m}-${d}`; // yyyy-mm-dd
        const formatDateFR = (iso) => {
            if (!iso) return '';
            const [yy, mm, dd] = iso.split('-');
            return `${dd}/${mm}/${yy}`;
        };
        const jourRecup = formatDateFR(isoTarget);

        // Récupérer commandes pour demain avec statuts sélectionnés
        const commandes = await db.select("SELECT id, livraison, email, repas_quantite FROM Commandes WHERE livraison = ? AND statut IN ('en_attente','a_preparer','a_deposer')", [isoTarget], 'remote');
        if (!commandes || commandes.length === 0) {
            return res.status(200).json({ message: 'Aucune commande à rappeler', total: 0 });
        }

        let sent = 0;
        for (const cmd of commandes) {
            try {
                // Amende éventuelle
                let compensationCantine = '0';
                try {
                    const amRows = await db.select('SELECT ob.amende FROM users u INNER JOIN onboarding_backoffice ob ON u.id = ob.user_id WHERE u.email = ? LIMIT 1', [cmd.email], 'remote');
                    if (amRows && amRows[0] && amRows[0].amende !== null && amRows[0].amende !== undefined) {
                        compensationCantine = String(amRows[0].amende);
                    }
                } catch (amErr) {
                    console.error('[Cantine rappel J-1] Erreur récupération amende:', amErr);
                }
                const variables = {
                    nbRepas: String(cmd.repas_quantite || 0),
                    jourRecup,
                    numeroCommande: String(cmd.id),
                    compensationCantine,
                };
                const templateId = 7726731;
                const subject = `Rappel cantine pour demain #${cmd.id}`;
                await sendTemplateEmail(cmd.email, templateId, variables, subject);
                sent++;
            } catch (emailErr) {
                console.error(`[Cantine rappel J-1] Erreur envoi email commande ${cmd.id}:`, emailErr);
            }
        }
        return res.status(200).json({ message: 'Rappels envoyés', total: sent });
    } catch (err) {
        console.error('[Cantine rappel J-1 Error]:', err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

module.exports = router;