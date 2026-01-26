# 🚀 Démarrage Rapide - Système de Logging

## ✅ Ce qui a été implémenté

### 1. Winston (Logger Node.js)
- ✅ Configuration Winston avec rotation automatique
- ✅ Logs structurés en JSON
- ✅ Middleware HTTP pour logger toutes les requêtes
- ✅ Gestion des erreurs, exceptions et rejections
- ✅ Niveaux de log : error, warn, info, http, debug

### 2. Loki (Stockage de logs)
- ✅ Configuration Loki avec rétention 30 jours
- ✅ Stockage filesystem optimisé
- ✅ Limites configurées pour éviter surcharge

### 3. Promtail (Collecteur de logs)
- ✅ Configuration pour lire les logs Winston
- ✅ Parsing automatique du JSON
- ✅ Labels automatiques (level, service)

### 4. Grafana (Dashboard)
- ✅ Configuration datasource Loki
- ✅ Accessible sur http://localhost:3001

### 5. Docker Compose
- ✅ Services Loki, Promtail, Grafana ajoutés
- ✅ Volumes partagés configurés
- ✅ Network configuré

## 📋 Prochaines étapes

### 1. Installer les dépendances Node.js

```bash
cd src/www/myamana/server/node
npm install
```

Cela installera :
- winston@^3.11.0
- winston-daily-rotate-file@^4.7.1
- express-winston@^4.2.0

### 2. Démarrer la stack de logging

```bash
# Depuis la racine du projet
docker-compose up -d loki promtail grafana
```

### 3. Redémarrer le serveur Node.js

```bash
docker-compose restart node
```

### 4. Vérifier que tout fonctionne

#### A. Vérifier Loki
```bash
curl http://localhost:3100/ready
# Devrait retourner "ready"
```

#### B. Vérifier Grafana
Ouvrir http://localhost:3001
- Username: `admin`
- Password: `admin` (à changer au premier login)

#### C. Tester les logs
```bash
# Faire une requête test
curl http://localhost:4242/api/test

# Voir les logs
docker exec node ls -lh /var/log/myamana/
```

### 5. Dans Grafana

1. **Aller dans "Explore"** (icône boussole dans le menu gauche)
2. **Sélectionner "Loki"** comme datasource
3. **Taper cette requête** :
   ```
   {service="myamana-api"}
   ```
4. **Cliquer sur "Run Query"**

Vous devriez voir vos logs apparaître ! 🎉

## 📊 Requêtes Loki utiles

### Voir tous les logs
```
{service="myamana-api"}
```

### Voir uniquement les erreurs
```
{service="myamana-api"} |= "error"
```

### Voir les requêtes HTTP
```
{service="myamana-api"} | json | method != ""
```

### Compter les logs par minute
```
sum(count_over_time({service="myamana-api"}[1m]))
```

## 🔧 Migration des console.log existants

Pour migrer progressivement vos `console.log` :

### Avant
```javascript
console.log("Demande reçue pour " + email);
console.error(`[Signin Error]: ${err.message}`, err);
```

### Après
```javascript
logger.info('Signin request received', { email, action: 'signin' });
logger.error('Signin error', { 
  error: err.message, 
  stack: err.stack,
  email,
  action: 'signin'
});
```

## 📖 Documentation complète

Pour plus de détails, consultez : **docs/LOGGING-MONITORING.md**

## ⚠️ Important

1. **Les logs Winston sont dans le container** : `/var/log/myamana/`
2. **Rétention** : 30 jours automatiquement
3. **Rotation** : 20 MB par fichier max
4. **Ne PAS logger** : mots de passe, tokens, données bancaires

## 🎯 Bénéfices immédiats

✅ Logs structurés et searchable  
✅ Dashboard temps réel dans Grafana  
✅ Rétention 30 jours automatique  
✅ Toutes les requêtes HTTP loggées  
✅ Erreurs avec contexte complet  
✅ Prêt pour les alertes (Email/Slack)  

## 🆘 Problèmes ?

### Les logs n'apparaissent pas dans Grafana

1. Vérifier que Promtail fonctionne :
   ```bash
   docker logs promtail
   ```

2. Vérifier que les fichiers de logs existent :
   ```bash
   docker exec node ls -lh /var/log/myamana/
   ```

3. Redémarrer Promtail :
   ```bash
   docker-compose restart promtail
   ```

### Grafana ne se connecte pas à Loki

1. Vérifier que Loki fonctionne :
   ```bash
   curl http://localhost:3100/ready
   ```

2. Dans Grafana, aller dans Configuration > Data Sources > Loki
3. Vérifier l'URL : `http://loki:3100`
4. Cliquer sur "Save & Test"

## 🚀 Prêt !

Votre système de logging moderne est maintenant opérationnel !

**Prochain objectif** : Créer des dashboards Grafana pour visualiser :
- Taux d'erreur
- Performance des endpoints
- Activité utilisateurs
- Métriques business
