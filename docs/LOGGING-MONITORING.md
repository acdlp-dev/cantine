# 📊 Système de Logging et Monitoring - MyAmana

Ce document décrit le système de logging et monitoring mis en place avec **Winston + Loki + Grafana**.

## 🏗️ Architecture

```
┌─────────────────┐
│  Node.js App    │
│   (Express)     │
│  Winston Logger │──► Logs JSON structurés
└────────┬────────┘    dans /var/log/myamana/
         │
         ▼
┌─────────────────┐
│    Promtail     │──► Collecte et parse les logs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      Loki       │──► Stockage et indexation
└────────┬────────┘    Rétention: 30 jours
         │
         ▼
┌─────────────────┐
│    Grafana      │──► Visualisation
│  localhost:3001 │    Dashboard et alertes
└─────────────────┘
```

## 📁 Fichiers de logs

Les logs sont écrits dans `/var/log/myamana/` :

- **application-YYYY-MM-DD.log** : Logs généraux (info, warn, error)
- **error-YYYY-MM-DD.log** : Erreurs uniquement
- **exceptions-YYYY-MM-DD.log** : Exceptions non capturées
- **rejections-YYYY-MM-DD.log** : Promise rejections non gérées

### Rotation automatique
- **Taille max** : 20 MB par fichier
- **Rétention** : 30 jours
- **Format** : JSON structuré

## 🎯 Niveaux de log

| Niveau | Usage | Exemple |
|--------|-------|---------|
| **error** | Erreurs critiques | DB down, crash serveur |
| **warn** | Avertissements | Token expiré, validation échouée |
| **info** | Informations business | Signup, login, actions importantes |
| **http** | Requêtes HTTP | Toutes les routes (automatique) |
| **debug** | Debug technique | Queries SQL, debug interne |

## 💻 Utilisation dans le code

### Import du logger

```javascript
const logger = require('./config/logger');
```

### Logs simples

```javascript
// Information
logger.info('User logged in', { email: user.email });

// Avertissement
logger.warn('Invalid token attempt', { ip: req.ip });

// Erreur
logger.error('Database connection failed', { error: err.message });

// Debug
logger.debug('Query executed', { query: sqlQuery, duration: '25ms' });
```

### Logger une erreur avec contexte

```javascript
try {
  // code...
} catch (error) {
  logger.logError(error, {
    action: 'signup',
    email: req.body.email,
    ip: req.ip
  });
}
```

### Logs HTTP automatiques

Le middleware `httpLogger` log automatiquement **toutes les requêtes** :
- Méthode HTTP
- URL
- Code de statut
- Temps de réponse
- IP utilisateur
- User agent
- Email utilisateur (si authentifié)

## 🚀 Démarrage

### 1. Installer les dépendances

```bash
cd src/www/myamana/server/node
npm install
```

### 2. Démarrer les services Docker

```bash
docker-compose up -d loki promtail grafana
```

### 3. Vérifier que tout fonctionne

```bash
# Loki
curl http://localhost:3100/ready

# Grafana
curl http://localhost:3001/api/health
```

### 4. Démarrer l'application

```bash
docker-compose up node
```

## 📊 Accès Grafana

### URL
```
http://localhost:3001
```

### Identifiants par défaut
- **Username** : `admin`
- **Password** : `admin` (à changer au premier login)

### Configuration des identifiants

Dans votre `.env` :
```env
GRAFANA_ADMIN_USER=votre_utilisateur
GRAFANA_ADMIN_PASSWORD=votre_mot_de_passe_securise
```

## 🔍 Requêtes Loki utiles

### Tous les logs des dernières 15 minutes
```
{service="myamana-api"}
```

### Erreurs uniquement
```
{service="myamana-api"} |= "error"
```

### Logs d'un utilisateur spécifique
```
{service="myamana-api"} |= "user@example.com"
```

### Logs HTTP avec erreur 500
```
{service="myamana-api"} | json | statusCode >= 500
```

