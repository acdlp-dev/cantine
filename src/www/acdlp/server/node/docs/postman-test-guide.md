# Guide de test de l'API avec Postman

Ce guide explique comment tester l'API de génération de reçus fiscaux avec Postman.

## Prérequis

- [Postman](https://www.postman.com/downloads/) installé sur votre ordinateur
- Le serveur Node.js en cours d'exécution

## Étapes pour tester l'API generateRecuFiscal

### 1. S'authentifier avec Postman

L'API utilise une authentification basée sur les cookies. Vous devez d'abord vous connecter pour obtenir un cookie d'authentification :

1. Créez une nouvelle requête POST dans Postman
2. URL : `http://localhost:4242/api/signin`
3. Onglet "Body" : sélectionnez "raw" et "JSON"
4. Entrez les informations d'identification :
   ```json
   {
     "email": "votre-email@exemple.com",
     "password": "votre-mot-de-passe"
   }
   ```
5. **Important** : Dans l'onglet "Headers", assurez-vous que le header "Content-Type" est défini à "application/json"
6. **Très important** : Allez dans les paramètres de Postman (icône d'engrenage en haut à droite) > Settings > General et assurez-vous que "Automatically follow redirects" est activé et que "Save cookies" est également activé
7. Cliquez sur "Send"
8. Vous devriez recevoir une réponse 200 avec un message "Logged in successfully"
9. Postman aura automatiquement enregistré le cookie `auth_token` qui sera utilisé pour les requêtes suivantes

### 2. Vérifier que l'authentification a fonctionné

Pour vérifier que vous êtes bien authentifié :

1. Créez une nouvelle requête GET dans Postman
2. URL : `http://localhost:4242/api/me`
3. Cliquez sur "Send"
4. Si l'authentification a fonctionné, vous devriez recevoir vos informations utilisateur

### 3. Configurer la requête pour generateRecuFiscal

1. Créez une nouvelle requête POST dans Postman
2. URL : `http://localhost:4242/api/generateRecuFiscal`
3. Onglet "Body" : sélectionnez "raw" et "JSON"
4. Entrez les données pour générer le reçu fiscal :
   ```json
   {
     "asso": "au-coeur-de-la-precarite",
     "prenom": "Jean",
     "nom": "Dupont",
     "adresse": "123 Rue de la Paix",
     "raisonSociale": "",
     "siren": "",
     "ville": "Paris",
     "codePostal": "75001",
     "montant": 100,
     "date": "01/04/2025",
     "moyen": "Carte bancaire",
     "id_don": 12345
   }
   ```
   
   Note: Le paramètre `id_don` est optionnel. Si vous le fournissez, l'API mettra à jour la colonne `lien_recu` de la table `Dons_Ponctuels` pour le don correspondant à cet ID, au lieu de créer un nouvel enregistrement dans la table `Recus_Fiscaux`. Les reçus fiscaux sont maintenant stockés dans le répertoire `/server/node/pdf/recuFiscal/{asso}/`.
5. Cliquez sur "Send"

### 4. Analyser la réponse

Si tout fonctionne correctement, vous devriez recevoir une réponse similaire à celle-ci :

```json
{
  "success": true,
  "message": "Reçu fiscal généré avec succès",
  "filename": "au-coeur-de-la-precarite_Jean_Dupont_1712213385000-J-n-D-t.pdf",
  "downloadUrl": "/api/getRecuFiscal/au-coeur-de-la-precarite_Jean_Dupont_1712213385000-J-n-D-t.pdf"
}
```

### 5. Tester la récupération du PDF

1. Créez une nouvelle requête GET dans Postman
2. URL : `http://localhost:4242` + le `downloadUrl` de la réponse précédente (par exemple : `http://localhost:4242/api/getRecuFiscal/12345`)
3. Cliquez sur "Send"
4. Vous devriez recevoir le fichier PDF en réponse. Postman affichera "This response is a binary file."
5. Cliquez sur "Save Response" > "Save to a file" pour enregistrer le PDF sur votre ordinateur

## Conseils pour Postman

### Gestion des cookies

Postman gère automatiquement les cookies pour vous, mais il est important de vérifier que :

1. Les cookies sont bien activés dans les paramètres de Postman
2. Vous utilisez la même "Collection" ou le même "Environment" pour toutes vos requêtes afin que les cookies soient partagés

Pour vérifier les cookies stockés :
1. Cliquez sur l'icône "Cookies" en bas à droite de Postman
2. Sélectionnez le domaine `localhost`
3. Vous devriez voir le cookie `auth_token` dans la liste

### Dépannage

Si vous rencontrez des erreurs :

- **401 Unauthorized** : Vérifiez que vous êtes bien authentifié et que le cookie `auth_token` est présent
  - Essayez de vous reconnecter via `/api/signin`
  - Vérifiez que Postman est configuré pour enregistrer et envoyer les cookies
- **400 Bad Request** : Vérifiez que tous les champs obligatoires sont présents dans le corps de la requête
- **404 Not Found** : Vérifiez que l'URL est correcte et que le serveur est en cours d'exécution
- **500 Internal Server Error** : Consultez les logs du serveur pour plus de détails sur l'erreur

### Automatisation des tests

Pour automatiser les tests, vous pouvez créer une collection Postman avec les étapes suivantes :

1. Authentification (`/api/signin`)
2. Génération du reçu fiscal (`/api/generateRecuFiscal`)
3. Récupération du PDF (`/api/getRecuFiscal/:filename`)

Vous pouvez utiliser des scripts de test pour extraire automatiquement le `downloadUrl` de la réponse de l'étape 2 et l'utiliser pour l'étape 3.
