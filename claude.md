# ACDLP - Context for Claude AI

## 🎯 Vue d'ensemble du projet

**ACDLP** (Au Cœur de la Précarité) est une plateforme web de gestion associative dédiée à l'aide aux personnes en situation de précarité. Elle permet de gérer le bénévolat, la distribution de repas (cantine solidaire) et le suivi de véhicules.

---

## 📚 Stack Technique

### Frontend
- **Framework**: Angular 18.1.0 (Architecture Standalone Components)
- **Langage**: TypeScript 5.4.5
- **Style**: Tailwind CSS 3.1.6
- **UI**: Lucide Icons, FontAwesome, ApexCharts, Quill
- **Charts**: ng-apexcharts 1.7.1

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 4.18.2
- **Base de données**: MySQL 8.0
- **ORM**: mysql2 3.3.2 (connection pooling)
- **Auth**: JWT (jsonwebtoken 8.5.1) avec cookies HttpOnly
- **Email**: node-mailjet 3.3.6

### Infrastructure
- **Conteneurisation**: Docker + Docker Compose
- **Serveur Web**: Nginx (reverse proxy)
- **SSL/TLS**: Let's Encrypt (Certbot)
- **Monitoring**: Grafana 10.2.0 + Loki 2.9.0 + Promtail 2.9.0
- **DB Admin**: phpMyAdmin

---

## 🏗️ Architecture du Projet

```
acdlp/
├── src/www/acdlp/
│   ├── client/acdlp-angular/            # Frontend Angular 18
│   │   ├── src/app/
│   │   │   ├── core/                    # Services core, guards, interceptors
│   │   │   ├── modules/                 # Modules métier (lazy-loaded)
│   │   │   │   ├── backoffice/          # Panel admin
│   │   │   │   ├── backoffice-auth/     # Auth admin
│   │   │   │   ├── benevolat/           # Gestion bénévoles
│   │   │   │   ├── cantine/             # Distribution repas (public)
│   │   │   │   ├── cantineAdmin/        # Admin repas (backoffice)
│   │   │   │   ├── error/               # Pages erreur
│   │   │   │   ├── layout/              # Layout app
│   │   │   │   └── uikit/               # Librairie composants UI
│   │   │   └── shared/                  # Composants, services, pipes partagés
│   │   └── dist/                        # Build output
│   └── server/node/                     # Backend Node.js/Express
│       ├── server.js                    # Point d'entrée
│       ├── config/                      # Configuration logger
│       ├── middleware/                  # Middleware HTTP logging
│       ├── routes/                      # Routes API (7 modules)
│       ├── services/                    # Services métier (5 services)
│       ├── credentials/                 # Credentials API (gitignored)
│       ├── assets/                      # Assets statiques
│       └── crons/                       # Tâches planifiées
├── nginx/                               # Config Nginx
├── mysql/                               # Scripts init DB
├── grafana/                             # Dashboards Grafana
├── loki/                                # Config Loki
├── promtail/                            # Config Promtail
├── docs/                                # Documentation
├── docker-compose.yml                   # Setup production
├── docker-compose.dev.yml               # Setup dev
├── docker-compose.staging.yml           # Setup staging
└── .env                                 # Variables environnement
```

---

## 🔐 Système d'Authentification Multi-Rôles

L'application gère **2 types d'utilisateurs distincts** avec des flux d'authentification séparés:

### 1. Associations (Admin)
- **Table DB**: `users` (role='association') + `Assos`
- **Rôle**: `'association'`
- **Flux**: Signup avec validation SIREN → Upload documents → Vérification email → Login
- **Routes**: `/backoffice-auth/*`, `/backoffice/*`
- **Validation**: API INSEE pour SIREN/SIRET
- **Features**: Backoffice complet, gestion bénévoles, gestion cantine, suivi véhicule

### 2. Bénévoles (Volunteers)
- **Table DB**: `benevoles`
- **Rôle**: `'volunteer'`
- **Flux OTP**: Demande code OTP → Vérification email (6 chiffres) → Inscription complète → Login
- **Routes**: `/benevolat/*`
- **Statuts**: `restreint`, `confirmé`, `responsable`
- **Features**: Inscription actions, calendrier, scan cartes repas (responsables)

