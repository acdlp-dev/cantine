# Formulaire de Don - Documentation

Le Formulaire de Don est une interface publique permettant à tout visiteur de faire un don ponctuel ou de souscrire à un abonnement mensuel en faveur d'une association.

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Personas et Droits](#personas-et-droits)
3. [Fonctionnalités](#fonctionnalités)
4. [Flux de donation](#flux-de-donation)
5. [Intégrations paiement](#intégrations-paiement)
6. [API Endpoints](#api-endpoints)
7. [Structure technique](#structure-technique)

---

## Vue d'ensemble

### Objectif

Le Formulaire de Don permet à tout visiteur de :
- Faire un don ponctuel à une association
- Souscrire à un don mensuel récurrent (abonnement)
- Choisir son mode de paiement (Stripe ou PayPal)
- Recevoir un reçu fiscal automatiquement

### Accès

URL : `/donation/:associationUri`

Authentification requise : Non (formulaire public)

---

## Personas et Droits

| Persona | Droits et Fonctionnalités |
|---------|---------------------------|
| **Visiteur/Donateur** | • Consulter la page de l'association<br>• Choisir le type de don (ponctuel ou mensuel)<br>• Saisir le montant du don<br>• Renseigner ses informations personnelles (nom, prénom, email, adresse)<br>• Choisir le mode de paiement (Stripe ou PayPal)<br>• Effectuer le paiement sécurisé<br>• Recevoir un reçu fiscal par email<br>• Créer un compte donateur automatiquement (optionnel) |

### Notes importantes

- **Formulaire public** : Aucune authentification requise pour faire un don
- **Données minimales** : Seules les informations nécessaires pour le reçu fiscal sont demandées
- **Sécurité paiement** : Les données bancaires ne transitent jamais par l'application (gérées par Stripe/PayPal)
- **Reçu fiscal automatique** : Généré et envoyé par email immédiatement après le paiement

---

## Fonctionnalités

### 1. Sélection du type de don

Le donateur choisit entre deux options :

**Don ponctuel** :
- Paiement unique
- Montant libre ou montants suggérés (10€, 20€, 50€, 100€, autre)
- Reçu fiscal généré immédiatement

**Don mensuel (abonnement)** :
- Prélèvement automatique mensuel
- Montant libre ou montants suggérés (5€, 10€, 20€, 50€, autre)
- Possibilité d'annuler à tout moment depuis l'Espace Donateur
- Reçu fiscal annuel récapitulatif

### 2. Saisie des informations personnelles

**Informations obligatoires** :
- Civilité (M., Mme, Autre)
- Prénom
- Nom
- Email
- Adresse postale complète (pour le reçu fiscal) :
  - Rue
  - Ville
  - Code postal
  - Pays

**Validation** :
- Format email valide
- Code postal français valide (si France)
- Tous les champs obligatoires remplis

### 3. Choix du mode de paiement

Le donateur peut choisir entre :

**Stripe** (par défaut) :
- Carte bancaire (Visa, Mastercard, American Express)
- Interface de paiement intégrée
- Support 3D Secure
- Confirmation immédiate

**PayPal** :
- Paiement via compte PayPal
- Redirection vers PayPal
- Retour automatique après paiement

### 4. Paiement sécurisé

**Processus** :
1. Validation des informations du formulaire
2. Création d'une session de paiement Stripe ou PayPal
3. Redirection vers l'interface de paiement
4. Saisie sécurisée des informations bancaires
5. Confirmation du paiement
6. Redirection vers la page de confirmation

**Sécurité** :
- Connexion HTTPS obligatoire
- PCI-DSS compliant (via Stripe/PayPal)
- Aucune donnée bancaire stockée
- Tokenisation des paiements

### 5. Génération du reçu fiscal

**Automatique après paiement** :
- Génération d'un PDF au format CERFA
- Contenu du reçu :
  - Informations du donateur (nom, prénom, adresse)
  - Informations de l'association (nom, SIRET, objet social)
  - Montant du don
  - Date du don
  - Mention légale pour déduction fiscale (66% ou 75% selon éligibilité)
  - Signature électronique de l'association

**Envoi par email** :
- Email transactionnel Mailjet
- Reçu en pièce jointe (PDF)
- Message de remerciement personnalisé

### 6. Création de compte donateur (optionnel)

Si le donateur souhaite suivre ses dons :
- Un compte est automatiquement créé dans l'Espace Donateur
- Email de bienvenue avec lien de vérification
- Accès à l'historique des dons
- Gestion des abonnements

---

## Flux de donation

### Don ponctuel avec Stripe

```
1. Visiteur accède au formulaire
   ↓
2. Sélectionne "Don ponctuel"
   ↓
3. Choisit le montant
   ↓
4. Remplit le formulaire (nom, prénom, email, adresse)
   ↓
5. Sélectionne "Stripe"
   ↓
6. Clique sur "Faire un don"
   ↓
7. Redirection vers Stripe Checkout
   ↓
8. Saisie des informations bancaires
   ↓
9. Validation 3D Secure (si nécessaire)
   ↓
10. Confirmation du paiement
    ↓
11. Webhook Stripe notifie le backend
    ↓
12. Enregistrement du don dans la base
    ↓
13. Génération du reçu fiscal (PDF)
    ↓
14. Envoi de l'email avec reçu
    ↓
15. Redirection vers page de confirmation
```

### Don mensuel avec Stripe

```
1. Visiteur accède au formulaire
   ↓
2. Sélectionne "Don mensuel"
   ↓
3. Choisit le montant mensuel
   ↓
4. Remplit le formulaire
   ↓
5. Sélectionne "Stripe"
   ↓
6. Clique sur "S'abonner"
   ↓
7. Redirection vers Stripe Checkout (mode subscription)
   ↓
8. Saisie des informations bancaires
   ↓
9. Acceptation du prélèvement automatique
   ↓
10. Confirmation de l'abonnement
    ↓
11. Webhook Stripe notifie le backend
    ↓
12. Enregistrement de l'abonnement
    ↓
13. Création du compte donateur
    ↓
14. Envoi de l'email de confirmation
    ↓
15. Prélèvement automatique mensuel
```

### Don ponctuel avec PayPal

```
1. Visiteur accède au formulaire
   ↓
2. Sélectionne "Don ponctuel"
   ↓
3. Choisit le montant
   ↓
4. Remplit le formulaire
   ↓
5. Sélectionne "PayPal"
   ↓
6. Clique sur "Faire un don"
   ↓
7. Redirection vers PayPal
   ↓
8. Connexion au compte PayPal
   ↓
9. Confirmation du paiement
    ↓
10. Retour vers l'application
    ↓
11. PayPal IPN notifie le backend
    ↓
12. Enregistrement du don
    ↓
13. Génération et envoi du reçu fiscal
    ↓
14. Affichage de la confirmation
```

---

## Intégrations paiement

### Stripe

**Configuration** :
- Clés API par association (stockées dans la base de données)
- Mode test et production
- Webhooks configurés pour les événements

**Événements Stripe écoutés** :
- `checkout.session.completed` : Paiement réussi
- `payment_intent.succeeded` : Confirmation du paiement
- `payment_intent.payment_failed` : Échec du paiement
- `customer.subscription.created` : Abonnement créé
- `customer.subscription.deleted` : Abonnement annulé
- `invoice.payment_succeeded` : Prélèvement mensuel réussi

**Produits Stripe** :
- Don ponctuel : Paiement unique (`mode: 'payment'`)
- Don mensuel : Abonnement récurrent (`mode: 'subscription'`)

**Session Checkout** :
```javascript
{
  mode: 'payment' | 'subscription',
  success_url: 'https://myamana.fr/donation/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://myamana.fr/donation/cancel',
  customer_email: 'donateur@example.com',
  line_items: [{
    price_data: {
      currency: 'eur',
      unit_amount: 5000, // 50€ en centimes
      product_data: {
        name: 'Don à [Association]'
      }
    },
    quantity: 1
  }],
  metadata: {
    asso: 'uri-association',
    firstName: 'Jean',
    lastName: 'Dupont',
    address: '123 rue exemple',
    city: 'Paris',
    postalCode: '75001',
    country: 'France'
  }
}
```

---

### PayPal

**Configuration** :
- Client ID et Secret par association
- Mode sandbox et production
- IPN (Instant Payment Notification) configuré

**Flux PayPal** :
1. Création d'un order PayPal
2. Redirection vers PayPal pour paiement
3. Capture du paiement après validation
4. Notification IPN reçue par le backend
5. Traitement et enregistrement du don

**Order PayPal** :
```javascript
{
  intent: 'CAPTURE',
  purchase_units: [{
    amount: {
      currency_code: 'EUR',
      value: '50.00'
    },
    description: 'Don à [Association]'
  }],
  application_context: {
    return_url: 'https://myamana.fr/donation/paypal/success',
    cancel_url: 'https://myamana.fr/donation/paypal/cancel'
  }
}
```

---

## API Endpoints

### Stripe

#### `POST /api/payment/create-checkout-session`
Crée une session Stripe Checkout pour un don.

**Body** :
```json
{
  "asso": "uri-association",
  "type": "ponctuel",
  "amount": 50,
  "email": "donateur@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "address": "123 rue exemple",
  "city": "Paris",
  "postalCode": "75001",
  "country": "France"
}
```

**Réponse** :
```json
{
  "success": true,
  "sessionId": "cs_test_123456789",
  "url": "https://checkout.stripe.com/pay/cs_test_123456789"
}
```

---

#### `POST /api/payment/webhook`
Webhook Stripe pour les événements de paiement.

**Headers** :
```
stripe-signature: signature_stripe
```

**Body** : Événement Stripe (JSON)

**Traitement** :
- Vérification de la signature
- Traitement selon le type d'événement
- Enregistrement du don/abonnement
- Génération du reçu fiscal
- Envoi des emails

---

### PayPal

#### `POST /api/payment-paypal/create-order`
Crée un order PayPal pour un don.

**Body** :
```json
{
  "asso": "uri-association",
  "amount": 50,
  "email": "donateur@example.com",
  "firstName": "Jean",
  "lastName": "Dupont",
  "address": "123 rue exemple",
  "city": "Paris",
  "postalCode": "75001",
  "country": "France"
}
```

**Réponse** :
```json
{
  "success": true,
  "orderId": "ORDER123456789",
  "approveLink": "https://www.paypal.com/checkoutnow?token=ORDER123456789"
}
```

---

#### `POST /api/payment-paypal/capture-order`
Capture le paiement après validation PayPal.

**Body** :
```json
{
  "orderId": "ORDER123456789"
}
```

**Réponse** :
```json
{
  "success": true,
  "transactionId": "TXN123456789",
  "status": "COMPLETED"
}
```

**Effet de bord** :
- Enregistrement du don
- Génération du reçu fiscal
- Envoi de l'email de confirmation

---

#### `POST /api/payment-paypal/ipn`
Endpoint IPN PayPal pour les notifications.

**Body** : Données IPN PayPal (form-urlencoded)

**Traitement** :
- Vérification IPN auprès de PayPal
- Traitement des notifications (paiement, abonnement, etc.)
- Mise à jour de la base de données

---

## Structure technique

### Modules Angular

```
modules/donation/
├── donation-routing.module.ts        # Routes du module
├── donation.module.ts                # Déclaration du module
├── models/
│   └── donation.model.ts             # Modèles de donation
├── services/
│   └── donation.service.ts           # Service API donations
└── pages/
    ├── donation-form/                # Formulaire principal
    ├── donation-success/             # Page de confirmation
    └── donation-cancel/              # Page d'annulation
```

### Routes Backend

```
routes/
├── payment.js                        # Paiements Stripe
│   ├── POST /api/payment/create-checkout-session
│   └── POST /api/payment/webhook
├── payment-paypal.js                 # Paiements PayPal
│   ├── POST /api/payment-paypal/create-order
│   ├── POST /api/payment-paypal/capture-order
│   └── POST /api/payment-paypal/ipn
└── dons.js                           # Gestion des dons
    └── POST /api/dons/create
```

### Base de données

**Table `dons`** (simplifié) :
```sql
CREATE TABLE `dons` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `asso` VARCHAR(255),
  `email` VARCHAR(255),
  `firstName` VARCHAR(255),
  `lastName` VARCHAR(255),
  `address` TEXT,
  `city` VARCHAR(255),
  `postalCode` VARCHAR(10),
  `country` VARCHAR(255),
  `montant` DECIMAL(10, 2),
  `payment_method` ENUM('stripe', 'paypal'),
  `payment_id` VARCHAR(255),
  `status` VARCHAR(50),
  `recu_fiscal_generated` TINYINT(1) DEFAULT 0,
  `recu_fiscal_url` VARCHAR(255),
  `ajout` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Table `abonnements`** (simplifié) :
```sql
CREATE TABLE `abonnements` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `asso` VARCHAR(255),
  `email` VARCHAR(255),
  `firstName` VARCHAR(255),
  `lastName` VARCHAR(255),
  `montant` DECIMAL(10, 2),
  `payment_method` ENUM('stripe', 'paypal'),
  `subscriptionId` VARCHAR(255) UNIQUE,
  `customerId` VARCHAR(255),
  `status` VARCHAR(50) DEFAULT 'active',
  `recurrence` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Reçu fiscal

### Format CERFA

Le reçu fiscal respecte le format officiel CERFA n°11580*04 :

**Informations obligatoires** :
- Nom et adresse de l'organisme bénéficiaire
- Numéro SIRET de l'association
- Objet social de l'association
- Date et montant du don
- Nom et adresse du donateur
- Forme du don (numéraire, en nature, etc.)
- Mention légale sur la déductibilité fiscale

**Taux de déduction** :
- **66%** : Pour les associations d'intérêt général
- **75%** : Pour les associations d'aide aux personnes en difficulté (dans la limite de 1000€)

### Génération et stockage

**Processus** :
1. Génération du PDF avec les données du don
2. Stockage du PDF dans `/pdf/recuFiscal/`
3. Enregistrement de l'URL dans la base de données
4. Envoi par email au donateur
5. Conservation pour téléchargement ultérieur

**Service PDF** :
- Bibliothèque : PDFKit (Node.js)
- Template : Format CERFA officiel
- Signature : Cachet électronique de l'association

---

## Emails transactionnels

### Confirmation de don ponctuel

**Template Mailjet** : ID configurable

**Variables** :
- `firstName` : Prénom du donateur
- `amount` : Montant du don
- `association` : Nom de l'association
- `date` : Date du don

**Pièce jointe** : Reçu fiscal (PDF)

---

### Confirmation d'abonnement

**Template Mailjet** : ID configurable

**Variables** :
- `firstName` : Prénom du donateur
- `amount` : Montant mensuel
- `association` : Nom de l'association
- `nextPaymentDate` : Date du prochain prélèvement

---

### Notification de prélèvement mensuel

**Template Mailjet** : ID configurable

**Envoi** : Automatique après chaque prélèvement réussi

**Variables** :
- `firstName` : Prénom du donateur
- `amount` : Montant prélevé
- `date` : Date du prélèvement

---

## Sécurité et conformité

### RGPD

- Collecte minimale de données
- Consentement explicite pour l'envoi d'emails
- Droit d'accès et de suppression des données
- Conservation limitée des données

### PCI-DSS

- Aucune donnée bancaire stockée
- Paiements via Stripe/PayPal (certifiés PCI-DSS)
- Connexion HTTPS obligatoire
- Tokenisation des paiements

### Protection des données

- Chiffrement des communications (TLS 1.2+)
- Validation des inputs côté client et serveur
- Protection contre les injections SQL
- Rate limiting sur les endpoints sensibles

---

[Retour au README principal](../README.md)
