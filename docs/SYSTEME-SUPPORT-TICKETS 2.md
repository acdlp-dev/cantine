# Système de Support et Ticketing

## Vue d'ensemble

Cette fonctionnalité permet aux associations de créer des demandes d'assistance via un widget flottant dans le back-office. Les tickets sont stockés dans Trello et gérés par l'équipe MyAmana via une interface d'administration dédiée. Les associations peuvent également suivre et répondre à leurs tickets depuis leur espace.

### Flux général

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ASSOCIATION                                        │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐       │
│  │  Widget flottant │───►│  Création ticket │───►│  Page Assistance │       │
│  │  (formulaire)    │    │  (API + Trello)  │    │  (suivi tickets) │       │
│  └──────────────────┘    └────────┬─────────┘    └────────▲─────────┘       │
└───────────────────────────────────┼───────────────────────┼─────────────────┘
                                    │                       │
                              ┌─────▼─────┐                 │
                              │  TRELLO   │                 │
                              │  (BDD)    │                 │
                              └─────┬─────┘                 │
                                    │                       │
┌───────────────────────────────────┼───────────────────────┼─────────────────┐
│                           ADMIN MYAMANA                   │                  │
│  ┌──────────────────┐    ┌───────▼──────────┐    ┌───────┴──────────┐       │
│  │  Gérer tickets   │◄───│  Liste tickets   │───►│  Réponse + Email │       │
│  │  (/support)      │    │  (depuis Trello) │    │  (Mailjet)       │       │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration requise

### Variables d'environnement (.env)

Ajouter les variables suivantes dans le fichier `.env` du serveur Node :

```bash
# Trello API
TRELLO_API_KEY=votre_api_key
TRELLO_SECRET=votre_secret
TRELLO_TOKEN=votre_token

# Board et Listes Trello
TRELLO_BOARD_ID=id_du_board
TRELLO_LIST_ID=id_liste_nouveaux_tickets
TRELLO_LIST_ID_WAITING=id_liste_en_attente_reponse
TRELLO_LIST_ID_RESOLVED=id_liste_resolus

# Membres Trello (pour les assignations)
TRELLO_MEMBER_TECHNIQUE=id_membre_technique
TRELLO_MEMBER_ADMIN=id_membre_admin
TRELLO_MEMBER_GENERAL=id_membre_general
```

### Dépendances Node.js

Nouvelles dépendances ajoutées dans `package.json` :

```json
{
  "multer": "^1.4.5-lts.1",    // Gestion des uploads de fichiers
  "form-data": "^4.0.0"        // Envoi de fichiers à l'API Trello
}
```

---

## Architecture

### Fichiers créés

#### Backend (Node.js)

| Fichier | Description |
|---------|-------------|
| `server/node/services/trelloService.js` | Service d'interaction avec l'API Trello |
| `server/node/routes/support.js` | Routes API pour le système de support |

#### Frontend (Angular)

| Fichier | Description |
|---------|-------------|
| `shared/components/support-widget/support-widget.component.ts` | Composant du widget flottant |
| `shared/components/support-widget/support-widget.component.html` | Template du widget |
| `shared/components/support-widget/support-widget.component.scss` | Styles du widget |
| `backoffice/components/support-tickets/support-tickets.component.ts` | Interface admin de gestion |
| `backoffice/components/support-tickets/support-tickets.component.html` | Template admin |
| `backoffice/components/support-tickets/support-tickets.component.scss` | Styles admin |
| `backoffice/components/assistance/assistance.component.ts` | Page "Mes demandes" pour les assos |
| `backoffice/components/assistance/assistance.component.html` | Template page assistance |
| `backoffice/components/assistance/assistance.component.scss` | Styles page assistance |

### Fichiers modifiés

#### Backend (Node.js)

| Fichier | Modifications |
|---------|---------------|
| `server/node/server.js` | Import et utilisation des routes `/api/support` |
| `server/node/package.json` | Ajout des dépendances `multer` et `form-data` |
| `server/node/services/mailService.js` | Ajout du support des pièces jointes dans `sendTemplateEmail()` |

#### Frontend (Angular)

| Fichier | Modifications |
|---------|---------------|
| `backoffice/backoffice.component.ts` | Import du `SupportWidgetComponent` |
| `backoffice/backoffice.component.html` | Ajout de `<app-support-widget>` |
| `backoffice/backoffice-routing.module.ts` | Ajout des routes `/support` et `/assistance` |
| `backoffice/components/sidebar/sidebar.component.ts` | Ajout du menu "🎧 Assistance" |
| `shared/modules/lucide-icons.module.ts` | Ajout des icônes requises |

---

## API Routes

### Endpoints disponibles