### Sécurité
- **JWT**: Stocké dans cookies HttpOnly (protection XSS)
- **Cookies**: `httpOnly: true`, `secure: true`, `sameSite: 'strict'`
- **Expiration Token**: 1 heure
- **Hash Password**: bcrypt (10 salt rounds)
- **Validation Password**: Min 6 caractères, pas de caractères de contrôle

---

## 📡 Architecture API

### Routes Backend (6 Modules)

| Fichier Route | Endpoints | Fonction |
|--------------|-----------|----------|
| `auth.js` | 8+ | Authentification admin et bénévoles (OTP) |
| `assos.js` | 5 | CRUD associations |
| `backOffice.js` | 8+ | Dashboard admin, infos asso, onboarding |
| `benevoles.js` | 30+ | Gestion bénévoles, actions, QR codes |
| `cantine.js` | 15+ | Distribution repas, commandes, quotas |
| `database.js` | 2 | Utilitaires DB |

**Préfixe**: Toutes les routes API sont préfixées par `/api`

### Endpoints Clés

**Authentification:**
- `POST /api/backoffice/signin` - Login admin
- `POST /api/backoffice/signup` - Inscription admin
- `POST /api/benevolat/request-otp` - Demande code OTP bénévole
- `POST /api/benevolat/verify-otp` - Vérification code OTP
- `POST /api/benevolat/signin` - Login bénévole
- `GET /api/backoffice/me` - Info admin courant
- `POST /api/logout` - Déconnexion

**Bénévoles:**
- `GET /api/benevolat/actions/:associationName` - Liste actions
- `POST /api/benevolat/actions/:actionId/register` - Inscription action
- `POST /api/benevolat/qrcode/generate` - Générer carte repas
- `POST /api/benevolat/qrcode/scan` - Scanner carte repas
- `GET /api/backoffice/benevoles` - Liste bénévoles (admin)
- `POST /api/backoffice/actions` - Créer action (admin)

**Cantine:**
- `GET /api/cantine/menu/:asso` - Menu du jour
- `POST /api/cantine/order` - Commander repas
- `GET /api/backoffice/cantine/commandes` - Liste commandes (admin)
- `POST /api/backoffice/cantine/quotas` - Définir quotas (admin)
- `GET /api/backoffice/qrcode/list` - Liste cartes repas
- `GET /api/backoffice/qrcode/pickups` - Historique distributions

**Backoffice:**
- `GET /api/backoffice/canteInfosCompleted` - Vérif infos cantine
- `GET /api/backoffice/getInfosAsso` - Infos association
- `POST /api/backoffice/updateInfosAsso` - MAJ infos association
- `GET /api/backoffice/onboarding/completed` - Statut onboarding

---

## 🗄️ Schéma Base de Données

### Tables Principales

#### Users & Authentification
- **`users`**: Comptes admin
  - Champs: id, email, password, firstName, lastName, role, siren, is_verified, verification_token, created_at
- **`Assos`**: Détails associations
  - Champs: id, email, siren, nom, uri, logoUrl, signataire_nom, signataire_prenom, benevoles_resp_email, adresse, code_postal, ville, tel
- **`benevoles`**: Comptes bénévoles
  - Champs: id, email, password, nom, prenom, telephone, adresse, ville, code_postal, pays, age, date_naissance, genre, vehicule, statut, association_nom, is_verified, verification_code, completion_token, metiers_competences, source_connaissance, tracking_uuid

#### Bénévoles & Actions
- **`actions`**: Activités bénévoles
  - Champs: id, association_nom, nom, description, rue, ville, pays, date_action, heure_debut, heure_fin, recurrence, responsable_email, nb_participants, genre, age, created_at
- **`Benevoles_Actions`**: Inscriptions actions
  - Champs: id, benevole_id, action_id, date_action, date_inscription, statut, presence, heure_arrivee, heure_depart
- **`Actions_Masquees`**: Actions masquées (feature admin)
  - Champs: id, action_id, association_nom, date_masquee, masquee_par

#### Cantine (Distribution Repas)
- **`Commandes`**: Commandes repas
  - Champs: id, email, ajout, livraison, repas_quantite, colis_quantite, asso, statut, zone
- **`Quotas2`**: Quotas journaliers repas
  - Champs: id, date_jour, repas_quantite, asso
- **`Menus`**: Menus hebdomadaires
  - Champs: id, asso, lundi, mardi, mercredi, jeudi, vendredi
- **`qrcode_cards`**: Cartes repas
  - Champs: id, qrcode_id, nom, prenom, nb_beneficiaires, created_at, created_by, association_nom
