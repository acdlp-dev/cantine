# Backoffice - Documentation

Le Backoffice est l'interface d'administration permettant aux associations de gérer tous les aspects de leur activité : bénévolat, dons, abonnements, cantine solidaire, et suivi de véhicule.

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

Le Backoffice permet aux administrateurs d'association de :
- Gérer les bénévoles et les actions de bénévolat
- Consulter et gérer les dons et abonnements
- Administrer la cantine solidaire (pour certaines associations)
- Suivre l'utilisation des véhicules (si activé)
- Configurer les paramètres de l'association

### Accès

URL : `/backoffice`

Authentification requise : Oui (email + mot de passe)

---

## Modules et Fonctionnalités

Le Backoffice est organisé en plusieurs modules activables selon les besoins de l'association. Chaque module doit être activé lors du processus d'onboarding.

### Module Bénévolat

| Fonctionnalité | Description | Droits requis |
|----------------|-------------|---------------|
| **Consulter la liste des bénévoles** | Voir tous les bénévoles inscrits avec filtres et recherche | Admin |
| **Inscrire un bénévole** | Créer manuellement un compte bénévole | Admin |
| **Modifier un bénévole** | Éditer les informations d'un bénévole (nom, prénom, téléphone, adresse, etc.) | Admin |
| **Changer le type** | Promouvoir un bénévole en responsable ou rétrograder | Admin |
| **Consulter l'historique** | Voir toutes les actions d'un bénévole | Admin |
| **Créer une action** | Créer une nouvelle action de bénévolat (ponctuelle ou récurrente) | Admin |
| **Modifier une action** | Éditer une action existante (nom, date, horaires, responsable, etc.) | Admin |
| **Masquer une occurrence** | Masquer une occurrence spécifique d'une action récurrente | Admin |
| **Démasquer une occurrence** | Rendre visible une occurrence précédemment masquée | Admin |
| **Voir le calendrier** | Visualiser toutes les actions dans un calendrier | Admin |
| **Voir les participants** | Consulter la liste des participants inscrits à une action | Admin |
| **Inscrire un bénévole à une action** | Inscrire manuellement un bénévole depuis le backoffice | Admin |
| **Désinscrire un bénévole** | Retirer un bénévole d'une action | Admin |
| **Générer des attestations** | Créer des attestations de bénévolat pour les heures effectuées | Admin |

**Détails techniques** :
- Les actions récurrentes (quotidiennes, hebdomadaires) génèrent automatiquement des occurrences futures
- Le changement de responsable d'une action déclenche la désinscription automatique de l'ancien responsable et l'inscription du nouveau
- Les actions peuvent être filtrées par genre (mixte, homme, femme) et âge (tous, majeure, mineur)
- Le masquage d'une occurrence la rend invisible pour les bénévoles mais reste visible pour les admins

---

### Module Dons

| Fonctionnalité | Description | Droits requis |
|----------------|-------------|---------------|
| **Consulter les dons** | Voir l'historique de tous les dons reçus | Admin |
| **Filtrer les dons** | Filtrer par période, montant, donateur | Admin |
| **Exporter les dons** | Exporter la liste des dons en CSV/Excel | Admin |
| **Consulter les abonnements** | Voir tous les abonnements mensuels actifs | Admin |
| **Gérer les campagnes** | Créer et gérer des campagnes de dons avec liens personnalisés | Admin |
| **Don hors ligne** | Enregistrer manuellement un don reçu hors plateforme (chèque, espèces) | Admin |
| **Gérer les reçus fiscaux** | Générer, régénérer ou télécharger des reçus fiscaux | Admin |
| **Envoyer les reçus** | Envoyer par email les reçus fiscaux aux donateurs | Admin |

**Détails techniques** :
- Les dons en ligne sont automatiquement enregistrés via Stripe/PayPal
- Les dons hors ligne nécessitent une saisie manuelle complète
- Les reçus fiscaux sont générés automatiquement pour les dons éligibles
- Les campagnes génèrent des liens de don personnalisés avec tracking

---

### Module Cantine

**Note** : Ce module est disponible pour certaines associations uniquement.

