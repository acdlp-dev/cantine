# MyAmana - Context for Claude AI

## 🎯 Vue d'ensemble du projet

**MyAmana** est une plateforme web complète de gestion associative conçue pour les organisations à but non lucratif. Elle permet de gérer les dons, le bénévolat, la distribution de repas ("cantine solidaire") et les opérations administratives.

---

## 📚 Stack Technique

### Frontend
- **Framework**: Angular 18.1.0 (Architecture Standalone Components)
- **Langage**: TypeScript 5.4.5
- **Style**: Tailwind CSS 3.1.6
- **UI**: Lucide Icons, FontAwesome, ApexCharts, Quill
- **Paiements**: Stripe (@stripe/stripe-js 2.4.0), PayPal (@paypal/paypal-js 8.2.0)

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js 4.18.2
- **Base de données**: MySQL 8.0
- **ORM**: mysql2 3.3.2 (connection pooling)
- **Auth**: JWT (jsonwebtoken 8.5.1) avec cookies HttpOnly
- **Email**: node-mailjet 3.3.6
- **PDF**: PDFKit 0.13.0
- **Paiements**: Stripe 12.0.0

### Infrastructure
- **Conteneurisation**: Docker + Docker Compose
- **Serveur Web**: Nginx (reverse proxy)
- **SSL/TLS**: Let's Encrypt (Certbot)
- **Monitoring**: Grafana 10.2.0 + Loki 2.9.0 + Promtail 2.9.0
- **DB Admin**: phpMyAdmin

---

## 🏗️ Architecture du Projet

```
myamana/
├── src/www/myamana/
│   ├── client/myamana-angular/          # Frontend Angular 18
│   │   ├── src/app/
│   │   │   ├── core/                    # Services core, guards, interceptors
│   │   │   ├── modules/                 # Modules métier (lazy-loaded)
│   │   │   │   ├── auth/                # Authentification donateurs
│   │   │   │   ├── backoffice/          # Panel admin
│   │   │   │   ├── backoffice-auth/     # Auth admin
│   │   │   │   ├── benevolat/           # Gestion bénévoles
│   │   │   │   ├── cantine/             # Distribution repas
│   │   │   │   ├── cantineAdmin/        # Admin repas
│   │   │   │   ├── dashboard/           # Tableau de bord donateur
│   │   │   │   ├── donation/            # Formulaire don public
│   │   │   │   ├── error/               # Pages erreur
│   │   │   │   ├── layout/              # Layout app
│   │   │   │   └── uikit/               # Librairie composants UI
│   │   │   └── shared/                  # Composants, services, pipes partagés
│   │   └── dist/                        # Build output
│   └── server/node/                     # Backend Node.js/Express
│       ├── server.js                    # Point d'entrée
│       ├── config/                      # Configuration logger
│       ├── middleware/                  # Middleware HTTP logging
│       ├── routes/                      # Routes API (14 modules)
│       ├── services/                    # Services métier (9 services)
│       ├── credentials/                 # Credentials API (gitignored)
│       ├── pdf/                         # PDFs générés
│       │   ├── recuFiscal/              # Reçus fiscaux
│       │   └── backoffice/              # Documents admin
│       ├── assets/                      # Assets statiques
│       └── crons/                       # Tâches planifiées
├── nginx/                               # Config Nginx
├── mysql/                               # Scripts init DB
├── grafana/                             # Dashboards Grafana
├── loki/                                # Config Loki
├── promtail/                            # Config Promtail
├── docs/                                # Documentation (12 fichiers MD)
├── docker-compose.yml                   # Setup production
├── docker-compose.dev.yml               # Setup dev
├── docker-compose.staging.yml           # Setup staging
└── .env                                 # Variables environnement
```

---

## 🔐 Système d'Authentification Multi-Rôles

L'application gère **3 types d'utilisateurs distincts** avec des flux d'authentification séparés:

### 1. Donateurs (Donators)
- **Table DB**: `users`
- **Rôle**: `'donator'`
- **Flux**: Email signup → Vérification email → Définition password → Login
- **Routes**: `/auth/*`, `/dashboard/*`
- **Features**: Historique dons, gestion abonnements, téléchargement reçus fiscaux

