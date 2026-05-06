const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Services et utilitaires
const db = require('../services/bdd');
const { sendTemplateEmail } = require('../services/mailService');
const rnaService = require('../services/rnaService');

// Variables et instanciations
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const urlOrigin = process.env.URL_ORIGIN;

// Helpers
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => {
    if (password.length < 6) {
        return { valid: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' };
    }
    const problematicChars = [];
    for (let i = 0; i < password.length; i++) {
        const charCode = password[i].charCodeAt(0);
        if (charCode >= 0 && charCode <= 31) {
            problematicChars.push(`caractère de contrôle (code ${charCode})`);
        } else if (charCode === 127) {
            problematicChars.push('caractère DEL');
        }
    }
    if (problematicChars.length > 0) {
        const uniqueChars = [...new Set(problematicChars)];
        return {
            valid: false,
            message: `Le mot de passe contient des caractères non autorisés : ${uniqueChars.join(', ')}.`
        };
    }
    return { valid: true };
};
const generateResetToken = () => crypto.randomBytes(32).toString('hex');
const validateRna = (rna) => /^W[0-9A-Z]{9}$/.test(rna);

function authMiddleware(req, res, next) {
    try {
        const token = req.cookies.auth_token;
        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error(`[AuthMiddleware] Token error : ${err.message}`);
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
}

router.get('/backoffice/me', authMiddleware, (req, res) => {
    const { email, firstName, lastName, role, rna, nameAsso } = req.user;
    console.log("Appel à l'api /me. Informations récupérées du JWT pour : " + email);
    return res.status(200).json({
        email,
        prenom: firstName,
        nom: lastName,
        role: role,
        rna: rna || null,
        nameAsso: nameAsso || null
    });
});

// ----------------------------------------------------
// ROUTES PUBLIQUES
// ----------------------------------------------------

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    return res.status(200).json({ message: 'Logged out successfully.' });
});

// Routes protégées
router.get('/protected-route', authMiddleware, (req, res) => {
    return res.status(200).json({
        message: 'You have accessed a protected route!',
        user: req.user,
    });
});

router.get('/backoffice/protected-route', authMiddleware, (req, res) => {
    return res.status(200).json({
        message: 'You have accessed a protected backoffice route!',
        user: req.user,
    });
});

// ----------------------------------------------------
// INSCRIPTION BACKOFFICE - FLOW OTP (3 étapes)
// ----------------------------------------------------

