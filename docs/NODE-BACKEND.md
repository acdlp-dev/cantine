# Documentation Backend Node.js - ACDLP

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

---

## 🎯 Vue d'ensemble

Le backend ACDLP est une API REST construite avec **Node.js** et **Express.js**, dédiée à la gestion de bénévoles, de la cantine solidaire et du suivi de véhicules pour l'association Au Cœur de la Précarité.

### Caractéristiques principales

- **Framework**: Node.js avec Express.js 4.18.2
- **Base de données**: MySQL 8.0 (pools de connexions locale et distante)
- **Authentification**: JWT avec cookies HttpOnly (2 rôles: Admin + Bénévoles)
- **Logging**: Winston avec rotation quotidienne
- **Intégrations**: Mailjet (emails), Google Sheets (sync bénévoles), INSEE (validation SIREN)
- **Sécurité**: bcrypt, validation des entrées, protection CSRF

### Technologies utilisées

```json
{
  "Node.js": "20 LTS",
  "Express.js": "4.18.2",
  "MySQL2": "3.3.2",
  "JWT": "8.5.1",
  "Bcrypt": "2.4.3",
  "Winston": "3.11.0",
  "Mailjet": "3.3.6",
  "QRCode": "1.5.3"
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
├── routes/                     # Routes API modulaires (7 fichiers)
│   ├── auth.js                # Authentification (admins, bénévoles)
│   ├── assos.js               # Gestion des associations
│   ├── backOffice.js          # Routes administration
│   ├── benevoles.js           # Gestion bénévoles
│   ├── cantine.js             # Module cantine solidaire
│   ├── database.js            # Routes base de données
│   └── support.js             # Système tickets support
├── services/                   # Services métier (7 fichiers)
│   ├── bdd.js                 # Abstraction base de données
│   ├── mailService.js         # Envoi d'emails via Mailjet
│   ├── googleSheetsService.js # Intégration Google Sheets
│   ├── icsService.js          # Génération de fichiers ICS
│   ├── inseeService.js        # API INSEE (validation SIREN)
│   ├── trelloService.js       # Intégration Trello (support)
│   └── mailjetSyncService.js  # Sync contacts Mailjet
├── credentials/                # Fichiers de credentials (gitignored)
├── assets/                     # Assets statiques
├── crons/                      # Tâches planifiées
└── logs/                       # Logs Winston
```

### Principes architecturaux

