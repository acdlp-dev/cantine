const express = require("express");
const router = express.Router();
const { select, insert } = require("../services/bdd");

// Route de vérification simple
router.get("/check", async (req, res) => {
    try {
        const result = await select("SELECT 1 FROM dual");
        res.json({ message: "Requête réussie", result });
    } catch (err) {
        res.status(500).json({ error: err });
    }
});

// Route pour insérer un utilisateur
router.post("/add-user", async (req, res) => {
    const { username, email } = req.body;
    try {
        await insert("users", ["username", "email"], [username, email], 'remote');
        res.json({ message: `Utilisateur ${username} ajouté avec succès` });
    } catch (err) {
        res.status(500).json({ error: "Erreur d'insertion" });
    }
});

module.exports = router;
