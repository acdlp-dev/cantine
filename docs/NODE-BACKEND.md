# Documentation Backend Node.js - MyAmana

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du serveur](#architecture-du-serveur)
3. [Configuration](#configuration)
4. [Structure des dossiers](#structure-des-dossiers)
5. [Point d'entrée (server.js)](#point-dentrée-serverjs)
6. [Système d'authentification](#système-dauthentification)
7. [Gestion de la base de données](#gestion-de-la-base-de-données)
8. [Routes API](#routes-api)
9. [Services métier](#services-métier)
10. [Middleware](#middleware)
11. [Logging et monitoring](#logging-et-monitoring)
12. [Intégrations externes](#intégrations-externes)
13. [Sécurité](#sécurité)
14. [Exemples de code](#exemples-de-code)
15. [Gestion des erreurs](#gestion-des-erreurs)
16. [Tests et débogage](#tests-et-débogage)

---

## 🎯 Vue d'ensemble

Le backend MyAmana est une API REST construite avec **Node.js** et **Express.js**, dédiée à la gestion de dons, d'abonnements et de bénévolat pour des associations.

### Caractéristiques principales

- **Framework**: Node.js avec Express.js 4.18.2
- **Base de données**: MySQL 2 (pools de connexions locale et distante)
- **Authentification**: JWT avec cookies HttpOnly
- **Logging**: Winston avec rotation quotidienne
- **Intégrations**: Stripe, PayPal, Mailjet, Google Sheets
- **Sécurité**: bcrypt, validation des entrées, protection CSRF

### Technologies utilisées

```json
{
  "Node.js": "Latest LTS",
  "Express.js": "4.18.2",
  "MySQL2": "3.3.2",
  "JWT": "8.5.1",
  "Bcrypt": "2.4.3",
  "Winston": "3.11.0",
  "Stripe": "12.0.0",
  "Mailjet": "3.3.6",
  "PDFKit": "0.13.0"
}
```

---

## 🏗️ Architecture du serveur

Le projet suit une architecture modulaire avec séparation des responsabilités:

```
server/node/
├── server.js                   # Point d'entrée, configuration Express
├── package.json                # Dépendances et scripts
├── config/                     # Configuration
│   └── logger.js              # Configuration Winston
├── middleware/                 # Middleware personnalisés
│   └── httpLogger.js          # Logging des requêtes HTTP
├── routes/                     # Routes API modulaires
│   ├── auth.js                # Authentification (donateurs, admins, bénévoles)
│   ├── dons.js                # Gestion des dons
│   ├── subscriptions.js       # Abonnements mensuels
│   ├── donateurs.js           # Gestion des donateurs
│   ├── assos.js               # Gestion des associations
│   ├── backOffice.js          # Routes administration
│   ├── benevoles.js           # Gestion bénévoles
│   ├── payment.js             # Paiement Stripe
│   ├── payment-paypal.js      # Paiement PayPal
│   ├── recus.js               # Reçus fiscaux
│   ├── cantine.js             # Module cantine
│   ├── database.js            # Routes base de données
│   └── emailDonateurs.js      # Emails aux donateurs
├── services/                   # Services métier
│   ├── bdd.js                 # Abstraction base de données
│   ├── mailService.js         # Envoi d'emails via Mailjet
│   ├── stripeService.js       # Intégration Stripe
│   ├── paypalService.js       # Intégration PayPal
│   ├── pdfService.js          # Génération de PDF
│   ├── googleSheetsService.js # Intégration Google Sheets
│   ├── icsService.js          # Génération de fichiers ICS
│   └── inseeService.js        # API INSEE
├── credentials/                # Fichiers de credentials (gitignored)
│   └── README.md
├── assets/                     # Assets statiques
├── pdf/                        # PDF générés
└── docs/                       # Documentation API
    ├── recu-fiscal-api.md
    └── postman-test-guide.md
```

### Principes architecturaux

1. **Modularité**: Routes et services séparés par domaine fonctionnel
2. **Abstraction de données**: Service BDD centralise l'accès aux bases
3. **Authentification centralisée**: Middleware auth réutilisable
4. **Logging structuré**: Winston avec rotation et niveaux de log
5. **Sécurité par défaut**: Validation, sanitization, cookies HttpOnly

---

## ⚙️ Configuration

### Variables d'environnement (.env)

```bash
# Configuration serveur
NODE_ENV=development
URL_ORIGIN=https://v2.myamana.fr/
STATIC_DIR=/usr/src/app/public

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Base de données locale (users, auth)
LOCAL_DB_HOST=mysql-local
LOCAL_DB_USER=root
LOCAL_DB_PASSWORD=your_local_password
LOCAL_DB_NAME=myamana_auth

# Base de données distante (données métier)
REMOTE_DB_HOST=mysql-remote
REMOTE_DB_USER=root
REMOTE_DB_PASSWORD=your_remote_password
REMOTE_DB_NAME=myamana_data

# Mailjet
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
MAILJET_SENDER_EMAIL=noreply@myamana.fr
MAILJET_SENDER_NAME=MyAmana

# Stripe (clés par association en BDD)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox # ou 'live'

# Logging
LOG_LEVEL=info # debug, info, warn, error

# Backoffice
BACKOFFICE_WHATSAPP_NUMBER=+33 6 78 92 04 45
```

### package.json

```json
{
  "name": "myamana",
  "version": "1.0.0",
  "description": "Générateur de dons",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.3.2",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^8.5.1",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^8.0.0",
    "winston": "^3.11.0",
    "winston-daily-rotate-file": "^4.7.1",
    "express-winston": "^4.2.0",
    "stripe": "^12.0.0",
    "node-mailjet": "^3.3.6",
    "pdfkit": "^0.13.0",
    "axios": "^1.5.1",
    "googleapis": "^128.0.0",
    "uuid": "^11.1.0",
    "body-parser": "^1.19.0",
    "fs-extra": "^11.1.1"
  }
}
```

---

## 📁 Structure des dossiers

### Routes modulaires

Chaque fichier de route gère un domaine fonctionnel spécifique:

```
routes/
├── auth.js              # Authentification (signup, signin, reset password)
├── dons.js              # Création et gestion des dons
├── subscriptions.js     # Abonnements mensuels (Stripe subscriptions)
├── donateurs.js         # CRUD donateurs
├── assos.js             # CRUD associations
├── backOffice.js        # Routes admin (stats, exports, config)
├── benevoles.js         # Gestion des bénévoles et actions
├── payment.js           # Processus de paiement Stripe
├── payment-paypal.js    # Processus de paiement PayPal
├── recus.js             # Génération de reçus fiscaux
├── cantine.js           # Module cantine
├── database.js          # Opérations base de données
└── emailDonateurs.js    # Envoi d'emails aux donateurs
```

### Services métier

```
services/
├── bdd.js                    # Abstraction base de données MySQL
├── mailService.js            # Envoi d'emails via Mailjet
├── stripeService.js          # Intégration Stripe
├── paypalService.js          # Intégration PayPal
├── pdfService.js             # Génération de PDF (reçus fiscaux)
├── googleSheetsService.js    # Synchronisation Google Sheets
├── icsService.js             # Génération de fichiers calendrier
└── inseeService.js           # API INSEE (SIRET/SIREN)
```

---

## 🚀 Point d'entrée (server.js)

### Configuration Express

```javascript
require('dotenv').config({ path: '/usr/src/app/.env' });

const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const logger = require('./config/logger');
const httpLogger = require('./middleware/httpLogger');

// Importer les routes
const { router: authRoutes } = require('./routes/auth');
const databaseRoute = require('./routes/database');
const donsRoute = require('./routes/dons');
const subscriptionsRoute = require('./routes/subscriptions');
const donateursRoute = require('./routes/donateurs');
const assosRoute = require('./routes/assos');
const recusRoute = require('./routes/recus');
const emailDonateursRoute = require('./routes/emailDonateurs');
const paymentRoute = require('./routes/payment');
const paymentPaypalRoute = require('./routes/payment-paypal');
const donsBackoffice = require('./routes/backOffice');
const cantineRoute = require('./routes/cantine');
const benevolesRoute = require('./routes/benevoles');

// Servir des fichiers statiques
app.use(express.static(process.env.STATIC_DIR));

// Configurer CORS pour autoriser l'accès depuis le front Angular
app.use(cors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true  // Permettre l'envoi de cookies
}));

// Middleware body-parser
app.use(express.json());

// Middleware cookie-parser
app.use(cookieParser());

// Middleware de logging HTTP
app.use(httpLogger);

// Monter les routes
app.use('/api', authRoutes);
app.use('/api', databaseRoute);
app.use('/api', donsRoute);
app.use('/api', subscriptionsRoute);
app.use('/api', donateursRoute);
app.use('/api', assosRoute);
app.use('/api', recusRoute);
app.use('/api', emailDonateursRoute);
app.use('/api', paymentRoute);
app.use('/api', paymentPaypalRoute);
app.use('/api', donsBackoffice);
app.use('/api', cantineRoute);
app.use('/api', benevolesRoute);

// Route de test
app.get('/api/test', (req, res) => {
    logger.info('Test endpoint called');
    res.status(200).json({ message: "ok" });
});

// Démarrer le serveur
app.listen(4242, () => {
    logger.info('Node server listening on port 4242', {
        environment: process.env.NODE_ENV || 'development',
        logLevel: process.env.LOG_LEVEL || 'info'
    });
});
```

### Points clés

- ✅ **CORS configuré** pour permettre les requêtes depuis Angular (`credentials: true`)
- ✅ **Cookie parser** pour gérer les cookies JWT HttpOnly
- ✅ **Logging HTTP** automatique de toutes les requêtes
- ✅ **Routes modulaires** montées sur `/api`
- ✅ **Port 4242** pour éviter les conflits

---

## 🔐 Système d'authentification

### Architecture multi-rôles

L'application supporte **3 types d'utilisateurs**:

1. **Donateurs** (`role: 'donator'`) - Espace donateur
2. **Associations** (`role: 'association'`) - Backoffice admin
3. **Bénévoles** (`role: 'volunteer'`) - Espace bénévolat

### Middleware d'authentification

**Localisation**: `routes/auth.js`

```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
    try {
        const token = req.cookies.auth_token; // Récupère le JWT depuis le cookie
        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email, firstName, lastName, role }

        next();
    } catch (err) {
        console.error(`[AuthMiddleware] Token error: ${err.message}`);
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
}
```

**Utilisation**:
```javascript
router.get('/api/protected-route', authMiddleware, (req, res) => {
    // req.user contient les données du JWT décodé
    return res.status(200).json({
        message: 'Accès autorisé',
        user: req.user
    });
});
```

### Flow d'authentification donateur

#### 1. Inscription (Sign Up)

```javascript
// POST /api/signup
router.post('/signup', async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!validateEmail(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await db.select('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
        // Logique de gestion des comptes existants
        // ...
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Générer un token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = Date.now() + 3600000; // 1 heure

    // Insérer en base
    await db.insert('users', {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        verification_token: verificationToken,
        verification_token_expiry: verificationTokenExpiry,
    });

    // Envoyer email de confirmation
    const confirmationUrl = `${urlOrigin}/app/auth/verify-email/token/${verificationToken}`;
    await sendTemplateEmail(email, 5536946, { 
        prenom: firstName, 
        lien_finalisation: confirmationUrl 
    }, 'Finalisez la création de votre compte');

    return res.status(201).json({ message: 'Email de vérification envoyé' });
});
```

#### 2. Vérification d'email

```javascript
// GET /api/verify-email/:token
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;

    const user = await db.select(
        'SELECT * FROM users WHERE verification_token = ? AND verification_token_expiry > ?',
        [token, Date.now()]
    );

    if (user.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    // Marquer comme vérifié
    await db.update(
        'users',
        { is_verified: 1, verification_token: null, verification_token_expiry: null },
        'id = ?',
        [user[0].id]
    );

    return res.status(200).json({ message: 'Email verified successfully.' });
});
```

#### 3. Connexion (Sign In)

```javascript
// POST /api/signin
router.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Récupérer l'utilisateur
    const results = await db.select('SELECT * FROM users WHERE email = ?', [email]);
    if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = results[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Vérifier si email vérifié
    if (!user.is_verified) {
        return res.status(403).json({ message: 'Please verify your email before signing in.' });
    }

    // Générer un token JWT
    const token = jwt.sign({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'donator'
    }, JWT_SECRET, { expiresIn: '1h' });

    // Définir le cookie HttpOnly
    res.cookie('auth_token', token, {
        httpOnly: true,  // Non accessible via JavaScript
        secure: process.env.URL_ORIGIN.startsWith('https'),  // HTTPS uniquement en prod
        sameSite: 'strict',  // Protection CSRF
        maxAge: 3600000,  // 1 heure
    });

    return res.status(200).json({ message: 'Logged in successfully' });
});
```

#### 4. Réinitialisation de mot de passe

```javascript
// POST /api/request-password-reset
router.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;

    const results = await db.select('SELECT * FROM users WHERE email = ?', [email]);
    if (results.length === 0) {
        return res.status(404).json({ message: 'Email not found.' });
    }

    // Générer token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 3600000; // 1 heure

    await db.update('users', 
        { reset_token: resetToken, token_expiry: tokenExpiry },
        'email = ?',
        [email]
    );

    // Envoyer email
    const resetUrl = `${urlOrigin}/app/auth/new-password/token/${resetToken}`;
    await sendTemplateEmail(email, 6857507, {
        prenom: results[0].firstName,
        lien_reinit_password: resetUrl
    }, 'Réinitialisez votre mot de passe');

    return res.status(200).json({ message: 'Reset password link sent to email.' });
});

// POST /api/reset-password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Vérifier le token
    const user = await db.select(
        'SELECT * FROM users WHERE reset_token = ? AND token_expiry > ?',
        [token, Date.now()]
    );

    if (user.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    // Hasher et mettre à jour
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(
        'users',
        { password: hashedPassword, reset_token: null, token_expiry: null },
        'id = ?',
        [user[0].id]
    );

    return res.status(200).json({ message: 'Password reset successfully.' });
});
```

### Flow d'authentification bénévole (OTP)

Le processus d'inscription bénévole utilise un code OTP pour plus de sécurité:

#### 1. Demande de code OTP

```javascript
// POST /api/benevolat/request-otp
router.post('/benevolat/request-otp', async (req, res) => {
    const { email, confirmEmail, associationName } = req.body;

    // Validation
    if (email !== confirmEmail) {
        return res.status(400).json({ message: 'Les adresses email ne correspondent pas.' });
    }

    // Générer un code OTP à 6 chiffres
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + (10 * 60000); // 10 minutes

    // Sauvegarder en base
    await db.insert('benevoles', {
        email,
        association_nom: associationName,
        verification_code: otp,
        verification_code_expiry: otpExpiry,
        tracking_uuid: uuidv4(),
        is_verified: 0
    });

    // Envoyer l'email avec le code OTP
    await sendTemplateEmail(email, 7367008, {
        code_verification: otp,
        logo_url: logoUrl
    }, 'Votre code de vérification');

    return res.status(200).json({
        message: 'Code de vérification envoyé.',
        expiresIn: 600
    });
});
```

#### 2. Vérification du code OTP

```javascript
// POST /api/benevolat/verify-otp
router.post('/benevolat/verify-otp', async (req, res) => {
    const { email, code } = req.body;

    // Vérifier le code
    const volunteer = await db.select(
        'SELECT * FROM benevoles WHERE email = ? AND verification_code = ? AND verification_code_expiry > ?',
        [email, code, Date.now()]
    );

    if (volunteer.length === 0) {
        return res.status(400).json({ message: 'Code invalide ou expiré.' });
    }

    // Générer un token de continuation
    const completionToken = crypto.randomBytes(32).toString('hex');
    const completionTokenExpiry = Date.now() + (24 * 3600000); // 24 heures

    // Marquer comme vérifié
    await db.update('benevoles', {
        is_verified: 1,
        verified_at: new Date(),
        verification_code: null,
        verification_code_expiry: null,
        completion_token: completionToken,
        completion_token_expiry: completionTokenExpiry
    }, 'id = ?', [volunteer[0].id]);

    return res.status(200).json({
        message: 'Email vérifié avec succès.',
        token: completionToken,
        email: email
    });
});
```

#### 3. Complétion de l'inscription

```javascript
// POST /api/benevolat/complete-signup
router.post('/benevolat/complete-signup', async (req, res) => {
    const {
        token,
        password,
        prenom,
        nom,
        telephone,
        adresse,
        ville,
        code_postal,
        age,
        genre,
        vehicule
    } = req.body;

    // Vérifier le token
    const volunteer = await db.select(
        'SELECT * FROM benevoles WHERE completion_token = ? AND completion_token_expiry > ?',
        [token, Date.now()]
    );

    if (volunteer.length === 0) {
        return res.status(400).json({ message: 'Token invalide ou expiré.' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mettre à jour le profil complet
    await db.update('benevoles', {
        password: hashedPassword,
        nom,
        prenom,
        telephone,
        adresse,
        ville,
        code_postal,
        age,
        genre,
        vehicule,
        statut: 'restreint',
        completion_token: null,
        completion_token_expiry: null
    }, 'id = ?', [volunteer[0].id]);

    // Envoyer email de bienvenue
    await sendTemplateEmail(volunteer[0].email, 7368057, {
        logo_url: logoUrl
    }, 'Bienvenue dans l\'équipe bénévole !');

    return res.status(201).json({
        message: 'Inscription complétée avec succès !',
        trackingId: volunteer[0].tracking_uuid
    });
});
```

### Authentification Backoffice (Associations)

```javascript
// POST /api/backoffice/signin
router.post('/backoffice/signin', async (req, res) => {
    const { email, password } = req.body;

    // Vérifier que l'utilisateur a le rôle 'association'
    const results = await db.select(
        'SELECT * FROM users WHERE email = ? AND role = "association"',
        [email]
    );

    if (results.length === 0) {
        return res.status(401).json({ 
            message: 'Invalid credentials or insufficient permissions.' 
        });
    }

    const user = results[0];

    // Récupérer les infos de l'association
    const assoCheck = await db.select(
        'SELECT * FROM Assos WHERE email = ?',
        [email],
        'remote'
    );

    if (assoCheck.length === 0) {
        return res.status(401).json({ message: 'Invalid email for this association.' });
    }

    const asso = assoCheck[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Vérifier l'onboarding (blocage si amende non payée)
    const onboarding = await db.select(
        'SELECT statut, amende FROM onboarding_backoffice WHERE user_id = ? LIMIT 1',
        [user.id],
        'remote'
    );

    if (onboarding.length > 0 && onboarding[0].statut !== 'ok') {
        return res.status(403).json({
            message: `Votre compte est bloqué. Montant dû: ${onboarding[0].amende} €.`
        });
    }

    // Générer JWT avec infos association
    const token = jwt.sign({
        id: asso.id,
        email: asso.email,
        firstName: asso.firstName,
        lastName: asso.lastName,
        role: 'association',
        siren: asso.siren,
        uri: asso.uri,
        nameAsso: asso.nom,
        logoUrl: asso.logoUrl
    }, JWT_SECRET, { expiresIn: '1h' });

    res.cookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.URL_ORIGIN.startsWith('https'),
        sameSite: 'strict',
        maxAge: 3600000
    });

    return res.status(200).json({ message: 'Logged in successfully to backoffice' });
});
```

---

## 🗄️ Gestion de la base de données

### Service BDD

**Localisation**: `services/bdd.js`

Le service BDD fournit une abstraction pour interagir avec MySQL en utilisant des **pools de connexions** séparés pour deux bases:

- **local**: Authentification et utilisateurs
- **remote**: Données métier (associations, dons, bénévoles, etc.)

```javascript
const mysql = require('mysql2');

// Créer des pools de connexions
const pools = {
  local: mysql.createPool({
    host: process.env.LOCAL_DB_HOST,
    user: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }).promise(),
  
  remote: mysql.createPool({
    host: process.env.REMOTE_DB_HOST,
    user: process.env.REMOTE_DB_USER,
    password: process.env.REMOTE_DB_PASSWORD,
    database: process.env.REMOTE_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }).promise()
};

// Fonction pour choisir un pool
const getPool = (type = 'local') => {
  if (!pools[type]) {
    throw new Error(`Invalid database type: ${type}`);
  }
  return pools[type];
};
```

### Opérations CRUD

#### SELECT

```javascript
const select = async (sql, params, dbType = 'local') => {
  try {
    console.log(`[SQL Query]: ${sql}`);
    console.log(`[Parameters]: ${JSON.stringify(params)}`);
    console.log(`[dbType]: `, dbType);

    const db = getPool(dbType);
    const [results] = await db.execute(sql, params);

    return results;
  } catch (err) {
    console.error(`[SQL Error]: ${err.sqlMessage}`, err);
    throw err;
  }
};
```

**Exemple d'utilisation**:
```javascript
// Requête sur la base locale
const users = await db.select(
  'SELECT * FROM users WHERE email = ?',
  ['user@example.com'],
  'local'
);

// Requête sur la base distante
const assos = await db.select(
  'SELECT * FROM Assos WHERE siren = ?',
  ['123456789'],
  'remote'
);
```

#### INSERT

```javascript
const insert = async (table, data, dbType = 'local') => {
  const columns = Object.keys(data);
  const values = Object.values(data);

  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

  console.log('[SQL Query]:', sql);
  console.log('[Values]:', values);

  try {
    const db = getPool(dbType);
    const [result] = await db.execute(sql, values);
    return result; // Contient insertId, affectedRows, etc.
  } catch (err) {
    console.error(`[SQL Error]: ${err.sqlMessage}`, err);
    throw err;
  }
};
```

**Exemple d'utilisation**:
```javascript
const result = await db.insert('users', {
  email: 'new@example.com',
  password: hashedPassword,
  firstName: 'John',
  lastName: 'Doe',
  is_verified: 0
}, 'local');

console.log('User ID:', result.insertId);
```

#### UPDATE

```javascript
const update = async (table, updates, condition, conditionValues, dbType = 'local') => {
  const setClause = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${condition}`;

  console.log('[SQL Query]:', sql);

  try {
    const db = getPool(dbType);
    const [result] = await db.execute(sql, [...Object.values(updates), ...conditionValues]);
    return result; // Contient affectedRows
  } catch (err) {
    console.error(`[SQL Error]: ${err.sqlMessage}`, err);
    throw err;
  }
};
```

**Exemple d'utilisation**:
```javascript
await db.update(
  'users',
  { is_verified: 1, verification_token: null },
  'email = ?',
  ['user@example.com'],
  'local'
);
```

#### DELETE

```javascript
const remove = async (table, condition, dbType = 'local') => {
  const sql = `DELETE FROM ${table} WHERE ${condition}`;

  console.log('[SQL Query]:', sql);

  try {
    const db = getPool(dbType);
    const [result] = await db.execute(sql, []);
    return result;
  } catch (err) {
    console.error(`[SQL Error]: ${err.sqlMessage}`, err);
    throw err;
  }
};
```

### Requêtes personnalisées

```javascript
// Requête SQL libre pour des cas complexes
const query = async (sql, params = [], dbType = 'local') => {
  console.log('[SQL Raw Query]:', sql);
  console.log('[Params]:', params);
  
  try {
    const db = getPool(dbType);
    const [results] = await db.execute(sql, params);
    return results;
  } catch (err) {
    console.error(`[SQL Error]: ${err.sqlMessage}`, err);
    throw err;
  }
};
```

**Exemple JOIN complexe**:
```javascript
const donations = await db.query(`
  SELECT d.*, u.email, u.firstName, u.lastName
  FROM donations d
  LEFT JOIN users u ON d.user_id = u.id
  WHERE d.amount > ? AND d.created_at > ?
  ORDER BY d.created_at DESC
`, [100, '2024-01-01'], 'remote');
```

### Protection des données sensibles

Le service masque automatiquement les clés API et mots de passe dans les logs:

```javascript
const maskSensitiveData = (data) => {
  if (typeof data === 'string' && data.startsWith('sk_')) {
    return '********';
  }
  
  if (typeof data === 'object' && data !== null) {
    const maskedData = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'stripe_secret_key' || key === 'password' || key === 'apiKey') {
        maskedData[key] = '********';
      } else {
        maskedData[key] = maskSensitiveData(value);
      }
    }
    return maskedData;
  }
  
  return data;
};
```

---

## 🛣️ Routes API

### Routes principales

#### Auth Routes (`/api`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/signup` | Inscription donateur | Non |
| POST | `/signin` | Connexion donateur | Non |
| POST | `/logout` | Déconnexion | Non |
| GET | `/verify-email/:token` | Vérification email | Non |
| POST | `/request-password-reset` | Demande reset password | Non |
| POST | `/reset-password` | Reset password avec token | Non |
| POST | `/resend-verification-link` | Renvoyer lien vérification | Non |
| GET | `/me` | Infos utilisateur connecté | Oui |
| GET | `/protected-route` | Test route protégée | Oui |

#### Backoffice Auth Routes (`/api/backoffice`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/backoffice/signup` | Inscription association | Non |
| POST | `/backoffice/signin` | Connexion association | Non |
| GET | `/backoffice/me` | Infos association | Oui |
| GET | `/backoffice/protected-route` | Test route protégée | Oui |

#### Benevolat Routes (`/api/benevolat`)

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| POST | `/benevolat/request-otp` | Demande code OTP | Non |
| POST | `/benevolat/verify-otp` | Vérification OTP | Non |
| POST | `/benevolat/complete-signup` | Complétion inscription | Non |
| POST | `/benevolat/signin` | Connexion bénévole | Non |
| POST | `/benevolat/request-password-reset` | Reset password | Non |
| POST | `/benevolat/reset-password` | Reset avec token | Non |
| GET | `/benevolat/verify-email/:token` | Vérif email | Non |

### Exemple de route complète

```javascript
const express = require('express');
const router = express.Router();
const db = require('../services/bdd');
const { authMiddleware } = require('./auth');

// GET /api/donations - Liste des dons
router.get('/donations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const donations = await db.select(`
      SELECT 
        id,
        amount,
        currency,
        payment_method,
        status,
        created_at
      FROM donations
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId], 'remote');

    return res.status(200).json({
      success: true,
      count: donations.length,
      data: donations
    });
  } catch (error) {
    console.error('[Get Donations Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des dons'
    });
  }
});

// POST /api/donations - Créer un don
router.post('/donations', authMiddleware, async (req, res) => {
  try {
    const { amount, currency, payment_method, asso_id } = req.body;
    const userId = req.user.id;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Montant invalide'
      });
    }

    // Insérer le don
    const result = await db.insert('donations', {
      user_id: userId,
      asso_id: asso_id,
      amount: amount,
      currency: currency || 'EUR',
      payment_method: payment_method,
      status: 'pending',
      created_at: new Date()
    }, 'remote');

    return res.status(201).json({
      success: true,
      message: 'Don créé avec succès',
      donationId: result.insertId
    });
  } catch (error) {
    console.error('[Create Donation Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du don'
    });
  }
});

module.exports = router;
```

---

## ⚙️ Services métier

### Mail Service (Mailjet)

**Localisation**: `services/mailService.js`

```javascript
const Mailjet = require('node-mailjet');

const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_SECRET_KEY
);

/**
 * Envoie un email avec template Mailjet
 * @param {string} recipientEmail - Email du destinataire
 * @param {number} templateId - ID du template Mailjet
 * @param {object} variables - Variables du template
 * @param {string} subject - Sujet de l'email
 * @param {object} replyTo - Configuration reply-to (optionnel)
 */
async function sendTemplateEmail(
  recipientEmail,
  templateId,
  variables,
  subject,
  replyTo = null
) {
  try {
    const request = mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.MAILJET_SENDER_EMAIL,
            Name: process.env.MAILJET_SENDER_NAME
          },
          To: [
            {
              Email: recipientEmail
            }
          ],
          Subject: subject,
          TemplateID: templateId,
          TemplateLanguage: true,
          Variables: variables,
          ...(replyTo && {
            ReplyTo: {
              Email: replyTo.email,
              Name: replyTo.name
            }
          })
        }
      ]
    });

    const result = await request;
    console.log(`[Email Sent] Template ${templateId} to ${recipientEmail}`);
    return result.body;
  } catch (error) {
    console.error('[Email Error]:', error.statusCode, error.message);
    throw error;
  }
}

