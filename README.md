# README : Projet ACDLP

ACDLP (Au Cœur de la Précarité) est une plateforme web de gestion associative dédiée à l'aide aux personnes en situation de précarité. Elle permet de gérer le bénévolat, la distribution de repas (cantine solidaire) et le suivi de véhicules.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Applications](#applications)
3. [Architecture](#architecture)
4. [Prérequis](#prérequis)
5. [Infrastructure Docker-Compose](#infrastructure-docker-compose)
6. [Services Backend](#services-backend)
7. [Guide de démarrage](#guide-de-démarrage)
8. [Documentation](#documentation)

---

## Vue d'ensemble

Le projet ACDLP est une plateforme web moderne construite avec :
- **Frontend** : Angular 18 (TypeScript)
- **Backend** : Node.js 20 (Express)
- **Base de données** : MySQL 8.0 (locale et distante)
- **Infrastructure** : Docker, Docker Compose, Nginx
- **Services externes** : Mailjet, Google Sheets, Trello, API INSEE

---

## Applications

Le projet est organisé en 2 applications principales, chacune avec sa propre documentation détaillée :

### 1. [Espace Bénévole](./docs/ESPACE-BENEVOLE.md)
Interface dédiée aux bénévoles pour s'inscrire aux actions, consulter le calendrier et gérer leur participation.

**Public** : Bénévoles (restreints, confirmés, responsables)

**Fonctionnalités principales** :
- Inscription aux actions de bénévolat via OTP (code à 6 chiffres)
- Consultation du calendrier des actions
- Tableau de bord personnel avec statistiques
- Accès au groupe WhatsApp (pour bénévoles confirmés)
- Génération et scan de cartes repas QR Code (pour responsables)
- Gestion des présences et tracking (pour responsables)

**Technologies** :
- Authentification OTP par email (10 min d'expiration)
- Cartes repas QR Code UUID
- Génération de fichiers ICS pour calendrier

### 2. [Backoffice](./docs/BACKOFFICE.md)
Interface d'administration pour l'association ACDLP, permettant de gérer tous les aspects de l'association.

**Public** : Administrateurs ACDLP

**Modules disponibles** :
- **Gestion du bénévolat** : Liste bénévoles, création d'actions, calendrier, attestations
- **Gestion de la cantine solidaire** : Commandes, quotas, cartes repas, tracking distributions
- **Suivi du véhicule** : Enregistrement trajets, pleins carburant, statistiques
- **Paramètres** : Infos association, onboarding, support tickets

**Features** :
- Onboarding avec tours guidés (Driver.js)
- Synchronisation automatique Google Sheets
- Génération d'attestations bénévoles
- Système de tickets support (Trello)
- Dashboard avec graphiques ApexCharts
- Exports Excel/CSV

---

## Architecture

### Structure du projet

```
acdlp/
├── src/www/acdlp/
│   ├── client/                      # Frontend Angular
│   │   └── acdlp-angular/
│   │       └── src/app/
│   │           └── modules/
│   │               ├── benevolat/   # Espace Bénévole
│   │               ├── backoffice/  # Backoffice ACDLP
│   │               ├── backoffice-auth/ # Auth Backoffice
│   │               ├── cantine/     # Module Cantine (public)
│   │               ├── cantineAdmin/# Module Cantine (admin)
│   │               ├── error/       # Pages d'erreur
│   │               ├── layout/      # Layout de l'app
│   │               └── uikit/       # Composants UI
│   └── server/
│       └── node/                    # Backend Node.js
│           ├── routes/              # Routes API (7 modules)
│           ├── services/            # Services (6 services)
│           ├── config/              # Configuration (logger)
│           ├── middleware/          # Middleware HTTP
│           └── server.js            # Point d'entrée
├── docker-compose.yml               # Configuration Docker production
├── docker-compose.dev.yml           # Configuration Docker dev
├── docker-compose.staging.yml       # Configuration Docker staging
├── nginx/                           # Configuration Nginx
├── mysql/                           # Scripts init DB
├── grafana/                         # Dashboards Grafana
├── loki/                            # Configuration Loki
├── promtail/                        # Configuration Promtail
└── docs/                            # Documentation
```

### Technologies utilisées

**Frontend**
- Angular 18.1.0
- TypeScript 5.4.5
- Tailwind CSS 3.1.6
- Lucide Icons + FontAwesome
- ApexCharts (ng-apexcharts)
- Driver.js (tours guidés)
- Quill (éditeur de texte)

**Backend**
- Node.js 20
- Express.js 4.18.2
- MySQL2 3.3.2 (connection pooling)
- JWT pour l'authentification (cookies HttpOnly)
- Bcrypt pour le hachage des mots de passe
- Winston pour le logging

**Services externes**
- **Mailjet** : Envoi d'emails transactionnels (OTP, confirmations, rappels)
- **Google Sheets API** : Synchronisation automatique des bénévoles
- **INSEE API** : Validation des numéros SIREN/SIRET
- **Trello API** : Système de tickets support

**Infrastructure**
- Docker + Docker Compose
- Nginx (reverse proxy, static files, SSL)
- Grafana + Loki + Promtail (monitoring et logs)
- Certbot (renouvellement SSL automatique)

---

## Prérequis

Pour exécuter ce projet sur votre machine, vous devez disposer des outils suivants :

- [Docker](https://www.docker.com/) (version 20.10 ou supérieure)
- [Docker Compose](https://docs.docker.com/compose/) (version 1.29 ou supérieure)
- [Git](https://git-scm.com/)

Assurez-vous que ces outils sont installés et configurés avant de procéder.

---

## Infrastructure Docker-Compose

### Description

Le projet ACDLP repose sur une infrastructure basée sur Docker Compose, qui comprend plusieurs services :

- **MySQL** : Base de données principale (port 3306)
- **Nginx** : Reverse proxy et serveur de fichiers statiques (ports 80/443)
- **Node.js** : Backend API (port 4242)
- **Angular** : Frontend (compilé et servi par Nginx)
- **phpMyAdmin** : Interface de gestion MySQL (port 8080)
- **Loki** : Agrégation de logs (port 3100)
- **Promtail** : Shipping de logs vers Loki
- **Grafana** : Visualisation de logs et métriques (port 3001)
- **Certbot** : Renouvellement automatique des certificats SSL

### Fichiers de configuration

Trois fichiers de configuration principaux sont disponibles :

- `docker-compose.yml` : Configuration production
- `docker-compose.dev.yml` : Configuration développement
- `docker-compose.staging.yml` : Configuration staging avec SSL

### Commandes

Pour lancer l'infrastructure :

**Environnement de développement** :
```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Environnement de staging** :
```bash
docker-compose -f docker-compose.staging.yml up --build
```

**Environnement de production** :
```bash
docker-compose up --build
```

**Arrêter les services** :
```bash
docker-compose down
```

**Voir les logs** :
```bash
docker-compose logs -f node  # Logs backend
docker-compose logs -f nginx  # Logs Nginx
```

---

## Services Backend

Le backend repose sur plusieurs services principaux, chacun responsable de fonctionnalités distinctes :

### 1. Service Base de Données (`bdd.js`)

**Objectif** : Gérer les requêtes SQL pour les bases de données locales et distantes.

**Fonctionnalités** :
- Connexion à la base de données via des pools (`local` et `remote`)
- Requêtes SQL génériques : `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- Protection contre les injections SQL grâce à l'utilisation de paramètres bindés
- Masquage des données sensibles dans les logs

**Exemple** :
```javascript
const results = await db.select('SELECT * FROM users WHERE email = ?', [email], 'remote');
```

### 2. Service Email (`mailService.js`)

**Objectif** : Gérer l'envoi d'emails transactionnels via Mailjet.

**Fonctionnalités** :
- Envoi d'emails basés sur des templates Mailjet
- Utilisation de variables dynamiques dans les emails
- Support des pièces jointes (fichiers ICS pour les événements)

**Templates utilisés** :
- Code OTP bénévole (6 chiffres)
- Bienvenue bénévole
- Confirmation inscription action
- Rappel action (24h avant)
- Notification responsable

**Exemple** :
```javascript
await sendTemplateEmail(email, templateId, { prenom: 'John', code_otp: '123456' }, 'Code OTP');
```

### 3. Service Google Sheets (`googleSheetsService.js`)

**Objectif** : Synchroniser les données des bénévoles avec Google Sheets.

**Fonctionnalités** :
- Synchronisation automatique quotidienne (cron 3h du matin)
- Mise à jour des statuts et informations des bénévoles
- Export du roster pour comptabilité
- Authentification via Service Account Google

**Exemple** :
```javascript
await syncVolunteersToGoogleSheets('acdlp');
```

### 4. Service ICS (`icsService.js`)

**Objectif** : Générer des fichiers ICS (iCalendar) pour les événements de bénévolat.

**Fonctionnalités** :
- Génération de fichiers ICS pour ajout au calendrier
- Support des rappels (24h avant l'action)
- Descriptions et localisations
- Pièce jointe automatique dans les emails

### 5. Service INSEE (`inseeService.js`)

**Objectif** : Valider les numéros SIREN/SIRET via l'API INSEE.

**Fonctionnalités** :
- Validation des numéros SIREN lors de l'inscription admin
- Récupération des informations de l'entreprise
- Vérification de l'adresse du siège social

### 6. Service Trello (`trelloService.js`)

**Objectif** : Intégration système tickets support.

**Fonctionnalités** :
- Création automatique de cards Trello
- Assignment selon le département (Technique, Admin, Compta, etc.)
- Tracking des statuts des tickets
- Widget support flottant dans l'interface

---

## Guide de démarrage

### 1. Cloner le repository

```bash
git clone git@github.com:LazyException/acdlp.git
cd acdlp
```

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# URLs
URL_ORIGIN=http://localhost

# Base de données locale
LOCAL_DB_HOST=acdlp-mysql
LOCAL_DB_PORT=3306
LOCAL_DB_USER=rachid
LOCAL_DB_PASSWORD=rachid
LOCAL_DB_NAME=acdlp

# Base de données distante
DB_HOST=your_remote_host
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=acdlp

# JWT
JWT_SECRET=your_jwt_secret_here

# Mailjet
MAILJET_KEY_ACDLP=your_mailjet_api_key
MAILJET_SECRET_ACDLP=your_mailjet_secret_key

# Google Sheets
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_CREDENTIALS_PATH=./credentials/your-credentials.json

# INSEE API
SIRENE_API_KEY=your_insee_api_key

# Trello
TRELLO_API_KEY=your_trello_api_key
TRELLO_TOKEN=your_trello_token
TRELLO_BOARD_ID=your_board_id

# GitHub OAuth (Grafana)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_ALLOWED_ORGS=your_github_org
```

### 3. Lancer les services

**Développement** :
```bash
docker-compose -f docker-compose.dev.yml up --build
```

**Production** :
```bash
docker-compose up --build
```

### 4. Accéder aux applications

- **Frontend** : http://localhost (port 80)
- **Backend API** : http://localhost:4242
- **phpMyAdmin** : http://localhost:8080
- **Grafana** : http://localhost:3001

### 5. Première connexion

**Backoffice Admin** :
1. Aller sur `/backoffice-auth/sign-up`
2. S'inscrire avec email, SIREN, nom/prénom
3. Vérifier l'email
4. Se connecter sur `/backoffice-auth/sign-in`
5. Compléter l'onboarding (activer modules)

**Espace Bénévole** :
1. Aller sur `/benevolat`
2. Saisir l'email
3. Recevoir le code OTP par email
4. Vérifier le code
5. Compléter le formulaire d'inscription

---

## Structure de la base de données

### Tables principales

**Authentification & Users**
- `users` : Administrateurs ACDLP
- `Assos` : Détails association ACDLP
- `benevoles` : Bénévoles

**Bénévolat**
- `actions` : Actions de bénévolat
- `Benevoles_Actions` : Inscriptions aux actions
- `Actions_Masquees` : Actions masquées par les admins

**Cantine**
- `Commandes` : Commandes de repas
- `Quotas2` : Quotas journaliers
- `Menus` : Menus hebdomadaires
- `qrcode_cards` : Cartes repas QR Code
- `meal_pickups` : Historique des distributions

**Administratif**
- `onboarding_backoffice` : Statut onboarding et modules activés

Pour plus de détails sur la structure de chaque table, consultez les fichiers SQL dans le dossier `mysql/init-db.sql/`.

---

## Documentation

Documentation complète disponible dans le dossier `/docs/` :

- **[NODE-BACKEND.md](./docs/NODE-BACKEND.md)** : Architecture backend, routes API, services
- **[ANGULAR.md](./docs/ANGULAR.md)** : Architecture frontend, modules, composants
- **[BACKOFFICE.md](./docs/BACKOFFICE.md)** : Documentation backoffice admin
- **[ESPACE-BENEVOLE.md](./docs/ESPACE-BENEVOLE.md)** : Documentation espace bénévole
- **[LOGGING-MONITORING.md](./docs/LOGGING-MONITORING.md)** : Setup logging Grafana/Loki
- **[SYSTEME-SUPPORT-TICKETS.md](./docs/SYSTEME-SUPPORT-TICKETS.md)** : Système tickets Trello
- **[CLAUDE.md](./CLAUDE.md)** : Context complet pour Claude AI

---

## Monitoring & Logs

### Grafana

Accès : http://localhost:3001/grafana

**Identifiants par défaut** :
- Username: `admin`
- Password: `admin`

**Dashboards disponibles** :
- Vue d'ensemble API (volume, taux d'erreur, temps de réponse)
- Logs applicatifs
- Métriques MySQL

### Loki

Les logs sont centralisés via Loki et consultables dans Grafana.

**Requêtes utiles** :
```
{service="acdlp-api"}  # Tous les logs
{service="acdlp-api"} |= "error"  # Erreurs uniquement
{service="acdlp-api"} | json | statusCode >= 500  # Erreurs HTTP 500+
```

### Winston

Les logs sont écrits dans `/var/log/acdlp/` :
- `application-YYYY-MM-DD.log` : Logs généraux
- `error-YYYY-MM-DD.log` : Erreurs uniquement
- Rotation automatique : 20MB max, 30 jours de rétention

---

## Contribution

Pour contribuer au projet :

1. Créez une branche feature : `git checkout -b feature/ma-fonctionnalite`
2. Committez vos changements : `git commit -m "Ajout de ma fonctionnalité"`
3. Poussez vers la branche : `git push origin feature/ma-fonctionnalite`
4. Ouvrez une Pull Request

**Conventions** :
- Code en TypeScript (frontend) et JavaScript (backend)
- Nommage : camelCase (JS/TS), snake_case (DB)
- Toujours tester avant de commit
- Respecter les patterns existants

---

## Licence

Ce projet est sous licence privée. Tous droits réservés.

**Association** : Au Cœur de la Précarité (ACDLP)

---

## Support

Pour toute question ou problème :
- Système de tickets intégré (widget support dans l'interface)
- Email : contact@acdlp.fr
- Documentation complète dans `/docs/`

---

**Dernière mise à jour** : 2026-01-26