### 2. Associations (Admin)
- **Table DB**: `users` (role='association') + `Assos`
- **Rôle**: `'association'`
- **Flux**: Signup avec validation SIREN → Upload documents → Vérification email → Approbation manuelle → Login
- **Routes**: `/backoffice-auth/*`, `/backoffice/*`
- **Validation**: API INSEE pour SIREN/SIRET
- **Features**: Backoffice complet, gestion dons, bénévoles, distribution repas

### 3. Bénévoles (Volunteers)
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

### Routes Backend (14 Modules)

| Fichier Route | Endpoints | Fonction |
|--------------|-----------|----------|
| `auth.js` | 25+ | Authentification multi-rôles |
| `dons.js` | 6 | Création et gestion dons |
| `subscriptions.js` | 8 | Gestion abonnements mensuels (Stripe) |
| `donateurs.js` | 4 | Gestion profils donateurs |
| `assos.js` | 5 | CRUD associations |
| `recus.js` | 6 | Génération reçus fiscaux |
| `payment.js` | 5 | Paiements Stripe |
| `payment-paypal.js` | 4 | Paiements PayPal |
| `backOffice.js` | 20+ | Dashboard admin, stats, exports |
| `benevoles.js` | 30+ | Gestion bénévoles, actions, QR codes |
| `cantine.js` | 15+ | Distribution repas, commandes, quotas |
| `emailDonateurs.js` | 3 | Campagnes email donateurs |
| `database.js` | 2 | Utilitaires DB |
| `support.js` | 6 | Système tickets support (Trello) |

**Préfixe**: Toutes les routes API sont préfixées par `/api`

### Endpoints Clés

**Authentification:**
- `POST /api/signup` - Inscription donateur
- `POST /api/signin` - Login donateur
- `POST /api/backoffice/signin` - Login admin
- `POST /api/benevolat/signin` - Login bénévole
- `GET /api/me` - Info utilisateur courant
- `POST /api/logout` - Déconnexion

**Dons:**
- `POST /api/dons` - Créer don
- `GET /api/dons` - Liste dons
- `POST /api/create-payment-intent` - Paiement Stripe
- `POST /api/create-subscription` - Abonnement Stripe
- `POST /api/cancel-subscription/:id` - Annuler abonnement

**Bénévoles:**
- `GET /api/benevolat/actions/:associationName` - Liste actions
- `POST /api/benevolat/actions/:actionId/register` - Inscription action
- `POST /api/benevolat/qrcode/generate` - Générer carte repas
- `POST /api/benevolat/qrcode/scan` - Scanner carte repas

**Backoffice:**
- `GET /api/backoffice/dashboard/stats` - Statistiques dashboard
- `GET /api/backoffice/dons` - Liste tous dons
- `POST /api/backoffice/generate-recu` - Générer reçu fiscal
- `GET /api/backoffice/export/excel` - Export Excel

---

## 🗄️ Schéma Base de Données

### Tables Principales

#### Users & Authentification
- **`users`**: Comptes donateurs et admin
  - Champs: id, email, password, firstName, lastName, role, siren, is_verified, verification_token, reset_token, created_at
- **`Assos`**: Détails associations
  - Champs: id, email, siren, nom, uri, stripe_secret_key, stripe_publishable_key, logoUrl, signataire_nom, signataire_prenom, benevoles_resp_email
- **`benevoles`**: Comptes bénévoles
  - Champs: id, email, password, nom, prenom, telephone, adresse, ville, code_postal, pays, age, date_naissance, genre, vehicule, statut, association_nom, is_verified, verification_code, completion_token, metiers_competences, source_connaissance, tracking_uuid

#### Dons
- **`dons`**: Dons ponctuels
  - Champs: id, user_id, asso_id, amount, currency, payment_method, stripe_payment_intent_id, status, date, fiscal_receipt_generated
- **`abonnements`**: Abonnements mensuels
  - Champs: id, user_id, asso_id, amount, stripe_subscription_id, stripe_customer_id, status, start_date, next_billing_date, canceled_at
- **`Prices`**: Catalogue tarifs Stripe
  - Champs: id, montant, price_id, product_id, nickname, asso

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
- **`qrcode_cards`**: Cartes repas
  - Champs: id, qrcode_id, nom, prenom, nb_beneficiaires, created_at, created_by, association_nom