module.exports = {
  sendTemplateEmail
};
```

**Utilisation**:
```javascript
const { sendTemplateEmail } = require('../services/mailService');

// Envoi d'un email de bienvenue
await sendTemplateEmail(
  'user@example.com',
  7368057,  // Template ID
  {
    prenom: 'John',
    lien_dashboard: 'https://myamana.fr/dashboard'
  },
  'Bienvenue sur MyAmana'
);

// Avec reply-to personnalisé
await sendTemplateEmail(
  'volunteer@example.com',
  7367008,
  { code_verification: '123456' },
  'Votre code de vérification',
  {
    email: 'contact@association.fr',
    name: 'Association XYZ'
  }
);
```

### Stripe Service

**Localisation**: `services/stripeService.js`

```javascript
const db = require('./bdd');
const stripe = require('stripe');

/**
 * Récupère une instance Stripe avec la clé de l'association
 * @param {string} identifier - URI de l'association
 * @returns {Promise<Stripe>} Instance Stripe
 */
async function getStripeInstance(identifier) {
  try {
    const query = 'SELECT stripe_secret_key FROM Assos WHERE uri = ?';
    const results = await db.select(query, [identifier], 'remote');
    
    if (results.length === 0) {
      throw new Error(`Aucune clé Stripe trouvée pour: ${identifier}`);
    }
    
    const stripeKey = results[0].stripe_secret_key;
    if (!stripeKey || typeof stripeKey !== 'string') {
      throw new Error("Clé Stripe invalide ou manquante.");
    }
    
    console.log("Instance Stripe créée pour:", identifier);
    return stripe(stripeKey);
  } catch (error) {
    console.error('[Stripe Instance Error]:', error);
    throw error;
  }
}

