const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'donator'; A ajouter un rôle par défaut pour les utilisateurs
// ALTER TABLE users ADD COLUMN siren VARCHAR(9) DEFAULT '';
// Services et utilitaires
const db = require('../services/bdd');
const { sendTemplateEmail } = require('../services/mailService');
const { stat } = require('fs');
const inseeService = require('../services/inseeService');

// Variables et instanciations
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const urlOrigin = process.env.URL_ORIGIN;

// Helpers
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => {
    // Vérifier que le mot de passe fait au moins 6 caractères
    if (password.length < 6) {
        return { valid: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' };
    }

    // Liste des caractères problématiques à détecter
    const problematicChars = [];

    // Vérifier chaque caractère du mot de passe
    for (let i = 0; i < password.length; i++) {
        const char = password[i];
        const charCode = char.charCodeAt(0);

        // Caractères de contrôle (invisibles)
        if (charCode >= 0 && charCode <= 31) {
            problematicChars.push(`caractère de contrôle (code ${charCode})`);
        }
        // Caractère DEL
        else if (charCode === 127) {
            problematicChars.push('caractère DEL');
        }
    }

    // Si des caractères problématiques sont trouvés
    if (problematicChars.length > 0) {
        const uniqueChars = [...new Set(problematicChars)];
        return {
            valid: false,
            message: `Le mot de passe contient des caractères non autorisés : ${uniqueChars.join(', ')}. Veuillez utiliser uniquement des lettres, chiffres et caractères spéciaux visibles.`
        };
    }

    return { valid: true };
};
const generateResetToken = () => crypto.randomBytes(32).toString('hex');
const validateSiren = (siren) => /^[0-9]{9}$/.test(siren);

function authMiddleware(req, res, next) {
    try {
        const token = req.cookies.auth_token; // Récupère le JWT depuis le cookie
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
    // Le middleware `authMiddleware` décode le JWT et place les données dans `req.user`
    const { id, email, firstName, lastName, role, siren, nameAsso, uri } = req.user; // Récupère les informations du JWT
    console.log("Appel à l'api /me. Informations récupérées du JWT pour : " + email);

    // Renvoyer les informations directement depuis le JWT
    // Adapter les noms de champs pour maintenir la compatibilité avec le frontend
    return res.status(200).json({
        email,
        prenom: firstName,
        nom: lastName,
        role: role,
        siren: siren || null,
        nameAsso: nameAsso || null,
        uri: uri || null
    });
});

// ----------------------------------------------------
// ROUTES PUBLIQUES BACKOFFICE & BENEVOLAT
// ----------------------------------------------------

// Logout (commun à tous les rôles)
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    return res.status(200).json({ message: 'Logged out successfully.' });
});

// ----------------------------------------------------
// ROUTES PROTEGEES (EXEMPLE)
// ----------------------------------------------------
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
// AUTHENTIFICATION BACKOFFICE (ASSOCIATIONS)
// ----------------------------------------------------
// Note: La route POST /backoffice/signin est définie plus bas dans le fichier

// ----------------------------------------------------
// ROUTES DONATEURS LEGACY (désactivées - système dons supprimé)
// ----------------------------------------------------

