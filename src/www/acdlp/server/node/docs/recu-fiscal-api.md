# API de Gestion des Reçus Fiscaux

Cette documentation décrit les API permettant de générer et récupérer des reçus fiscaux en PDF pour les dons effectués aux associations.

## Authentification

Toutes les routes de cette API nécessitent une authentification. L'utilisateur doit être connecté à son compte ACDLP pour pouvoir générer et récupérer des reçus fiscaux.

L'authentification se fait via un cookie HTTP-only nommé `auth_token` qui contient un token JWT. Ce cookie est automatiquement géré par le navigateur et envoyé avec chaque requête.

Pour s'authentifier :
1. Envoyez une requête POST à `/api/signin` avec les identifiants de l'utilisateur
2. Le serveur répond avec un cookie `auth_token` qui sera automatiquement stocké par le navigateur
3. Toutes les requêtes suivantes incluront automatiquement ce cookie

Pour tester l'API avec Postman, consultez le guide [postman-test-guide.md](./postman-test-guide.md).

## Endpoints

### Génération d'un reçu fiscal

```
POST /api/generateRecuFiscal
```

#### Description

Cette API permet de générer un reçu fiscal au format PDF à partir des informations du donateur et de l'association. Le reçu fiscal est généré selon les normes fiscales françaises et inclut toutes les informations nécessaires pour la déduction fiscale.

Le reçu généré est stocké de manière sécurisée et n'est accessible qu'à l'utilisateur authentifié qui l'a généré.

#### Paramètres de la Requête

La requête doit être envoyée en format JSON avec les champs suivants :

| Paramètre     | Type   | Description                                      | Obligatoire |
|---------------|--------|--------------------------------------------------|-------------|
| asso          | string | Identifiant de l'association (URI)               | Oui         |
| prenom        | string | Prénom du donateur                               | Oui         |
| nom           | string | Nom du donateur                                  | Oui         |
| adresse       | string | Adresse du donateur                              | Oui         |
| raisonSociale | string | Raison sociale (pour les entreprises)            | Non         |
| siren         | string | Numéro SIREN (pour les entreprises)              | Non         |
| ville         | string | Ville du donateur                                | Oui         |
| codePostal    | string | Code postal du donateur                          | Oui         |
| montant       | number | Montant du don en euros                          | Oui         |
| date          | string | Date du don (format JJ/MM/AAAA)                  | Oui         |
| moyen         | string | Moyen de paiement utilisé                        | Oui         |
| id_don        | number | ID du don dans la table Dons_Ponctuels           | Non         |

#### Réponse

La réponse est au format JSON et contient les champs suivants :

| Champ       | Type    | Description                                      |
|-------------|---------|--------------------------------------------------|
| success     | boolean | Indique si la génération a réussi                |
| message     | string  | Message de succès ou d'erreur                    |
| filename    | string  | Nom du fichier PDF généré (si succès)            |
| downloadUrl | string  | URL relative pour télécharger le PDF (si succès) |
| error       | string  | Message d'erreur détaillé (si échec)             |

#### Exemple de Requête

```javascript
const axios = require('axios');

// Configuration avec withCredentials pour envoyer les cookies
const config = {
  withCredentials: true
};

const data = {
  asso: 'au-coeur-de-la-precarite',
  prenom: 'Jean',
  nom: 'Dupont',
  adresse: '123 Rue de la Paix',
  raisonSociale: '', // Laisser vide pour un particulier
  siren: '', // Laisser vide pour un particulier
  ville: 'Paris',
  codePostal: '75001',
  montant: 100,
  date: '01/04/2025',
  moyen: 'Carte bancaire',
  id_don: 12345 // Optionnel: ID du don dans la table Dons_Ponctuels
};

axios.post('http://localhost:4242/api/generateRecuFiscal', data, config)
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error(error.response.data);
  });
```

#### Exemple de Réponse (Succès)

```json
{
  "success": true,
  "message": "Reçu fiscal généré avec succès",
  "filename": "au-coeur-de-la-precarite_Jean_Dupont_1712213385000-J-n-D-t.pdf",
  "downloadUrl": "/api/getRecuFiscal/12345"
}
```

#### Exemple de Réponse (Échec)

```json
{
  "success": false,
  "message": "Erreur lors de la génération du reçu fiscal",
  "error": "Association non trouvée"
}
```

### Récupération d'un reçu fiscal

```
GET /api/getRecuFiscal/:id_don
```