| Fonctionnalité | Description | Droits requis |
|----------------|-------------|---------------|
| **Voir les commandes** | Consulter toutes les commandes de repas | Admin Cantine |
| **Gérer les zones de distribution** | Définir et modifier les zones géographiques de distribution | Admin Cantine |
| **Gérer les quotas** | Définir le nombre de repas disponibles par zone et par jour | Admin Cantine |
| **Gérer les associations** | Ajouter/modifier les associations bénéficiaires | Admin Cantine |
| **Renseigner les menus** | Saisir les menus de la semaine | Admin Cantine |
| **Valider les commandes** | Approuver ou refuser les commandes | Admin Cantine |
| **Exporter les commandes** | Exporter la liste des commandes pour préparation | Admin Cantine |

**Cas particulier** : Une association spécifique ("Au Coeur De La Précarité") a accès à un flow complet de gestion cantine admin.

---

### Module Suivi Véhicule

| Fonctionnalité | Description | Droits requis |
|----------------|-------------|---------------|
| **Voir le tableau de bord** | Visualiser les statistiques d'utilisation du véhicule | Admin + Responsables |
| **Enregistrer un trajet** | Saisir les informations d'un déplacement | Admin + Responsables |
| **Consulter l'historique** | Voir tous les trajets effectués | Admin + Responsables |
| **Gérer les pleins** | Enregistrer les pleins de carburant | Admin + Responsables |
| **Calculer les coûts** | Voir les coûts totaux (carburant, entretien, etc.) | Admin |
| **Exporter les données** | Exporter l'historique pour comptabilité | Admin |

**Note** : Ce module doit être activé lors de l'onboarding pour être accessible.

---

### Section Compte

| Fonctionnalité | Description | Droits requis |
|----------------|-------------|---------------|
| **Mes infos** | Consulter et modifier les informations de l'association | Admin |
| **Paramètres** | Configurer les préférences (modules actifs, notifications, etc.) | Admin |
| **Déconnexion** | Se déconnecter du backoffice | Tous |

---

## Onboarding

### Processus d'activation des modules

Lors de la première connexion, l'administrateur passe par un processus d'onboarding pour activer les modules souhaités.

**Étapes** :
1. **Connexion** : Authentification avec email et mot de passe
2. **Écran d'onboarding** :
   - Sélection des modules à activer :
     - ☐ Gestion des dons
     - ☐ Module cantine
     - ☐ Suivi véhicule
     - ☐ Bénévolat
3. **Enregistrement** : Les préférences sont sauvegardées dans la base de données
4. **Accès au backoffice** : Seuls les modules activés sont visibles dans la sidebar

**Modification ultérieure** :
- Les préférences peuvent être modifiées dans la section "Paramètres"
- L'activation/désactivation d'un module prend effet immédiatement

### Vérification de l'onboarding

**Endpoint** : `GET /api/backoffice/onboarding/completed`

**Réponse** :
```json
{
  "result": {
    "isOnboarded": true,
    "donations": true,
    "cantine": false,
    "suiviVehicule": false,
    "benevolat": true
  }
}
```

---

## API Endpoints

### Authentification Backoffice

#### `POST /api/backoffice/auth/signin`
Authentifie un administrateur d'association.

**Body** :
```json
{
  "email": "admin@association.com",
  "password": "MotDePasse123!"
}
```

**Réponse** :
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "email": "admin@association.com",
    "uri": "mon-association",
    "nameAsso": "Mon Association"
  }
}
```

---

### Gestion des bénévoles

#### `GET /api/backoffice/benevoles`
Récupère la liste de tous les bénévoles de l'association.

**Headers** :
```
Authorization: Bearer {jwt_token}
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

**Headers** :
```
Authorization: Bearer {jwt_token}
```

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
Modifie le type d'un bénévole (promotion/rétrogradation).

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Body** :
```json
{
  "type": "responsable"
}
```

**Valeurs possibles** : `bénévole`, `responsable`

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

**Headers** :
```
Authorization: Bearer {jwt_token}
```

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

