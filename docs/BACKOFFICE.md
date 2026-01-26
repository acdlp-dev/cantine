# Backoffice ACDLP - Documentation

Le Backoffice est l'interface d'administration permettant aux administrateurs de l'association **Au Cœur de la Précarité (ACDLP)** de gérer tous les aspects de leur activité : bénévolat, cantine solidaire et suivi de véhicule.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Modules et Fonctionnalités](#modules-et-fonctionnalités)
3. [Onboarding](#onboarding)
4. [API Endpoints](#api-endpoints)
5. [Structure technique](#structure-technique)

---

## Vue d'ensemble

### Objectif

Le Backoffice permet aux administrateurs ACDLP de :
- Gérer les bénévoles et les actions de bénévolat
- Administrer la cantine solidaire (commandes, quotas, menus)
- Suivre l'utilisation des véhicules
- Configurer les paramètres de l'association

### Accès

**URL** : `/backoffice`

**Authentification requise** : Oui (email + mot de passe)

---

## Modules et Fonctionnalités

Le Backoffice est organisé en trois modules principaux activables selon les besoins. Chaque module doit être activé lors du processus d'onboarding.

### Module Bénévolat

Le module bénévolat permet de gérer l'ensemble du cycle de vie des bénévoles et de leurs activités.

| Fonctionnalité | Description | Droits requis |
|----------------|-------------|---------------|
| **Consulter la liste des bénévoles** | Voir tous les bénévoles inscrits avec filtres et recherche | Admin |
| **Inscrire un bénévole** | Créer manuellement un compte bénévole | Admin |
| **Modifier un bénévole** | Éditer les informations d'un bénévole (nom, prénom, téléphone, adresse, etc.) | Admin |
| **Changer le statut** | Promouvoir un bénévole en responsable ou rétrograder | Admin |
| **Consulter l'historique** | Voir toutes les actions passées d'un bénévole | Admin |
| **Créer une action** | Créer une nouvelle action de bénévolat (ponctuelle ou récurrente) | Admin |
| **Modifier une action** | Éditer une action existante (nom, date, horaires, responsable, etc.) | Admin |
| **Masquer une occurrence** | Masquer une occurrence spécifique d'une action récurrente | Admin |
| **Démasquer une occurrence** | Rendre visible une occurrence précédemment masquée | Admin |
| **Voir le calendrier** | Visualiser toutes les actions dans un calendrier mensuel | Admin |
| **Voir les participants** | Consulter la liste des participants inscrits à une action | Admin |
| **Inscrire un bénévole à une action** | Inscrire manuellement un bénévole depuis le backoffice | Admin |
| **Désinscrire un bénévole** | Retirer un bénévole d'une action | Admin |
| **Générer des attestations** | Créer des attestations de bénévolat pour les heures effectuées | Admin |

**Détails techniques** :
- Les actions récurrentes (quotidiennes, hebdomadaires) génèrent automatiquement des occurrences futures
- Le changement de responsable d'une action déclenche la désinscription automatique de l'ancien responsable et l'inscription du nouveau
- Les actions peuvent être filtrées par genre (mixte, homme, femme) et âge (tous, majeure, mineur)
- Le masquage d'une occurrence la rend invisible pour les bénévoles mais reste visible pour les admins
- Synchronisation automatique avec Google Sheets pour le roster des bénévoles

**Statuts des bénévoles** :
- `restreint` : Nouveau bénévole en période d'observation
- `confirmé` : Bénévole régulier validé
- `responsable` : Bénévole avec droits étendus (scan cartes repas, gestion actions)

---

### Module Cantine Solidaire

Le module cantine permet de gérer la distribution des repas aux bénéficiaires.

| Fonctionnalité | Description | Droits requis |
|----------------|-------------|---------------|
| **Voir les commandes** | Consulter toutes les commandes de repas avec filtres par date/zone/statut | Admin |
| **Gérer les zones de distribution** | Définir et modifier les zones géographiques de distribution | Admin |
| **Gérer les quotas** | Définir le nombre de repas disponibles par zone et par jour | Admin |
| **Renseigner les menus** | Saisir les menus de la semaine | Admin |
| **Valider les commandes** | Approuver ou refuser les commandes en fonction des quotas | Admin |
| **Gérer les cartes repas** | Générer, lister et gérer les cartes repas QR Code | Admin |
| **Tracking des distributions** | Visualiser l'historique des distributions (meal pickups) | Admin |
| **Exporter les commandes** | Exporter la liste des commandes pour préparation (Excel/CSV) | Admin |

**Cartes repas QR Code** :
- Chaque carte est unique et contient : nom, prénom, nombre de bénéficiaires
- Les responsables bénévoles peuvent scanner les cartes lors de la distribution
- Le système enregistre automatiquement la date/heure de distribution et le bénévole qui a scanné
- Les cartes peuvent être listées et consultées dans le backoffice

**Workflow de gestion** :
1. Les quotas sont définis par l'admin (nombre de repas par jour)
2. Les commandes publiques arrivent via le formulaire cantine
3. L'admin valide ou refuse selon les quotas disponibles
4. Le jour J, les responsables scannent les cartes repas lors de la distribution
5. Le système enregistre chaque distribution pour tracking

---

### Module Suivi Véhicule

| Fonctionnalité | Description | Droits requis |
|----------------|-------------|---------------|
| **Voir le tableau de bord** | Visualiser les statistiques d'utilisation du véhicule | Admin + Responsables |
| **Enregistrer un trajet** | Saisir les informations d'un déplacement (kilométrage, destination, motif) | Admin + Responsables |
| **Consulter l'historique** | Voir tous les trajets effectués avec filtres temporels | Admin + Responsables |
| **Gérer les pleins** | Enregistrer les pleins de carburant avec montants | Admin + Responsables |
| **Calculer les coûts** | Voir les coûts totaux (carburant, entretien, assurance) | Admin |
| **Exporter les données** | Exporter l'historique pour comptabilité | Admin |

**Note** : Ce module doit être activé lors de l'onboarding pour être accessible.

---

### Section Compte

| Fonctionnalité | Description | Droits requis |
|----------------|-------------|---------------|
| **Mes infos** | Consulter et modifier les informations de l'association (nom, adresse, contact) | Admin |
| **Paramètres** | Configurer les préférences (modules actifs, email responsable bénévoles) | Admin |
| **Support** | Accéder au système de tickets support (intégration Trello) | Admin |
| **Déconnexion** | Se déconnecter du backoffice | Tous |

---

## Onboarding

### Processus d'activation des modules

Lors de la première connexion, l'administrateur passe par un processus d'onboarding pour activer les modules souhaités.

**Étapes** :
1. **Connexion** : Authentification avec email et mot de passe
2. **Écran d'onboarding** :
   - Sélection des modules à activer :
     - ☐ Bénévolat
     - ☐ Module cantine
     - ☐ Suivi véhicule
3. **Enregistrement** : Les préférences sont sauvegardées dans la base de données
4. **Accès au backoffice** : Seuls les modules activés sont visibles dans la sidebar
5. **Tours guidés** : Découverte des fonctionnalités via Driver.js

**Modification ultérieure** :
- Les préférences peuvent être modifiées dans la section "Paramètres"
- L'activation/désactivation d'un module prend effet immédiatement
- Les données existantes sont conservées même si un module est désactivé temporairement

### Vérification de l'onboarding

**Endpoint** : `GET /api/backoffice/onboarding/completed`

**Réponse** :
```json
{
  "result": {
    "isOnboarded": true,
    "benevolat": true,
    "cantine": true,
    "suiviVehicule": false
  }
}
```

---

## API Endpoints

### Authentification Backoffice

#### `POST /api/backoffice/signin`
Authentifie un administrateur ACDLP.

**Body** :
```json
{
  "email": "admin@acdlp.fr",
  "password": "MotDePasse123!"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Connexion réussie",
  "user": {
    "email": "admin@acdlp.fr",
    "uri": "acdlp",
    "nameAsso": "Au Coeur De La Précarité"
  }
}
```

**Cookies** :
- `token` : JWT HttpOnly, expire dans 1h
- `sameSite: 'strict'`, `secure: true` en production

---

### Gestion des bénévoles

#### `GET /api/backoffice/benevoles`
Récupère la liste de tous les bénévoles de l'association.

**Headers** :
```
Cookie: token={jwt_token}
```

**Query params** :
- `search` : Recherche par nom, prénom, email, téléphone ou ville
- `limit` : Nombre maximum de résultats (défaut : 10000)

**Réponse** :
```json
{
  "success": true,
  "results": [
    {
      "id": 1,
      "type": "bénévole",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean@example.com",
      "telephone": "0612345678",
      "adresse": "123 rue de la Paix",
      "ville": "Paris",
      "code_postal": "75001",
      "pays": "France",
      "age": 30,
      "genre": "homme",
      "metiers_competences": "Informatique",
      "statut": "confirmé",
      "created_at": "2024-01-01T10:00:00.000Z",
      "date_derniere_action_presente": "2024-01-15"
    }
  ],
  "total": 1
}
```

---

#### `GET /api/backoffice/benevoles/responsables`
Récupère la liste des responsables (pour sélection lors de création d'action).

**Réponse** :
```json
{
  "success": true,
  "results": [
    {
      "nom": "Martin",
      "prenom": "Sophie",
      "email": "sophie.martin@example.com"
    }
  ]
}
```

---

#### `PATCH /api/backoffice/benevoles/:email/type`
Modifie le statut d'un bénévole (promotion/rétrogradation).

**Body** :
```json
{
  "type": "responsable"
}
```

**Valeurs possibles** : `restreint`, `bénévole`, `confirmé`, `responsable`

**Réponse** :
```json
{
  "success": true,
  "message": "Type mis à jour avec succès",
  "type": "responsable"
}
```

---

#### `PATCH /api/backoffice/benevoles/:email`
Modifie les informations complètes d'un bénévole.

**Body** :
```json
{
  "type": "bénévole",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0612345678",
  "adresse": "123 rue de la Paix",
  "ville": "Paris",
  "code_postal": "75001",
  "pays": "France",
  "age": 30,
  "genre": "homme",
  "metiers_competences": "Informatique",
  "statut": "confirmé"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Bénévole mis à jour avec succès"
}
```

---

#### `GET /api/backoffice/benevoles/:email/actions`
Récupère l'historique des actions d'un bénévole.

**Réponse** :
```json
{
  "success": true,
  "actions": [
    {
      "inscription_id": 1,
      "date_action": "2024-01-15",
      "inscription_date": "2024-01-01T10:00:00.000Z",
      "action_nom": "Distribution alimentaire",
      "rue": "123 rue exemple",
      "ville": "Paris",
      "heure_debut": "14:00:00",
      "heure_fin": "17:00:00",
      "statut": "présent"
    }
  ],
  "total": 1
}
```

---

### Gestion des actions

#### `GET /api/backoffice/actions/list`
Récupère toutes les actions de l'association.

**Réponse** :
```json
{
  "success": true,
  "actions": [
    {
      "id": 1,
      "association_nom": "acdlp",
      "rue": "123 rue exemple",
      "ville": "Paris",
      "pays": "France",
      "nom": "Distribution alimentaire",
      "description": "Aide à la distribution",
      "date_action": "2024-01-15",
      "heure_debut": "14:00:00",
      "heure_fin": "17:00:00",
      "recurrence": "Hebdomadaire",
      "responsable_email": "responsable@example.com",
      "nb_participants": 10,
      "genre": "mixte",
      "age": "majeure",
      "created_at": "2024-01-01T10:00:00.000Z"
    }
  ],
  "participants_counts": {
    "1_2024-01-15": 5
  },
  "masked_actions": {
    "1_2024-01-22": true
  },
  "total": 1
}
```

---

#### `POST /api/backoffice/actions`
Crée une nouvelle action.

**Body** :
```json
{
  "nom": "Distribution alimentaire",
  "description": "Aide à la distribution",
  "date_action": "2024-01-15",
  "heure_debut": "14:00",
  "heure_fin": "17:00",
  "rue": "123 rue exemple",
  "ville": "Paris",
  "pays": "France",
  "recurrence": "Hebdomadaire",
  "responsable_email": "responsable@example.com",
  "nb_participants": 10,
  "genre": "mixte",
  "age": "majeure"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Action créée avec succès",
  "id": 1
}
```

**Effet de bord** : Le responsable est automatiquement inscrit à toutes les occurrences générées.

---

#### `PUT /api/backoffice/actions/:id`
Modifie une action existante.

**Body** : Mêmes champs que la création

**Réponse** :
```json
{
  "success": true,
  "message": "Action mise à jour avec succès",
  "responsable_changed": true
}
```

**Effet de bord** : Si le responsable change, l'ancien est désinscrit et le nouveau inscrit automatiquement aux occurrences futures.

---

#### `GET /api/backoffice/actions/:actionId/participants`
Récupère les participants d'une action.

**Query params** :
- `date_action` : Date spécifique pour les actions récurrentes

**Réponse** :
```json
{
  "success": true,
  "participants": [
    {
      "inscription_id": 1,
      "statut": "inscrit",
      "date_action": "2024-01-15",
      "nom": "Dupont",
      "prenom": "Jean",
      "email": "jean@example.com",
      "telephone": "0612345678"
    }
  ],
  "total": 1
}
```

---

#### `POST /api/backoffice/actions/:actionId/mask`
Masque une occurrence d'action récurrente.

**Body** :
```json
{
  "date_action": "2024-01-22"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Action masquée avec succès"
}
```

---

#### `DELETE /api/backoffice/actions/:actionId/mask`
Démasque une occurrence d'action récurrente.

**Query params** :
- `date_action` : Date de l'occurrence à démasquer

**Réponse** :
```json
{
  "success": true,
  "message": "Action démasquée avec succès"
}
```

---

### Gestion Cantine

#### `GET /api/backoffice/cantine/commandes`
Récupère toutes les commandes de repas.

**Query params** :
- `date` : Filtrer par date de livraison
- `zone` : Filtrer par zone
- `statut` : Filtrer par statut (en attente, validée, refusée)

**Réponse** :
```json
{
  "success": true,
  "commandes": [
    {
      "id": 1,
      "email": "beneficiaire@example.com",
      "repas_quantite": 5,
      "date_livraison": "2024-01-15",
      "zone": "Paris 18",
      "statut": "validée",
      "created_at": "2024-01-10T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

#### `GET /api/backoffice/cantine/quotas`
Récupère les quotas de repas définis.

**Réponse** :
```json
{
  "success": true,
  "quotas": [
    {
      "id": 1,
      "date_jour": "2024-01-15",
      "repas_quantite": 100,
      "repas_restants": 45
    }
  ]
}
```

---

#### `POST /api/backoffice/cantine/quotas`
Définit un quota pour une date donnée.

**Body** :
```json
{
  "date_jour": "2024-01-15",
  "repas_quantite": 100
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Quota défini avec succès"
}
```

---

### Cartes Repas (QR Code)

#### `POST /api/backoffice/qrcode/generate`
Génère une nouvelle carte repas QR Code.

**Body** :
```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "nb_beneficiaires": 3
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Carte générée avec succès",
  "qrcode_id": "abc123def456"
}
```

---

#### `GET /api/backoffice/qrcode/list`
Récupère la liste de toutes les cartes repas.

**Réponse** :
```json
{
  "success": true,
  "cards": [
    {
      "id": 1,
      "qrcode_id": "abc123def456",
      "nom": "Dupont",
      "prenom": "Jean",
      "nb_beneficiaires": 3,
      "created_at": "2024-01-01T10:00:00.000Z",
      "last_pickup": "2024-01-15T14:30:00.000Z"
    }
  ],
  "total": 1
}
```

---

#### `GET /api/backoffice/qrcode/pickups`
Récupère l'historique des distributions.

**Query params** :
- `qrcode_id` : Filtrer par carte spécifique
- `start_date` : Date de début
- `end_date` : Date de fin

**Réponse** :
```json
{
  "success": true,
  "pickups": [
    {
      "id": 1,
      "qrcode_id": "abc123def456",
      "pickup_date": "2024-01-15",
      "pickup_time": "14:30:00",
      "benevole_nom": "Martin",
      "benevole_prenom": "Sophie",
      "nb_beneficiaires": 3
    }
  ],
  "total": 1
}
```

---

### Onboarding

#### `GET /api/backoffice/onboarding/completed`
Vérifie si l'onboarding est complété et récupère les préférences.

**Réponse** :
```json
{
  "result": {
    "isOnboarded": true,
    "benevolat": true,
    "cantine": true,
    "suiviVehicule": false
  }
}
```

---

#### `POST /api/backoffice/onboarding/complete`
Complète l'onboarding et enregistre les préférences.

**Body** :
```json
{
  "benevolat": true,
  "cantine": true,
  "suiviVehicule": false
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Préférences enregistrées"
}
```

---

## Structure technique

### Modules Angular

```
modules/backoffice/
├── backoffice-routing.module.ts      # Routes du module
├── backoffice.module.ts              # Déclaration du module
├── services/
│   ├── benevolat-admin.service.ts    # Service API bénévolat
│   ├── cantine-admin.service.ts      # Service API cantine
│   └── onboarding.service.ts         # Service onboarding
└── components/
    ├── sidebar/                      # Menu latéral avec modules
    ├── benevolat-list/               # Liste des bénévoles
    ├── benevolat-actions/            # Création d'action
    ├── benevolat-actions-list/       # Liste des actions
    ├── benevolat-calendar/           # Calendrier
    ├── benevolat-attestations/       # Génération d'attestations
    ├── cantine-commandes/            # Gestion commandes
    ├── cantine-quotas/               # Gestion quotas
    ├── beneficiaires-cartes/         # Gestion cartes repas
    ├── vehicule/                     # Suivi véhicule
    └── infos/                        # Paramètres association
```

### Routes Backend

```
routes/
├── backOffice.js                     # Routes générales backoffice
│   ├── GET /api/backoffice/me
│   ├── GET /api/backoffice/canteInfosCompleted
│   ├── POST /api/backoffice/updateInfosAsso
│   └── GET /api/backoffice/getInfosAsso
├── auth.js                           # Authentification
│   ├── POST /api/backoffice/signin
│   └── POST /api/backoffice/signup
├── benevoles.js                      # Routes bénévolat backoffice
│   ├── GET /api/backoffice/benevoles
│   ├── GET /api/backoffice/benevoles/responsables
│   ├── PATCH /api/backoffice/benevoles/:email/type
│   ├── PATCH /api/backoffice/benevoles/:email
│   ├── GET /api/backoffice/benevoles/:email/actions
│   ├── GET /api/backoffice/actions/list
│   ├── POST /api/backoffice/actions
│   ├── PUT /api/backoffice/actions/:id
│   ├── GET /api/backoffice/actions/:actionId/participants
│   ├── POST /api/backoffice/actions/:actionId/mask
│   └── DELETE /api/backoffice/actions/:actionId/mask
└── cantine.js                        # Routes cantine
    ├── GET /api/backoffice/cantine/commandes
    ├── POST /api/backoffice/cantine/quotas
    ├── GET /api/backoffice/cantine/quotas
    ├── POST /api/backoffice/qrcode/generate
    ├── GET /api/backoffice/qrcode/list
    └── GET /api/backoffice/qrcode/pickups
```

### Base de données

**Table `users`** :
```sql
CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(255),
  `lastName` VARCHAR(255),
  `role` ENUM('association') DEFAULT 'association',
  `siren` VARCHAR(20),
  `is_verified` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Table `Assos`** :
```sql
CREATE TABLE `Assos` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `siren` VARCHAR(20),
  `nom` VARCHAR(255),
  `uri` VARCHAR(255) UNIQUE,
  `logoUrl` TEXT,
  `signataire_nom` VARCHAR(255),
  `signataire_prenom` VARCHAR(255),
  `benevoles_resp_email` VARCHAR(255),
  `adresse` TEXT,
  `code_postal` VARCHAR(10),
  `ville` VARCHAR(255),
  `tel` VARCHAR(20)
);
```

**Table `onboarding_backoffice`** :
```sql
CREATE TABLE `onboarding_backoffice` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `asso_id` INT,
  `benevolat` TINYINT(1) DEFAULT 0,
  `cantine` TINYINT(1) DEFAULT 0,
  `suiviVehicule` TINYINT(1) DEFAULT 0,
  `isOnboarded` TINYINT(1) DEFAULT 0,
  `tutorielDone` TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (asso_id) REFERENCES Assos(id)
);
```

---

## Guards et Sécurité

### Feature Access Guard

Le `feature-access.guard.ts` protège les routes en fonction des modules activés.

**Fonctionnement** :
1. Vérification de l'authentification (JWT dans cookie HttpOnly)
2. Récupération des préférences depuis l'API
3. Vérification que le module demandé est activé
4. Autorisation ou redirection

**Exemple** :
```typescript
{
  path: 'benevolat',
  canActivate: [FeatureAccessGuard],
  data: { feature: 'benevolat' }
}
```

### Authentification

- **Token JWT** : Stocké dans un cookie HTTP-only
- **Expiration** : 1 heure
- **Renouvellement** : Automatique via refresh token
- **Algorithme** : HS256
- **Secret** : Variable d'environnement `JWT_SECRET`

### Autorisations

- **Par module** : Seuls les modules activés sont accessibles
- **Par association** : Chaque admin ne voit que les données de son association
- **Isolation des données** : Filtre automatique par `association_nom` ou `uri`
- **Protection CSRF** : Cookie sameSite='strict'

---

## Intégrations

### Google Sheets

**Synchronisation automatique des bénévoles** :
- **Déclenchement** : Cron quotidien (3h du matin) ou après modification d'un bénévole
- **Données synchronisées** : Nom, prénom, genre, téléphone, statut
- **Direction** : Base de données MySQL → Google Sheets
- **Service Account** : Authentification via JSON credentials
- **API** : Google Sheets API v4

### Mailjet

**Emails transactionnels** :
- Confirmation d'inscription bénévole
- Rappels avant actions (envoi 24h avant)
- Notifications aux responsables (nouvelle inscription)
- Confirmations de désinscription
- Codes OTP pour connexion bénévole

**Templates Mailjet** :
- `BienvenueVolonteer` : Email de bienvenue
- `ReminderAction` : Rappel avant action
- `OTPCode` : Code de vérification

### Trello (Support)

**Système de tickets** :
- Création automatique de cards Trello depuis le widget support
- Catégories : Technique, Admin, Compta, Juridique, Formation
- Assignment automatique selon le département
- Tracking du statut : Nouveau → En attente → Résolu

---

## Monitoring et Logs

### Grafana + Loki

- **Dashboard** : Visualisation des métriques backoffice
- **Logs** : Centralisés via Loki/Promtail
- **Alertes** : Notifications en cas d'erreurs critiques

### Métriques suivies

- Nombre de connexions admins par jour
- Nombre d'actions créées par semaine
- Nombre de commandes cantine validées
- Temps de réponse API
- Taux d'erreurs HTTP

---

[Retour au README principal](../README.md)
