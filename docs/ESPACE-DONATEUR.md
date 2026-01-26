# Espace Donateur - Documentation

L'Espace Donateur est une interface permettant aux donateurs de consulter l'historique de leurs dons, gérer leurs abonnements mensuels et télécharger leurs reçus fiscaux.

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

L'Espace Donateur permet aux donateurs de :
- Consulter l'historique complet de leurs dons
- Gérer leurs abonnements mensuels
- Modifier ou annuler leurs abonnements
- Télécharger leurs reçus fiscaux
- Mettre à jour leurs informations personnelles

### Accès

URL : `/dashboard`

Authentification requise : Oui (email + mot de passe)

---

## Personas et Droits

| Persona | Droits et Fonctionnalités |
|---------|---------------------------|
| **Donateur** | • Consulter l'historique de ses dons ponctuels<br>• Voir le détail de chaque don (montant, date, association)<br>• Télécharger les reçus fiscaux disponibles<br>• Consulter la liste de ses abonnements mensuels actifs<br>• Voir les détails de chaque abonnement (montant, date de prochaine récurrence, association)<br>• Modifier un abonnement via le portail Stripe<br>• Annuler un abonnement<br>• Mettre à jour ses informations personnelles (nom, prénom, email, mot de passe)<br>• Se déconnecter |

### Notes importantes

- **Un seul type d'utilisateur** : Tous les donateurs ont les mêmes droits
- **Espace personnel** : Chaque donateur ne voit que ses propres dons et abonnements
- **Sécurité** : Les données sensibles (carte bancaire) sont gérées par Stripe, jamais stockées dans l'application

---

## Fonctionnalités

### 1. Inscription et création de compte

**Flux complet** :
1. Le donateur remplit le formulaire d'inscription
2. Saisie des informations : email, mot de passe, nom, prénom
3. Validation du format email et de la complexité du mot de passe
4. Vérification que l'email n'existe pas déjà
5. Hachage sécurisé du mot de passe (bcrypt)
6. Création du compte dans la base de données
7. Envoi d'un email de vérification avec un lien
8. Le donateur clique sur le lien pour activer son compte
9. Redirection vers la page de connexion

**Données collectées** :
- Email (identifiant unique)
- Mot de passe (haché)
- Nom de famille
- Prénom
- Date de création du compte

### 2. Connexion (Sign-In)

**Flux** :
1. Le donateur saisit son email et mot de passe
2. Vérification des identifiants
3. Génération d'un token JWT en cas de succès
4. Stockage du token dans un cookie HTTP-only sécurisé
5. Redirection vers le tableau de bord

**Sécurité** :
- Mot de passe haché avec bcrypt
- Token JWT avec expiration
- Cookie HTTP-only (protection contre XSS)
- Rate limiting pour prévenir les attaques par force brute

### 3. Tableau de bord - Mes Dons

Le tableau de bord affiche l'historique complet des dons ponctuels effectués par le donateur.

**Informations affichées pour chaque don** :
- Nom de l'association bénéficiaire
- Montant du don (en euros)
- Date du don
- Lien de téléchargement du reçu fiscal (si disponible)

**Tri et filtrage** :
- Affichage par ordre chronologique inverse (les plus récents en premier)
- Recherche possible par nom d'association
- Filtrage par période (année, mois)

**Format du tableau** :
| Association | Montant | Date | Reçu Fiscal |
|-------------|---------|------|-------------|
| Association A | 50 € | 01/12/2023 | [Télécharger] |
| Association B | 100 € | 15/11/2023 | [Télécharger] |

### 4. Mes Abonnements

Cette section affiche tous les abonnements mensuels actifs du donateur.

**Informations affichées pour chaque abonnement** :
- Nom de l'association bénéficiaire
- Montant mensuel (en euros)
- Date de la prochaine récurrence
- Statut de l'abonnement (actif, annulé, expiré)

**Actions disponibles** :
- **Modifier l'abonnement** : Ouvre le portail Stripe pour mettre à jour le mode de paiement
- **Annuler l'abonnement** : Annule immédiatement l'abonnement (avec confirmation)