#### Description

Cette API permet de récupérer un reçu fiscal au format PDF. L'accès est sécurisé et n'est autorisé qu'à l'utilisateur authentifié qui a généré le reçu.

#### Paramètres de la Requête

| Paramètre | Type   | Description                                | Obligatoire |
|-----------|--------|--------------------------------------------|-------------|
| id_don    | string | ID du don pour lequel récupérer le reçu fiscal (dans l'URL) | Oui         |

#### Réponse

En cas de succès, l'API renvoie directement le fichier PDF avec les en-têtes appropriés pour l'affichage dans le navigateur.

En cas d'échec, l'API renvoie une réponse JSON avec les informations suivantes :

| Champ     | Type    | Description                                      |
|-----------|---------|--------------------------------------------------|
| success   | boolean | Indique si la récupération a réussi (toujours false en cas d'échec) |
| message   | string  | Message d'erreur                                 |
| error     | string  | Message d'erreur détaillé (si disponible)        |

#### Exemple de Requête

```javascript
const axios = require('axios');

// Configuration avec withCredentials pour envoyer les cookies
const config = {
  withCredentials: true,
  responseType: 'blob' // Important pour recevoir le PDF correctement
};

axios.get('http://localhost:4242/api/getRecuFiscal/12345', config)
  .then(response => {
    // Créer une URL pour le blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    // Créer un lien pour télécharger le fichier
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'recu-fiscal.pdf');
    document.body.appendChild(link);
    link.click();
  })
  .catch(error => {
    console.error(error.response.data);
  });
```

#### Codes de Statut HTTP

- `200 OK` : La requête a réussi et le PDF est renvoyé
- `403 Forbidden` : L'utilisateur n'est pas autorisé à accéder à ce reçu fiscal
- `404 Not Found` : Le reçu fiscal demandé n'existe pas
- `500 Internal Server Error` : Une erreur s'est produite lors de la récupération du reçu fiscal

## Codes de Statut HTTP Généraux

- `200 OK` : La requête a réussi et le reçu fiscal a été généré
- `400 Bad Request` : La requête est incorrecte (paramètres manquants ou invalides)
- `500 Internal Server Error` : Une erreur s'est produite lors de la génération du reçu fiscal

## Notes Importantes

1. Les informations de l'association (nom, adresse, signataire, etc.) sont récupérées automatiquement à partir de la base de données en utilisant l'identifiant de l'association fourni.
2. Le reçu fiscal généré est stocké dans le répertoire `/server/node/pdf/recuFiscal/`.
3. Le nom du fichier PDF généré est au format `{asso}_{prenom}_{nom}_{timestamp}-{initiales}.pdf`.
4. Toutes les routes nécessitent une authentification. L'utilisateur doit être connecté à son compte ACDLP.
5. Les reçus fiscaux sont liés à l'utilisateur qui les a générés et ne sont accessibles que par cet utilisateur.
6. Si le paramètre `id_don` est fourni, l'API mettra à jour la colonne `lien_recu` de la table `Dons_Ponctuels` pour le don correspondant à cet ID, au lieu de créer un nouvel enregistrement dans la table `Recus_Fiscaux`. Dans ce cas, l'URL complète (commençant par "http") est stockée dans la colonne `lien_recu`.

## Sécurité

Pour garantir la sécurité des reçus fiscaux :

1. Toutes les routes sont protégées par une authentification.
2. Les reçus fiscaux sont liés à l'utilisateur qui les a générés dans la base de données.
3. Lors de la récupération d'un reçu fiscal, l'API vérifie que l'utilisateur authentifié est bien celui qui a généré le reçu.
4. Les noms de fichiers des reçus fiscaux incluent un timestamp, ce qui les rend difficiles à deviner.
5. Les reçus fiscaux ne sont accessibles que via l'API sécurisée, et non directement via une URL publique.

## Exemple de Script de Test

Un script de test est disponible dans le fichier `test-recu-fiscal.js` à la racine du projet. Ce script est destiné à être utilisé en développement uniquement, car il ne gère pas l'authentification. Pour l'exécuter :

```bash
node test-recu-fiscal.js
```

Ce script envoie une requête de test à l'API et affiche le résultat.

Pour tester l'API en production, vous devez utiliser un client HTTP qui prend en charge l'authentification, comme Postman ou un script personnalisé qui inclut le token d'authentification dans les en-têtes de la requête.