// Étape 1 : Demande de code OTP
router.post('/backoffice/request-otp', async(req, res) => {
    const { email, confirmEmail } = req.body;
    console.log("Demande OTP cantine reçue pour " + email);

    if (!email || !confirmEmail) {
        return res.status(400).json({ message: 'Email et confirmation requis.' });
    }
    if (email !== confirmEmail) {
        return res.status(400).json({ message: 'Les adresses email ne correspondent pas.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Format d\'email invalide.' });
    }

    try {
        const existingUser = await db.select('SELECT * FROM asso_users WHERE email = ?', [email], 'remote');

        if (existingUser.length > 0) {
            const user = existingUser[0];
            if (user.is_verified && user.password) {
                // Compte déjà vérifié : envoyer un email informatif (protection énumération)
                console.log(`[CANTINE OTP SECURITY] Tentative d'inscription sur compte existant: ${email}`);
                try {
                    const resetToken = generateResetToken();
                    const tokenExpiry = Date.now() + 3600000;
                    await db.update('asso_users', { reset_token: resetToken, token_expiry: tokenExpiry }, 'email = ?', [email], 'remote');
                    const resetUrl = `${urlOrigin}/app/new-password/token/${resetToken}`;
                    await sendTemplateEmail(email, 7796174, {
                        prenom: user.firstName || 'Utilisateur',
                        lien_reinit_password: resetUrl,
                        lien_reinit: 'https://asso.acdlp.com/app/forgot-password'
                    }, 'Cantine ACDLP : Votre compte existe déjà');
                } catch (emailErr) {
                    console.error('[CANTINE OTP] Erreur envoi email compte existant:', emailErr);
                }
            } else {
                // Compte non vérifié ou sans mot de passe : mettre à jour avec nouveau OTP
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const otpExpiry = Date.now() + (10 * 60000); // 10 minutes

                await db.update('asso_users', {
                    verification_token: otp,
                    verification_token_expiry: otpExpiry
                }, 'email = ?', [email], 'remote');

                await sendTemplateEmail(email, 7726875, {
                    code_verification: otp
                }, 'Cantine ACDLP : Votre code de vérification');
            }
        } else {
            // Nouveau utilisateur : créer un enregistrement minimal
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = Date.now() + (10 * 60000);

            await db.insert('asso_users', {
                email,
                verification_token: otp,
                verification_token_expiry: otpExpiry,
                role: 'association',
                is_verified: 0
            }, 'remote');

            await sendTemplateEmail(email, 7726875, {
                code_verification: otp
            }, 'Cantine ACDLP : Votre code de vérification');
        }

        // Message générique (protection énumération)
        return res.status(200).json({
            message: 'Si cette adresse email est valide, un code de vérification a été envoyé.',
            expiresIn: 600
        });

    } catch (err) {
        console.error(`[Cantine Request OTP Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Étape 2 : Vérification du code OTP
router.post('/backoffice/verify-otp', async(req, res) => {
    const { email, code } = req.body;
    console.log(`[CANTINE OTP] Vérification du code pour: ${email}`);

    if (!email || !code) {
        return res.status(400).json({ message: 'Email et code requis.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Format d\'email invalide.' });
    }

    try {
        const user = await db.select(
            'SELECT * FROM asso_users WHERE email = ? AND verification_token = ? AND verification_token_expiry > ?',
            [email, code, Date.now()], 'remote'
        );

        if (user.length === 0) {
            return res.status(400).json({ message: 'Code invalide ou expiré.' });
        }

        const userData = user[0];

        // Générer un token de continuation sécurisé (24h)
        const completionToken = generateResetToken();
        const completionTokenExpiry = Date.now() + (24 * 3600000);

        await db.update('asso_users', {
            verification_token: completionToken,
            verification_token_expiry: completionTokenExpiry
        }, 'id = ?', [userData.id], 'remote');

        console.log(`[CANTINE OTP] Email vérifié avec succès pour: ${email}`);

        return res.status(200).json({
            message: 'Email vérifié avec succès.',
            token: completionToken,
            email: email
        });
    } catch (err) {
        console.error(`[Cantine Verify OTP Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Préparer le stockage temporaire pour les uploads du signup
const tempUploadDir = path.join(__dirname, '../pdf/backoffice/documentassociation', '_tmp');
if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
}
const allowedMimesSignup = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const uploadSignup = multer({
    dest: tempUploadDir,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (allowedMimesSignup.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Seuls les fichiers PDF, JPG et PNG sont acceptés'));
    }
});

// Étape 3 : Complétion de l'inscription (multipart: champs + document)
router.post('/backoffice/complete-signup', uploadSignup.single('document'), async(req, res) => {
    const { token, email, password, confirmPassword, firstName, lastName, rna } = req.body;
    console.log("Demande de complete-signup cantine reçue de " + email);

    // Validations
    if (!token || !email || !password || !confirmPassword || !firstName || !lastName || !rna) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
    }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
    }
    if (!validateRna(rna)) {
        return res.status(400).json({ message: 'RNA invalide. Format attendu : W + 9 caractères.' });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'Le document justificatif est obligatoire.' });
    }

    try {
        // Vérifier le token de continuation
        const user = await db.select(
            'SELECT * FROM asso_users WHERE email = ? AND verification_token = ? AND verification_token_expiry > ?',
            [email, token, Date.now()], 'remote'
        );

        if (user.length === 0) {
            return res.status(400).json({ message: 'Token invalide ou expiré. Veuillez recommencer l\'inscription.' });
        }

        const userData = user[0];

        // Déplacer le document justificatif
        let documentJustificatifFilename = '';
        try {
            const finalDir = path.join(__dirname, '../pdf/backoffice/documentassociation', rna);
            if (!fs.existsSync(finalDir)) {
                fs.mkdirSync(finalDir, { recursive: true });
            }
            const timestamp = Date.now();
            const extension = path.extname(req.file.originalname);
            const finalName = `${rna}_justificatif_${timestamp}${extension}`;
            const finalPath = path.join(finalDir, finalName);
            fs.renameSync(req.file.path, finalPath);
            documentJustificatifFilename = finalName;
            console.log(`[Complete Signup Cantine] Fichier déplacé: ${finalPath}`);
        } catch (moveErr) {
            console.error('[Complete Signup Cantine Upload Move Error]:', moveErr);
            return res.status(500).json({ message: 'Erreur lors du traitement du document justificatif.' });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Récupérer le nom de l'association via l'API RNA
        let raisonSociale = '';
        try {
            const rnaInfo = await rnaService.getAssociationInfo(rna);
            raisonSociale = rnaInfo.title;
            console.log(`[Complete Signup Cantine] Nom récupéré pour RNA ${rna}: ${raisonSociale}`);
        } catch (rnaError) {
            console.warn(`[Complete Signup Cantine] Impossible de récupérer le nom pour RNA ${rna}:`, rnaError.message);
        }

        // Mettre à jour l'utilisateur (incluant la raison sociale et le document)
        await db.update('asso_users', {
            password: hashedPassword,
            firstName,
            lastName,
            rna,
            nom: raisonSociale,
            is_verified: 1,
            verification_token: null,
            verification_token_expiry: null,
            document_justificatif: documentJustificatifFilename || null
        }, 'id = ?', [userData.id], 'remote');

        // Envoyer l'email de bienvenue
        try {
            await sendTemplateEmail(
                email,
                7726868,
                { logo_url: '', lien_signin: 'https://asso.acdlp.com/app/signin' },
                'Cantine ACDLP : Bienvenue !'
            );
            console.log(`[Complete Signup Cantine] Email de bienvenue envoyé à: ${email}`);
        } catch (emailErr) {
            console.error(`[Complete Signup Cantine] Erreur envoi email bienvenue:`, emailErr);
        }

        return res.status(201).json({
            message: 'Inscription complétée avec succès !',
            email: userData.email
        });
    } catch (err) {
        console.error(`[Complete Signup Cantine Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// ----------------------------------------------------
// RÉINITIALISATION DE MOT DE PASSE
// ----------------------------------------------------

router.post('/request-password-reset', async(req, res) => {
    const { email } = req.body;

    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Format d\'email invalide.' });
    }

    try {
        const results = await db.select('SELECT * FROM asso_users WHERE email = ?', [email], 'remote');

        if (results.length === 0) {
            // Protection énumération : envoyer un email générique
            await sendTemplateEmail(email, 7726847, {
                lien_creation: "https://asso.acdlp.com/app/signup"
            }, 'Cantine ACDLP : Compte inconnu');
            return res.status(200).json({
                message: 'Si cette adresse email est valide, un email a été envoyé.'
            });
        }

        const user = results[0];

        if (!user.is_verified || !user.password) {
            // Compte non finalisé : inviter à recommencer l'inscription
            return res.status(200).json({
                message: 'Votre compte n\'est pas encore finalisé. Veuillez recommencer l\'inscription.',
                requiresSignup: true
            });
        }

        // Compte vérifié : générer un lien de réinitialisation
        const resetToken = generateResetToken();
        const tokenExpiry = Date.now() + 3600000;

        await db.update('asso_users', {
            reset_token: resetToken,
            token_expiry: tokenExpiry
        }, 'email = ?', [email], 'remote');

        const resetUrl = `${urlOrigin}/app/new-password/token/${resetToken}`;

        await sendTemplateEmail(email, 7755509, {
            prenom: user.firstName,
            lien_reinit_password: resetUrl
        }, 'Cantine ACDLP : Réinitialisez votre mot de passe');

        return res.status(200).json({
            message: 'Lien de réinitialisation de mot de passe envoyé.',
            requiresPasswordReset: true
        });
    } catch (err) {
        console.error(`[Request Password Reset Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

router.post('/reset-password', async(req, res) => {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
    }
    try {
        const user = await db.select(
            'SELECT * FROM asso_users WHERE reset_token = ? AND token_expiry > ?', [token, Date.now()]
        );
        if (user.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token.' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.update(
            'asso_users', { password: hashedPassword, reset_token: null, token_expiry: null },
            'id = ?', [user[0].id]
        );
        return res.status(200).json({ message: 'Password reset successfully.', user: { role: user[0].role } });
    } catch (err) {
        console.error(`[Reset Password Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// ----------------------------------------------------
// SIGNIN BACKOFFICE (avec contrôles multi-gate cantine)
// ----------------------------------------------------

router.post('/backoffice/signin', async(req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }

    try {
        const results = await db.select('SELECT * FROM asso_users WHERE email = ? AND role = "association"', [email], 'remote');
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials or insufficient permissions.' });
        }
        const user = results[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ message: 'Please verify your email before signing in.' });
        }

        if (!user.rna) {
            return res.status(401).json({ message: 'RNA manquant pour cet utilisateur.' });
        }

        // Vérifier double_checked et statut directement sur asso_users
        if (!user.double_checked) {
            return res.status(403).json({
                message: 'Votre compte est en cours de traitement par nos équipes. Nous reviendrons vers vous dès que votre compte sera activé.'
            });
        }

        if (user.statut && user.statut !== 'ok') {
            const whatsapp = process.env.BACKOFFICE_WHATSAPP_NUMBER || '+33 6 78 92 04 45';
            const amendeText = (user.amende !== null && user.amende !== undefined && user.amende !== '') ? `Montant dû: ${user.amende} €.` : '';
            const message = `Votre compte est bloqué car vous n'avez pas récupéré votre commande. ${amendeText} Pour débloquer, veuillez payer la compensation et envoyer une preuve de paiement via WhatsApp au ${whatsapp}. Les commandes futures sont annulées dans l'attente de la preuve de paiement.`;
            return res.status(403).json({ message });
        }

        const token = jwt.sign({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: 'association',
                rna: user.rna,
                nameAsso: user.nom,
            },
            JWT_SECRET, { expiresIn: '1h' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.URL_ORIGIN?.startsWith('https'),
            sameSite: 'strict',
            maxAge: 3600000,
        });

        return res.status(200).json({ message: 'Logged in successfully to backoffice' });
    } catch (err) {
        console.error(`[Backoffice Signin Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Database error.' });
    }
});

// ----------------------------------------------------
// UTILITAIRES
// ----------------------------------------------------

// Lookup RNA
router.get('/rna/:rna', async (req, res) => {
    const { rna } = req.params;

    try {
        if (!rna || !validateRna(rna)) {
            return res.status(400).json({ error: 'Le numéro RNA doit être au format W suivi de 9 caractères (ex: W751234567)' });
        }

        const info = await rnaService.getAssociationInfo(rna);

        if (info.position === 'Dissoute') {
            return res.status(400).json({
                success: false,
                error: 'Cette association est dissoute et ne peut pas être enregistrée'
            });
        }

        res.json({
            success: true,
            denomination: info.title,
            position: info.position
        });
    } catch (error) {
        console.error(`[RNA API Error] RNA ${rna}:`, error.message);
        res.status(500).json({ success: false, error: 'Impossible de récupérer le nom de l\'association' });
    }
});

// Upload document justificatif (standalone)
const storageDocumentJustificatif = multer.diskStorage({
    destination: (req, file, cb) => {
        const rna = req.body.rna;
        if (!rna || !validateRna(rna)) {
            return cb(new Error('RNA invalide ou manquant'));
        }
        const uploadDir = path.join(__dirname, '../pdf/backoffice/documentassociation', rna);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const rna = req.body.rna;
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const filename = `${rna}_justificatif_${timestamp}${extension}`;
        cb(null, filename);
    }
});

const uploadDocumentJustificatif = multer({
    storage: storageDocumentJustificatif,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (allowedMimes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Seuls les fichiers PDF, JPG et PNG sont acceptés'));
    }
});

router.post('/backoffice/upload-document-justificatif', uploadDocumentJustificatif.single('document'), async (req, res) => {
    try {
        const { rna } = req.body;
        if (!rna || !validateRna(rna)) {
            return res.status(400).json({ message: 'RNA invalide ou manquant' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier uploadé' });
        }
        console.log(`[Upload Document] Fichier uploadé pour RNA ${rna}: ${req.file.filename}`);
        return res.status(200).json({
            success: true,
            message: 'Document justificatif uploadé avec succès',
            filename: req.file.filename,
            filepath: req.file.path,
            rna: rna
        });
    } catch (err) {
        console.error(`[Upload Document Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur lors de l\'upload du document' });
    }
});

// Export
module.exports = {
    router,
    authMiddleware,
};