1. **Modularité**: Chaque domaine métier (auth, bénévoles, cantine) a son propre fichier de routes
2. **Séparation des préoccupations**: Routes → Services → Base de données
3. **DRY (Don't Repeat Yourself)**: Logique commune dans les services
4. **Sécurité par défaut**: Toutes les routes protégées par JWT sauf endpoints publics
5. **Logging centralisé**: Winston pour tous les logs applicatifs

---

## ⚙️ Configuration

### Variables d'environnement (.env)

```bash
# Base de données locale (Docker)
LOCAL_DB_HOST=mysql
LOCAL_DB_USER=rachid
LOCAL_DB_PASSWORD=rachid
LOCAL_DB_NAME=acdlp

# Base de données distante
REMOTE_DB_HOST=mysql
REMOTE_DB_USER=rachid
REMOTE_DB_PASSWORD=rachid
REMOTE_DB_NAME=acdlp

# Authentification
JWT_SECRET=Sourate76Verset9

# URL origine
URL_ORIGIN=https://acdlp.fr

# Mailjet
MAILJET_KEY_MYAMANA=***
MAILJET_SECRET_MYAMANA=***

# Google Sheets
GOOGLE_SHEET_ID=***
GOOGLE_CREDENTIALS_PATH=./credentials/google-credentials.json

# INSEE API
SIRENE_API_KEY=***

# Trello (Support)
TRELLO_API_KEY=***
TRELLO_TOKEN=***
TRELLO_BOARD_ID=***

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

---

## 📂 Structure des dossiers

```
server/node/
├── server.js              # Point d'entrée
├── package.json           # Dépendances
├── .env                   # Variables environnement
├── config/
│   └── logger.js         # Config Winston
├── middleware/
│   └── httpLogger.js     # Logging HTTP
├── routes/
│   ├── auth.js           # Authentification (285 lignes)
│   ├── assos.js          # Associations (43 lignes)
│   ├── backOffice.js     # Backoffice (464 lignes)
│   ├── benevoles.js      # Bénévoles (1800+ lignes)
│   ├── cantine.js        # Cantine (800+ lignes)
│   ├── database.js       # DB utils
│   └── support.js        # Support tickets
├── services/
│   ├── bdd.js                 # Base de données (148 lignes)
│   ├── mailService.js         # Emails (150 lignes)
│   ├── googleSheetsService.js # Google Sheets (200+ lignes)
│   ├── icsService.js          # Calendrier (250 lignes)
│   ├── inseeService.js        # INSEE API (50 lignes)
│   ├── trelloService.js       # Trello (400+ lignes)
│   └── mailjetSyncService.js  # Mailjet sync (300+ lignes)
├── credentials/
│   └── google-credentials.json
├── assets/
├── crons/
│   └── syncDonateursMailjet.js
└── logs/
    ├── combined.log
    ├── error.log
    └── http.log
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
const assosRoute = require('./routes/assos');
const donsBackoffice = require('./routes/backOffice');
const cantineRoute = require('./routes/cantine');
const benevolesRoute = require('./routes/benevoles');
const supportRoute = require('./routes/support');

// Middleware
app.use(express.static(process.env.STATIC_DIR));
app.use(cors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(httpLogger);

// Monter les routes
app.use('/api', authRoutes);
app.use('/api', databaseRoute);
app.use('/api', assosRoute);
app.use('/api', donsBackoffice);
app.use('/api', cantineRoute);
app.use('/api', benevolesRoute);
app.use('/api', supportRoute);

// Route de test
app.get('/api/test', (req, res) => {
    logger.info('Test endpoint called');
    res.status(200).json({ message: "ok" });
});

// Démarrer le serveur
app.listen(4242, () => {
    logger.info('Node server listening on port 4242');
});
```

---

## 🔐 Système d'authentification

### Flux d'authentification multi-rôles

ACDLP gère **2 types d'utilisateurs** avec des flux d'authentification distincts:

#### 1. Admins Association (Table: `users`)

**Flux:**
1. Signup avec validation SIREN → Upload documents → Vérification email → Approbation manuelle
2. Login: Email + Password
3. JWT stocké dans cookie HttpOnly

**Routes auth.js:**
```javascript
POST /api/backoffice/signup        // Inscription admin
POST /api/backoffice/signin        // Connexion admin
GET  /api/backoffice/me            // Info user courant
POST /api/backoffice/verify-email  // Vérification email
```

#### 2. Bénévoles (Table: `benevoles`)

**Flux:**
1. Demande code OTP (6 chiffres) → Vérification email → Inscription complète
2. Login: Email + Password OU OTP
3. JWT stocké dans cookie HttpOnly

**Routes auth.js:**
```javascript
POST /api/benevolat/request-otp           // Demande OTP
POST /api/benevolat/verify-otp            // Vérification OTP
POST /api/benevolat/complete-signup       // Compléter inscription
POST /api/benevolat/signin                // Connexion bénévole
POST /api/benevolat/request-password-reset
POST /api/benevolat/reset-password
```

### Middleware authMiddleware

```javascript
function authMiddleware(req, res, next) {
    try {
        const token = req.cookies.auth_token;
        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email, firstName, lastName, role, uri }

        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token.' });
    }
}
```

### Sécurité JWT

- **Algorithme**: HS256
- **Expiration**: 1 heure
- **Stockage**: Cookie HttpOnly (protection XSS)
- **Payload**: id, email, firstName, lastName, role, uri, siren
- **Secret**: Variable d'environnement `JWT_SECRET`

---

## 🗄️ Gestion de la base de données

### Service bdd.js

Abstraction MySQL avec dual pooling (local + remote).

```javascript
const mysql = require('mysql2/promise');

// Pool local (Docker)
const localPool = mysql.createPool({
    host: process.env.LOCAL_DB_HOST,
    user: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Pool distant
const remotePool = mysql.createPool({
    host: process.env.REMOTE_DB_HOST,
    user: process.env.REMOTE_DB_USER,
    password: process.env.REMOTE_DB_PASSWORD,
    database: process.env.REMOTE_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// Méthodes CRUD
async function select(query, params = [], pool = 'local') { ... }
async function insert(table, data, pool = 'local') { ... }
async function update(table, data, where, whereParams, pool = 'local') { ... }
async function deleteRow(table, where, whereParams, pool = 'local') { ... }

module.exports = { select, insert, update, deleteRow };
```

### Protection SQL Injection

✅ **Toutes les requêtes utilisent des requêtes préparées:**

```javascript
// ✅ CORRECT
const results = await db.select(
    'SELECT * FROM benevoles WHERE email = ? AND association_nom = ?',
    [email, assoName]
);

// ❌ INCORRECT (vulnérable)
const results = await db.select(
    `SELECT * FROM benevoles WHERE email = '${email}'`
);
```

---

## 🛣️ Routes API

### Vue d'ensemble des routes

| Fichier | Endpoints | Fonction |
|---------|-----------|----------|
| **auth.js** | 15+ | Authentification multi-rôles (admin, bénévoles) |
| **benevoles.js** | 30+ | Gestion bénévoles, actions, QR codes repas |
| **cantine.js** | 15+ | Gestion cantine solidaire, commandes, quotas |
| **backOffice.js** | 9 | Dashboard admin, stats, configuration |
| **assos.js** | 2 | Gestion associations |
| **support.js** | 6 | Système tickets support (Trello) |
| **database.js** | 2 | Utilitaires DB |

**Total: ~80 endpoints**

---

### Routes Authentification (auth.js)

#### Routes Admin Backoffice

```javascript
POST   /api/backoffice/signup                  // Inscription admin
POST   /api/backoffice/signin                  // Connexion admin
GET    /api/backoffice/me                      // Info user admin
GET    /api/sirene/:siren                      // Lookup INSEE
POST   /api/backoffice/upload-document-justificatif
GET    /api/backoffice/verify-email/:token
```

#### Routes Bénévoles

```javascript
POST   /api/benevolat/request-otp              // Demande code OTP
POST   /api/benevolat/verify-otp               // Vérification OTP
POST   /api/benevolat/complete-signup          // Compléter inscription
POST   /api/benevolat/signin                   // Connexion
POST   /api/benevolat/request-password-reset
POST   /api/benevolat/reset-password
GET    /api/benevolat/verify-email/:token
```

#### Routes Communes

```javascript
POST   /api/logout                             // Déconnexion
GET    /api/protected-route                    // Test auth
GET    /api/backoffice/protected-route         // Test auth admin
```

---

### Routes Bénévoles (benevoles.js)

```javascript
// Gestion bénévoles
GET    /api/benevolat/benevoles                // Liste bénévoles
GET    /api/benevolat/benevoles/:id            // Détail bénévole
PUT    /api/benevolat/benevoles/:id            // Modifier bénévole
DELETE /api/benevolat/benevoles/:id            // Supprimer bénévole
POST   /api/benevolat/benevoles/:id/statut     // Changer statut

// Gestion actions
GET    /api/benevolat/actions/:associationName // Liste actions
POST   /api/benevolat/actions                  // Créer action
PUT    /api/benevolat/actions/:id              // Modifier action
DELETE /api/benevolat/actions/:id              // Supprimer action
POST   /api/benevolat/actions/:actionId/register  // S'inscrire action
DELETE /api/benevolat/actions/:actionId/unregister // Se désinscrire

// Cartes repas QR Code
POST   /api/benevolat/qrcode/generate          // Générer carte repas
GET    /api/benevolat/qrcode/list              // Liste cartes
POST   /api/benevolat/qrcode/scan              // Scanner carte (pickup)
GET    /api/benevolat/qrcode/pickups           // Liste pickups

// Statistiques
GET    /api/benevolat/stats/:associationName   // Stats bénévolat
GET    /api/benevolat/dashboard/:email         // Dashboard bénévole
```

---

### Routes Cantine (cantine.js)

```javascript
// Gestion commandes
POST   /api/cantine/commandes                  // Créer commande
GET    /api/cantine/commandes                  // Liste commandes
GET    /api/cantine/commandes/:id              // Détail commande
PUT    /api/cantine/commandes/:id              // Modifier commande
DELETE /api/cantine/commandes/:id              // Supprimer commande

// Gestion quotas
GET    /api/cantine/quotas                     // Liste quotas
POST   /api/cantine/quotas                     // Créer quota
PUT    /api/cantine/quotas/:id                 // Modifier quota
DELETE /api/cantine/quotas/:id                 // Supprimer quota

// Gestion menus
GET    /api/cantine/menus                      // Liste menus
POST   /api/cantine/menus                      // Créer menu
PUT    /api/cantine/menus/:id                  // Modifier menu
DELETE /api/cantine/menus/:id                  // Supprimer menu

// Zones livraison
GET    /api/cantine/zones                      // Liste zones
POST   /api/cantine/zones                      // Créer zone
```

---

### Routes Backoffice (backOffice.js)

```javascript
GET    /api/canteInfosCompleted                // Vérif infos cantine
GET    /api/api/sirene/:siren                  // Lookup INSEE
GET    /api/getInfosAsso                       // Infos association
POST   /api/updateInfosAsso                    // Mettre à jour infos

// Onboarding
GET    /api/isOnboardingCompleted              // Statut onboarding
POST   /api/completeOnboarding                 // Compléter onboarding
GET    /api/hasSeenGuidedTour                  // Statut tour guidé
POST   /api/markGuidedTourAsSeen               // Marquer tour vu
POST   /api/resetGuidedTour                    // Réinitialiser tour
```

---

### Routes Support (support.js)

```javascript
POST   /api/support/tickets                    // Créer ticket Trello
GET    /api/support/tickets                    // Liste tickets
GET    /api/support/tickets/:id                // Détail ticket
PUT    /api/support/tickets/:id                // Mettre à jour ticket
POST   /api/support/tickets/:id/comment        // Ajouter commentaire
```

---

## 🔧 Services métier

### 1. bdd.js - Service Base de Données

**Fonction**: Abstraction MySQL avec dual pooling

```javascript
// Méthodes principales
select(query, params, pool)      // SELECT
insert(table, data, pool)        // INSERT
update(table, data, where, whereParams, pool)  // UPDATE
deleteRow(table, where, whereParams, pool)     // DELETE
```

**Features**:
- Dual pooling (local + remote)
- Requêtes préparées (protection SQL injection)
- Masquage données sensibles dans logs
- Gestion erreurs

---

### 2. mailService.js - Service Email

**Fonction**: Envoi emails via Mailjet

```javascript
async function sendTemplateEmail(to, templateId, variables, subject, attachments = []) {
    const mailjet = require('node-mailjet').connect(
        process.env.MAILJET_KEY_MYAMANA,
        process.env.MAILJET_SECRET_MYAMANA
    );

    const request = mailjet.post("send", {'version': 'v3.1'}).request({
        Messages: [{
            From: { Email: "contact@acdlp.fr", Name: "ACDLP" },
            To: [{ Email: to }],
            TemplateID: templateId,
            TemplateLanguage: true,
            Subject: subject,
            Variables: variables,
            Attachments: attachments
        }]
    });

    return request;
}
```

**Templates utilisés**:
- Vérification email admin
- Code OTP bénévole
- Welcome bénévole
- Confirmation inscription action
- Notification carte repas

---

### 3. googleSheetsService.js - Service Google Sheets

**Fonction**: Synchronisation roster bénévoles avec Google Sheets

```javascript
async function updateBenevolesSheet(benevoles) {
    const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Formatter les données
    const rows = benevoles.map(b => [
        b.nom, b.prenom, b.email, b.telephone,
        b.statut, b.date_inscription
    ]);

    // Mettre à jour la feuille
    await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Bénévoles!A2',
        valueInputOption: 'RAW',
        resource: { values: rows }
    });
}
```

---

### 4. icsService.js - Service Calendrier

**Fonction**: Génération fichiers iCalendar pour actions bénévoles

```javascript
function generateICS(action) {
    const ics = require('ics');

    const event = {
        start: [year, month, day, hour, minute],
        duration: { hours: 2 },
        title: action.nom,
        description: action.description,
        location: `${action.rue}, ${action.ville}`,
        status: 'CONFIRMED',
        organizer: { name: 'ACDLP', email: action.responsable_email },
        alarms: [
            { action: 'display', trigger: { hours: 24, before: true } }
        ]
    };

    return ics.createEvent(event);
}
```

---

### 5. inseeService.js - Service INSEE

**Fonction**: Validation numéros SIREN/SIRET via API Sirene

```javascript
async function getLegalName(siren) {
    const axios = require('axios');

    const response = await axios.get(
        `https://api.insee.fr/entreprises/sirene/V3.11/siren/${siren}`,
        {
            headers: {
                'Authorization': `Bearer ${process.env.SIRENE_API_KEY}`
            }
        }
    );

    return response.data.uniteLegale.denominationUniteLegale;
}
```

---

### 6. trelloService.js - Service Trello

**Fonction**: Intégration système tickets support

```javascript
async function createTicket(title, description, category) {
    const axios = require('axios');

    // Déterminer la liste selon la catégorie
    const listId = getCategoryListId(category);

    const response = await axios.post(
        `https://api.trello.com/1/cards`,
        {
            name: title,
            desc: description,
            idList: listId,
            key: process.env.TRELLO_API_KEY,
            token: process.env.TRELLO_TOKEN
        }
    );

    return response.data;
}
```

**Catégories**: Technique, Admin, Compta, Juridique, Formation

---

## 🔒 Sécurité

### Mesures implémentées

#### 1. Authentification
- ✅ JWT avec cookies HttpOnly (protection XSS)
- ✅ Expiration tokens 1h
- ✅ Hashing bcrypt (10 salt rounds)
- ✅ Validation password (min 6 caractères)

#### 2. Protection données
- ✅ CORS avec credentials
- ✅ Cookies SameSite=strict (protection CSRF)
- ✅ HTTPS (Let's Encrypt)
- ✅ Variables .env gitignored

#### 3. Base de données
- ✅ Requêtes préparées (protection SQL injection)
- ✅ Masquage données sensibles logs
- ✅ Connection pooling sécurisé

#### 4. Validation inputs
- ✅ Email format
- ✅ SIREN format (9 chiffres)
- ✅ Password strength
- ✅ Sanitization XSS

---

## 📝 Exemples de code

### Créer une action bénévole

```javascript
router.post('/benevolat/actions', authMiddleware, async (req, res) => {
    const {
        association_nom,
        nom,
        description,
        rue,
        ville,
        pays,
        date_action,
        heure_debut,
        heure_fin,
        responsable_email,
        nb_participants
    } = req.body;

    try {
        const result = await db.insert('actions', {
            association_nom,
            nom,
            description,
            rue,
            ville,
            pays,
            date_action,
            heure_debut,
            heure_fin,
            responsable_email,
            nb_participants,
            created_at: new Date()
        });

        // Envoyer email confirmation
        await sendTemplateEmail(
            responsable_email,
            12345,
            { action_nom: nom, date: date_action },
            'Action créée avec succès'
        );

        return res.status(201).json({
            message: 'Action créée',
            id: result.insertId
        });
    } catch (err) {
        logger.error(`[Create Action Error]: ${err.message}`);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});
```

---

### Générer carte repas QR code

```javascript
router.post('/benevolat/qrcode/generate', authMiddleware, async (req, res) => {
    const { nom, prenom, nb_beneficiaires } = req.body;
    const association_nom = req.user.uri;
    const created_by = req.user.email;

    try {
        // Générer QR code unique
        const qrcode_id = crypto.randomBytes(16).toString('hex');

        // Insérer carte
        await db.insert('qrcode_cards', {
            qrcode_id,
            nom,
            prenom,
            nb_beneficiaires,
            created_by,
            association_nom,
            created_at: new Date()
        });

        // Générer QR code image
        const QRCode = require('qrcode');
        const qrCodeDataURL = await QRCode.toDataURL(qrcode_id);

        return res.status(201).json({
            message: 'Carte créée',
            qrcode_id,
            qrcode_image: qrCodeDataURL
        });
    } catch (err) {
        logger.error(`[Generate QR Error]: ${err.message}`);
        return res.status(500).json({ message: 'Erreur serveur' });
    }
});
```

---

## 📊 Stats Projet

- **Fichiers routes**: 7
- **Endpoints API**: ~80
- **Services**: 7
- **Tables DB**: 12
- **Lignes de code backend**: ~5000
- **Dépendances**: 15

---

## 🚀 Commandes utiles

```bash
# Démarrer serveur
npm start

# Logs
docker logs acdlp-node --tail 100
docker logs acdlp-node -f

# Restart
docker restart acdlp-node

# Tests
curl http://localhost:4242/api/test
```

---

**Documentation mise à jour**: 2026-01-26
**Version**: 2.0.0 (ACDLP)