module.exports = {
  getStripeInstance
};
```

**Utilisation**:
```javascript
const { getStripeInstance } = require('../services/stripeService');

// Dans une route de paiement
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, associationUri } = req.body;
    
    // Récupérer l'instance Stripe de l'association
    const stripeInstance = await getStripeInstance(associationUri);
    
    // Créer un Payment Intent
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amount * 100, // En centimes
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true
      }
    });
    
    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('[Payment Intent Error]:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### PDF Service

**Localisation**: `services/pdfService.js`

```javascript
const PDFDocument = require('pdfkit');
const fs = require('fs-extra');
const path = require('path');

/**
 * Génère un reçu fiscal PDF
 * @param {object} donationData - Données du don
 * @param {object} donorData - Données du donateur
 * @param {object} assoData - Données de l'association
 * @returns {Promise<string>} Chemin du fichier PDF généré
 */
async function generateRecuFiscal(donationData, donorData, assoData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const fileName = `recu_${donationData.id}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../pdf', fileName);
      
      // Créer le dossier si nécessaire
      fs.ensureDirSync(path.dirname(filePath));
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // En-tête
      doc.fontSize(20).text('REÇU FISCAL', { align: 'center' });
      doc.moveDown();
      
      // Informations association
      doc.fontSize(12).text(`Association: ${assoData.nom}`);
      doc.text(`SIREN: ${assoData.siren}`);
      doc.text(`Adresse: ${assoData.adresse}`);
      doc.moveDown();
      
      // Informations donateur
      doc.text(`Donateur: ${donorData.firstName} ${donorData.lastName}`);
      doc.text(`Email: ${donorData.email}`);
      doc.moveDown();
      
      // Informations don
      doc.fontSize(14).text(`Montant du don: ${donationData.amount} €`, {
        bold: true
      });
      doc.fontSize(12).text(`Date: ${new Date(donationData.date).toLocaleDateString('fr-FR')}`);
      doc.text(`Référence: ${donationData.id}`);
      doc.moveDown();
      
      // Mention légale
      doc.fontSize(10).text(
        'Ce reçu vous permet de bénéficier d\'une réduction d\'impôt égale à 66% du montant du don.',
        { align: 'justify' }
      );

      doc.end();

      stream.on('finish', () => {
        console.log('[PDF Generated]:', filePath);
        resolve(filePath);
      });

      stream.on('error', (error) => {
        console.error('[PDF Generation Error]:', error);
        reject(error);
      });
    } catch (error) {
      console.error('[PDF Service Error]:', error);
      reject(error);
    }
  });
}