- **`meal_pickups`**: Distributions repas
  - Champs: id, qrcode_id, pickup_date, pickup_time, benevole_id, nb_beneficiaires

#### Administratif
- **`onboarding_backoffice`**: Statut onboarding admin
  - Champs: id, user_id, asso_id, cantine, suiviVehicule, benevolat, isOnboarded, tutorielDone, document_justificatif

---

## 🔧 Services Backend (5 Services Core)

### 1. Database Service (`bdd.js`)
- **Fonction**: Abstraction MySQL avec connection pooling
- **Features**: Dual pool (local + remote), CRUD operations, protection SQL injection, masquage données sensibles dans logs

### 2. Mail Service (`mailService.js`)
- **Provider**: Mailjet
- **Features**: Templates emails, variables, pièces jointes (ICS)
- **Templates**: Code OTP bénévole, welcome bénévole, rappels actions, confirmations inscriptions

### 3. Google Sheets Service (`googleSheetsService.js`)
- **Fonction**: Sync données bénévoles avec Google Sheets
- **Features**: MAJ automatique roster, sync statuts, export pour comptabilité

### 4. ICS Service (`icsService.js`)
- **Fonction**: Génération fichiers iCalendar pour actions bénévoles
- **Features**: Création événements avec rappels, support actions récurrentes

### 5. INSEE Service (`inseeService.js`)
- **Fonction**: Validation numéros SIREN/SIRET
- **API**: INSEE Sirene V3.11
- **Features**: Lookup infos entreprise, validation adresse association

---

## 🎨 Architecture Frontend

### Modules Angular (7 Modules)

#### 1. Backoffice Module (`/backoffice`)
- **Fonction**: Panel administration ACDLP
- **Composants**: BenevolatList, BenevolatActions, BenevolatCalendrier, CantineCommandes, CantineQuotas, BeneficiairesCartes, Vehicule, Infos
- **Services**: `OnboardingService`, `BenevolatAdminService`

#### 2. Backoffice Auth Module (`/backoffice-auth`)
- **Fonction**: Authentification admin
- **Pages**: sign-in, sign-up
- **Service**: `BackofficeAuthService` (JWT avec cookies)

#### 3. Benevolat Module (`/benevolat`)
- **Fonction**: Interface bénévole
- **Pages**: signin, form, dashboard, actions, profile, otp-verification, qrcode-generate/scan/list
- **Service**: `ActionService`

#### 4. Cantine Module (`/cantine`)
- **Fonction**: Interface commande repas publique
- **Features**: Affichage menu, commande, planification livraison

#### 5. CantineAdmin Module (`/cantineAdmin`)
- **Fonction**: Gestion distribution repas (backoffice)
- **Features**: Gestion commandes, quotas, tracking pickups

#### 6. Layout Module (`/layout`)
- **Fonction**: Structure commune des pages (navbar, sidebar, footer)
- **Composants**: Navbar, Sidebar avec navigation, Footer, Breadcrumb

#### 7. Error Module (`/error`)
- **Fonction**: Pages d'erreur personnalisées
- **Pages**: 404, 500, 403

### Ressources Partagées

**Composants Shared:**
- ButtonComponent
- ConfirmationDialogComponent
- SupportWidgetComponent
- StepIndicatorComponent

**Services Shared:**
- ThemeService
- SupportService

**Pipes:** Formatage dates, troncature texte

**Validators:** Email, SIREN, code postal

---

## 🚀 Déploiement & Infrastructure

### Docker Compose (9 Services)

1. **MySQL**: Port 3306, volumes `dbdata` + `init-db.sql`
2. **Nginx**: Ports 80/443, reverse proxy, SSL, static files
3. **Node.js**: Port 4242, backend API
4. **Angular**: Container build-only
5. **phpMyAdmin**: Port 8080
6. **Loki**: Port 3100, aggregation logs
7. **Promtail**: Shipping logs vers Loki
8. **Grafana**: Port 3001, dashboards, OAuth GitHub
9. **Certbot**: Renouvellement SSL (toutes les 12h)

### Configuration Nginx

**Routes:**
- `/app/*` → Angular SPA
- `/api/*` → Node.js backend (port 4242)
- `/assets/*` → Assets statiques
- `/grafana/*` → Dashboard Grafana
- `/phpmyadmin/*` → Admin DB