#### `POST /api/support/ticket`
Créer un nouveau ticket de support.

**Body (multipart/form-data) :**
```json
{
  "category": "bug | fiscal | question",
  "message": "Description du problème",
  "email": "email@asso.fr",
  "assoName": "Nom de l'association",
  "attachment": "[Fichier optionnel]"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Ticket créé avec succès",
  "ticketId": "abc123"
}
```

---

#### `GET /api/support/tickets`
Récupérer tous les tickets actifs (nouveaux + en attente).

**Réponse :**
```json
{
  "tickets": [
    {
      "id": "card_id",
      "title": "[#ABC12] [Asso Name] 🐛 Bug technique",
      "category": "bug",
      "email": "email@asso.fr",
      "message": "Description...",
      "date": "2024-12-19T10:30:00Z",
      "status": "new | waiting",
      "trelloUrl": "https://trello.com/c/xxx",
      "attachments": [...]
    }
  ],
  "newCount": 3,
  "totalCount": 5
}
```

---

#### `GET /api/support/tickets/:ticketId`
Récupérer un ticket avec son fil de conversation.

**Réponse :**
```json
{
  "ticket": {
    "id": "card_id",
    "title": "...",
    "comments": [
      {
        "id": "comment_id",
        "text": "Contenu du commentaire",
        "date": "2024-12-19T11:00:00Z",
        "memberCreator": { "fullName": "Nom Agent" }
      }
    ]
  }
}
```

---

#### `POST /api/support/tickets/:ticketId/reply`
Envoyer une réponse admin (email + commentaire Trello).

**Body :**
```json
{
  "message": "Contenu de la réponse",
  "email": "destinataire@asso.fr"
}
```

**Actions effectuées :**
1. Envoie un email via Mailjet
2. Ajoute un commentaire sur la carte Trello
3. Déplace la carte vers la liste "En attente de réponse"

---

#### `POST /api/support/tickets/:ticketId/resolve`
Marquer un ticket comme résolu.

**Actions effectuées :**
1. Déplace la carte vers la liste "Résolu"

---

#### `GET /api/support/my-tickets` (🔒 Auth requise)
Récupérer les tickets de l'association connectée.

**Filtrage :** Par nom d'association OU email

---

#### `POST /api/support/tickets/:ticketId/asso-reply` (🔒 Auth requise)
Permettre à une association de répondre à un ticket.

**Body :**
```json
{
  "message": "Réponse de l'association"
}
```