**Format des cartes d'abonnement** :
```
┌─────────────────────────────────────┐
│ Association A                       │
│ 20 € / mois                        │
│ Prochaine récurrence : 15/01/2024  │
│                                     │
│ [Modifier]  [Annuler]              │
└─────────────────────────────────────┘
```

### 5. Modification d'un abonnement

**Flux** :
1. Le donateur clique sur "Modifier"
2. Génération d'une session Stripe Billing Portal
3. Redirection vers le portail Stripe
4. Le donateur peut modifier :
   - Son mode de paiement
   - Ses informations de facturation
5. Retour automatique vers l'Espace Donateur après modification

**Important** : Le montant de l'abonnement ne peut pas être modifié (doit être annulé puis recréé)

### 6. Annulation d'un abonnement

**Flux** :
1. Le donateur clique sur "Annuler"
2. Affichage d'une boîte de dialogue de confirmation
3. Si confirmé :
   - Appel API pour annuler l'abonnement dans Stripe
   - Suppression de l'abonnement de la base de données
   - Actualisation de la liste des abonnements
4. Message de confirmation affiché

**Effet** :
- L'abonnement est immédiatement annulé
- Aucun prélèvement futur ne sera effectué
- Les dons déjà effectués restent visibles dans l'historique

### 7. Téléchargement des reçus fiscaux

**Fonctionnement** :
- Un lien de téléchargement est disponible pour chaque don ayant un reçu
- Le clic sur le lien génère et télécharge le PDF du reçu fiscal
- Le reçu contient :
  - Informations du donateur (nom, prénom, adresse)
  - Informations de l'association
  - Montant du don
  - Date du don
  - Mention légale pour la déduction fiscale

**Format du reçu** : PDF généré dynamiquement

### 8. Gestion du profil

Le donateur peut mettre à jour ses informations personnelles :
- Nom
- Prénom
- Email
- Mot de passe (avec confirmation)

**Validation** :
- L'email doit être valide et unique
- Le nouveau mot de passe doit respecter les critères de sécurité
- Confirmation requise pour le changement de mot de passe

### 9. Mot de passe oublié

**Flux de réinitialisation** :
1. Le donateur clique sur "Mot de passe oublié"
2. Saisie de son email
3. Réception d'un email avec un lien de réinitialisation (token)
4. Le lien est valide pendant 1 heure
5. Le donateur clique sur le lien et saisit un nouveau mot de passe
6. Le mot de passe est mis à jour
7. Redirection vers la page de connexion

### 10. Déconnexion

- Suppression du cookie d'authentification
- Redirection vers la page de connexion
- Session terminée côté serveur

---

## Authentification

### Flux d'inscription (Sign-Up)

**Étapes** :
1. **Formulaire d'inscription** :
   - Email
   - Mot de passe (minimum 8 caractères, avec majuscule, minuscule, chiffre)
   - Confirmation du mot de passe
   - Nom
   - Prénom

2. **Validation backend** :
   - Vérification du format email
   - Vérification de la complexité du mot de passe
   - Vérification que l'email n'existe pas déjà

3. **Création du compte** :
   - Hachage du mot de passe avec bcrypt (salt rounds : 10)
   - Génération d'un token de vérification
   - Enregistrement dans la table `users`
   - `is_verified` = 0 (non vérifié)

4. **Envoi de l'email de vérification** :
   - Email contenant un lien avec le token
   - Le token expire après 24 heures

5. **Vérification de l'email** :
   - Le donateur clique sur le lien
   - Le backend valide le token
   - `is_verified` = 1
   - Redirection vers la page de connexion

### Flux de connexion (Sign-In)

**Étapes** :
1. **Formulaire de connexion** :
   - Email
   - Mot de passe

2. **Validation** :
   - Vérification de l'existence de l'email
   - Vérification que le compte est vérifié (`is_verified` = 1)
   - Comparaison du mot de passe haché avec bcrypt

3. **Génération du token JWT** :
   - Payload : `{ id, email, firstName, lastName }`
   - Secret : Variable d'environnement `JWT_SECRET`
   - Expiration : 24 heures