// Signin donateurs (legacy - désactivé)
router.post('/signin', async(req, res) => {
    const { email, password } = req.body;
    console.log("Demande de signin recue de " + email);


    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }

    try {
        const results = await db.select('SELECT * FROM users WHERE email = ?', [email], 'remote');
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ message: 'Please verify your email before signing in.' });
        }

        // Générer un token JWT avec les informations de l'utilisateur, y compris prénom, nom et rôle
        const token = jwt.sign({
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role || 'donator'
            },
            JWT_SECRET, { expiresIn: '1h' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.URL_ORIGIN === 'https://v2.myamana.fr/',
            sameSite: 'strict',
            maxAge: 3600000,
        });

        return res.status(200).json({ message: 'Logged in successfully' });
    } catch (err) {
        console.error(`[Signin Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Database error.' });
    }
});

// Vérification d'email
router.get('/verify-email/:token', async(req, res) => {
    const { token } = req.params;

    try {
        const user = await db.select(
            'SELECT * FROM users WHERE verification_token = ? AND verification_token_expiry > ?', [token, Date.now()]
        );

        if (user.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token.' });
        }

        const userData = user[0];

        // Vérifier si l'utilisateur a déjà un mot de passe
        const hasPassword = !!userData.password;

        if (hasPassword) {
            // Cas où l'utilisateur a déjà un mot de passe (compte existant)
            await db.update('users', {
                is_verified: 1,
                verification_token: null,
                verification_token_expiry: null
            }, 'id = ?', [userData.id]);

            // Envoyer email de confirmation
            await sendTemplateEmail(userData.email, 7614809, {},
                'Confirmation de la création de votre espace donateur');

            return res.status(200).json({
                message: 'Email vérifié avec succès.',
                nextStep: 'login',
                user: { role: userData.role }
            });
        } else {
            // Nouveau cas : rediriger vers la création de mot de passe
            // Générer un token temporaire pour la transition
            const tempToken = generateResetToken();
            const tempTokenExpiry = Date.now() + 3600000;

            await db.update('users', {
                verification_token: tempToken, // Réutiliser le champ pour le token temporaire
                verification_token_expiry: tempTokenExpiry
            }, 'id = ?', [userData.id]);

            return res.status(200).json({
                message: 'Email vérifié. Veuillez maintenant créer votre mot de passe.',
                nextStep: 'set-password',
                tempToken: tempToken,
                email: userData.email,
                firstName: userData.firstName
            });
        }
    } catch (err) {
        console.error(`[Verify Email Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * Nouveau endpoint pour définir le mot de passe après vérification d'email
 */
router.post('/set-password', async(req, res) => {
    const { token, email, password, confirmPassword, firstName, lastName } = req.body;

    if (!token || !email || !password || !confirmPassword || !firstName || !lastName) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
    }

    try {
        // Vérifier le token et l'email
        const user = await db.select(
            'SELECT * FROM users WHERE email = ? AND verification_token = ? AND verification_token_expiry > ?',
            [email, token, Date.now()]
        );

        if (user.length === 0) {
            return res.status(400).json({ message: 'Token invalide ou expiré.' });
        }

        const userData = user[0];

        // Hasher et enregistrer le mot de passe + prénom et nom
        const hashedPassword = await bcrypt.hash(password, 10);

        await db.update('users', {
            password: hashedPassword,
            firstName: firstName,
            lastName: lastName,
            is_verified: 1,
            verification_token: null,
            verification_token_expiry: null
        }, 'id = ?', [userData.id]);

        // Envoyer email de confirmation
        await sendTemplateEmail(userData.email, 7614809, {},
            'Confirmation de la création de votre espace donateur');

        return res.status(200).json({
            message: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.',
            nextStep: 'login',
            email: userData.email
        });
    } catch (err) {
        console.error(`[Set Password Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// Renvoyer un lien de vérification d'email
router.post('/resend-verification-link', async(req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Token requis.' });
    }

    try {
        // Rechercher l'utilisateur par token
        // Nous allons d'abord essayer de trouver l'utilisateur avec le token exact
        let users = await db.select('SELECT * FROM users WHERE verification_token = ?', [token]);

        // Si aucun utilisateur n'est trouvé, essayons de trouver l'utilisateur avec un token qui commence par le même préfixe
        // Cela peut être utile si le token a été tronqué dans l'URL
        if (users.length === 0 && token.length >= 8) {
            const tokenPrefix = token.substring(0, 8); // Utiliser les 8 premiers caractères comme préfixe
            users = await db.select('SELECT * FROM users WHERE verification_token LIKE ?', [`${tokenPrefix}%`]);
        }

        if (users.length === 0) {
            return res.status(404).json({ message: 'Token invalide ou utilisateur non trouvé.' });
        }

        const user = users[0];

        // Vérifier si l'email est déjà vérifié
        if (user.is_verified) {
            return res.status(400).json({ message: 'Ce compte est déjà vérifié. Vous pouvez vous connecter.' });
        }

        // Générer un nouveau token de vérification
        const verificationToken = generateResetToken();
        const verificationTokenExpiry = Date.now() + 3600000; // 1 heure

        await db.update(
            'users', { verification_token: verificationToken, verification_token_expiry: verificationTokenExpiry },
            'id = ?', [user.id]
        );

        // Envoyer l'email avec le nouveau lien
        const confirmationUrl = `${urlOrigin}/app/auth/verify-email/token/${verificationToken}`;
        const templateId = 5536946; // ID du template Mailjet pour confirmation
        const variables = { prenom: user.firstName, lien_finalisation: confirmationUrl };

        await sendTemplateEmail(user.email, templateId, variables, 'Espace Donateur : Finalisez la création de votre compte Myamana');

        return res.status(200).json({ message: 'Un nouveau lien de vérification a été envoyé à votre adresse email.' });
    } catch (err) {
        console.error(`[Resend Verification Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Réinitialisation de mot de passe
router.post('/request-password-reset', async(req, res) => {
    const { email } = req.body;

    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Format d\'email invalide.' });
    }

    try {
        const results = await db.select('SELECT * FROM users WHERE email = ?', [email], 'remote');

        if (results.length === 0) {
            // 🔒 PROTECTION CONTRE L'ENUMERATION D'UTILISATEURS
            // Si l'email n'existe pas, envoyer un email personnalisé pour inviter à créer un compte
            // au lieu de retourner une erreur 404

            const signupUrl = `${urlOrigin}/app/auth/sign-up`;

            await sendTemplateEmail(email, 7614858, {
                lien_creation_compte: signupUrl
            }, 'Espace Donateur : Création de compte');

            // Toujours retourner un message générique pour éviter l'énumération
            return res.status(200).json({
                message: 'Si cette adresse email est valide, un email a été envoyé.'
            });
        }

        const user = results[0];

        if (!user.is_verified) {
            // Nouveau comportement : si non vérifié, envoyer un lien de vérification
            const verificationToken = generateResetToken();
            const verificationTokenExpiry = Date.now() + 3600000;

            await db.update('users', {
                verification_token: verificationToken,
                verification_token_expiry: verificationTokenExpiry
            }, 'email = ?', [email]);

            const confirmationUrl = `${urlOrigin}/app/auth/verify-email/token/${verificationToken}`;

            await sendTemplateEmail(email, 5536946, {
                prenom: user.firstName,
                lien_finalisation: confirmationUrl
            }, 'Espace Donateur : Finalisez la création de votre compte');

            return res.status(200).json({
                message: 'Un lien de vérification a été envoyé à votre adresse email.',
                requiresVerification: true
            });
        }

        // Comportement existant pour les comptes vérifiés
        const resetToken = generateResetToken();
        const tokenExpiry = Date.now() + 3600000;

        await db.update('users', {
            reset_token: resetToken,
            token_expiry: tokenExpiry
        }, 'email = ?', [email]);

        const resetUrl = `${urlOrigin}/app/auth/new-password/token/${resetToken}`;

        await sendTemplateEmail(email, 5536948, {
            prenom: user.firstName,
            lien_reinit_password: resetUrl
        }, 'Espace Donateur : Réinitialisez votre mot de passe');

        return res.status(200).json({
            message: 'Lien de réinitialisation de mot de passe envoyé.',
            requiresPasswordReset: true
        });
    } catch (err) {
        console.error(`[Request Password Reset Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

/**
 * Réinitialisation du mot de passe (avec le reset_token)
 */
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
            'SELECT * FROM users WHERE reset_token = ? AND token_expiry > ?', [token, Date.now()]
        );
        if (user.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token.' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.update(
            'users', { password: hashedPassword, reset_token: null, token_expiry: null },
            'id = ?', [user[0].id]
        );
        return res.status(200).json({ message: 'Password reset successfully.', user: { role: user[0].role } });
    } catch (err) {
        console.error(`[Reset Password Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    return res.status(200).json({ message: 'Logged out successfully.' });
});

// ----------------------------------------------------
// ROUTES PROTEGEES (EXEMPLE)
// ----------------------------------------------------
/**
 * Exemple de route protégée par le middleware authMiddleware
 * Pour tester, tu peux faire un GET sur /protected-route
 * après t'être connecté et avoir le cookie.
 */
router.get('/protected-route', authMiddleware, (req, res) => {
    // Si on arrive ici, c'est que le middleware a validé le cookie
    // et a mis req.user = { id, email, iat, exp }
    return res.status(200).json({
        message: 'You have accessed a protected route!',
        user: req.user,
    });
});

router.get('/backoffice/protected-route', authMiddleware, (req, res) => {
    // Si on arrive ici, c'est que le middleware a validé le cookie
    // et a mis req.user = { id, email, iat, exp }
    return res.status(200).json({
        message: 'You have accessed a protected backoffice route!',
        user: req.user,
    });
});


// Signin spécifique pour le backoffice
router.post('/backoffice/signin', async(req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }

    try {
        // Vérifier si l'utilisateur existe et a le rôle 'association'
        const results = await db.select('SELECT * FROM users WHERE email = ? AND role = "association"', [email], 'remote');
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials or insufficient permissions.' });
        }
        const user = results[0];

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ message: 'Please verify your email before signing in.' });
        }

        // Récupérer l'association via le SIREN de l'utilisateur (au lieu de l'email)
        if (!user.siren) {
            return res.status(401).json({ message: 'SIREN manquant pour cet utilisateur.' });
        }

        const assoCheck = await db.select('SELECT * FROM Assos WHERE siren = ?', [user.siren], 'remote');
        if (assoCheck.length === 0) {
            return res.status(401).json({ message: 'Association non trouvée pour ce SIREN.' });
        }

        const asso = assoCheck[0];

        // Vérifier le statut onboarding_backoffice et bloquer si doubleChecked = false
        try {
            const ob = await db.select('SELECT statut, amende, doubleChecked, cantine FROM onboarding_backoffice WHERE user_id = ? LIMIT 1', [user.id], 'remote');
            if (ob && ob.length > 0) {
                const statut = ob[0].statut;
                const amende = ob[0].amende;
                const doubleChecked = ob[0].doubleChecked;
                const cantine = ob[0].cantine;

                // Bloquer si l'utilisateur n'a pas la cantine activée (utilisateur non-ACDLP)
                if (!cantine) {
                    return res.status(403).json({
                        message: 'Verifiez vos identifiants'
                    });
                }

                // Bloquer si le compte n'est pas encore validé manuellement
                if (doubleChecked === 0 || doubleChecked === false) {
                    return res.status(403).json({
                        message: 'Votre compte est en cours de traitement par nos équipes. Nous reviendrons vers vous dès que votre compte sera activé.'
                    });
                }

                // Bloquer si statut non-ok (amende impayée)
                if (statut && statut !== 'ok') {
                    const whatsapp = process.env.BACKOFFICE_WHATSAPP_NUMBER || '+33 6 78 92 04 45';
                    const amendeText = (amende !== null && amende !== undefined && amende !== '') ? `Montant dû: ${amende} €.` : '';
                    const message = `Votre compte est bloqué car vous n'avez pas récupéré votre commande. ${amendeText} Pour débloquer, veuillez payer la compensation et envoyer une preuve de paiement via WhatsApp au ${whatsapp}. Les commandes futures sont annulées dans l'attente de la preuve de paiement.`;
                    return res.status(403).json({ message });
                }
            }
        } catch (e) {
            console.error('[Backoffice signin onboarding check error]:', e);
            // ignore and continue (don't block login on DB read error)
        }

        // Générer un token JWT avec les informations de l'utilisateur, y compris prénom, nom et rôle
        const token = jwt.sign({
                id: asso.id,
                email: asso.email,
                firstName: asso.firstName,
                lastName: asso.lastName,
                role: 'association',
                siren: asso.siren,
                uri: asso.uri,
                nameAsso: asso.nom,
                logoUrl: asso.logoUrl,
            },
            JWT_SECRET, { expiresIn: '1h' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.URL_ORIGIN === 'https://v2.myamana.fr/',
            sameSite: 'strict',
            maxAge: 3600000,
        });

        return res.status(200).json({ message: 'Logged in successfully to backoffice' });
    } catch (err) {
        console.error(`[Backoffice Signin Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Database error.' });
    }
});


/**
 * Route publique pour récupérer la raison sociale d'une entreprise via son SIREN
 * Utilisée lors du signup pour auto-compléter la raison sociale
 */
router.get('/sirene/:siren', async (req, res) => {
    const { siren } = req.params;

    try {
        // Validation basique du SIREN
        if (!siren || siren.length !== 9 || !/^\d+$/.test(siren)) {
            return res.status(400).json({ error: 'Le numéro SIREN doit contenir exactement 9 chiffres' });
        }

        // Utilisation du service INSEE pour récupérer la dénomination légale
        const denomination = await inseeService.getLegalName(siren);
        res.json({
            success: true,
            denomination: denomination
        });
    } catch (error) {
        console.error(`[Sirene API Error] SIREN ${siren}:`, error.message);
        res.status(500).json({ success: false, error: 'Impossible de récupérer la raison sociale' });
    }
});

/**
 * Configuration de multer pour l'upload de documents justificatifs
 */
const storageDocumentJustificatif = multer.diskStorage({
    destination: (req, file, cb) => {
        const siren = req.body.siren;
        if (!siren || !validateSiren(siren)) {
            return cb(new Error('SIREN invalide ou manquant'));
        }
        
        // Créer le dossier pour cette association
        const uploadDir = path.join(__dirname, '../pdf/backoffice/documentassociation', siren);
        
        // Créer le répertoire s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log(`[Upload Document] Dossier créé: ${uploadDir}`);
        }
        
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const siren = req.body.siren;
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const filename = `${siren}_justificatif_${timestamp}${extension}`;
        cb(null, filename);
    }
});

const uploadDocumentJustificatif = multer({
    storage: storageDocumentJustificatif,
    limits: {
        fileSize: 10 * 1024 * 1024, // Max 10 MB
    },
    fileFilter: (req, file, cb) => {
        // Accepter PDF, JPG, JPEG, PNG
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers PDF, JPG et PNG sont acceptés'));
        }
    }
});

/**
 * Route pour uploader le document justificatif lors du signup backoffice
 */
router.post('/backoffice/upload-document-justificatif', uploadDocumentJustificatif.single('document'), async (req, res) => {
    try {
        const { siren } = req.body;

        if (!siren || !validateSiren(siren)) {
            return res.status(400).json({ message: 'SIREN invalide ou manquant' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier uploadé' });
        }

        console.log(`[Upload Document] Fichier uploadé pour SIREN ${siren}: ${req.file.filename}`);

        return res.status(200).json({
            success: true,
            message: 'Document justificatif uploadé avec succès',
            filename: req.file.filename,
            filepath: req.file.path,
            siren: siren
        });

    } catch (err) {
        console.error(`[Upload Document Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur lors de l\'upload du document' });
    }
});


// Préparer un stockage temporaire pour les uploads du signup
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

// Signup Backoffice (multipart: champs + document)
router.post('/backoffice/signup', uploadSignup.single('document'), async(req, res) => {
    const { email, password, firstName, lastName, siren } = req.body;
    console.log("Demande de signup backoffice reçue de " + email);
    
    if (!email || !password || !siren) {
        return res.status(400).json({ message: 'Email, password et SIREN sont requis.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }
    if (!validatePassword(password)) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }
    if (!validateSiren(siren)) {
        return res.status(400).json({ message: 'SIREN invalide.' });
    }

    // Vérifier la présence du fichier
    if (!req.file) {
        return res.status(400).json({ message: 'Le document justificatif est obligatoire.' });
    }

    // Déplacer le fichier du répertoire temporaire vers le répertoire de l'association
    let documentJustificatifFilename = '';
    try {
        const finalDir = path.join(__dirname, '../pdf/backoffice/documentassociation', siren);
        if (!fs.existsSync(finalDir)) {
            fs.mkdirSync(finalDir, { recursive: true });
            console.log(`[Signup Upload] Dossier créé: ${finalDir}`);
        }

        const timestamp = Date.now();
        const extension = path.extname(req.file.originalname);
        const finalName = `${siren}_justificatif_${timestamp}${extension}`;
        const finalPath = path.join(finalDir, finalName);

        fs.renameSync(req.file.path, finalPath);
        documentJustificatifFilename = finalName;
        console.log(`[Signup Upload] Fichier déplacé: ${finalPath}`);
    } catch (moveErr) {
        console.error('[Signup Upload Move Error]:', moveErr);
        return res.status(500).json({ message: 'Erreur lors du traitement du document justificatif.' });
    }

    try {
        const existingUser = await db.select('SELECT * FROM users WHERE email = ?', [email], 'remote');
        if (existingUser.length > 0) {
            // Vérifier si l'utilisateur a déjà vérifié son email
            if (existingUser[0].is_verified) {
                // Si l'email est déjà vérifié, envoyer un lien de réinitialisation de mot de passe
                const resetToken = generateResetToken();
                const tokenExpiry = Date.now() + 3600000;

                await db.update('users', { reset_token: resetToken, token_expiry: tokenExpiry }, 'email = ?', [email]);

                const resetUrl = `${urlOrigin}/app/auth/forgot-password/token/${resetToken}`;
                const templateId = 5536948; // ID du template Mailjet
                const variables = { prenom: firstName || existingUser[0].firstName, lien_reinit_password: resetUrl };

                await sendTemplateEmail(email, templateId, variables, "Backoffice : Oups, vous avez déjà un compte Myamana :)");
                return res.status(200).json({ message: 'Email already exists. Reset password link sent.' });
            } else {
                // Si l'email existe mais n'est pas vérifié, envoyer un nouveau lien de vérification
                const verificationToken = generateResetToken();
                const verificationTokenExpiry = Date.now() + 3600000;

                await db.update('users', {
                        verification_token: verificationToken,
                        verification_token_expiry: verificationTokenExpiry,
                        // Mettre à jour le mot de passe si l'utilisateur l'a changé
                        ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
                        // Mettre à jour le nom et prénom si fournis
                        ...(firstName ? { firstName } : {}),
                        ...(lastName ? { lastName } : {})
                    },
                    'email = ?', [email]
                );

                const confirmationUrl = `${urlOrigin}/app/auth/verify-email/token/${verificationToken}`;
                const templateId = 5536946; // ID du template Mailjet pour confirmation
                const variables = { prenom: firstName || existingUser[0].firstName, lien_finalisation: confirmationUrl };

                await sendTemplateEmail(email, templateId, variables, 'Espace Donateur : Finalisez la création de votre compte Myamana');
                return res.status(200).json({ message: 'Un nouveau lien de vérification a été envoyé à votre adresse email.' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = generateResetToken();
        const verificationTokenExpiry = Date.now() + 3600000;

        const insertResult = await db.insert('users', {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            verification_token: verificationToken,
            verification_token_expiry: verificationTokenExpiry,
            role: 'association',
            siren: siren
        }, 'remote');

        // Récupérer la raison sociale via l'API INSEE
        let raisonSociale = '';
        try {
            raisonSociale = await inseeService.getLegalName(siren);
            console.log(`[Signup Backoffice] Raison sociale récupérée pour SIREN ${siren}: ${raisonSociale}`);
        } catch (inseeError) {
            console.warn(`[Signup Backoffice] Impossible de récupérer la raison sociale pour SIREN ${siren}:`, inseeError.message);
            // On continue le signup même si la récupération de la raison sociale échoue
        }

        // Vérifier si l'asso existe déjà avant d'insérer
        const existingAsso = await db.select('SELECT id FROM Assos WHERE email = ? OR siren = ?', [email, siren], 'remote');
        
        if (existingAsso.length === 0) {
            // L'asso n'existe pas, on l'insère
            await db.insert('Assos', {
                email,
                siren,
                nom: raisonSociale,
                signataire_nom: lastName,
                signataire_prenom: firstName,
            }, 'remote');
            console.log(`[Signup Backoffice] Nouvelle association créée pour ${email}`);
        } else {
            // L'asso existe dejà
            console.log(`[Signup Backoffice] Association existante trouvée pour ${email}, pas de création.`);
        }

        // Créer une ligne d'onboarding par défaut pour ce nouvel utilisateur (backoffice)
        try {
            const newUserId = insertResult.insertId;
            // Essayer de récupérer l'asso correspondante à l'email
            let assoId = null;
            try {
                const assoRow = await db.select('SELECT id FROM Assos WHERE email = ?', [email], 'remote');
                if (assoRow && assoRow.length > 0) {
                    assoId = assoRow[0].id;
                }
            } catch (lookupErr) {
                console.warn('[Onboarding] Impossible de lookup Assos by email:', lookupErr);
            }

            await db.insert('onboarding_backoffice', {
                user_id: newUserId,
                asso_id: assoId,
                donations: false,
                cantine: true,
                suiviVehicule: false,
                doubleChecked: false,
                isOnboarded: false,
                tutorielDone: false,
                document_justificatif: documentJustificatifFilename
            }, 'remote');

        } catch (e) {
            console.error('[Onboarding Insert Error]:', e);
            // On ignore l'erreur pour ne pas bloquer le signup
        }

        const confirmationUrl = `${urlOrigin}/app/auth/verify-email/token/${verificationToken}`;
        const templateId = 5536946; // ID du template Mailjet pour confirmation
        const variables = { prenom: firstName, lien_finalisation: confirmationUrl };

        await sendTemplateEmail(email, templateId, variables, 'Backoffice : Finalisez la création de votre compte Myamana');
        return res.status(201).json({ message: 'Email de vérification envoyé' });
    } catch (err) {
        console.error(`[Signup Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// Étape 1 : Demande de code OTP pour inscription bénévolat
router.post('/benevolat/request-otp', async(req, res) => {
    const { email, confirmEmail, associationName } = req.body;
    console.log("Demande OTP bénévolat reçue pour " + email);

    // Validation
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
        // Vérifier si l'email existe déjà
        const existingVolunteer = await db.select('SELECT * FROM benevoles WHERE email = ?', [email]);

        // 🔒 PROTECTION CONTRE L'ENUMERATION D'UTILISATEURS
        // On renvoie TOUJOURS le même message de succès, que le compte existe ou non

        let shouldSendOTP = true;
        let shouldCreateOrUpdate = true;

        if (existingVolunteer.length > 0) {
            const volunteer = existingVolunteer[0];
            if (volunteer.is_verified) {
                // ⚠️ COMPTE DEJA VERIFIE : Ne pas envoyer d'OTP
                // Mais envoyer un email informatif avec lien reset password
                shouldSendOTP = false;
                shouldCreateOrUpdate = false;
                console.log(`⚠️ [BENEVOLAT OTP SECURITY] Tentative d'inscription sur compte existant: ${email}`);

                // Générer un token de réinitialisation et envoyer un email informatif
                try {
                    const resetToken = generateResetToken();
                    const tokenExpiry = Date.now() + 3600000; // 1 heure

                    await db.update('benevoles', {
                        reset_token: resetToken,
                        reset_token_expiry: tokenExpiry
                    }, 'email = ?', [email]);

                    // Récupérer les infos de l'association pour le logo
                    let logoUrl = '';
                    let nomAsso = '';
                    if (associationName) {
                        try {
                            const assoQuery = 'SELECT nom, logoUrl FROM Assos WHERE uri = ?';
                            const assoResults = await db.select(assoQuery, [associationName], 'remote');
                            if (assoResults && assoResults.length > 0) {
                                if (assoResults[0].logoUrl) {
                                    logoUrl = `https://v2.myamana.fr/${assoResults[0].logoUrl}`;
                                }
                                nomAsso = assoResults[0].nom;
                            }
                        } catch (assoErr) {
                            console.warn(`[BENEVOLAT ACCOUNT EXISTS] Impossible de récupérer le logo:`, assoErr);
                        }
                    }

                    const resetUrl = `${urlOrigin}/app/benevolat/new-password/token/${resetToken}`;

                    // Template ID pour "compte existant détecté"
                    const templateId = 7472537; // Template personnalisé pour tentative d'inscription sur compte existant
                    const variables = {
                        prenom: volunteer.prenom || 'Bénévole',
                        lien_reinit_password: resetUrl,
                        logo_url: logoUrl
                    };

                    await sendTemplateEmail(
                        email,
                        templateId,
                        variables,
                        `${nomAsso} : Votre compte existe déjà`
                    );

                    console.log(`📧 [BENEVOLAT ACCOUNT EXISTS] Email informatif envoyé à: ${email}`);
                } catch (emailErr) {
                    console.error(`[BENEVOLAT ACCOUNT EXISTS] Erreur envoi email:`, emailErr);
                    // Ne pas bloquer le flow, on continue avec le message générique
                }
            }
            // Si email existe mais pas vérifié, on continue normalement avec un nouveau OTP
        }

        if (shouldCreateOrUpdate) {
            // Générer un code OTP à 6 chiffres
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpiry = Date.now() + (10 * 60000); // 10 minutes

            console.log(`🔑 [BENEVOLAT OTP] Code généré pour ${email}: ${otp} (expire: ${new Date(otpExpiry)})`);

            // Générer un UUID pour le tracking
            const { v4: uuidv4 } = require('uuid');
            const trackingId = uuidv4();

            // INSERT ou UPDATE en base
            if (existingVolunteer.length > 0) {
                // UPDATE
                await db.update('benevoles', {
                    verification_code: otp,
                    verification_code_expiry: otpExpiry,
                    updated_at: new Date()
                }, 'email = ?', [email]);
            } else {
                // INSERT minimal
                await db.insert('benevoles', {
                    email: email,
                    association_nom: associationName || '',
                    verification_code: otp,
                    verification_code_expiry: otpExpiry,
                    tracking_uuid: trackingId,
                    is_verified: 0,
                    created_at: new Date()
                });
            }

            if (shouldSendOTP) {
                // Récupérer le logo de l'association
                let logoUrl = '';
                let nomAsso = '';

                if (associationName) {
                    try {
                        const assoQuery = 'SELECT nom, logoUrl FROM Assos WHERE uri = ?';
                        const assoResults = await db.select(assoQuery, [associationName], 'remote');
                        if (assoResults && assoResults.length > 0 && assoResults[0].logoUrl) {
                            logoUrl = `https://v2.myamana.fr/${assoResults[0].logoUrl}`;
                            nomAsso = assoResults[0].nom;
                        }
                    } catch (assoErr) {
                        console.warn(`[BENEVOLAT OTP] Impossible de récupérer le logo de l'association:`, assoErr);
                    }
                }

                // Envoyer l'email avec le code OTP
                try {
                    const templateId = 7367008;
                    const variables = {
                        code_verification: otp,
                        logo_url: logoUrl
                    };

                    await sendTemplateEmail(
                        email,
                        templateId,
                        variables,
                        `${nomAsso} : Votre code de vérification`
                    );

                    console.log(`✅ [BENEVOLAT OTP] Email OTP envoyé à: ${email}`);
                } catch (emailErr) {
                    console.error(`[BENEVOLAT OTP] Erreur envoi email:`, emailErr);
                    return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
                }
            }
        }

        // 🔒 MESSAGE GENERIQUE : Toujours le même, que le compte existe ou non
        return res.status(200).json({
            message: 'Si cette adresse email est valide, un code de vérification a été envoyé.',
            expiresIn: 600 // 10 minutes en secondes
        });

    } catch (err) {
        console.error(`[Benevolat Request OTP Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Étape 2 : Vérification du code OTP
router.post('/benevolat/verify-otp', async(req, res) => {
    const { email, code } = req.body;
    console.log(`🔍 [BENEVOLAT OTP] Vérification du code pour: ${email}`);

    if (!email || !code) {
        return res.status(400).json({ message: 'Email et code requis.' });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Format d\'email invalide.' });
    }

    try {
        // Récupérer le bénévole
        const volunteer = await db.select(
            'SELECT * FROM benevoles WHERE email = ? AND verification_code = ? AND verification_code_expiry > ?', [email, code, Date.now()]
        );

        if (volunteer.length === 0) {
            console.log(`❌ [BENEVOLAT OTP] Code invalide ou expiré pour: ${email}`);
            return res.status(400).json({ message: 'Code invalide ou expiré.' });
        }

        const volunteerData = volunteer[0];

        // Générer un token de continuation sécurisé
        const completionToken = generateResetToken(); // Réutiliser la fonction existante
        const completionTokenExpiry = Date.now() + (24 * 3600000); // 24 heures

        // Marquer comme vérifié et stocker le token de continuation
        await db.update(
            'benevoles', {
                is_verified: 1,
                verified_at: new Date(),
                verification_code: null,
                verification_code_expiry: null,
                completion_token: completionToken,
                completion_token_expiry: completionTokenExpiry
            },
            'id = ?', [volunteerData.id]
        );

        console.log(`✅ [BENEVOLAT OTP] Email vérifié avec succès pour: ${email}`);
        console.log(`🔑 [BENEVOLAT OTP] Token de continuation généré: ${completionToken.substring(0, 10)}...`);

        return res.status(200).json({
            message: 'Email vérifié avec succès.',
            token: completionToken,
            email: email
        });

    } catch (err) {
        console.error(`[Benevolat Verify OTP Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Étape 3 : Complétion de l'inscription avec toutes les informations
router.post('/benevolat/complete-signup', async(req, res) => {
    const {
        token,
        password,
        prenom: firstName,
        nom: lastName,
        telephone: phone,
        adresse: address,
        ville: city,
        code_postal: postalCode,
        pays: country,
        age,
        date_naissance: birthDate,
        genre: gender,
        vehicule: hasVehicle,
        source_connaissance: sourceKnowledge,
        source_connaissance_autre: sourceKnowledgeOther,
        metiers_competences: skills
    } = req.body;

    console.log("Demande de complétion d'inscription bénévolat avec token");

    // Validation du token
    if (!token) {
        return res.status(400).json({ message: 'Token requis.' });
    }

    try {
        // Vérifier le token et récupérer le bénévole
        const volunteer = await db.select(
            'SELECT * FROM benevoles WHERE completion_token = ? AND completion_token_expiry > ?', [token, Date.now()]
        );

        if (volunteer.length === 0) {
            console.log(`❌ [BENEVOLAT COMPLETE] Token invalide ou expiré`);
            return res.status(400).json({ message: 'Token invalide ou expiré.' });
        }

        const volunteerData = volunteer[0];
        const email = volunteerData.email;

        console.log(`📝 [BENEVOLAT COMPLETE] Complétion pour: ${email}`);

        // Validation des champs obligatoires
        const missingFields = [];
        if (!password) missingFields.push('mot de passe');
        if (!firstName) missingFields.push('prénom');
        if (!lastName) missingFields.push('nom');
        if (!phone) missingFields.push('téléphone');
        if (!address) missingFields.push('adresse');
        if (!city) missingFields.push('ville');
        if (!postalCode) missingFields.push('code postal');
        if (!age) missingFields.push('âge');
        if (!gender) missingFields.push('genre');

        if (missingFields.length > 0) {
            const fieldsList = missingFields.length === 1 ?
                `Le champ "${missingFields[0]}"` :
                `Les champs "${missingFields.join('", "')}"`;
            return res.status(400).json({
                message: `${fieldsList} ${missingFields.length === 1 ? 'est obligatoire' : 'sont obligatoires'}.`,
                missingFields: missingFields
            });
        }

        // Validation du mot de passe
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({ message: passwordValidation.message });
        }

        // Validation de l'âge
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 16 || ageNum > 99) {
            return res.status(400).json({ message: 'L\'âge doit être compris entre 16 et 99 ans.' });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // UPDATE du bénévole avec toutes les informations
        await db.update('benevoles', {
            password: hashedPassword,
            nom: lastName,
            prenom: firstName,
            telephone: phone,
            adresse: address,
            ville: city,
            code_postal: postalCode,
            pays: country || 'France',
            age: ageNum,
            date_naissance: birthDate || null,
            genre: gender.toLowerCase(),
            vehicule: hasVehicle || 'non',
            source_connaissance: sourceKnowledge || null,
            source_connaissance_autre: sourceKnowledgeOther || null,
            metiers_competences: skills || '',
            statut: 'restreint', // Définir le statut à "restreint"
            completion_token: null,
            completion_token_expiry: null,
            updated_at: new Date()
        }, 'id = ?', [volunteerData.id]);

        console.log(`✅ [BENEVOLAT COMPLETE] Profil complété pour: ${email}`);

        // Récupérer le logo de l'association
        let logoUrl = '';
        let nomAsso = '';
        if (volunteerData.association_nom) {
            try {
                const assoQuery = 'SELECT nom, logoUrl FROM Assos WHERE uri = ?';
                const assoResults = await db.select(assoQuery, [volunteerData.association_nom], 'remote');
                if (assoResults && assoResults.length > 0 && assoResults[0].logoUrl) {
                    logoUrl = `https://v2.myamana.fr/${assoResults[0].logoUrl}`;
                    nomAsso = assoResults[0].nom;
                }
            } catch (assoErr) {
                console.warn(`[BENEVOLAT COMPLETE] Impossible de récupérer le logo de l'association:`, assoErr);
            }
        }

        // Envoyer l'email de bienvenue
        try {
            const templateId = 7368057; // Template de bienvenue
            const variables = {
                logo_url: logoUrl
            };

            await sendTemplateEmail(
                email,
                templateId,
                variables,
                `${nomAsso} : Bienvenue dans l'équipe bénévole !`
            );

            console.log(`📧 [BENEVOLAT COMPLETE] Email de bienvenue envoyé à: ${email}`);
        } catch (emailErr) {
            console.error(`[BENEVOLAT COMPLETE] Erreur envoi email:`, emailErr);
            // Ne pas bloquer l'inscription si l'email échoue
        }

        return res.status(201).json({
            message: 'Inscription complétée avec succès !',
            trackingId: volunteerData.tracking_uuid
        });

    } catch (err) {
        console.error(`[Benevolat Complete Signup Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Signin Bénévolat
router.post('/benevolat/signin', async(req, res) => {
    const { email, password } = req.body;
    console.log("Demande de signin bénévolat reçue de " + email);

    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Format d\'email invalide.' });
    }

    try {
        const results = await db.select('SELECT * FROM benevoles WHERE email = ?', [email]);
        if (results.length === 0) {
            return res.status(401).json({ message: 'Identifiants invalides.' });
        }

        const volunteer = results[0];
        const isPasswordValid = await bcrypt.compare(password, volunteer.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Identifiants invalides.' });
        }

        if (!volunteer.is_verified) {
            return res.status(403).json({ message: 'Votre compte n\' est pas encore actif, vous devez vous connecter sur votre boite mail et cliquer sur le bouton de confirmation avant.' });
        }

        // Générer un token JWT avec les informations du bénévole
        const token = jwt.sign({
                id: volunteer.id,
                email: volunteer.email,
                firstName: volunteer.prenom,
                lastName: volunteer.nom,
                role: 'volunteer',
                associationName: volunteer.association_nom
            },
            JWT_SECRET, { expiresIn: '1h' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.URL_ORIGIN === 'https://v2.myamana.fr/',
            sameSite: 'strict',
            maxAge: 3600000,
        });

        console.log(`✅ [BENEVOLAT SIGNIN] Connexion réussie pour: ${volunteer.email}`);
        return res.status(200).json({ message: 'Connexion réussie' });
    } catch (err) {
        console.error(`[Benevolat Signin Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur de base de données.' });
    }
});


// Réinitialisation de mot de passe pour les bénévoles
router.post('/benevolat/request-password-reset', async (req, res) => {
    const { email } = req.body;
    console.log(`🔑 [BENEVOLAT PASSWORD RESET] Demande de réinitialisation pour: ${email}`);

    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Format d\'email invalide.' });
    }

    try {
        const results = await db.select('SELECT * FROM benevoles WHERE email = ?', [email]);

        if (results.length === 0) {
            // 🔒 PROTECTION CONTRE L'ENUMERATION D'UTILISATEURS
            // Si l'email n'existe pas, envoyer un email personnalisé pour inviter à créer un compte
            // au lieu de retourner une erreur 404

            const signupUrl = `${urlOrigin}/app/benevolat/sign-up`;

            await sendTemplateEmail(email, 7614867, {
                lien_creation_compte: signupUrl
            }, 'Espace Bénévole : Création de compte');

            // Toujours retourner un message générique pour éviter l'énumération
            return res.status(200).json({
                message: 'Si cette adresse email est valide, un email a été envoyé.'
            });
        }

        const volunteer = results[0];
        const resetToken = generateResetToken();
        const tokenExpiry = Date.now() + 3600000; // 1 heure

        await db.update('benevoles', { reset_token: resetToken, reset_token_expiry: tokenExpiry }, 'email = ?', [email]);

        // Récupérer les informations de contact bénévolat de l'association
        let replyToConfig = null;
        if (volunteer.association_nom) {
            try {
                const assoQuery = 'SELECT nom, benevoles_resp_email FROM Assos WHERE uri = ?';
                const assoResults = await db.select(assoQuery, [volunteer.association_nom], 'remote');
                if (assoResults && assoResults.length > 0 && assoResults[0].benevoles_resp_email) {
                    replyToConfig = {
                        email: assoResults[0].benevoles_resp_email,
                        name: assoResults[0].nom
                    };
                    console.log(`[BENEVOLAT PASSWORD RESET] Reply-to configuré : ${assoResults[0].nom} <${assoResults[0].benevoles_resp_email}>`);
                }
            } catch (assoErr) {
                console.warn(`[BENEVOLAT PASSWORD RESET] Impossible de récupérer l'email de contact:`, assoErr);
            }
        }

        const resetUrl = `${urlOrigin}/app/benevolat/new-password/token/${resetToken}`;

        // LOG POUR LE DÉVELOPPEMENT
        console.log(`🔗 [BENEVOLAT PASSWORD RESET] Lien de réinitialisation pour ${email}:`);
        console.log(`   ${resetUrl}`);
        console.log(`   Token: ${resetToken}`);
        console.log(`   Expire le: ${new Date(tokenExpiry)}`);

        const templateId = 5536948; // Template Mailjet pour réinitialisation
        const variables = { 
            prenom: volunteer.prenom, 
            lien_reinit_password: resetUrl 
        };

        await sendTemplateEmail(
            email, 
            templateId, 
            variables, 
            'Espace Bénévole : Réinitialisez votre mot de passe',
            replyToConfig
        );

        console.log(`✅ [BENEVOLAT PASSWORD RESET] Email de réinitialisation envoyé à: ${email}`);
        return res.status(200).json({ message: 'Lien de réinitialisation envoyé par email.' });
    } catch (err) {
        console.error(`[Benevolat Request Password Reset Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

/**
 * Réinitialisation de mot de passe pour les bénévoles connectés
 * Cette route nécessite une authentification et utilise l'email de l'utilisateur connecté
 */
router.post('/benevolat/request-password-reset-current-user', authMiddleware, async (req, res) => {
    console.log(`🔑 [BENEVOLAT PASSWORD RESET] Demande de réinitialisation pour l'utilisateur connecté`);

    try {
        // Récupérer l'email de l'utilisateur connecté depuis le JWT
        const userEmail = req.user.email;
        console.log(`👤 [BENEVOLAT PASSWORD RESET] Email de l'utilisateur connecté: ${userEmail}`);

        const results = await db.select('SELECT * FROM benevoles WHERE email = ?', [userEmail]);
        if (results.length === 0) {
            console.log(`❌ [BENEVOLAT PASSWORD RESET] Email non trouvé: ${userEmail}`);
            return res.status(404).json({ message: 'Email non trouvé.' });
        }

        const volunteer = results[0];
        const resetToken = generateResetToken();
        const tokenExpiry = Date.now() + 3600000; // 1 heure

        await db.update('benevoles', { reset_token: resetToken, reset_token_expiry: tokenExpiry }, 'email = ?', [userEmail]);

        // Récupérer les informations de contact bénévolat de l'association
        let replyToConfig = null;
        if (volunteer.association_nom) {
            try {
                const assoQuery = 'SELECT nom, benevoles_resp_email FROM Assos WHERE uri = ?';
                const assoResults = await db.select(assoQuery, [volunteer.association_nom], 'remote');
                if (assoResults && assoResults.length > 0 && assoResults[0].benevoles_resp_email) {
                    replyToConfig = {
                        email: assoResults[0].benevoles_resp_email,
                        name: assoResults[0].nom
                    };
                    console.log(`[BENEVOLAT PASSWORD RESET] Reply-to configuré : ${assoResults[0].nom} <${assoResults[0].benevoles_resp_email}>`);
                }
            } catch (assoErr) {
                console.warn(`[BENEVOLAT PASSWORD RESET] Impossible de récupérer l'email de contact:`, assoErr);
            }
        }

        const resetUrl = `${urlOrigin}/app/benevolat/new-password/token/${resetToken}`;

        // LOG POUR LE DÉVELOPPEMENT
        console.log(`🔗 [BENEVOLAT PASSWORD RESET] Lien de réinitialisation pour ${userEmail}:`);
        console.log(`   ${resetUrl}`);
        console.log(`   Token: ${resetToken}`);
        console.log(`   Expire le: ${new Date(tokenExpiry)}`);

        const templateId = 5536948; // Template Mailjet pour réinitialisation
        const variables = { 
            prenom: volunteer.prenom, 
            lien_reinit_password: resetUrl 
        };

        await sendTemplateEmail(
            userEmail, 
            templateId, 
            variables, 
            'Espace Bénévole : Réinitialisez votre mot de passe',
            replyToConfig
        );

        console.log(`✅ [BENEVOLAT PASSWORD RESET] Email de réinitialisation envoyé à: ${userEmail}`);
        return res.status(200).json({ message: 'Lien de réinitialisation envoyé par email.' });
    } catch (err) {
        console.error(`[Benevolat Request Password Reset Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

/**
 * Réinitialisation du mot de passe pour les bénévoles (avec le reset_token)
 */
router.post('/benevolat/reset-password', async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;
    console.log(`🔑 [BENEVOLAT PASSWORD RESET] Tentative de réinitialisation avec token`);

    if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Tous les champs sont requis.' });
    }
    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
        return res.status(400).json({ message: passwordValidation.message });
    }

    try {
        const volunteer = await db.select(
            'SELECT * FROM benevoles WHERE reset_token = ? AND reset_token_expiry > ?', 
            [token, Date.now()]
        );

        if (volunteer.length === 0) {
            console.log(`❌ [BENEVOLAT PASSWORD RESET] Token invalide ou expiré`);
            return res.status(400).json({ message: 'Token invalide ou expiré.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.update(
            'benevoles', 
            { password: hashedPassword, reset_token: null, reset_token_expiry: null },
            'id = ?', 
            [volunteer[0].id]
        );

        console.log(`✅ [BENEVOLAT PASSWORD RESET] Mot de passe réinitialisé avec succès pour: ${volunteer[0].email}`);
        return res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
    } catch (err) {
        console.error(`[Benevolat Reset Password Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});
// Vérification d'email pour les bénévoles
router.get('/benevolat/verify-email/:token', async(req, res) => {
    const { token } = req.params;
    console.log(`🔍 [BENEVOLAT VERIFICATION] Tentative de vérification avec token: ${token}`);

    try {
        const volunteer = await db.select(
            'SELECT * FROM benevoles WHERE verification_token = ? AND verification_token_expiry > ?', [token, Date.now()]
        );

        if (volunteer.length === 0) {
            console.log(`❌ [BENEVOLAT VERIFICATION] Token invalide ou expiré: ${token}`);
            return res.status(400).json({
                message: 'Token de vérification invalide ou expiré.',
                error: 'INVALID_TOKEN'
            });
        }

        const volunteerData = volunteer[0];

        // Vérifier si déjà vérifié
        if (volunteerData.is_verified) {
            console.log(`✅ [BENEVOLAT VERIFICATION] Email déjà vérifié pour: ${volunteerData.email}`);
            return res.status(200).json({
                message: 'Email déjà vérifié.',
                volunteer: {
                    prenom: volunteerData.prenom,
                    nom: volunteerData.nom,
                    email: volunteerData.email
                }
            });
        }

        // Marquer comme vérifié
        await db.update(
            'benevoles', {
                is_verified: 1,
                verified_at: new Date(),
                verification_token: null,
                verification_token_expiry: null
            },
            'id = ?', [volunteerData.id]
        );

        console.log(`✅ [BENEVOLAT VERIFICATION] Email vérifié avec succès pour: ${volunteerData.email}`);

        // Récupérer le nom réel de l'association depuis la table Assos
        let associationDisplayName = volunteerData.association_nom;
        let logoUrl = '';

        if (volunteerData.association_nom) {
            try {
                const assoQuery = 'SELECT nom, logoUrl FROM Assos WHERE uri = ?';
                const assoResults = await db.select(assoQuery, [volunteerData.association_nom], 'remote');
                if (assoResults && assoResults.length > 0) {
                    // Utiliser le nom de l'association depuis la table Assos
                    associationDisplayName = assoResults[0].nom || volunteerData.association_nom;

                    // Récupérer le logo
                    if (assoResults[0].logoUrl) {
                        logoUrl = `https://v2.myamana.fr/${assoResults[0].logoUrl}`;
                    }
                }
            } catch (assoErr) {
                console.warn(`[BENEVOLAT WELCOME] Impossible de récupérer le logo de l'association:`, assoErr);
            }
        }

        // Envoyer un email de bienvenue avec les instructions de connexion
        try {

            // Envoyer l'email de bienvenue
            const templateId = 7368057; // Template de bienvenue
            const variables = {
                logo_url: logoUrl
            };

            await sendTemplateEmail(
                volunteerData.email,
                templateId,
                variables,
                'MyAmana : Bienvenue dans l\'équipe bénévole'
            );

            console.log(`📧 [BENEVOLAT WELCOME] Email de bienvenue envoyé à: ${volunteerData.email}`);
        } catch (emailErr) {
            console.error(`[Benevolat Welcome Email Error]: ${emailErr.message}`);
            // Ne pas bloquer la vérification si l'email échoue
        }

        return res.status(200).json({
            message: 'Email vérifié avec succès ! Merci pour votre inscription bénévole.',
            volunteer: {
                prenom: volunteerData.prenom,
                nom: volunteerData.nom,
                email: volunteerData.email,
                association_nom: associationDisplayName
            }
        });
    } catch (err) {
        console.error(`[Benevolat Verify Email Error]: ${err.message}`, err);
        return res.status(500).json({
            message: 'Erreur interne du serveur.',
            error: 'SERVER_ERROR'
        });
    }
});

// Export
module.exports = {
    router,
    authMiddleware,
};
