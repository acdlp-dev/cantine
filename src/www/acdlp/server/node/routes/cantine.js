const express = require('express');
// Middleware d'authentification 
const { authMiddleware } = require('./auth');
const db = require('../services/bdd');
const pdfService = require('../services/pdfService');
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

        const resp = await fetch(url.toString(), { headers: { 'User-Agent': 'myamana/1.0 (contact@myamana.fr)' } });
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

// Mettre à jour un quota existant
router.put('/quotas/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        let { date_jour, jour, day_of_week, repas_quantite, colis_quantite, creneau_debut, creneau_fin } = req.body || {};

        // Vérifier l'existence
        const rows = await db.select('SELECT * FROM Quotas2 WHERE id = ? LIMIT 1', [id], 'remote');
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Quota introuvable' });
        }

        // Helpers
        const isIsoDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
        const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

        // Back-compat: si 'jour' ressemble à une date ISO, on l'utilise comme date_jour
        if (!date_jour && jour && isIsoDate(jour)) {
            date_jour = jour;
        }

        const updatePayload = {};
        if (date_jour !== undefined) updatePayload.date_jour = date_jour || null;
        if (jour !== undefined) {
            // si 'jour' est une date ISO, on stocke le libellé du jour en FR
            if (isIsoDate(jour)) {
                const d = new Date(jour);
                updatePayload.jour = dayNames[d.getDay()];
            } else {
                updatePayload.jour = jour;
            }
        }
        if (day_of_week !== undefined) updatePayload.day_of_week = parseInt(day_of_week, 10);
        if (repas_quantite !== undefined) updatePayload.repas_quantite = parseInt(repas_quantite, 10);
        if (colis_quantite !== undefined) updatePayload.colis_quantite = parseInt(colis_quantite, 10);
        if (creneau_debut !== undefined) updatePayload.creneau_debut = creneau_debut;
        if (creneau_fin !== undefined) updatePayload.creneau_fin = creneau_fin;

        // Si on a date_jour et pas de 'jour' (libellé), on le calcule
        if (updatePayload.date_jour && updatePayload.jour === undefined) {
            const d = new Date(updatePayload.date_jour);
            updatePayload.jour = dayNames[d.getDay()];
        }
        // Si on a date_jour et pas de day_of_week, on le calcule (1..7, dimanche=1)
        if (updatePayload.date_jour && updatePayload.day_of_week === undefined) {
            const d = new Date(updatePayload.date_jour);
            updatePayload.day_of_week = d.getDay() + 1;
        }

        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
        }

        await db.update('Quotas2', updatePayload, 'id = ?', [id], 'remote');

        // Retourner la ligne mise à jour
        const updated = await db.select('SELECT id, date_jour, jour, day_of_week, repas_quantite, colis_quantite, creneau_debut, creneau_fin FROM Quotas2 WHERE id = ? LIMIT 1', [id], 'remote');
        return res.status(200).json({ message: 'Quota mis à jour', quota: updated[0] });
    } catch (err) {
        console.error(`[Quotas PUT Error]: ${err.message}`, err);
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


// Mettre à jour un menu
router.put('/menus/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const { titre, allergenes, menu_date } = req.body || {};
        const rows = await db.select('SELECT * FROM Menus WHERE id = ? LIMIT 1', [id], 'remote');
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Menu introuvable' });
        }
        const updatePayload = {};
        if (titre !== undefined) updatePayload.titre = titre;
        if (allergenes !== undefined) updatePayload.allergenes = allergenes ? JSON.stringify(allergenes) : null;
        if (menu_date !== undefined) updatePayload.menu_date = menu_date || null;
        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
        }
        await db.update('Menus', updatePayload, 'id = ?', [id], 'remote');
        const updatedRow = await db.select('SELECT id, date_ajout, menu_date, titre, allergenes FROM Menus WHERE id = ? LIMIT 1', [id], 'remote');
        const updated = updatedRow[0];
        updated.allergenes = updated.allergenes ? JSON.parse(updated.allergenes) : null;
        return res.status(200).json(updated);
    } catch (err) {
        console.error(`[Menus PUT Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});


// Back-compat / front-specific routes used by client naming
// GET menusAdmin -> same as /menus
router.get('/menusAdmin', authMiddleware, async (req, res) => {
    try {
        // reuse /menus logic but here accept same query params
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
            // default to current week
            const today = new Date();
            const day = today.getDay();
            const daysSinceMonday = (day + 6) % 7;
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
        console.error(`[MenusAdmin GET Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// POST createMenus -> same as POST /menus
router.post('/createMenus', authMiddleware, async (req, res) => {
    try {
        const { titre, allergenes, menu_date } = req.body || {};
        const allergenesJson = allergenes ? JSON.stringify(allergenes) : null;
        const payload = { titre: titre || null, allergenes: allergenesJson };
        if (menu_date) payload.menu_date = menu_date;
        const result = await db.insert('Menus', payload, 'remote');
        const created = { id: result.insertId, date_ajout: new Date(), menu_date: menu_date || null, titre: titre || null, allergenes: allergenes || null };
        return res.status(201).json(created);
    } catch (err) {
        console.error(`[createMenus POST Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// PUT updateMenus/:id -> same as PUT /menus/:id
router.put('/updateMenus/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const { titre, allergenes, menu_date } = req.body || {};
        const rows = await db.select('SELECT * FROM Menus WHERE id = ? LIMIT 1', [id], 'remote');
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Menu introuvable' });
        }
        const updatePayload = {};
        if (titre !== undefined) updatePayload.titre = titre;
        if (allergenes !== undefined) updatePayload.allergenes = allergenes ? JSON.stringify(allergenes) : null;
        if (menu_date !== undefined) updatePayload.menu_date = menu_date || null;
        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
        }
        await db.update('Menus', updatePayload, 'id = ?', [id], 'remote');
        const updatedRow = await db.select('SELECT id, date_ajout, menu_date, titre, allergenes FROM Menus WHERE id = ? LIMIT 1', [id], 'remote');
        const updated = updatedRow[0];
        updated.allergenes = updated.allergenes ? JSON.parse(updated.allergenes) : null;
        return res.status(200).json(updated);
    } catch (err) {
        console.error(`[updateMenus PUT Error]: ${err.message}`, err);
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
        const templateId = 5088966; // ID du template Mailjet
        const baseUrl = process.env.URL_ORIGIN || 'https://myamana.fr';
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

        // Email d'annulation (template 6799304)
        try {
            const templateId = 6799304;
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

        // Email modification (template 7410380) - nouvelle quantité seulement
        try {
            const templateId = 7410380;
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



router.get('/admin/getCommandesAssosCantine', authMiddleware, async (req, res) => {
    try {
        // Admin: return all commandes. Default to today's livraison if no date filter provided.
        let query = 'SELECT id, ajout, livraison, repas_quantite, colis_quantite, asso, statut, zone FROM Commandes';
        const params = [];
        const { dateFrom, dateTo, limit } = req.query || {};

        if (dateFrom && dateTo) {
            query += ' WHERE livraison >= ? AND livraison <= ?';
            params.push(dateFrom, dateTo);
        } else if (dateFrom) {
            query += ' WHERE livraison >= ?';
            params.push(dateFrom);
        } else if (dateTo) {
            query += ' WHERE livraison <= ?';
            params.push(dateTo);
        } else {
            // default: today's commandes (livraison equal to today)
            const today = new Date();
            const y = today.getFullYear();
            const m = (today.getMonth() + 1).toString().padStart(2, '0');
            const d = today.getDate().toString().padStart(2, '0');
            const iso = `${y}-${m}-${d}`; // yyyy-mm-dd
            query += ' WHERE livraison = ?';
            params.push(iso);
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

        const results = await db.select(query, params, 'remote');

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

module.exports = router;

// ----------------------------------
// Associations (liste des users role 'association')
// ----------------------------------
router.get('/associations', authMiddleware, async (req, res) => {
    try {
        // optional limit param
        const { limit } = req.query || {};
        let safeLimit = 1000;
        if (limit) {
            const l = parseInt(limit, 10);
            if (!isNaN(l) && l > 0) safeLimit = Math.min(l, 10000);
        }

        // select basic fields from Users table with inner join on onboarding_backoffice where cantine = 1
        const query = `SELECT u.id, u.email, u.firstname, u.role, ob.statut, ob.doubleChecked
                   FROM users u 
                   INNER JOIN onboarding_backoffice ob ON u.id = ob.user_id 
                   WHERE u.role = 'association' AND ob.cantine = 1 
                   ORDER BY u.email ASC LIMIT ${safeLimit}`;
        const rows = await db.select(query, [], 'remote');
        if (!rows || rows.length === 0) return res.status(200).json({ results: [], total: 0 });
        return res.status(200).json({ results: rows, total: rows.length });
    } catch (err) {
        console.error(`[Associations GET Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// PATCH route to update onboarding status for an association (backoffice)
router.patch('/updateAssociationStatus/:id', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { statut, amende } = req.body || {};

        if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });
        if (!statut || (statut !== 'blocked' && statut !== 'ok')) {
            return res.status(400).json({ message: "Invalid 'statut' value. Use 'blocked' or 'ok'" });
        }

        // Vérifier qu'un onboarding_backoffice existe pour cet user
        const rows = await db.select('SELECT * FROM onboarding_backoffice WHERE user_id = ? LIMIT 1', [id], 'remote');
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Onboarding record not found for this user' });
        }

        const updatePayload = { statut };

        // If statut is 'blocked' and amende provided, validate numeric and store it
        if (statut === 'blocked') {
            if (amende !== undefined && amende !== null && amende !== '') {
                const numeric = Number(amende);
                if (Number.isNaN(numeric) || numeric < 0) {
                    return res.status(400).json({ message: 'Invalid amende value; must be a non-negative number' });
                }
                updatePayload.amende = numeric;
            }
        } else {
            // statut === 'ok' -> clear amende
            updatePayload.amende = null;
        }

        await db.update('onboarding_backoffice', updatePayload, 'user_id = ?', [id], 'remote');

        // If we changed statut to 'blocked' or back to 'ok', reflect that on future Commandes
        try {
            // Determine which identifier is used on Commandes: Commandes.email contains the user email
            // We'll try to find the user's email from users table, and also the associated Asso email if present.
            const userRows = await db.select('SELECT email FROM users WHERE id = ? LIMIT 1', [id]);
            const userEmail = (userRows && userRows[0]) ? userRows[0].email : null;

            // Build today's ISO date (yyyy-mm-dd) to compare livraison
            const today = new Date();
            const y = today.getFullYear();
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const d = String(today.getDate()).padStart(2, '0');
            const isoToday = `${y}-${m}-${d}`;

            if (statut === 'blocked') {
                // Set future commandes (livraison > today) for this association to 'blocked'
                if (userEmail) {
                    await db.update('Commandes', { statut: 'blocked' }, 'email = ? AND livraison > ?', [userEmail, isoToday], 'remote');
                }
            } else if (statut === 'ok') {
                // Simplified: do not reactivate or adjust previously blocked future commandes.
                // They remain 'blocked' and users must re-saisir leurs commandes.
            }
        } catch (cmdErr) {
            console.error('[updateAssociationStatus: Commandes update error]:', cmdErr);
            // don't fail the request if commande update fails; onboarding status was already updated
        }

        // Retourner la ligne mise à jour
        const updated = await db.select('SELECT * FROM onboarding_backoffice WHERE user_id = ? LIMIT 1', [id], 'remote');

        // Email si statut = blocked (template 7410386)
        try {
            if (statut === 'blocked') {
                // Récupérer email utilisateur
                const userRows2 = await db.select('SELECT email FROM users WHERE id = ? LIMIT 1', [id]);
                const userEmail2 = (userRows2 && userRows2[0]) ? userRows2[0].email : null;
                if (userEmail2) {
                    const templateId = 7410386;
                    const compensationCantine = (updatePayload.amende !== undefined && updatePayload.amende !== null) ? String(updatePayload.amende) : '0';
                    const variables = {
                        nbRepas: '0',
                        jourRecup: '',
                        numeroCommande: '',
                        compensationCantine,
                    };
                    const subject = 'Compte cantine bloqué';
                    await sendTemplateEmail(userEmail2, templateId, variables, subject);
                    console.log(`[Cantine] Email compte bloqué envoyé à ${userEmail2}`);
                }
            }
        } catch (emailErr) {
            console.error('[Cantine] Erreur envoi email compte bloqué:', emailErr);
        }

        return res.status(200).json({ message: 'Statut mis à jour', onboarding: updated[0] });
    } catch (err) {
        console.error(`[updateAssociationStatus Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});



// PATCH: Valider une association (doubleChecked=1)
router.patch('/associations/:id/validate', authMiddleware, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

        // Vérifier qu'un onboarding_backoffice existe pour cet user
        const rows = await db.select('SELECT * FROM onboarding_backoffice WHERE user_id = ? LIMIT 1', [id], 'remote');
        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: 'Onboarding record not found for this user' });
        }

        await db.update('onboarding_backoffice', { doubleChecked: 1 }, 'user_id = ?', [id], 'remote');
        const updated = await db.select('SELECT * FROM onboarding_backoffice WHERE user_id = ? LIMIT 1', [id], 'remote');
        return res.status(200).json({ message: 'Association validée', onboarding: updated[0] });
    } catch (err) {
        console.error('[ValidateAssociation PATCH Error]:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// ----------------------------------
// Rappel J-1 des commandes (à appeler via cron vers 10h00)
// ----------------------------------
router.post('/rappelCantineJMoinsUn', authMiddleware, async (req, res) => {
    try {
        // Autoriser seulement rôle admin/backoffice
        const role = req.user.role;
        if (!['admin', 'superadmin', 'backoffice'].includes(role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

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
                const templateId = 7410387;
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