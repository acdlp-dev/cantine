# README : Projet Myamana V2

Myamana est une plateforme complète de gestion associative qui permet aux associations de gérer leurs dons, leur bénévolat, leur cantine solidaire et bien plus encore. Le projet est composé de plusieurs applications interconnectées, chacune dédiée à un public spécifique.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Applications](#applications)
3. [Architecture](#architecture)
4. [Prérequis](#prérequis)
5. [Infrastructure Docker-Compose](#infrastructure-docker-compose)
6. [Services Backend](#services-backend)
7. [Guide de démarrage](#guide-de-démarrage)

---

## Vue d'ensemble

Le projet Myamana V2 est une plateforme web moderne construite avec :
- **Frontend** : Angular (TypeScript)
- **Backend** : Node.js (Express)
- **Base de données** : MySQL (locale et distante)
- **Infrastructure** : Docker, Docker Compose, Nginx
- **Services externes** : Stripe, PayPal, Mailjet, Google Sheets

---

## Applications

Le projet est organisé en 4 applications principales, chacune avec sa propre documentation détaillée :

### 1. [Espace Bénévole](./docs/ESPACE-BENEVOLE.md)
Interface dédiée aux bénévoles pour s'inscrire aux actions, consulter le calendrier et gérer leur participation.

**Public** : Bénévoles (restreints, confirmés, responsables)

**Fonctionnalités principales** :
- Inscription aux actions de bénévolat
- Consultation du calendrier des actions
- Tableau de bord personnel
- Accès au groupe WhatsApp (pour bénévoles confirmés)
- Gestion des présences (pour responsables)

### 2. [Espace Donateur](./docs/ESPACE-DONATEUR.md)
Interface permettant aux donateurs de consulter leurs dons, gérer leurs abonnements et télécharger leurs reçus fiscaux.

**Public** : Donateurs

**Fonctionnalités principales** :
- Historique des dons
- Gestion des abonnements mensuels
- Téléchargement des reçus fiscaux
- Modification/annulation des abonnements

### 3. [Backoffice](./docs/BACKOFFICE.md)
Interface d'administration pour les associations, permettant de gérer tous les aspects de l'association (dons, bénévolat, cantine, etc.).

**Public** : Administrateurs d'association

**Modules disponibles** :
- Gestion du bénévolat
- Gestion des dons et abonnements
- Gestion de la cantine solidaire
- Suivi du véhicule
- Gestion des paramètres

### 4. [Formulaire de Don](./docs/FORMULAIRE-DON.md)
Formulaire public permettant à tout visiteur de faire un don ponctuel ou de souscrire à un abonnement mensuel.

**Public** : Visiteurs/Donateurs

**Fonctionnalités principales** :
- Don ponctuel
- Abonnement mensuel
- Paiement sécurisé (Stripe, PayPal)
- Génération de reçu fiscal

---

## Architecture

### Structure du projet

```
myamana/
├── src/www/myamana/
│   ├── client/                      # Frontend Angular
│   │   └── myamana-angular/
│   │       └── src/app/
│   │           └── modules/
│   │               ├── benevolat/   # Espace Bénévole
│   │               ├── dashboard/   # Espace Donateur
│   │               ├── backoffice/  # Backoffice
│   │               ├── donation/    # Formulaire de Don
│   │               ├── auth/        # Authentification Donateur
│   │               ├── backoffice-auth/ # Auth Backoffice
│   │               └── cantine/     # Module Cantine
│   └── server/
│       └── node/                    # Backend Node.js
│           ├── routes/              # Routes API
│           ├── services/            # Services (BDD, Mail, etc.)
│           └── server.js
├── docker-compose.yml               # Configuration Docker
├── nginx/                           # Configuration Nginx
└── docs/                            # Documentation
```

### Technologies utilisées

**Frontend**
- Angular 18
- TypeScript
- TailwindCSS
- Lucide Icons

**Backend**
- Node.js
- Express.js
- MySQL2
- JWT pour l'authentification
- Bcrypt pour le hachage des mots de passe

**Services externes**
- **Stripe** : Paiements et abonnements
- **PayPal** : Paiements alternatifs
- **Mailjet** : Envoi d'emails transactionnels
- **Google Sheets API** : Synchronisation des bénévoles
- **INSEE API** : Validation des adresses

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

Le projet Myamana repose sur une infrastructure basée sur Docker Compose, qui comprend plusieurs services :

- **MySQL** : Fournit la base de données pour le backend
- **Nginx** : Sert les fichiers statiques et agit comme un reverse proxy
- **Node.js** : Héberge le backend API
- **Angular** : Fournit le frontend (compilé et servi par Nginx)
- **phpMyAdmin** : Interface de gestion pour MySQL (optionnel)

### Fichiers de configuration

Deux fichiers de configuration principaux sont disponibles :

- `docker-compose.dev.yml` : Configuré pour un environnement de développement
- `docker-compose.staging.yml` : Configuré pour un environnement de staging, avec des fonctionnalités supplémentaires comme Certbot pour les certificats SSL

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

**Arrêter les services** :
```bash
docker-compose down
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

**Exemple** :
```javascript
const results = await db.select('SELECT * FROM users WHERE email = ?', [email], 'remote');
```

### 2. Service Email (`mailService.js`)

**Objectif** : Gérer l'envoi d'emails transactionnels via Mailjet.

**Fonctionnalités** :
- Envoi d'emails basés sur des templates
- Utilisation de variables dynamiques dans les emails
- Support des pièces jointes (fichiers ICS pour les événements)

**Exemple** :
```javascript
await sendTemplateEmail(email, templateId, { prenom: 'John' }, 'Bienvenue sur Myamana');
```

### 3. Service Stripe (`stripeService.js`)

**Objectif** : Gérer les interactions avec l'API Stripe.

**Fonctionnalités** :
- Récupération dynamique des clés Stripe associées à une organisation
- Gestion des paiements et abonnements
- Annulation des abonnements

**Exemple** :
```javascript
const stripeInstance = await getStripeInstance('asso_identifier');
const canceledSubscription = await stripeInstance.subscriptions.del(subscriptionId);
```

### 4. Service Google Sheets (`googleSheetsService.js`)

**Objectif** : Synchroniser les données des bénévoles avec Google Sheets.

**Fonctionnalités** :
- Synchronisation automatique des bénévoles
- Mise à jour des statuts et informations

### 5. Service ICS (`icsService.js`)

**Objectif** : Générer des fichiers ICS pour les événements de bénévolat.

**Fonctionnalités** :
- Génération de fichiers ICS pour ajout au calendrier
- Support des rappels et descriptions

### 6. Service INSEE (`inseeService.js`)

**Objectif** : Valider les adresses via l'API INSEE.

**Fonctionnalités** :
- Validation des codes postaux
- Récupération des informations de communes

---

## Guide de démarrage

### 1. Cloner le repository

```bash
git clone git@github.com:LazyException/myamana.git
cd myamana
```

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=myamana

# JWT
JWT_SECRET=your_jwt_secret

# Mailjet
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Google Sheets
GOOGLE_SHEETS_CREDENTIALS=path_to_credentials.json
```

### 3. Lancer les services

```bash
docker-compose -f docker-compose.dev.yml up --build
```

### 4. Accéder aux applications

- **Frontend** : http://localhost:4200
- **Backend API** : http://localhost:3000
- **phpMyAdmin** : http://localhost:8080

---

## Structure de la base de données

### Tables principales

- `users` : Utilisateurs (donateurs)
- `benevoles` : Bénévoles
- `actions` : Actions de bénévolat
- `Benevoles_Actions` : Inscriptions aux actions
- `Actions_Masquees` : Actions masquées par les admins
- `Assos` : Associations
- `dons` : Dons ponctuels
- `abonnements` : Abonnements mensuels

Pour plus de détails sur la structure de chaque table, consultez les fichiers SQL dans le dossier `mysql/`.

---

## Contribution

Pour contribuer au projet :

1. Créez une branche feature : `git checkout -b feature/ma-fonctionnalite`
2. Committez vos changements : `git commit -m "Ajout de ma fonctionnalité"`
3. Poussez vers la branche : `git push origin feature/ma-fonctionnalite`
4. Ouvrez une Pull Request

---

## Licence

Ce projet est sous licence privée. Tous droits réservés.

---

## Support

Pour toute question ou problème, contactez l'équipe de développement.