- **`meal_pickups`**: Distributions repas
  - Champs: id, qrcode_id, pickup_date, pickup_time, benevole_id, nb_beneficiaires

#### Administratif
- **`onboarding_backoffice`**: Statut onboarding admin
  - Champs: id, user_id, asso_id, donations, cantine, suiviVehicule, doubleChecked, isOnboarded, tutorielDone, document_justificatif, statut, amende

---

## 🔧 Services Backend (9 Services Core)

### 1. Database Service (`bdd.js`)
- **Fonction**: Abstraction MySQL avec connection pooling
- **Features**: Dual pool (local + remote), CRUD operations, protection SQL injection, masquage données sensibles dans logs

### 2. Mail Service (`mailService.js`)
- **Provider**: Mailjet
- **Features**: Templates emails, variables, pièces jointes (ICS)
- **Templates**: Vérification email, reset password, welcome bénévole, code OTP

### 3. Stripe Service (`stripeService.js`)
- **Fonction**: Intégration Stripe dynamique par association
- **Features**: Multi-tenant, gestion abonnements, payment intents, seeding prix

### 4. PayPal Service (`paypalService.js`)
- **Fonction**: Intégration PayPal pour dons
- **Features**: Création orders, capture paiements, webhooks

### 5. PDF Service (`pdfService.js`)
- **Fonction**: Génération reçus fiscaux et documents admin
- **Technology**: PDFKit
- **Outputs**: Reçus fiscaux, documents association
- **Features**: QR codes, watermarks, layouts personnalisés

### 6. Google Sheets Service (`googleSheetsService.js`)
- **Fonction**: Sync données bénévoles avec Google Sheets
- **Features**: MAJ automatique roster, sync statuts

### 7. ICS Service (`icsService.js`)
- **Fonction**: Génération fichiers iCalendar pour actions bénévoles
- **Features**: Création événements avec rappels

### 8. INSEE Service (`inseeService.js`)
- **Fonction**: Validation numéros SIREN/SIRET
- **API**: INSEE Sirene V3.11
- **Features**: Lookup infos entreprise, validation adresse

### 9. Trello Service (`trelloService.js`)
- **Fonction**: Intégration système tickets support
- **Features**: Création cards, assignation départements, tracking statuts

---

## 🎨 Architecture Frontend

### Modules Angular (11 Modules)

#### 1. Auth Module (`/auth`)
- **Fonction**: Authentification donateurs
- **Pages**: sign-in, sign-up, forgot-password, verify-email, set-password
- **Service**: `AuthService` (JWT avec cookies)

#### 2. Backoffice Module (`/backoffice`)
- **Fonction**: Panel administration association
- **Composants** (15+): Dashboard, Dons, Abonnements, Reçus, Bénévoles, Actions, Campagnes, Configuration, Cantine, Onboarding
- **Services**: `OnboardingService`, `AutoTourService`, `BenevolatAdminService`, `DonsService`

#### 3. Benevolat Module (`/benevolat`)
- **Fonction**: Interface bénévole
- **Pages**: signin, form, dashboard, actions, profile, otp-verification, qrcode-generate/scan/list
- **Service**: `ActionService`

#### 4. Donation Module (`/donation`)
- **Fonction**: Formulaire don public
- **Features**: Form multi-étapes, dons ponctuels/récurrents, Stripe/PayPal, validation adresse INSEE
- **Composants**: DonationForm, PersonalInfoForm, PaymentForm

#### 5. Dashboard Module (`/dashboard`)
- **Fonction**: Tableau de bord donateur
- **Features**: Historique dons, gestion abonnements, téléchargement reçus
- **Composants**: Charts (ApexCharts), tables, filtres

#### 6. Cantine Module (`/cantine`)
- **Fonction**: Interface commande repas publique
- **Features**: Affichage menu, commande, planification livraison

#### 7. CantineAdmin Module (`/cantineAdmin`)
- **Fonction**: Gestion distribution repas (backoffice)
- **Features**: Gestion commandes, quotas, tracking pickups

#### 8. Layout Module (`/layout`)
- **Fonction**: Shell app et navigation
- **Composants**: Navbar, Sidebar, Footer, Breadcrumb

#### 9-11. Error, UIKit, Backoffice-Auth Modules
- **Error**: Pages 404, 500, 403
- **UIKit**: Librairie composants et style guide
- **Backoffice-Auth**: Authentification admin