**Headers** :
```
Authorization: Bearer {jwt_token}
```

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
      "heure_fin": "17:00:00"
    }
  ],
  "total": 1
}
```

---

### Gestion des actions

#### `GET /api/backoffice/actions/list`
Récupère toutes les actions de l'association.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Réponse** :
```json
{
  "success": true,
  "actions": [
    {
      "id": 1,
      "association_nom": "mon-asso",
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

**Headers** :
```
Authorization: Bearer {jwt_token}
```

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

**Headers** :
```
Authorization: Bearer {jwt_token}
```

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

**Headers** :
```
Authorization: Bearer {jwt_token}
```

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

**Headers** :
```
Authorization: Bearer {jwt_token}
```

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

**Headers** :
```
Authorization: Bearer {jwt_token}
```

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

### Onboarding

#### `GET /api/backoffice/onboarding/completed`
Vérifie si l'onboarding est complété et récupère les préférences.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Réponse** :
```json
{
  "result": {
    "isOnboarded": true,
    "donations": true,
    "cantine": false,
    "suiviVehicule": false,
    "benevolat": true
  }
}
```

---

#### `POST /api/backoffice/onboarding/complete`
Complète l'onboarding et enregistre les préférences.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Body** :
```json
{
  "donations": true,
  "cantine": false,
  "suiviVehicule": false,
  "benevolat": true
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
│   └── onboarding.service.ts         # Service onboarding
└── components/
    ├── sidebar/                      # Menu latéral avec modules
    ├── benevolat-list/               # Liste des bénévoles
    ├── benevolat-actions/            # Création d'action
    ├── benevolat-actions-list/       # Liste des actions
    ├── benevolat-calendar/           # Calendrier
    ├── benevolat-attestations/       # Génération d'attestations
    ├── don-hors-ligne/               # Saisie don hors ligne
    └── ... (autres composants)
```

### Routes Backend

```
routes/
├── backOffice.js                     # Routes générales backoffice
│   ├── POST /api/backoffice/auth/signin
│   ├── GET /api/backoffice/onboarding/completed
│   └── POST /api/backoffice/onboarding/complete
└── benevoles.js                      # Routes bénévolat backoffice
    ├── GET /api/backoffice/benevoles
    ├── GET /api/backoffice/benevoles/responsables
    ├── PATCH /api/backoffice/benevoles/:email/type
    ├── PATCH /api/backoffice/benevoles/:email
    ├── GET /api/backoffice/benevoles/:email/actions
    ├── GET /api/backoffice/actions/list
    ├── POST /api/backoffice/actions
    ├── PUT /api/backoffice/actions/:id
    ├── GET /api/backoffice/actions/:actionId/participants
    ├── POST /api/backoffice/actions/:actionId/mask
    └── DELETE /api/backoffice/actions/:actionId/mask
```

### Base de données

**Table `assos_backoffice_users`** (simplifié) :
```sql
CREATE TABLE `assos_backoffice_users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255) UNIQUE,
  `password` VARCHAR(255),
  `uri` VARCHAR(255),
  `nameAsso` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Table `backoffice_preferences`** (simplifié) :
```sql
CREATE TABLE `backoffice_preferences` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `association_uri` VARCHAR(255) UNIQUE,
  `isOnboarded` TINYINT(1) DEFAULT 0,
  `donations` TINYINT(1) DEFAULT 0,
  `cantine` TINYINT(1) DEFAULT 0,
  `suiviVehicule` TINYINT(1) DEFAULT 0,
  `benevolat` TINYINT(1) DEFAULT 0,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Guards et Sécurité

### Feature Access Guard

Le `feature-access.guard.ts` protège les routes en fonction des modules activés.

**Fonctionnement** :
1. Vérification de l'authentification (token JWT)
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
- **Expiration** : 24 heures
- **Renouvellement** : Automatique à chaque requête

### Autorisations

- **Par module** : Seuls les modules activés sont accessibles
- **Par association** : Chaque admin ne voit que les données de son association
- **Isolation des données** : Filtre automatique par `association_nom` ou `uri`

---

## Intégrations

### Google Sheets

**Synchronisation automatique des bénévoles** :
- Déclenchement : Cron quotidien ou après déblocage d'un bénévole
- Données synchronisées : Nom, prénom, genre, téléphone, statut
- Direction : Base de données → Google Sheets

### Mailjet

**Emails transactionnels** :
- Confirmation d'inscription bénévole
- Rappels avant actions (24h)
- Notifications aux responsables
- Confirmations de désinscription

---

[Retour au README principal](../README.md)
