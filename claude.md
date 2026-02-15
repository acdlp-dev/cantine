# ACDLP Cantine - Context for Claude AI

## Vue d'ensemble du projet

**ACDLP Cantine** est une plateforme web de **distribution de repas solidaires** pour l'association **Au Coeur de la Precarite**. Elle permet a des associations partenaires de commander des repas en gros, avec un systeme de quotas journaliers, de menus hebdomadaires et de suivi des commandes.

L'application a evolue depuis un systeme multi-fonctions (dons, benevolat, vehicules) vers une **plateforme specialisee cantine uniquement**. Les anciens modules (benevolat, QR codes, dons Stripe/PayPal, suivi vehicules) ont ete supprimes via migrations.

---

## Stack Technique

### Frontend
- **Framework**: Angular 18.1.0 (Standalone Components)
- **Langage**: TypeScript 5.4.5
- **Style**: Tailwind CSS 3.1.6
- **UI**: Lucide Icons, FontAwesome, ApexCharts
- **Adresses**: Google Places Autocomplete

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 4.18.2
- **Base de donnees**: MySQL 8.0 (dual pool local + remote)
- **Driver DB**: mysql2 3.3.2 (connection pooling)
- **Auth**: JWT (jsonwebtoken 8.5.1) avec cookies HttpOnly
- **Email**: node-mailjet 3.3.6
- **Upload**: multer (documents justificatifs)
- **Logging**: Winston + winston-daily-rotate-file

### Infrastructure
- **Conteneurisation**: Docker + Docker Compose (9 services)
- **Serveur Web**: Nginx (reverse proxy)
- **SSL/TLS**: Let's Encrypt (Certbot)
- **Monitoring**: Grafana 10.2.0 + Loki 2.9.0 + Promtail 2.9.0
- **DB Admin**: phpMyAdmin

---

## Architecture du Projet

```
cantine/
├── src/www/cantine/
│   ├── client/acdlp-angular/              # Frontend Angular 18
│   │   ├── src/app/
│   │   │   ├── core/                      # Guards, interceptors
│   │   │   ├── modules/
│   │   │   │   ├── backoffice/            # Panel association (infos, cantine)
│   │   │   │   ├── backoffice-auth/       # Auth (sign-in, sign-up)
│   │   │   │   ├── cantine/              # Interface commande repas
│   │   │   │   ├── error/                # Pages erreur (404, 500)
│   │   │   │   ├── layout/              # Sidebar, layout commun
│   │   │   │   └── uikit/               # Librairie composants UI
│   │   │   └── shared/                   # Composants, services, pipes partages
│   │   └── dist/                          # Build output
│   └── server/node/                       # Backend Node.js/Express
│       ├── server.js                      # Point d'entree
│       ├── config/                        # Configuration logger (Winston)
│       ├── middleware/                    # Middleware HTTP logging
│       ├── routes/                        # Routes API (5 fichiers)
│       │   ├── auth.js                   # Auth (signup, signin, email verif, password reset)
│       │   ├── backOffice.js             # Infos asso, gestion associations
│       │   ├── cantine.js               # Commandes, quotas, menus
│       │   ├── assos.js                  # Lookup association par URI
│       │   └── database.js              # Health check DB
│       ├── services/                      # Services metier (3 services)
│       │   ├── bdd.js                    # Abstraction MySQL (dual pool)
│       │   ├── mailService.js            # Emails transactionnels (Mailjet)
│       │   └── inseeService.js           # Validation SIREN (API INSEE v3.11)
│       ├── credentials/                   # Credentials API (gitignored)
│       ├── pdf/                           # Documents uploades (justificatifs)
│       └── assets/                        # Assets statiques
├── nginx/                                 # Config Nginx
├── mysql/                                 # Scripts init DB (init-db.sql)
├── grafana/                               # Dashboards Grafana
├── loki/                                  # Config Loki
├── promtail/                              # Config Promtail
├── docker-compose.yml                     # Setup production
├── docker-compose.dev.yml                 # Setup dev
├── docker-compose.staging.yml             # Setup staging
└── .env                                   # Variables environnement
```

---

## Systeme d'Authentification

**Un seul type d'utilisateur actif : les associations.**

### Associations (Admin)
- **Tables DB**: `users` (role='association') + `Assos` + `onboarding_backoffice`
- **Flux**: Signup SIREN + upload document justificatif -> Verification email -> Validation manuelle admin (`doubleChecked`) -> Login
- **Routes**: `/backoffice-auth/*`, `/backoffice/*`
- **Validation**: API INSEE pour SIREN (raison sociale auto-completee)