module.exports = {
  generateRecuFiscal
};
```

---

## 🔧 Middleware

### HTTP Logger

**Localisation**: `middleware/httpLogger.js`

```javascript
const logger = require('../config/logger');

module.exports = (req, res, next) => {
  const start = Date.now();

  // Capturer la fin de la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    // Ajouter l'utilisateur si authentifié
    if (req.user && req.user.email) {
      logData.user = req.user.email;
    }

    // Log selon le niveau
    if (res.statusCode >= 500) {
      logger.error('HTTP Request Error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request Warning', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  });

  next();
};
```

### Rate Limiting (exemple)

```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: 'Trop de tentatives de connexion, réessayez dans 15 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Utilisation
router.post('/signin', authLimiter, async (req, res) => {
  // ...
});
```

---

## 📊 Logging et monitoring

### Configuration Winston

**Localisation**: `config/logger.js`

```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Niveau de log
const level = process.env.LOG_LEVEL || 'info';

// Format personnalisé
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Transport avec rotation quotidienne
const fileRotateTransport = new DailyRotateFile({
  filename: path.join('/var/log/myamana', 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: customFormat,
  level: 'info'
});

// Transport pour les erreurs
const errorRotateTransport = new DailyRotateFile({
  filename: path.join('/var/log/myamana', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: customFormat,
  level: 'error'
});

// Créer le logger
const logger = winston.createLogger({
  level: level,
  format: customFormat,
  defaultMeta: { service: 'myamana-api' },
  transports: [
    fileRotateTransport,
    errorRotateTransport
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join('/var/log/myamana', 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// En développement, ajouter console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

### Utilisation du logger

```javascript
const logger = require('./config/logger');

// Différents niveaux
logger.debug('Message de débogage');
logger.info('Information', { userId: 123 });
logger.warn('Avertissement', { action: 'deprecated_api' });
logger.error('Erreur critique', { error: err.message, stack: err.stack });

// Helper pour logger les erreurs avec contexte
logger.logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context
  });
};

// Utilisation
try {
  // Code susceptible de générer une erreur
} catch (error) {
  logger.logError(error, { 
    userId: req.user.id,
    action: 'create_donation' 
  });
}
```

---

## 🔐 Sécurité

### Validation des entrées

```javascript
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const validatePassword = (password) => {
  if (password.length < 6) {
    return { 
      valid: false, 
      message: 'Le mot de passe doit contenir au moins 6 caractères.' 
    };
  }

  // Vérifier les caractères problématiques
  for (let i = 0; i < password.length; i++) {
    const charCode = password.charCodeAt(i);
    // Caractères de contrôle
    if (charCode >= 0 && charCode <= 31 || charCode === 127) {
      return {
        valid: false,
        message: 'Le mot de passe contient des caractères non autorisés.'
      };
    }
  }

  return { valid: true };
};

const validateSiren = (siren) => {
  return /^[0-9]{9}$/.test(siren);
};
```

### Hashage des mots de passe

```javascript
const bcrypt = require('bcryptjs');

// Hash
const hashedPassword = await bcrypt.hash(password, 10);

// Vérification
const isValid = await bcrypt.compare(password, hashedPassword);
```

### Protection CSRF

Les cookies sont configurés avec `sameSite: 'strict'`:

```javascript
res.cookie('auth_token', token, {
  httpOnly: true,      // Inaccessible via JavaScript
  secure: true,        // HTTPS uniquement
  sameSite: 'strict',  // Protection CSRF
  maxAge: 3600000     // 1 heure
});
```

### Sécurité des headers

```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## 💡 Exemples de code

### 1. Créer une nouvelle route protégée

```javascript
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./auth');
const db = require('../services/bdd');

router.get('/my-protected-data', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const data = await db.select(
      'SELECT * FROM my_table WHERE user_id = ?',
      [userId],
      'remote'
    );

    return res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('[Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
```

### 2. Créer un service de paiement Stripe

```javascript
const { getStripeInstance } = require('../services/stripeService');
const db = require('../services/bdd');

router.post('/create-payment', authMiddleware, async (req, res) => {
  try {
    const { amount, associationUri, description } = req.body;
    const userId = req.user.id;

    // Récupérer l'instance Stripe
    const stripe = await getStripeInstance(associationUri);

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Centimes
      currency: 'eur',
      description: description,
      metadata: {
        userId: userId,
        associationUri: associationUri
      }
    });

    // Sauvegarder en base
    await db.insert('payments', {
      user_id: userId,
      amount: amount,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'pending',
      created_at: new Date()
    }, 'remote');

    return res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('[Payment Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

### 3. Envoyer un email de notification

```javascript
const { sendTemplateEmail } = require('../services/mailService');

router.post('/send-notification', authMiddleware, async (req, res) => {
  try {
    const { recipientEmail, templateId, variables } = req.body;

    await sendTemplateEmail(
      recipientEmail,
      templateId,
      variables,
      'Notification MyAmana'
    );

    return res.status(200).json({
      success: true,
      message: 'Email envoyé avec succès'
    });
  } catch (error) {
    console.error('[Email Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi de l\'email'
    });
  }
});
```

### 4. Middleware de validation

```javascript
const validateDonation = (req, res, next) => {
  const { amount, associationUri } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Montant invalide'
    });
  }

  if (!associationUri) {
    return res.status(400).json({
      success: false,
      message: 'URI de l\'association requis'
    });
  }

  next();
};

// Utilisation
router.post('/donations', authMiddleware, validateDonation, async (req, res) => {
  // La validation est déjà passée
});
```

---

## 🐛 Gestion des erreurs

### Middleware global d'erreurs

```javascript
// À la fin de server.js
app.use((err, req, res, next) => {
  logger.error('Unhandled Error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});
```

### Try-Catch dans les routes async

```javascript
router.post('/my-route', authMiddleware, async (req, res) => {
  try {
    // Code susceptible d'échouer
    const result = await someAsyncOperation();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[Route Error]:', error);
    logger.logError(error, { 
      route: '/my-route',
      userId: req.user?.id 
    });
    return res.status(500).json({ 
      success: false, 
      message: 'Une erreur est survenue' 
    });
  }
});
```

---

## 🧪 Tests et débogage

### Tests manuels avec curl

```bash
# Test de signup
curl -X POST http://localhost:4242/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Test de signin
curl -X POST http://localhost:4242/api/signin \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'

# Test route protégée
curl -X GET http://localhost:4242/api/protected-route \
  -b cookies.txt
```

### Déboguer avec VS Code

**launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "program": "${workspaceFolder}/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
