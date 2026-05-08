const express = require('express');
const { authMiddleware } = require('./auth');
const db = require('../services/bdd');

const router = express.Router();

async function getUserId(email) {
    const rows = await db.select('SELECT id FROM asso_users WHERE email = ? LIMIT 1', [email], 'remote');
    return rows[0]?.id || null;
}

function sanitizeAddresses(input) {
    if (!Array.isArray(input)) return [];
    return input
        .filter(a => a && typeof a.line1 === 'string' && a.line1.trim())
        .map(a => ({
            line1: a.line1.trim(),
            postal_code: (a.postal_code || '').trim() || null,
            city: (a.city || '').trim() || null,
            country: (a.country || 'France').trim() || 'France'
        }));
}

// Format snapshot utilisé pour Commandes.zone (string lisible cuisine)
function buildZoneSnapshot(addresses) {
    return addresses
        .map(a => [a.line1, [a.postal_code, a.city].filter(Boolean).join(' '), a.country].filter(Boolean).join(', '))
        .join(' | ');
}

// GET /api/zones?archived=1 — liste les zones de l'asso (actives par défaut)
router.get('/zones', authMiddleware, async (req, res) => {
    try {
        const userId = await getUserId(req.user.email);
        if (!userId) return res.status(404).json({ message: 'Utilisateur introuvable.' });

        const includeArchived = req.query.archived === '1';
        const zones = await db.select(
            `SELECT id, nom, archived, created_at FROM zones_distribution
             WHERE user_id = ? ${includeArchived ? '' : 'AND archived = 0'}
             ORDER BY archived ASC, nom ASC`,
            [userId], 'remote'
        );

        if (zones.length === 0) return res.status(200).json({ zones: [] });

        const zoneIds = zones.map(z => z.id);
        const placeholders = zoneIds.map(() => '?').join(',');
        const addresses = await db.select(
            `SELECT id, zone_id, line1, postal_code, city, country, ordre
             FROM zone_addresses
             WHERE zone_id IN (${placeholders})
             ORDER BY zone_id, ordre`,
            zoneIds, 'remote'
        );

        const byZone = new Map();
        for (const a of addresses) {
            if (!byZone.has(a.zone_id)) byZone.set(a.zone_id, []);
            byZone.get(a.zone_id).push({
                id: a.id, line1: a.line1, postal_code: a.postal_code,
                city: a.city, country: a.country, ordre: a.ordre
            });
        }

        const result = zones.map(z => ({ ...z, addresses: byZone.get(z.id) || [] }));
        return res.status(200).json({ zones: result });
    } catch (err) {
        console.error('[zones GET Error]:', err);
        return res.status(500).json({ message: 'Erreur lors de la récupération des zones.' });
    }
});

// POST /api/zones  body: { nom, addresses: [{ line1, postal_code, city, country }] }
router.post('/zones', authMiddleware, async (req, res) => {
    try {
        const userId = await getUserId(req.user.email);
        if (!userId) return res.status(404).json({ message: 'Utilisateur introuvable.' });

        const { nom, addresses } = req.body || {};
        if (!nom || typeof nom !== 'string' || !nom.trim()) {
            return res.status(400).json({ message: 'Nom de zone requis.' });
        }
        const valid = sanitizeAddresses(addresses);
        if (valid.length === 0) {
            return res.status(400).json({ message: 'Au moins une adresse avec line1 requise.' });
        }

        const insertResult = await db.insert('zones_distribution', {
            user_id: userId,
            nom: nom.trim()
        }, 'remote');
        const zoneId = insertResult.insertId;

        for (let i = 0; i < valid.length; i++) {
            await db.insert('zone_addresses', {
                zone_id: zoneId,
                line1: valid[i].line1,
                postal_code: valid[i].postal_code,
                city: valid[i].city,
                country: valid[i].country,
                ordre: i
            }, 'remote');
        }

        return res.status(201).json({ message: 'Zone créée.', success: true, id: zoneId });
    } catch (err) {
        console.error('[zones POST Error]:', err);
        return res.status(500).json({ message: 'Erreur lors de la création de la zone.' });
    }
});

// PUT /api/zones/:id  body: { nom, addresses } — remplace nom + adresses complètes
router.put('/zones/:id', authMiddleware, async (req, res) => {
    try {
        const userId = await getUserId(req.user.email);
        if (!userId) return res.status(404).json({ message: 'Utilisateur introuvable.' });

        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ message: 'ID invalide.' });

        const ownerRows = await db.select(
            'SELECT id FROM zones_distribution WHERE id = ? AND user_id = ? LIMIT 1',
            [id, userId], 'remote'
        );
        if (!ownerRows[0]) return res.status(404).json({ message: 'Zone introuvable.' });

        const { nom, addresses } = req.body || {};
        if (!nom || typeof nom !== 'string' || !nom.trim()) {
            return res.status(400).json({ message: 'Nom de zone requis.' });
        }
        const valid = sanitizeAddresses(addresses);
        if (valid.length === 0) {
            return res.status(400).json({ message: 'Au moins une adresse avec line1 requise.' });
        }

        await db.update('zones_distribution', { nom: nom.trim() }, 'id = ?', [id], 'remote');
        await db.delete('zone_addresses', 'zone_id = ?', [id], 'remote');
        for (let i = 0; i < valid.length; i++) {
            await db.insert('zone_addresses', {
                zone_id: id,
                line1: valid[i].line1,
                postal_code: valid[i].postal_code,
                city: valid[i].city,
                country: valid[i].country,
                ordre: i
            }, 'remote');
        }

        return res.status(200).json({ message: 'Zone mise à jour.', success: true });
    } catch (err) {
        console.error('[zones PUT Error]:', err);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de la zone.' });
    }
});

// DELETE /api/zones/:id — soft delete (archived=1)
router.delete('/zones/:id', authMiddleware, async (req, res) => {
    try {
        const userId = await getUserId(req.user.email);
        if (!userId) return res.status(404).json({ message: 'Utilisateur introuvable.' });

        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ message: 'ID invalide.' });

        const ownerRows = await db.select(
            'SELECT id FROM zones_distribution WHERE id = ? AND user_id = ? LIMIT 1',
            [id, userId], 'remote'
        );
        if (!ownerRows[0]) return res.status(404).json({ message: 'Zone introuvable.' });

        await db.update('zones_distribution', { archived: 1 }, 'id = ?', [id], 'remote');
        return res.status(200).json({ message: 'Zone archivée.', success: true });
    } catch (err) {
        console.error('[zones DELETE Error]:', err);
        return res.status(500).json({ message: 'Erreur lors de l\'archivage de la zone.' });
    }
});

module.exports = { router, buildZoneSnapshot, sanitizeAddresses };