### Controles d'acces (multi-gate)
1. `is_verified = 1` (email verifie)
2. `doubleChecked = 1` (validation manuelle par admin ACDLP, via appli externe)
3. `cantine = 1` (module cantine active)
4. `statut = 'ok'` (pas d'amende impayee)

Si une association ne recupere pas sa commande, elle peut etre **bloquee avec amende**. Deblocage via preuve de paiement WhatsApp.

### Securite
- **JWT**: Cookie HttpOnly, secure, sameSite strict
- **Expiration**: 1 heure
- **Hash**: bcrypt (10 salt rounds)
- **Password**: Min 6 caracteres
- **Upload**: PDF/JPG/PNG uniquement, max 10MB

---

## Architecture API

### Routes Backend (5 Fichiers)

| Fichier Route | Endpoints | Fonction |
|--------------|-----------|----------|
| `auth.js` | ~15 | Signup/signin, email verif, password reset, SIREN lookup, upload document |
| `backOffice.js` | ~7 | Infos asso, liste associations, statut/amende, validation |
| `cantine.js` | ~15 | Commandes, quotas, menus, quantites, geocodage, rappel J-1 |
| `assos.js` | 2 | Lookup association par URI |
| `database.js` | 2 | Health check DB |

**Prefixe**: Toutes les routes API sont prefixees par `/api`

### Endpoints Cles

**Authentification:**
- `POST /api/backoffice/signin` - Login association
- `POST /api/backoffice/signup` - Inscription (multipart: champs + document)
- `POST /api/backoffice/upload-document-justificatif` - Upload document
- `GET /api/verify-email/:token` - Verification email
- `POST /api/request-password-reset` - Demande reset password
- `POST /api/reset-password` - Reset password
- `GET /api/backoffice/me` - Info user connecte
- `POST /api/logout` - Deconnexion
- `GET /api/sirene/:siren` - Lookup raison sociale INSEE

**Commandes:**
- `POST /api/addCommandeCantine` - Creer commande
- `GET /api/getCommandesAssosCantine` - Mes commandes
- `PUT /api/annulerCommande/:id` - Annuler commande
- `PUT /api/modifierCommande/:id` - Modifier quantite

**Quotas (lecture seule):**
- `GET /api/quotas` - Quotas par plage de dates

**Menus (lecture seule):**
- `GET /api/menus` - Liste menus
- `GET /api/menuAsso` - Menu de la semaine (public)

**Infos association:**
- `GET /api/canteInfosCompleted` - Verif infos completes
- `GET /api/getInfosAsso` - Infos association
- `POST /api/updateInfosAsso` - MAJ infos

**Utilitaires:**
- `GET /api/getQuantiteCantine` - Quantite disponible pour une date
- `GET /api/geocode` - Proxy geocodage OpenStreetMap
- `POST /api/rappelCantineJMoinsUn` - Envoyer rappels J-1 (cron)

---

## Schema Base de Donnees (7 tables actives)

### `users` - Comptes admin
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | |
| email | VARCHAR UNIQUE | |
| password | VARCHAR | bcrypt hashed |
| firstName, lastName | VARCHAR | |
| role | VARCHAR | 'association' |
| siren | VARCHAR(9) UNIQUE | |
| is_verified | BOOLEAN | Email verifie |
| verification_token | VARCHAR | Token email |
| verification_token_expiry | TIMESTAMP | |
| reset_token | VARCHAR | Token reset password |
| token_expiry | TIMESTAMP | |
| created_at | TIMESTAMP | |

### `Assos` - Details associations
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | |
| email | VARCHAR | |
| siren | VARCHAR(9) UNIQUE | |
| nom | VARCHAR | Raison sociale (INSEE) |
| surnom | VARCHAR | Nom d'usage |
| uri | VARCHAR | Slug URL |
| logoUrl | VARCHAR | |
| codeCouleur | VARCHAR | Couleur de marque |
| signataire_nom, signataire_prenom | VARCHAR | Signataire recus fiscaux |
| adresse, code_postal, ville | VARCHAR | Adresse principale |
| tel | VARCHAR | |
| site | VARCHAR | Site web |
| objet | VARCHAR | Objet associatif |

### `onboarding_backoffice` - Statut onboarding et controle
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | |
| user_id | INT FK -> users | |
| asso_id | INT FK -> Assos | |
| cantine | BOOLEAN | Module cantine active |
| statut | VARCHAR | 'ok', 'blocked' |
| amende | DECIMAL | Montant amende |
| doubleChecked | BOOLEAN | Validation manuelle admin |
| isOnboarded | BOOLEAN | |
| tutorielDone | BOOLEAN | |
| document_justificatif | VARCHAR | Nom fichier document |

### `Commandes` - Commandes repas
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | |
| email | VARCHAR | Email association |
| ajout | TIMESTAMP | Date creation |
| livraison | DATE | Date livraison |
| repas_quantite | INT | Nb repas |
| colis_quantite | INT | Nb colis |
| asso | VARCHAR | Nom association |
| statut | VARCHAR | en_attente, a_preparer, a_deposer, annulee, blocked |
| zone | VARCHAR | Zone de distribution |

### `Quotas2` - Quotas journaliers
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | |
| date_jour | DATE | |
| jour | VARCHAR | Nom du jour |
| day_of_week | INT | 1-7 |
| repas_quantite | INT | Quota repas |
| colis_quantite | INT | Quota colis |
| creneau_debut, creneau_fin | TIME | Creneau horaire |

### `Menus` - Menus hebdomadaires
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | |
| date_ajout | TIMESTAMP | |
| menu_date | DATE | Date effective |
| auteur_id | INT FK | |
| titre | VARCHAR | |
| allergenes | TEXT/JSON | |

### `migration_backup` - Audit migrations
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT PK | |
| table_name | VARCHAR | |
| row_count | INT | |
| backup_date | DATETIME | |

### Relations
```
users.siren -----> Assos.siren
users.id -------> onboarding_backoffice.user_id
Assos.id -------> onboarding_backoffice.asso_id
Commandes.email -> users.email (implicite)
Commandes.asso --> Assos.nom (implicite)
```

---

## Services Backend (3 Services)

### 1. Database Service (`bdd.js`)
- Abstraction MySQL avec connection pooling (mysql2/promise)
- Dual pool: local (Docker) + remote (production)
- Methodes: `select()`, `insert()`, `update()`, `delete()`
- Protection SQL injection (requetes parametrees)
- Masquage donnees sensibles dans les logs

### 2. Mail Service (`mailService.js`)
- Provider: Mailjet
- `sendTemplateEmail()` - Emails avec templates Mailjet
- `sendEmail()` - Emails simples (notifications support)
- **Templates utilises:**
  - 7755507: Verification email
  - 5536948: Reset password
  - 7726824: Confirmation commande cantine
  - 7755508: Annulation commande
  - 7726731: Modification commande
  - 7726748: Compte bloque
  - 7726731: Rappel J-1

### 3. INSEE Service (`inseeService.js`)
- `getLegalName(siren)` - Recupere la denomination legale via API INSEE Sirene v3.11
- Utilise lors du signup pour auto-completer la raison sociale

---

## Architecture Frontend

### Modules Angular (7 Modules, lazy-loaded)

#### 1. Backoffice-Auth (`/backoffice-auth`)
- **sign-in**: Login email/password
- **sign-up**: Inscription multi-etapes (infos + SIREN + document)
- Service: `BackofficeAuthService`

#### 2. Backoffice (`/backoffice`)
- **infos**: Edition profil association (SIREN, adresse Google Places, couleur)
- **parametres**: Parametres
- **cantine/**: Historique commandes (pagination, filtres date, annulation, modification)
- **cantine/commande**: Nouvelle commande (date J+3 min, quantite, multi-adresses)
- **cantine/menu**: Menu de la semaine
#### 3. Cantine (`/cantine`)
- Interface commande repas (reutilise les composants backoffice)
- Routes: historique, commande, menu, infos, blocked

#### 4. Layout (`/layout`)
- Sidebar dynamique selon `moduleType` (backoffice/cantine)
- Responsive mobile

#### 5. Error (`/error`)
- Pages 404, 500

#### 6. UIKit (`/components`)
- Showcase composants UI

### Routing complet
```
/backoffice-auth/sign-in
/backoffice-auth/sign-up
/backoffice/infos
/backoffice/parametres
/backoffice/cantine                     # Historique commandes
/backoffice/cantine/commande            # Nouvelle commande
/backoffice/cantine/menu                # Menu semaine
/cantine                                # Historique (autre entree)
/cantine/commande
/cantine/menu
/cantine/infos
/cantine/blocked
/errors/404
/errors/500
```

---

## Services externes integres

| Service | Usage |
|---------|-------|
| **Mailjet** | Emails transactionnels (templates) |
| **API INSEE Sirene v3.11** | Validation SIREN, raison sociale |
| **Google Places Autocomplete** | Autocompletion adresses (frontend) |
| **OpenStreetMap Nominatim** | Geocodage adresses (proxy backend) |

---

## Logique metier cle

### Cycle de vie d'une commande
1. Association cree commande (date livraison min J+3)
2. Verification quota disponible pour la date
3. Statut `a_preparer`
4. Possibilite de modifier quantite jusqu'a J-1
5. Possibilite d'annuler avant la date de livraison
6. Si non recuperee -> amende possible -> compte bloque

### Systeme de quotas
- Un quota global par jour (pas par association)
- Disponibilite = `quota.repas_quantite` - SUM(`commandes.repas_quantite`) pour la date
- Commande refusee si quota depasse

### Onboarding association
1. Signup avec SIREN + document justificatif
2. Email de verification envoye (Mailjet template 7755507)
3. Clic lien -> email verifie (`is_verified = 1`)
4. Admin ACDLP valide manuellement (`doubleChecked = 1`) via appli externe
5. Association peut commander

### Statuts commande
- `en_attente` - En attente
- `a_preparer` - Programmee
- `a_deposer` - A deposer
- `a_recuperer` - A recuperer
- `recupere` - Recuperee
- `non_recupere` - Non recuperee
- `livree` - Livree
- `annulee` - Annulee
- `confirmee` - Confirmee
- `en_preparation` - En preparation
- `blocked` - Bloquee

---

## Deploiement & Infrastructure

### Docker Compose (9 Services)
1. **MySQL**: Port 3306, volume `dbdata` + `init-db.sql`
2. **Nginx**: Ports 80/443, reverse proxy, SSL
3. **Node.js**: Port 4242, backend API
4. **Angular**: Container build-only (output dans volume partage)
5. **phpMyAdmin**: Port 8080
6. **Loki**: Port 3100
7. **Promtail**: Shipping logs
8. **Grafana**: Port 3001, OAuth GitHub
9. **Certbot**: Renouvellement SSL (12h)

### Routes Nginx
- `/app/*` -> Angular SPA
- `/api/*` -> Node.js backend (port 4242)
- `/assets/*` -> Assets statiques
- `/grafana/*` -> Grafana
- `/phpmyadmin/*` -> phpMyAdmin

### Environnements
- **Dev**: `environment.ts` -> `localhost:4242/api`
- **Staging**: `environment.staging.ts`
- **Prod**: `environment.prod.ts` -> `https://acdlp.com/api`

---

## Build & Developpement

```bash
# Backend
cd src/www/cantine/server/node
npm install
npm start  # Port 4242

# Frontend
cd src/www/cantine/client/acdlp-angular
npm install
npm start  # Port 4200

# Docker (production)
docker-compose -f docker-compose.yml up --build
```

---

## Variables Environnement

```bash
URL_ORIGIN=https://acdlp.com

# Database
LOCAL_DB_HOST=mysql
LOCAL_DB_USER=***
LOCAL_DB_PASSWORD=***
LOCAL_DB_NAME=acdlp

# JWT
JWT_SECRET=***

# Mailjet
MAILJET_KEY_ACDLP=***
MAILJET_SECRET_ACDLP=***

# INSEE API
SIRENE_API_KEY=***

# Grafana
GITHUB_CLIENT_ID=***
GITHUB_CLIENT_SECRET=***

# WhatsApp support
BACKOFFICE_WHATSAPP_NUMBER=***
```

---

## Securite

### Implemente
- JWT HttpOnly cookies (protection XSS)
- bcrypt passwords (10 salt rounds)
- CORS avec credentials
- Requetes SQL parametrees (protection injection)
- Validation inputs (email, SIREN, passwords)
- Expiration tokens (1h JWT, 1h email verification)
- HTTPS (Let's Encrypt)
- sameSite strict cookies (protection CSRF)
- .env gitignore
- Masquage donnees sensibles dans logs
- Validation type fichiers upload (PDF/JPG/PNG, 10MB max)

---

## Conventions de Code

- **Frontend**: Standalone components Angular 18, TypeScript strict
- **Backend**: Express.js, pattern route/service separe
- **DB**: Requetes parametrees, snake_case pour les colonnes
- **JS/TS**: camelCase
- **Etat frontend**: Services RxJS avec BehaviorSubjects
- **Auth**: JWT dans cookies HttpOnly partout
- **Validation**: Double (Angular validators + Express backend)
- **Logs**: Winston avec rotation quotidienne

### Fichiers sensibles (gitignored)
- `.env`
- `credentials/`

---

## Notes pour Claude AI

### Lors de modifications code:
1. Toujours lire le fichier d'abord avant de proposer des changements
2. Respecter les patterns existants (conventions, structure)
3. Verifier la securite (XSS, SQL injection, CSRF)
4. Eviter l'over-engineering
5. Pas de breaking changes sans confirmation

### Lors de debug:
1. Verifier les logs (`/var/log/cantine/` ou Grafana)
2. Verifier l'auth (JWT, cookies, role, statut onboarding)
3. Verifier la DB (tables, donnees)
4. Tester les routes API

### Lors d'ajout features:
1. Analyser l'impact (tables DB, routes API, composants Angular)
2. Ajouter validation frontend + backend
3. Tester le controle d'acces