4. **Stockage du token** :
   - Cookie HTTP-only nommé `token`
   - Options : `httpOnly: true`, `secure: true` (en production), `sameSite: 'strict'`

5. **Redirection** :
   - Vers le tableau de bord (`/dashboard`)

### Flux de mot de passe oublié

**Étapes** :
1. **Demande de réinitialisation** :
   - Le donateur saisit son email
   - Génération d'un token de réinitialisation
   - Stockage dans la table `users` (`reset_token`, `token_expiry`)
   - Envoi d'un email avec le lien

2. **Validation du token** :
   - Le donateur clique sur le lien
   - Vérification que le token existe et n'a pas expiré

3. **Saisie du nouveau mot de passe** :
   - Formulaire avec nouveau mot de passe et confirmation
   - Validation de la complexité

4. **Mise à jour** :
   - Hachage du nouveau mot de passe
   - Mise à jour dans la base de données
   - Suppression du `reset_token`
   - Redirection vers la page de connexion

---

## API Endpoints

### Authentification

#### `POST /api/signup`
Crée un nouveau compte donateur.

**Body** :
```json
{
  "email": "donateur@example.com",
  "password": "MotDePasse123!",
  "firstName": "Jean",
  "lastName": "Dupont"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Compte créé avec succès. Veuillez vérifier votre email.",
  "userId": 1
}
```

---

#### `GET /api/verify-email/:token`
Vérifie l'email du donateur via le token.

**Réponse** :
```json
{
  "success": true,
  "message": "Email vérifié avec succès"
}
```

---

#### `POST /api/signin`
Authentifie un donateur.

**Body** :
```json
{
  "email": "donateur@example.com",
  "password": "MotDePasse123!"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Connexion réussie",
  "user": {
    "id": 1,
    "email": "donateur@example.com",
    "firstName": "Jean",
    "lastName": "Dupont"
  }
}
```

**Cookie** : Token JWT stocké dans un cookie HTTP-only

---

#### `POST /api/request-password-reset`
Demande une réinitialisation de mot de passe.

**Body** :
```json
{
  "email": "donateur@example.com"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Email de réinitialisation envoyé"
}
```

---

#### `POST /api/reset-password`
Réinitialise le mot de passe avec le token.

**Body** :
```json
{
  "token": "reset_token_here",
  "newPassword": "NouveauMotDePasse123!"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Mot de passe réinitialisé avec succès"
}
```

---

#### `POST /api/logout`
Déconnecte le donateur.

**Réponse** :
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

### Dons

#### `POST /api/dons`
Récupère l'historique des dons d'un donateur.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Body** :
```json
{
  "email": "donateur@example.com"
}
```

**Réponse** :
```json
{
  "results": [
    {
      "id": 1,
      "asso": "Association A",
      "montant": 50,
      "ajout": "2023-12-01",
      "recu_fiscal_url": "/api/recus/download/1"
    },
    {
      "id": 2,
      "asso": "Association B",
      "montant": 100,
      "ajout": "2023-11-15",
      "recu_fiscal_url": "/api/recus/download/2"
    }
  ]
}
```

---

### Abonnements

#### `POST /api/getSubscriptionsByEmail`
Récupère les abonnements actifs d'un donateur.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Body** :
```json
{
  "email": "donateur@example.com"
}
```

**Réponse** :
```json
{
  "results": [
    {
      "id": 1,
      "asso": "Association A",
      "montant": 20,
      "recurrence": "2023-12-15",
      "subscriptionId": "sub_123456789",
      "status": "active"
    }
  ]
}
```

---

#### `POST /api/cancel-subscription`
Annule un abonnement actif.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Body** :
```json
{
  "asso": "Association A",
  "subscriptionId": "sub_123456789"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Souscription annulée avec succès."
}
```

---

#### `POST /api/create-billing-portal-session`
Crée une session Stripe Billing Portal pour modifier un abonnement.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Body** :
```json
{
  "customerId": "cus_123456789",
  "returnUrl": "https://myamana.fr/dashboard/abonnements"
}
```

**Réponse** :
```json
{
  "success": true,
  "url": "https://billing.stripe.com/session/xyz123"
}
```

