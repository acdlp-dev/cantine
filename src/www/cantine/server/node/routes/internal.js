const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../services/bdd');

const router = express.Router();

// Authentification par API key partagée entre les services ACDLP (bo, cantine, ...)
function internalApiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-internal-api-key'];
    if (!apiKey || apiKey !== process.env.INTERNAL_API_SECRET) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
    }
    next();
}

router.use(internalApiKeyAuth);

// Sert le document justificatif d'une asso (appelé par le bo)
router.get('/internal/document/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ message: 'ID invalide.' });

        const rows = await db.select(
            'SELECT rna, document_justificatif FROM asso_users WHERE id = ? LIMIT 1',
            [id], 'remote'
        );
        const user = rows[0];
        if (!user || !user.rna || !user.document_justificatif) {
            return res.status(404).json({ message: 'Aucun document justificatif.' });
        }

        const safeRna = String(user.rna).replace(/[^a-zA-Z0-9_-]/g, '');
        const safeFile = path.basename(String(user.document_justificatif));
        const filePath = path.join(__dirname, '..', 'pdf', 'backoffice', 'documentassociation', safeRna, safeFile);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'Document introuvable sur le serveur.' });
        }
        return res.sendFile(filePath);
    } catch (err) {
        console.error('[Internal getDocument Error]:', err);
        return res.status(500).json({ message: 'Erreur lors de la récupération du document.' });
    }
});

module.exports = router;