### Ressources Partagées

**Composants Shared:**
- ButtonComponent, ConfirmationDialogComponent, PauseDialogComponent, ModifySubscriptionDialogComponent, AddressUpdateDialogComponent, SupportWidgetComponent, StepIndicatorComponent

**Services Shared:**
- ThemeService, FailedDonationsService, SupportService

**Pipes:** Formatage dates, devises, troncature texte

**Validators:** Email, SIREN, code postal

---

## 🚀 Déploiement & Infrastructure

### Docker Compose (7 Services)

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

---

## 🎯 Features Business Clés

### 1. Gestion Dons
- Dons ponctuels (Stripe/PayPal)
- Abonnements mensuels (Stripe)
- Reçus fiscaux auto-générés (PDF + QR codes)
- Multi-tenant (chaque asso a son compte Stripe)

### 2. Gestion Bénévoles
- Inscription OTP (6 chiffres)
- Calendrier actions
- Tracking présence (QR codes)
- Statuts: Restreint → Confirmé → Responsable
- Sync Google Sheets

### 3. Distribution Repas (Cantine Solidaire)
- Commande publique
- Panel admin (gestion commandes, quotas)
- Cartes repas QR Code
- Système scan (tracking pickups)
- Statistiques

### 4. Backoffice
- Dashboard temps réel (ApexCharts)
- Gestion dons (liste, filtres, exports Excel/CSV)
- Admin bénévoles
- Reçus fiscaux (bulk generation)
- Campagnes email
- Configuration (Stripe, logo, SIREN)
- Onboarding (Driver.js tours)

### 5. Système Support
- Widget support flottant
- Intégration Trello
- Catégories: Technique, Admin, Compta, Juridique, Formation
- Statuts: Nouveau → En attente → Résolu

### 6. Architecture Multi-tenant
- Isolation données par `uri`
- Branding personnalisé (logo, couleurs)
- Comptes Stripe séparés

---

## 📝 Modèles de Données TypeScript

```typescript
// User
interface User {
  id: number;
  email: string;
  password: string; // bcrypt hashed
  firstName: string;
  lastName: string;
  role: 'donator' | 'association';
  siren?: string;
  is_verified: boolean;
  created_at: Date;
}

// Donation
interface Donation {
  id: number;
  user_id: number;
  asso_id: number;
  amount: number;
  currency: string;
  payment_method: 'stripe' | 'paypal' | 'bank';
  stripe_payment_intent_id?: string;
  status: 'success' | 'pending' | 'failed';
  date: Date;
  fiscal_receipt_generated: boolean;
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
```

---

## 🔒 Sécurité