---

### Reçus fiscaux

#### `GET /api/recus/download/:donId`
Télécharge le reçu fiscal d'un don.

**Headers** :
```
Authorization: Bearer {jwt_token}
```

**Réponse** : Fichier PDF en téléchargement

---

## Structure technique

### Modules Angular

```
modules/dashboard/
├── dashboard-routing.module.ts       # Routes du module
├── dashboard.module.ts               # Déclaration du module
├── models/
│   └── nft.ts                        # Modèles (dons, abonnements)
├── services/
│   └── dons.service.ts               # Service API dons et abonnements
├── components/
│   └── nft/
│       ├── nft-auctions-table/       # Tableau des dons
│       ├── nft-auctions-table-item/  # Ligne de don
│       └── nft-single-card/          # Carte d'abonnement
└── pages/
    └── nft/
        └── nft.component.ts          # Page abonnements
```

### Routes Backend

```
routes/
├── auth.js                           # Authentification
│   ├── POST /api/signup
│   ├── POST /api/signin
│   ├── POST /api/logout
│   ├── GET /api/verify-email/:token
│   ├── POST /api/request-password-reset
│   └── POST /api/reset-password
├── dons.js                           # Dons
│   └── POST /api/dons
├── subscriptions.js                  # Abonnements
│   ├── POST /api/getSubscriptionsByEmail
│   ├── POST /api/cancel-subscription
│   └── POST /api/create-billing-portal-session
└── recus.js                          # Reçus fiscaux
    └── GET /api/recus/download/:donId
```

### Base de données

**Table `users`** :
```sql
CREATE TABLE `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(255) NOT NULL,
  `lastName` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `verification_token` VARCHAR(64),
  `verification_token_expiry` VARCHAR(64),
  `reset_token` VARCHAR(64),
  `token_expiry` BIGINT,
  `is_verified` TINYINT(1) DEFAULT 0
);
```

**Table `dons`** (simplifié) :
```sql
CREATE TABLE `dons` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255),
  `asso` VARCHAR(255),
  `montant` DECIMAL(10, 2),
  `ajout` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `recu_fiscal_generated` TINYINT(1) DEFAULT 0
);
```

**Table `abonnements`** (simplifié) :
```sql
CREATE TABLE `abonnements` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(255),
  `asso` VARCHAR(255),
  `montant` DECIMAL(10, 2),
  `recurrence` DATE,
  `subscriptionId` VARCHAR(255) UNIQUE,
  `status` VARCHAR(50) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Intégrations

### Stripe

**Fonctionnalités utilisées** :
- **Stripe Checkout** : Gestion des paiements (dons ponctuels et abonnements)
- **Stripe Billing Portal** : Modification des abonnements
- **Stripe Subscriptions API** : Annulation des abonnements

**Configuration** :
- Clés API stockées dans les variables d'environnement
- Webhook pour les événements Stripe (paiement réussi, abonnement annulé, etc.)

### Mailjet

**Emails transactionnels envoyés** :
- Email de vérification lors de l'inscription
- Email de réinitialisation de mot de passe
- Confirmation de don
- Confirmation d'abonnement
- Notification d'annulation d'abonnement

---

## Sécurité

### Protection des données

- **Mots de passe** : Hachés avec bcrypt (salt rounds : 10)
- **Tokens JWT** : Signés avec un secret fort, expiration 24h
- **Cookies** : HTTP-only, Secure (en production), SameSite=Strict
- **Données de paiement** : Jamais stockées (gérées par Stripe)

### Protection contre les attaques

- **XSS** : Cookies HTTP-only, sanitization des inputs
- **CSRF** : Tokens CSRF, SameSite cookies
- **SQL Injection** : Paramètres bindés dans toutes les requêtes
- **Force Brute** : Rate limiting sur les endpoints d'authentification

### Validation

- **Email** : Format validé avec regex
- **Mot de passe** : Minimum 8 caractères, majuscule, minuscule, chiffre
- **Montants** : Validation numérique, montants positifs uniquement

---

[Retour au README principal](../README.md)
