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
// ROUTES PUBLIQUES BACKOFFICE
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
            secure: process.env.URL_ORIGIN === 'https://acdlp.com/',
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

        await sendTemplateEmail(user.email, templateId, variables, 'Espace Donateur : Finalisez la création de votre compte ACDLP');

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
            secure: process.env.URL_ORIGIN === 'https://acdlp.com/',
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

                await sendTemplateEmail(email, templateId, variables, "Backoffice : Oups, vous avez déjà un compte ACDLP :)");
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

                await sendTemplateEmail(email, templateId, variables, 'Espace Donateur : Finalisez la création de votre compte ACDLP');
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

        // Créer une ligne dans onboarding_backoffice pour ce nouvel utilisateur
        try {
            const newUserId = insertResult.insertId;
            let assoId = null;
            try {
                const assoRow = await db.select('SELECT id FROM Assos WHERE email = ?', [email], 'remote');
                if (assoRow && assoRow.length > 0) {
                    assoId = assoRow[0].id;
                }
            } catch (lookupErr) {
                console.warn('[Signup] Impossible de lookup Assos by email:', lookupErr);
            }

            await db.insert('onboarding_backoffice', {
                user_id: newUserId,
                asso_id: assoId,
                donations: false,
                cantine: true,
                doubleChecked: false,
                isOnboarded: true,
                tutorielDone: true,
                document_justificatif: documentJustificatifFilename
            }, 'remote');

        } catch (e) {
            console.error('[Signup onboarding_backoffice Insert Error]:', e);
            // On ignore l'erreur pour ne pas bloquer le signup
        }

        const confirmationUrl = `${urlOrigin}/app/auth/verify-email/token/${verificationToken}`;
        const templateId = 5536946; // ID du template Mailjet pour confirmation
        const variables = { prenom: firstName, lien_finalisation: confirmationUrl };

        await sendTemplateEmail(email, templateId, variables, 'Backoffice : Finalisez la création de votre compte ACDLP');
        return res.status(201).json({ message: 'Email de vérification envoyé' });
    } catch (err) {
        console.error(`[Signup Error]: ${err.message}`, err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// Export
module.exports = {
    router,
    authMiddleware,
};