### Implémenté ✅
- JWT HttpOnly cookies (protection XSS)
- Hashing bcrypt passwords
- CORS avec credentials
- Protection SQL injection (requêtes paramétrées)
- Validation inputs (email, SIREN, passwords)
- Expiration tokens (1h JWT)
- HTTPS (Let's Encrypt)
- Protection .env (gitignored)
- Masquage données sensibles dans logs
- Protection CSRF (sameSite cookies)
- Whitelisting IP (mode maintenance)

### Améliorations Potentielles ⚠️
- Rate limiting endpoints auth
- Headers CSP
- 2FA comptes admin
- Audit logging
- Rotation API keys
- Validation signature webhooks Stripe

---

## 📚 Documentation

Documentation complète dans `/docs/`:
1. README.md - Vue d'ensemble projet
2. ANGULAR.md - Architecture frontend (49KB)
3. NODE-BACKEND.md - Architecture backend (50KB)
4. BACKOFFICE.md - Documentation panel admin (18KB)
5. ESPACE-BENEVOLE.md - Documentation espace bénévole (18KB)
6. ESPACE-DONATEUR.md - Documentation dashboard donateur (17KB)
7. FORMULAIRE-DON.md - Documentation formulaire don (15KB)
8. SYSTEME-CARTE-REPAS.md - Système cartes repas (6KB)
9. SYSTEME-SUPPORT-TICKETS.md - Système tickets support (15KB)
10. LOGGING-MONITORING.md - Setup logging & monitoring (7KB)

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
- **Onboarding**: Driver.js

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
cd src/www/myamana/server/node
npm install
npm start  # Port 4242

# Frontend
cd src/www/myamana/client/myamana-angular
npm install
npm start  # Port 4200
```

### Build Production
```bash
# Docker Compose
docker-compose -f docker-compose.yml up --build

# Build Angular manuel
cd src/www/myamana/client/myamana-angular
npm run prod  # Output: dist/angular-tailwind/
```

### Environnements
- **Development**: `environment.ts` - API locale (localhost:4242)
- **Staging**: `environment.staging.ts` - API staging
- **Production**: `environment.prod.ts` - API prod (v2.myamana.fr)

---

## 🔧 Variables Environnement Critiques

```bash
# URLs
URL_ORIGIN=https://v2.myamana.fr

# Database
LOCAL_DB_HOST=mysql
LOCAL_DB_USER=rachid
LOCAL_DB_PASSWORD=rachid
LOCAL_DB_NAME=myamana

# JWT
JWT_SECRET=Sourate76Verset9

# Mailjet
MAILJET_KEY_MYAMANA=***
MAILJET_SECRET_MYAMANA=***

# Google Sheets
GOOGLE_SHEET_ID=***
GOOGLE_CREDENTIALS_PATH=./credentials/metal-zodiac-290317-cddf3d3d5bbb.json

# GitHub OAuth (Grafana)
GITHUB_CLIENT_ID=***
GITHUB_CLIENT_SECRET=***

# Trello
TRELLO_API_KEY=***
TRELLO_TOKEN=***
TRELLO_BOARD_ID=***

# INSEE API
SIRENE_API_KEY=***
```

---

## 📊 Statistiques Projet

- **Modules Frontend**: 11 modules
- **Routes Backend**: 14 fichiers routes
- **Services Backend**: 9 services core
- **Tables DB**: 20+ tables
- **Endpoints API**: 100+ endpoints
- **Fichiers Documentation**: 12 fichiers MD
- **Services Docker**: 9 containers
- **Lignes de Code**: ~50,000+ (frontend + backend)

---

## 🎯 Cas d'Usage Business

MyAmana est conçu pour les **organisations à but non lucratif** qui ont besoin de:
1. Accepter et gérer des dons en ligne
2. Recruter et coordonner des bénévoles
3. Distribuer des repas aux bénéficiaires
4. Générer des reçus fiscaux pour les donateurs
5. Suivre les statistiques et générer des rapports
6. Gérer plusieurs associations depuis une plateforme

**Utilisateurs Cibles**:
- Banques alimentaires
- Refuges pour sans-abri
- Organisations communautaires
- Associations caritatives religieuses
- Associations humanitaires

**Exemple**: **Au Cœur de la Précarité** (client principal)

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
- `/pdf/recuFiscal/*` (reçus fiscaux)
- `/pdf/backoffice/documentassociation/*` (documents associations)

### Branches Git
- **Main branch**: `develop`
- **Branche courante**: `develop`

### Commits Récents
1. `fbe9f2d3` - Cantine (#44)
2. `7de79c27` - Merge pull request #43 (suppression_log)
3. `62fb7c70` - Ajout filigrane cartes repas

---

## 💡 Notes pour Claude AI

### Lors de modifications code:
1. **Toujours lire le fichier d'abord** avant de proposer des changements
2. **Respecter les patterns existants** (conventions, structure)
3. **Tester la sécurité** (XSS, SQL injection, CSRF)
4. **Éviter over-engineering** (seulement ce qui est demandé)
5. **Pas de breaking changes** sans confirmation utilisateur

### Lors de debug:
1. **Vérifier les logs** (`/var/log/myamana/` ou Grafana)
2. **Tester l'auth** (vérifier JWT, cookies, rôles)
3. **Vérifier la DB** (tables, relations, données)
4. **Tester les routes API** (endpoints, paramètres, réponses)

### Lors d'ajout features:
1. **Analyser l'impact** (tables DB, routes API, composants Angular)
2. **Respecter l'architecture multi-tenant** (isolation par `uri`)
3. **Ajouter validation** (frontend + backend)
4. **Documenter** (mettre à jour docs/ si feature majeure)
5. **Tester avec les 3 rôles** (donateur, admin, bénévole)

---

**Ce fichier doit être chargé au début de chaque conversation pour contextualiser Claude AI sur le projet MyAmana.**
