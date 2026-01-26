# Configuration Nginx pour Grafana

## Modifications effectuées

J'ai ajouté la configuration Nginx pour router `/grafana/` vers le conteneur Grafana dans tous les environnements :

### 1. nginx.dev.conf (développement local)
### 2. nginx.staging.conf (v2.myamana.fr)
### 3. nginx.conf (www.myamana.fr)

## Configuration ajoutée

```nginx
location /grafana/ {
    proxy_pass http://grafana:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Support pour les WebSockets (nécessaire pour Grafana live updates)
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Application des changements en production

### Méthode 1: Redémarrage complet (recommandé)

```bash
# 1. Aller dans le répertoire du projet
cd /path/to/myamana

# 2. Pull les dernières modifications
git pull

# 3. Redémarrer Nginx
docker-compose restart nginx
```

### Méthode 2: Reload de la configuration (sans downtime)

```bash
# 1. Vérifier que la configuration est valide
docker exec nginx nginx -t

# 2. Si la configuration est valide, recharger Nginx
docker exec nginx nginx -s reload
```

### Méthode 3: Recréation du conteneur (si les méthodes précédentes ne fonctionnent pas)

```bash
docker-compose stop nginx
docker-compose rm -f nginx
docker-compose up -d nginx
```

## Vérification

Une fois Nginx redémarré, vérifiez que Grafana est accessible :

### Développement
- URL: http://localhost/grafana
- Login: `admin` / `admin`

### Staging
- URL: https://v2.myamana.fr/grafana
- Login: `admin` / `admin` (ou votre mot de passe configuré)

### Production
- URL: https://www.myamana.fr/grafana
- Login: Utilise GitHub OAuth (voir docs/GRAFANA-GITHUB-OAUTH.md)

## Dépannage

### Erreur 502 Bad Gateway

Si vous obtenez une erreur 502, vérifiez que Grafana est bien démarré :

```bash
docker ps | grep grafana
docker logs grafana
```

Si Grafana n'est pas démarré, lancez-le :

```bash
docker-compose up -d grafana
```

### Erreur 404 persiste

1. Vérifiez que la configuration Nginx a bien été rechargée :
```bash
docker logs nginx --tail 50
```

2. Vérifiez que le conteneur Grafana existe sur le même réseau que Nginx :
```bash
docker network inspect myamana_app-network
```

### Grafana ne se connecte pas à Loki

Si Grafana s'affiche mais ne peut pas se connecter à Loki :

1. Vérifiez que tous les services de monitoring sont démarrés :
```bash
docker ps | grep -E "loki|promtail|grafana"
```

2. Vérifiez les logs de Loki :
```bash
docker logs loki --tail 50
```

3. Dans Grafana, allez dans Configuration > Data Sources > Loki et testez la connexion

## Ports utilisés

- **Grafana**: Port 3001 (mapping externe) → 3000 (interne)
- **Loki**: Port 3100
- **Nginx**: Ports 80 (HTTP) et 443 (HTTPS)

## Notes importantes

1. **GitHub OAuth** : En production (www.myamana.fr), l'authentification par mot de passe admin est désactivée. Utilisez GitHub OAuth pour vous connecter. Voir `docs/GRAFANA-GITHUB-OAUTH.md` pour la configuration.

2. **Certificats SSL** : Les certificats Let's Encrypt doivent être valides pour que HTTPS fonctionne correctement.

3. **Réseau Docker** : Tous les services (nginx, grafana, loki, promtail) doivent être sur le même réseau Docker (`app-network`).
