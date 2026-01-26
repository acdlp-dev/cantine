# 📊 Dashboards Grafana MyAmana

## Vue d'ensemble

Ce document décrit les dashboards Grafana disponibles pour monitorer l'application MyAmana.

## 🎯 Dashboard : MyAmana API Overview

Dashboard principal pour surveiller l'API Node.js de MyAmana.

### 📈 Panels inclus

#### 1. Total Requests (Stat)
Affiche le nombre total de requêtes HTTP reçues pendant la période sélectionnée.

**Requête LogQL** :
```logql
sum(count_over_time({service="myamana-api"} [$__range]))
```

**Indicateurs de seuil** :
- 🟢 Vert : < 1000 requêtes
- 🟡 Jaune : 1000-5000 requêtes
- 🔴 Rouge : > 5000 requêtes

---

#### 2. Status Code Distribution (Pie Chart)
Répartition des requêtes par code HTTP (200, 400, 404, 500, etc.).

**Requête LogQL** :
```logql
sum by (status) (count_over_time({service="myamana-api"} | json | status != "" [$__range]))
```

**Utilité** : Identifier rapidement les problèmes (pics de 4xx ou 5xx).

---

#### 3. Request Rate (Time Series)
Évolution du trafic API en requêtes par seconde.

**Requête LogQL** :
```logql
sum(rate({service="myamana-api"} [$__rate_interval]))
```

**Utilité** : 
- Détecter les pics de charge
- Identifier les heures de pointe
- Repérer les anomalies de trafic

---

#### 4. Response Time (Time Series)
Temps de réponse moyen de l'API en millisecondes.

**Requête LogQL** :
```logql
avg(avg_over_time({service="myamana-api"} | json | unwrap responseTime [$__rate_interval]))
```

**Indicateurs de seuil** :
- 🟢 Vert : < 500ms (Bon)
- 🟡 Jaune : 500-1000ms (Acceptable)
- 🔴 Rouge : > 1000ms (Problème)

**Utilité** : Détecter les dégradations de performance.

---

#### 5. Top 10 Most Called Endpoints (Bar Chart)
Les 10 endpoints les plus sollicités.

**Requête LogQL** :
```logql
topk(10, sum by (url) (count_over_time({service="myamana-api"} | json | url != "" [$__range])))
```

**Utilité** :
- Identifier les routes critiques
- Optimiser les endpoints les plus utilisés
- Détecter les abus potentiels

---

#### 6. Recent Errors (Logs)
Affichage en temps réel des 50 dernières erreurs.

**Requête LogQL** :
```logql
{service="myamana-api"} | json | level="error"
```

**Utilité** : Debugging en temps réel.

---

## 🚀 Accès au dashboard

### URL
- **Dev** : http://localhost:3001
- **Prod** : https://v2.myamana.fr/grafana

### Connexion
1. Cliquer sur "Sign in with GitHub"
2. Autoriser l'application
3. Le dashboard "MyAmana API Overview" apparaît automatiquement

### Navigation
1. Menu latéral → **Dashboards**
2. Sélectionner **"MyAmana API Overview"**

---

## ⚙️ Configuration

### Auto-refresh
Le dashboard se rafraîchit automatiquement toutes les **30 secondes**.

Pour modifier :
1. Cliquer sur l'icône de rafraîchissement (en haut à droite)
2. Choisir l'intervalle : 5s, 10s, 30s, 1m, etc.

### Période de temps
Par défaut : **Dernière heure** (`now-1h` → `now`)

Pour modifier :
1. Cliquer sur le sélecteur de temps (en haut à droite)
2. Choisir : Last 5m, 15m, 1h, 6h, 24h, etc.
3. Ou définir une période personnalisée

---

## 📚 Requêtes LogQL utiles

### Filtrer par niveau de log
```logql
{service="myamana-api"} | json | level="info"
{service="myamana-api"} | json | level="warn"
{service="myamana-api"} | json | level="error"
```