### Compter les erreurs par minute
```
sum(rate({service="myamana-api"} |= "error" [1m]))
```

## 🎨 Dashboards Grafana recommandés

### 1. Vue d'ensemble
- Volume de logs par niveau
- Taux d'erreur en temps réel
- Top 10 des endpoints
- Temps de réponse moyen

### 2. Erreurs
- Liste des erreurs récentes
- Stack traces
- Contexte complet
- Timeline des erreurs

### 3. Performance
- Temps de réponse par endpoint
- Requêtes les plus lentes
- Volume de requêtes par heure

### 4. Utilisateurs
- Activité par utilisateur
- Erreurs par utilisateur
- Actions business importantes

## 🔔 Alertes recommandées

### Taux d'erreur élevé
- **Condition** : Taux d'erreur > 5%
- **Période** : 5 minutes
- **Action** : Email / Slack

### Aucun log reçu
- **Condition** : Aucun log depuis 5 minutes
- **Action** : Alerte critique

### Erreurs critiques
- **Condition** : Erreur contenant "Database" ou "Connection"
- **Action** : Alerte immédiate

## 🛠️ Maintenance

### Vérifier l'espace disque

```bash
# Logs Winston
docker exec node du -sh /var/log/myamana

# Données Loki
docker exec loki du -sh /loki
```

### Nettoyer les anciens logs manuellement

```bash
# Supprimer les logs > 30 jours
docker exec node find /var/log/myamana -name "*.log" -mtime +30 -delete
```

### Réinitialiser Loki (ATTENTION : supprime tous les logs)

```bash
docker-compose stop loki
docker volume rm myamana_loki-data
docker-compose up -d loki
```

## 📈 Métriques disponibles

### Logs HTTP
- Nombre de requêtes par endpoint
- Temps de réponse moyen/médian/p95/p99
- Taux d'erreur (4xx, 5xx)
- Requêtes par utilisateur

### Logs applicatifs
- Signups/Signins
- Actions bénévoles
- Erreurs par type
- Performance base de données

### Logs d'erreur
- Stack traces complètes
- Contexte d'exécution
- Utilisateur concerné
- Paramètres de la requête

## 🔒 Sécurité

### Ne PAS logger
- ❌ Mots de passe
- ❌ Tokens d'authentification
- ❌ Numéros de carte bancaire
- ❌ Données personnelles sensibles

### À logger
- ✅ Email utilisateur (pour traçabilité)
- ✅ IP (anonymisée en production si RGPD)
- ✅ Actions business
- ✅ Erreurs et contexte

## 🌍 Production

### Variables d'environnement importantes

```env
# Niveau de log en production
NODE_ENV=production
LOG_LEVEL=info

# Identifiants Grafana
GRAFANA_ADMIN_USER=admin_prod
GRAFANA_ADMIN_PASSWORD=mot_de_passe_securise

# URL de votre serveur (pour les logs)
URL_ORIGIN=https://v2.myamana.fr
```

### Recommandations production

1. **Changer les identifiants Grafana** par défaut
2. **Restreindre l'accès** à Grafana (IP whitelist ou VPN)
3. **Surveiller l'espace disque** régulièrement
4. **Configurer des alertes** sur Slack/Email
5. **Sauvegarder** les dashboards Grafana
6. **Activer HTTPS** sur Grafana (via nginx)

## 📞 Support

En cas de problème :

1. Vérifier les logs Docker : `docker-compose logs loki promtail grafana`
2. Vérifier que les volumes sont montés correctement
3. Vérifier les permissions sur `/var/log/myamana/`
4. Redémarrer les services : `docker-compose restart loki promtail grafana`

## 📚 Ressources

- [Documentation Winston](https://github.com/winstonjs/winston)
- [Documentation Loki](https://grafana.com/docs/loki/latest/)
- [Documentation Grafana](https://grafana.com/docs/grafana/latest/)
- [LogQL (langage de requête Loki)](https://grafana.com/docs/loki/latest/logql/)