**Features:**
- Redirection HTTP → HTTPS
- Cache statique long terme (1 an)
- Proxying API
- Routing SPA Angular
- Gzip compression
- Upload limit: 1000MB

### Logging & Monitoring

**Stack**: Grafana + Loki + Promtail + Winston

**Winston:**
- Niveaux: debug, info, warn, error
- Rotation journalière, max 30 jours, 20MB/fichier
- Format: JSON avec timestamp
- Logs: `/var/log/acdlp/`

---

## 🎯 Features Business Clés

### 1. Gestion Bénévoles
- Inscription OTP (6 chiffres envoyés par email)
- Calendrier actions avec inscriptions
- Tracking présence (QR codes pour responsables)
- Statuts progressifs: Restreint → Confirmé → Responsable
- Sync Google Sheets automatique
- Génération attestations de bénévolat

### 2. Distribution Repas (Cantine Solidaire)
- Commande publique avec validation adresse
- Panel admin (gestion commandes, quotas)
- Cartes repas QR Code avec tracking
- Système scan pour responsables
- Statistiques et exports
- Gestion menus hebdomadaires

### 3. Backoffice
- Dashboard temps réel (ApexCharts)
- Admin bénévoles (liste, filtres, modification statuts)
- Admin cantine (commandes, quotas, cartes repas)
- Configuration association (SIREN, logo, infos contact)
- Onboarding

---

## 📝 Modèles de Données TypeScript

```typescript
// User (Admin)
interface User {
  id: number;
  email: string;
  password: string; // bcrypt hashed
  firstName: string;
  lastName: string;
  role: 'association';
  siren: string;
  is_verified: boolean;
  created_at: Date;
}

// Volunteer
interface Volunteer {
  id: number;
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone: string;
  statut: 'restreint' | 'confirmé' | 'responsable';
  association_nom: string;
  is_verified: boolean;
  tracking_uuid: string;
}

// Action
interface Action {
  id: number;
  association_nom: string;
  nom: string;
  description: string;
  ville: string;
  date_action: Date;
  heure_debut: Time;
  heure_fin: Time;
  recurrence: 'Aucune' | 'Quotidienne' | 'Hebdomadaire';
  responsable_email: string;
  nb_participants: number;
}

// QR Code Card
interface QRCodeCard {
  id: number;
  qrcode_id: string; // UUID
  nom: string;
  prenom: string;
  nb_beneficiaires: number;
  created_at: Date;
  created_by: number; // benevole_id
  association_nom: string;
}

// Meal Pickup
interface MealPickup {
  id: number;
  qrcode_id: string;
  pickup_date: Date;
  pickup_time: Time;
  benevole_id: number;
  nb_beneficiaires: number;
}
```

---

## 🔒 Sécurité