### Filtrer par endpoint spécifique
```logql
{service="myamana-api"} | json | url=~"/api/benevoles.*"
```

### Rechercher un message spécifique
```logql
{service="myamana-api"} | json | message =~ ".*database.*"
```

### Compter les erreurs par endpoint
```logql
sum by (url) (count_over_time({service="myamana-api"} | json | level="error" [1h]))
```

### Temps de réponse par endpoint
```logql
avg by (url) (avg_over_time({service="myamana-api"} | json | unwrap responseTime [5m]))
```

### Requêtes lentes (> 1000ms)
```logql
{service="myamana-api"} | json | responseTime > 1000
```

---

## 🎨 Personnalisation du dashboard

### Ajouter un nouveau panel

1. Cliquer sur **"Add"** → **"Visualization"**
2. Sélectionner **Loki** comme datasource
3. Écrire la requête LogQL
4. Choisir le type de visualisation :
   - **Time series** : Graphiques temporels
   - **Stat** : Valeur unique
   - **Bar chart** : Barres horizontales/verticales
   - **Pie chart** : Camembert
   - **Logs** : Liste de logs
5. Configurer l'apparence
6. Sauvegarder

### Modifier un panel existant

1. Survoler le panel
2. Cliquer sur le titre → **"Edit"**
3. Modifier la requête ou les options
4. **"Apply"** puis sauvegarder le dashboard

### Dupliquer le dashboard

1. Menu du dashboard → **"Settings"** (⚙️)
2. **"Save As"**
3. Donner un nouveau nom
4. Sauvegarder

---

## 🔔 Alertes (Future)

Pour configurer des alertes :

### Exemple : Alerte sur le taux d'erreur

```yaml
Condition: 
  sum(rate({service="myamana-api"} | json | level="error" [5m])) > 10

Action:
  - Envoyer email
  - Notification Slack
  - SMS
```

### Exemple : Alerte sur le temps de réponse

```yaml
Condition:
  avg(avg_over_time({service="myamana-api"} | json | unwrap responseTime [5m])) > 1000

Action:
  - Notification immediate
```

---

## 💡 Bonnes pratiques

### 1. Surveillance quotidienne
- Vérifier le dashboard **1x par jour**
- Surveiller les tendances
- Repérer les anomalies tôt

### 2. Analyse post-incident
- Utiliser le sélecteur de temps pour revenir à l'incident
- Analyser les logs d'erreur
- Identifier la cause racine

### 3. Optimisation continue
- Identifier les endpoints lents
- Optimiser le code
- Mesurer l'amélioration

### 4. Documentation
- Noter les incidents dans un journal
- Documenter les solutions
- Améliorer la résilience

---

## 🆘 Dépannage

### Panel vide ou "No data"

**Causes possibles** :
1. Aucun log généré pendant la période
2. Promtail ne collecte pas les logs
3. Loki ne reçoit pas les données

**Solutions** :
```bash
# Vérifier que Promtail fonctionne
docker logs promtail

# Vérifier que Loki fonctionne  
docker logs loki

# Vérifier qu'il y a des logs
ls -la /var/log/myamana/

# Générer du trafic pour créer des logs
curl http://localhost:4242/api/health
```

### Requête trop lente

**Solution** : Réduire la période de temps analysée
- Au lieu de "Last 24h", essayer "Last 1h"
- Ou affiner les filtres LogQL

### Dashboard ne se charge pas

```bash
# Redémarrer Grafana
docker restart grafana

# Vérifier les logs
docker logs grafana
```

---

## 📖 Ressources

- [Documentation LogQL](https://grafana.com/docs/loki/latest/logql/)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [Loki Labels](https://grafana.com/docs/loki/latest/fundamentals/labels/)

---

## 📝 Changelog

### v1.0 - 2024-11-24
- ✅ Dashboard initial créé
- ✅ 6 panels configurés
- ✅ Auto-provisioning activé
- ✅ Documentation complète