**Actions effectuées :**
1. Ajoute un commentaire sur la carte Trello (préfixé `[ASSO]`)
2. Déplace la carte vers la liste "Nouveaux" (pour notifier l'admin)
3. Envoie un email de notification à l'admin

---

## Services

### trelloService.js

| Fonction | Description |
|----------|-------------|
| `createTrelloCard(data)` | Crée une carte avec titre, description, labels, membres, pièces jointes |
| `getTickets(listId)` | Récupère les cartes d'une liste spécifique |
| `getAllActiveTickets()` | Récupère les tickets des listes "Nouveaux" et "En attente" |
| `getTicketComments(cardId)` | Récupère les commentaires d'une carte |
| `addCommentToTrelloCard(cardId, text)` | Ajoute un commentaire à une carte |
| `moveCard(cardId, listId)` | Déplace une carte vers une autre liste |
| `archiveCard(cardId)` | Archive une carte (non utilisé actuellement) |

### mailService.js

Modification de `sendTemplateEmail()` pour supporter les pièces jointes :

```javascript
async function sendTemplateEmail(to, templateId, variables, attachments = []) {
  // ...
  body.Messages[0].Attachments = attachments;
  // ...
}
```

---

## Composants Angular

### SupportWidgetComponent

**Emplacement :** `shared/components/support-widget/`

Widget flottant visible sur toutes les pages du back-office.

**Fonctionnalités :**
- Bouton flottant en bas à droite
- Formulaire modal avec :
  - Sélection de catégorie (Bug, Reçu fiscal, Question)
  - Champ message
  - Email (pré-rempli si connecté)
  - Upload de pièce jointe
- Animation d'ouverture/fermeture
- Indicateur visuel pour encourager les captures d'écran (bugs)

**État du composant :**
```typescript
interface State {
  isOpen: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  selectedFile: File | null;
}
```

---

### SupportTicketsComponent

**Emplacement :** `backoffice/components/support-tickets/`  
**Route :** `/backoffice/support`

Interface d'administration pour gérer tous les tickets.

**Fonctionnalités :**
- Liste des tickets avec badges de statut (Nouveau, En attente)
- Compteur de nouveaux tickets
- Vue détaillée avec fil de conversation
- Formulaire de réponse
- Bouton "Résolu" pour clôturer
- Lien vers la carte Trello

---

### AssistanceComponent

**Emplacement :** `backoffice/components/assistance/`  
**Route :** `/backoffice/assistance`

Page permettant aux associations de suivre leurs propres tickets.

**Fonctionnalités :**
- Liste des tickets de l'association connectée
- Vue conversation type "chat" :
  - Messages du support à gauche
  - Messages de l'association à droite
- Possibilité de répondre aux tickets

---

## Navigation (Sidebar)

Le menu "🎧 Assistance" est ajouté dans la sidebar avec :

| Association | Menu visible |
|-------------|--------------|
| Toutes les assos | "Mes demandes" → `/backoffice/assistance` |
| Au Coeur De La Précarité (admin) | "Mes demandes" + "Gérer les tickets" → `/backoffice/support` |

---

## Workflow Trello

### Listes utilisées

| Liste | Variable env | Usage |
|-------|--------------|-------|
| Nouveaux tickets | `TRELLO_LIST_ID` | Tickets jamais traités ou avec nouvelle réponse asso |
| En attente de réponse | `TRELLO_LIST_ID_WAITING` | Tickets où l'admin a répondu |
| Résolus | `TRELLO_LIST_ID_RESOLVED` | Tickets clôturés |

### Labels

- 🐛 `bug` (rouge) - Bugs et incidents techniques
- 📄 `fiscal` (bleu) - Questions sur les reçus fiscaux  
- ❓ `question` (vert) - Questions générales sur MyAmana

### Format du titre de carte

```
[#ABC12] [Nom Association] 🐛 Bug technique
```

- `#ABC12` : ID unique court pour référence
- Emoji selon la catégorie

### Description de carte

```
**Email:** email@asso.fr
**Catégorie:** Bug technique

---

**Message:**
Contenu du message de l'association...

---

🔗 [Voir dans l'interface admin](https://v2.myamana.fr/backoffice/support)
```

---

## Icônes Lucide ajoutées

Les icônes suivantes ont été ajoutées dans `lucide-icons.module.ts` :

```typescript
import {
  MessageCircle,  // Widget flottant
  Headphones,     // Menu assistance
  Bug,            // Catégorie bug
  Camera,         // Indication capture d'écran
  Upload,         // Upload fichier
  Paperclip,      // Pièce jointe
  Send,           // Envoi message
  Reply,          // Réponse
  ExternalLink,   // Lien externe (Trello)
  MousePointerClick,
  Inbox,          // Tickets
  Clock,          // En attente
  MessageSquare   // Conversation
} from 'lucide-angular';
```

---

## Tests recommandés

### Création de ticket
1. Se connecter en tant qu'association
2. Cliquer sur le bouton flottant
3. Remplir le formulaire avec une pièce jointe
4. Vérifier la création de la carte dans Trello

### Réponse admin
1. Aller sur `/backoffice/support`
2. Sélectionner un ticket
3. Envoyer une réponse
4. Vérifier :
   - Email reçu par l'association
   - Commentaire ajouté dans Trello
   - Carte déplacée vers "En attente de réponse"

### Réponse association
1. Se connecter en tant qu'association
2. Aller sur `/backoffice/assistance`
3. Sélectionner un ticket et répondre
4. Vérifier :
   - Commentaire ajouté dans Trello (préfixé `[ASSO]`)
   - Carte déplacée vers "Nouveaux tickets"
   - Email de notification à l'admin

### Résolution
1. Cliquer sur "Résolu" dans l'interface admin
2. Vérifier que la carte est dans la liste "Résolus"
3. Vérifier que le ticket n'apparaît plus dans l'interface

---

## Troubleshooting

### Le widget ne s'affiche pas
- Vérifier que `SupportWidgetComponent` est importé dans `backoffice.component.ts`
- Vérifier les icônes dans `lucide-icons.module.ts`

### Erreur lors de la création de ticket
- Vérifier les variables d'environnement Trello
- Vérifier que le container Node a été redémarré (`docker restart node`)

### Les tickets ne s'affichent pas dans l'interface
- Vérifier les IDs des listes Trello dans `.env`
- Vérifier les logs du serveur Node

### L'association ne voit pas ses tickets
- Le filtrage se fait par nom d'association ou email
- Vérifier que le nom/email correspond à celui utilisé lors de la création

---

## Évolutions possibles

- [ ] Ajout de notifications push
- [ ] Historique des tickets résolus pour les associations
- [ ] Statistiques sur les tickets (temps de réponse moyen, etc.)
- [ ] Catégories personnalisables
- [ ] Système de priorité
- [ ] Assignation automatique selon la catégorie


