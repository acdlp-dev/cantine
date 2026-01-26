# Google Sheets API Credentials

Ce dossier doit contenir le fichier de credentials JSON du Service Account Google.

## 📋 Instructions

1. **Téléchargez votre fichier de credentials JSON** depuis Google Cloud Console
   - Ce fichier a été créé lors de la configuration du Service Account
   - Il se nomme généralement quelque chose comme `myamana-sheets-sync-xxxxxxx.json`

2. **Renommez-le en `google-credentials.json`**

3. **Placez-le dans ce dossier** : `src/www/myamana/server/node/credentials/`

## 🔒 Sécurité

⚠️ **IMPORTANT** : Ce fichier contient des informations sensibles et ne doit **JAMAIS** être commité dans Git.

Le fichier `.gitignore` du projet devrait déjà ignorer ce dossier, mais vérifiez que la ligne suivante est présente :

```
src/www/myamana/server/node/credentials/*.json
```

## ✅ Vérification

Une fois le fichier placé, votre arborescence devrait ressembler à :

```
src/www/myamana/server/node/
├── credentials/
│   ├── google-credentials.json  ← Votre fichier de credentials
│   └── README.md
├── services/
│   └── googleSheetsService.js
└── routes/
    └── benevoles.js
```

## 🧪 Test

Pour tester que tout fonctionne, vous pouvez :

1. Installer les dépendances :
   ```bash
   cd src/www/myamana/server/node
   npm install
   ```

2. Appeler l'endpoint de synchronisation (via Postman, curl, ou le cron) :
   ```bash
   GET http://localhost:3000/api/benevolat/cron/sync-to-sheets
   ```

Le service devrait synchroniser tous les bénévoles vers votre Google Sheet!
