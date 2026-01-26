# Espace Bénévole - Documentation

L'Espace Bénévole est une interface dédiée permettant aux bénévoles de s'inscrire aux actions organisées par les associations, de consulter le calendrier des événements et de gérer leur participation.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Personas et Droits](#personas-et-droits)
3. [Fonctionnalités](#fonctionnalités)
4. [Authentification](#authentification)
5. [API Endpoints](#api-endpoints)
6. [Structure technique](#structure-technique)

---

## Vue d'ensemble

### Objectif

L'Espace Bénévole permet aux bénévoles de :
- Consulter les actions de bénévolat disponibles
- S'inscrire et se désinscrire des actions
- Voir leur tableau de bord avec statistiques personnelles
- Accéder au groupe WhatsApp (pour les bénévoles confirmés)
- Gérer les présences (pour les responsables)

### Accès

URL : `/benevolat`

Authentification requise : Oui (via OTP email)

---

## Personas et Droits

L'application gère trois types de bénévoles avec des niveaux de privilèges différents :

| Persona | Statut | Droits et Fonctionnalités |
|---------|--------|---------------------------|
| **Bénévole Restreint** | `restreint` (défaut) | • Consulter les actions filtrées selon son profil (âge/genre)<br>• S'inscrire à une action<br>• Se désinscrire d'une action<br>• Voir son tableau de bord personnel<br>• Consulter ses statistiques (actions inscrites, effectuées, manquées)<br>• Recevoir des rappels par email 24h avant une action |
| **Bénévole Confirmé** | `confirmé` | • Tous les droits du Bénévole Restreint<br>• **Voir le bandeau WhatsApp** dans le tableau de bord<br>• **Rejoindre le groupe WhatsApp** de l'association<br>• Déblocage automatique après participation à une première action marquée "présent" |
| **Responsable** | Type: `responsable` | • Tous les droits du Bénévole Confirmé<br>• **Faire l'appel** (marquer présent/absent) pour les actions dont il est responsable<br>• **Voir la liste complète des participants** d'une action<br>• **Accès aux menus de suivi du véhicule** (si activé pour l'association)<br>• Inscription automatique aux actions qu'il crée/gère |

### Évolution du statut

- **Restreint → Confirmé** : Déblocage automatique lorsqu'un responsable marque le bénévole comme "présent" à une action
- **Restreint/Confirmé → Responsable** : Promotion manuelle par un administrateur via le backoffice

---

## Fonctionnalités

### 1. Inscription

**Flux complet** :
1. Le bénévole saisit son email
2. Réception d'un code OTP par email (valide 10 minutes)
3. Vérification du code OTP
4. Si nouveau bénévole : formulaire d'inscription complet
5. Si bénévole existant : connexion automatique

**Données collectées lors de l'inscription** :
- Nom, prénom
- Email (utilisé comme identifiant)
- Téléphone
- Adresse complète (rue, ville, code postal, pays)
- Date de naissance (pour filtrage des actions par âge)
- Genre (pour filtrage des actions par genre)
- Possession d'un véhicule (oui/non)
- Source de connaissance de l'association
- Métiers et compétences

### 2. Tableau de bord

Le tableau de bord affiche :
- **Statistiques personnelles** :
  - Nombre d'actions inscrites
  - Nombre d'actions effectuées (marquées "présent")
  - Nombre d'actions manquées (marquées "absent")
- **Bandeau WhatsApp** (uniquement pour bénévoles confirmés et responsables) :
  - Lien vers le groupe WhatsApp de l'association
  - Message d'invitation personnalisé
- **Statut du bénévole** : Restreint, Confirmé ou Responsable

### 3. Consultation des actions

Les bénévoles peuvent consulter toutes les actions disponibles, automatiquement filtrées selon :
- **Genre** : Actions mixtes ou correspondant au genre du bénévole
- **Âge** : Actions pour tous, majeurs uniquement, ou mineurs uniquement

**Informations affichées pour chaque action** :
- Nom de l'action
- Date et horaires (début - fin)
- Lieu (adresse complète)
- Description
- Nombre de places disponibles / nombre total
- Logo de l'association
- Email et coordonnées du responsable
- Récurrence (ponctuelle, quotidienne, hebdomadaire)

**Actions récurrentes** :
- Les actions récurrentes génèrent automatiquement des occurrences futures
- Quotidienne : 365 jours
- Hebdomadaire : 52 semaines

### 4. Inscription aux actions

**Processus** :
1. Le bénévole clique sur une action pour s'inscrire
2. Vérification des places disponibles
3. Inscription enregistrée
4. **Email de confirmation** envoyé au bénévole avec :
   - Détails de l'action
   - Fichier ICS pour ajout au calendrier
5. **Email de notification** envoyé au responsable avec les coordonnées du nouveau participant

**Rappels automatiques** :
- Un email de rappel est automatiquement envoyé **24h avant l'action** à tous les participants inscrits
- Envoi via un cron quotidien à 14h

### 5. Désinscription

**Désinscription simple** :
- Le bénévole peut se désinscrire d'une action ponctuelle ou d'une occurrence spécifique
- Emails envoyés au bénévole (confirmation) et au responsable (notification)

**Désinscription groupée** (actions récurrentes) :
- Pour les actions récurrentes, possibilité de se désinscrire de toutes les occurrences futures en un clic
- Le système supprime automatiquement toutes les inscriptions à partir de la date sélectionnée

### 6. Calendrier

Le calendrier affiche :
- Toutes les actions disponibles
- Les actions auxquelles le bénévole est inscrit (marquées différemment)
- Filtres : Toutes les actions / Mes inscriptions

### 7. Gestion des présences (Responsables uniquement)

Les responsables peuvent :
- Voir la liste complète des participants pour leurs actions
- Marquer chaque participant comme "présent" ou "absent"
- Le marquage "présent" déclenche automatiquement :
  - Le déblocage du bénévole (passage de "restreint" à "confirmé")
  - La synchronisation avec Google Sheets

---

## Authentification

### Flux OTP (One-Time Password)

L'authentification se fait via un code à usage unique envoyé par email :

1. **Étape 1 : Saisie de l'email**
   - Le bénévole saisit son adresse email
   - Le système vérifie si l'email existe déjà

2. **Étape 2 : Génération et envoi du code OTP**
   - Un code à 6 chiffres est généré aléatoirement
   - Le code est stocké dans la base de données avec une expiration de 10 minutes
   - Le code est envoyé par email via Mailjet

3. **Étape 3 : Vérification du code**
   - Le bénévole saisit le code reçu
   - Le système vérifie que le code correspond et n'a pas expiré
   - Si valide : génération d'un token JWT

4. **Étape 4 : Accès à l'espace**
   - Si nouveau bénévole : redirection vers le formulaire d'inscription complet
   - Si bénévole existant : redirection vers le tableau de bord

### Sécurité

- **Token JWT** : Stocké dans un cookie HTTP-only, sécurisé
- **Expiration** : Les codes OTP expirent après 10 minutes
- **Rate limiting** : Protection contre les tentatives multiples

---

## API Endpoints

### Authentification

#### `POST /api/auth/volunteer/send-otp`
Génère et envoie un code OTP par email.

**Body** :
```json
{
  "email": "benevole@example.com",
  "asso": "nom-association"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Code OTP envoyé",
  "email": "benevole@example.com"
}
```

---

#### `POST /api/auth/volunteer/verify-otp`
Vérifie le code OTP et authentifie le bénévole.

**Body** :
```json
{
  "email": "benevole@example.com",
  "otp": "123456",
  "asso": "nom-association"
}
```

**Réponse** :
```json
{
  "success": true,
  "token": "jwt_token_here",
  "isNewVolunteer": false,
  "volunteer": {
    "id": 1,
    "email": "benevole@example.com",
    "nom": "Dupont",
    "prenom": "Jean",
    "type": "bénévole",
    "statut": "confirmé"
  }
}
```

---

#### `POST /api/auth/volunteer/complete-signup`
Complète l'inscription d'un nouveau bénévole.

**Body** :
```json
{
  "email": "benevole@example.com",
  "nom": "Dupont",
  "prenom": "Jean",
  "telephone": "0612345678",
  "adresse": "123 rue de la Paix",
  "ville": "Paris",
  "code_postal": "75001",
  "pays": "France",
  "date_naissance": "1990-01-01",
  "genre": "homme",
  "vehicule": "oui",
  "source_connaissance": "Réseaux sociaux",
  "metiers_competences": "Informatique",
  "asso": "nom-association"
}
```

**Réponse** :
```json
{
  "success": true,
  "volunteerId": "1",
  "tracking": "tracking_id",
  "message": "Inscription réussie"
}
```

---

### Actions de bénévolat

#### `GET /api/benevolat/actions/:associationName`
Récupère toutes les actions d'une association, filtrées selon le profil du bénévole.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Query params** :
- `filter` : `all` (défaut) ou `inscribed` (uniquement les actions où le bénévole est inscrit)

**Réponse** :
```json
{
  "success": true,
  "actions": [
    {
      "id": 1,
      "association_nom": "mon-asso",
      "association_logo_url": "https://example.com/logo.png",
      "nom": "Distribution alimentaire",
      "description": "Aide à la distribution",
      "date_action": "2024-01-15",
      "heure_debut": "14:00:00",
      "heure_fin": "17:00:00",
      "rue": "123 rue exemple",
      "ville": "Paris",
      "pays": "France",
      "recurrence": "Hebdomadaire",
      "responsable_email": "responsable@example.com",
      "responsable_nom": "Martin",
      "responsable_prenom": "Sophie",
      "responsable_telephone": "0612345678",
      "nb_participants": 10,
      "genre": "mixte",
      "age": "majeure"
    }
  ],
  "inscriptions": [
    {
      "inscription_id": 1,
      "action_id": 1,
      "date_action": "2024-01-15"
    }
  ],
  "participants_counts": {
    "1_2024-01-15": 5
  },
  "masked_actions": {
    "1_2024-01-22": true
  },
  "total": 1,
  "benevole": {
    "id": 1,
    "email": "benevole@example.com",
    "genre": "homme",
    "age": 30
  }
}
```

---

#### `POST /api/benevolat/inscription`
Inscrit un bénévole à une action.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Body** :
```json
{
  "action_id": 1,
  "date_action": "2024-01-15"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Inscription réussie",
  "inscription_id": 1,
  "action": {
    "id": 1,
    "nom": "Distribution alimentaire",
    "date_action": "2024-01-15",
    "places_restantes": 5
  }
}
```

**Emails automatiques envoyés** :
1. Email au bénévole (confirmation + fichier ICS)
2. Email au responsable (notification + coordonnées du bénévole)

---

#### `DELETE /api/benevolat/desinscription/:inscriptionId`
Désinscrit un bénévole d'une action.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Désinscription réussie",
  "action": {
    "nom": "Distribution alimentaire",
    "date_action": "2024-01-15"
  }
}
```

**Emails automatiques envoyés** :
1. Email au bénévole (confirmation de désinscription)
2. Email au responsable (notification de désinscription)

---

#### `DELETE /api/benevolat/desinscription/:inscriptionId/future-occurrences`
Désinscrit un bénévole de toutes les occurrences futures d'une action récurrente.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Bénévole désinscrit de 12 occurrence(s)",
  "count": 12,
  "date_debut": "2024-01-15",
  "date_fin": "2024-04-01",
  "action": {
    "nom": "Distribution alimentaire"
  }
}
```

---

### Gestion des participants (Responsables)

#### `GET /api/benevolat/actions/:actionId/participants`
Récupère la liste des participants d'une action (réservé aux responsables).

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Query params** :
- `date_action` : Date spécifique pour les actions récurrentes (format YYYY-MM-DD)

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
      "email": "jean.dupont@example.com",
      "telephone": "0612345678"
    }
  ],
  "total": 1
}
```

---

#### `PATCH /api/benevolat/actions/participants/:inscriptionId/statut`
Met à jour le statut d'un participant (réservé aux responsables).

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Body** :
```json
{
  "statut": "présent"
}
```

**Valeurs possibles** : `inscrit`, `présent`, `absent`

**Réponse** :
```json
{
  "success": true,
  "message": "Statut mis à jour avec succès",
  "statut": "présent"
}
```

**Effet de bord** :
- Si statut = `présent` et bénévole = `restreint` : déblocage automatique vers `confirmé`
- Synchronisation automatique avec Google Sheets

---

### Statistiques

#### `GET /api/benevolat/stats`
Récupère les statistiques personnelles du bénévole connecté.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Réponse** :
```json
{
  "success": true,
  "nom": "Dupont",
  "prenom": "Jean",
  "statut": "confirmé",
  "genre": "homme",
  "type": "bénévole",
  "inscrites": 5,
  "effectuees": 3,
  "manquees": 1
}
```

---

## Structure technique

### Modules Angular

```
modules/benevolat/
├── benevolat-routing.module.ts       # Routes du module
├── benevolat.module.ts                # Déclaration du module
├── models/
│   ├── volunteer.model.ts            # Modèles TypeScript
│   └── action.model.ts
├── services/
│   ├── volunteer.service.ts          # Service API bénévoles
│   └── action.service.ts             # Service API actions
└── pages/
    ├── volunteer-email-step/         # Étape 1 : Saisie email
    ├── volunteer-otp-verification/   # Étape 2 : Vérification OTP
    ├── volunteer-complete-signup/    # Étape 3 : Formulaire complet
    ├── volunteer-signin/             # Page de connexion
    ├── volunteer-dashboard/          # Tableau de bord
    ├── volunteer-actions/            # Liste des actions
    ├── volunteer-forgot-password/    # Mot de passe oublié
    ├── volunteer-new-password/       # Nouveau mot de passe
    ├── volunteer-form/               # Formulaire d'édition
    └── volunteer-verify/             # Vérification email
```

### Routes Backend

```
routes/benevoles.js
├── Authentification
│   ├── POST /api/auth/volunteer/send-otp
│   ├── POST /api/auth/volunteer/verify-otp
│   └── POST /api/auth/volunteer/complete-signup
├── Actions
│   ├── GET /api/benevolat/actions/:associationName
│   ├── POST /api/benevolat/inscription
│   ├── DELETE /api/benevolat/desinscription/:inscriptionId
│   └── DELETE /api/benevolat/desinscription/:inscriptionId/future-occurrences
├── Participants (Responsables)
│   ├── GET /api/benevolat/actions/:actionId/participants
│   └── PATCH /api/benevolat/actions/participants/:inscriptionId/statut
└── Statistiques
    └── GET /api/benevolat/stats
```

### Base de données

**Table `benevoles`** :
```sql
CREATE TABLE `benevoles` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `association_nom` VARCHAR(255),
  `type` ENUM('bénévole', 'responsable') DEFAULT 'bénévole',
  `statut` ENUM('restreint', 'confirmé') DEFAULT 'restreint',
  `nom` VARCHAR(255),
  `prenom` VARCHAR(255),
  `email` VARCHAR(255) UNIQUE,
  `telephone` VARCHAR(20),
  `adresse` TEXT,
  `ville` VARCHAR(255),
  `code_postal` VARCHAR(10),
  `pays` VARCHAR(255),
  `age` INT,
  `date_naissance` DATE,
  `genre` ENUM('homme', 'femme', 'autre'),
  `vehicule` ENUM('oui', 'non'),
  `source_connaissance` VARCHAR(255),
  `metiers_competences` TEXT,
  `otp_code` VARCHAR(6),
  `otp_expiration` BIGINT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Table `actions`** :
```sql
CREATE TABLE `actions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `association_nom` VARCHAR(255),
  `nom` VARCHAR(255),
  `description` TEXT,
  `date_action` DATE,
  `heure_debut` TIME,
  `heure_fin` TIME,
  `rue` VARCHAR(255),
  `ville` VARCHAR(255),
  `pays` VARCHAR(255),
  `recurrence` ENUM('Aucune', 'Quotidienne', 'Hebdomadaire'),
  `responsable_email` VARCHAR(255),
  `nb_participants` INT DEFAULT 6,
  `genre` ENUM('mixte', 'homme', 'femme'),
  `age` ENUM('tous', 'majeure', 'mineur'),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Table `Benevoles_Actions`** :
```sql
CREATE TABLE `Benevoles_Actions` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `benevole_id` INT,
  `action_id` INT,
  `date_action` DATE,
  `statut` ENUM('inscrit', 'présent', 'absent') DEFAULT 'inscrit',
  `relance_email` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`benevole_id`) REFERENCES `benevoles`(`id`),
  FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`),
  UNIQUE KEY `unique_inscription` (`benevole_id`, `action_id`, `date_action`)
);
```

**Table `Actions_Masquees`** :
```sql
CREATE TABLE `Actions_Masquees` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `action_id` INT,
  `date_masquee` DATE,
  `association_nom` VARCHAR(255),
  FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`),
  UNIQUE KEY `unique_masked` (`action_id`, `date_masquee`)
);
```

---

## Tâches automatisées (Cron)

### Rappels quotidiens

**Endpoint** : `GET /api/benevolat/cron/send-reminders`

**Fréquence** : Tous les jours à 14h

**Fonctionnement** :
- Récupère toutes les inscriptions pour le lendemain
- Envoie un email de rappel à chaque bénévole inscrit
- Marque l'inscription avec la date du rappel pour éviter les doublons

### Synchronisation Google Sheets

**Endpoint** : `GET /api/benevolat/cron/sync-to-sheets`

**Fréquence** : Configurable (recommandé : quotidien)

**Fonctionnement** :
- Récupère tous les bénévoles de la base de données
- Synchronise avec le Google Sheet associé
- Met à jour les statuts et informations

---

[Retour au README principal](../README.md)