### Implémenté ✅
- JWT HttpOnly cookies (protection XSS)
- Hashing bcrypt passwords
- CORS avec credentials
- Protection SQL injection (requêtes paramétrées)
- Validation inputs (email, SIREN, passwords)
- Expiration tokens (1h JWT, 10min OTP)
- HTTPS (Let's Encrypt)
- Protection .env (gitignored)
- Masquage données sensibles dans logs
- Protection CSRF (sameSite cookies)

### Améliorations Potentielles ⚠️
- Rate limiting endpoints auth
- Headers CSP
- 2FA comptes admin
- Audit logging
- Rotation API keys

---

## 📚 Documentation

Documentation complète dans `/docs/`:
1. NODE-BACKEND.md - Architecture backend
2. ANGULAR.md - Architecture frontend
3. BACKOFFICE.md - Documentation panel admin
4. ESPACE-BENEVOLE.md - Documentation espace bénévole
5. LOGGING-MONITORING.md - Setup logging & monitoring

---

## 🎨 Patterns UI/UX

### Design System
- **Framework**: Tailwind CSS (thème custom)
- **Icons**: Lucide + FontAwesome
- **Forms**: @tailwindcss/forms
- **Responsive**: Mobile-first
- **Dark Mode**: Supporté (ThemeService)
- **Notifications**: Toast (ngx-sonner)
- **Charts**: ApexCharts
- **Onboarding**: Custom

### Patterns Composants
- Standalone components (Angular 18)
- Reactive forms
- Lazy loading modules
- Smart/Dumb components
- State RxJS (BehaviorSubjects)
- Guards multi-niveaux
- HTTP interceptors

---

## 📦 Build & Déploiement

### Développement
```bash
# Backend
cd src/www/acdlp/server/node
npm install
npm start  # Port 4242

# Frontend
cd src/www/acdlp/client/acdlp-angular
npm install
npm start  # Port 4200
```

### Build Production
```bash
# Docker Compose
docker-compose -f docker-compose.yml up --build

# Build Angular manuel
cd src/www/acdlp/client/acdlp-angular
npm run prod  # Output: dist/angular-tailwind/
```

### Environnements
- **Development**: `environment.ts` - API locale (localhost:4242)
- **Staging**: `environment.staging.ts` - API staging
- **Production**: `environment.prod.ts` - API prod

---

## 🔧 Variables Environnement Critiques

```bash
# URLs
URL_ORIGIN=https://acdlp.fr

# Database
LOCAL_DB_HOST=acdlp-mysql
LOCAL_DB_USER=rachid
LOCAL_DB_PASSWORD=rachid
LOCAL_DB_NAME=acdlp

# JWT
JWT_SECRET=Sourate76Verset9

# Mailjet
MAILJET_KEY_ACDLP=***
MAILJET_SECRET_ACDLP=***

# Google Sheets
GOOGLE_SHEET_ID=***
GOOGLE_CREDENTIALS_PATH=./credentials/metal-zodiac-290317-cddf3d3d5bbb.json

# GitHub OAuth (Grafana)
GITHUB_CLIENT_ID=***
GITHUB_CLIENT_SECRET=***

# INSEE API
SIRENE_API_KEY=***
```

---

## 📊 Statistiques Projet

- **Modules Frontend**: 7 modules
- **Routes Backend**: 6 fichiers routes
- **Services Backend**: 5 services core
- **Tables DB**: 15+ tables
- **Endpoints API**: 80+ endpoints
- **Services Docker**: 9 containers

---

## 🎯 Cas d'Usage Business

ACDLP est une application conçue pour l'association **Au Cœur de la Précarité** qui a besoin de:
1. Recruter et coordonner des bénévoles
2. Distribuer des repas aux bénéficiaires
3. Suivre les distributions avec cartes QR Code
4. Gérer le planning des actions de solidarité
5. Suivre l'utilisation des véhicules
6. Générer des statistiques et rapports

**Utilisateurs Cibles**:
- Banques alimentaires
- Refuges pour sans-abri
- Associations caritatives
- Organisations communautaires

---

## 🔑 Informations Importantes pour le Contexte

### Conventions de Code
- **Frontend**: Standalone components Angular 18, TypeScript strict mode
- **Backend**: Express.js avec pattern service/route séparé
- **DB**: Requêtes paramétrées (protection SQL injection)
- **Nommage**: camelCase (JS/TS), snake_case (DB)

### Patterns Récurrents
- **Auth**: JWT dans cookies HttpOnly
- **Validation**: Côté client (Angular validators) + côté serveur (Express)
- **Erreurs**: Gestion centralisée via interceptors (frontend) et middleware (backend)
- **Logs**: Winston avec rotation quotidienne
- **État**: Services RxJS avec BehaviorSubjects

### Fichiers Sensibles (gitignored)
- `.env` (variables environnement)
- `/credentials/*` (credentials API)

### Branches Git
- **Main branch**: `main`
- **Branche feature**: `feature/transform-to-acdlp`

---

## 💡 Notes pour Claude AI

### Lors de modifications code:
1. **Toujours lire le fichier d'abord** avant de proposer des changements
2. **Respecter les patterns existants** (conventions, structure)
3. **Tester la sécurité** (XSS, SQL injection, CSRF)
4. **Éviter over-engineering** (seulement ce qui est demandé)
5. **Pas de breaking changes** sans confirmation utilisateur

### Lors de debug:
1. **Vérifier les logs** (`/var/log/acdlp/` ou Grafana)
2. **Tester l'auth** (vérifier JWT, cookies, rôles)
3. **Vérifier la DB** (tables, relations, données)
4. **Tester les routes API** (endpoints, paramètres, réponses)

### Lors d'ajout features:
1. **Analyser l'impact** (tables DB, routes API, composants Angular)
2. **Ajouter validation** (frontend + backend)
3. **Documenter** (mettre à jour docs/ si feature majeure)
4. **Tester avec les 2 rôles** (admin, bénévole)

---

**Ce fichier doit être chargé au début de chaque conversation pour contextualiser Claude AI sur le projet ACDLP.**
