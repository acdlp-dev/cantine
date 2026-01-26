# Page de Maintenance pour MyAmana

Ce dossier contient la page HTML de maintenance qui sera affichée aux utilisateurs lorsque le site est en maintenance.

## Comment activer/désactiver le mode maintenance

Le mode maintenance est activé par la présence d'un fichier flag. Si le fichier `/var/www/maintenance/maintenance.flag` existe dans le conteneur Nginx, toutes les requêtes sont redirigées vers la page de maintenance, sauf pour les adresses IP autorisées.

### Pour activer le mode maintenance

Créez le fichier flag dans le conteneur Nginx:

```bash
docker exec nginx touch /var/www/maintenance/maintenance.flag
```

### Pour désactiver le mode maintenance

Supprimez le fichier flag du conteneur Nginx:

```bash
docker exec nginx rm -f /var/www/maintenance/maintenance.flag
```

### Pour vérifier l'état du mode maintenance

Vérifiez si le fichier flag existe dans le conteneur Nginx:

```bash
docker exec nginx test -f /var/www/maintenance/maintenance.flag && echo "Mode maintenance ACTIVÉ" || echo "Mode maintenance DÉSACTIVÉ"
```

## Comment connaître votre adresse IP

Pour ajouter votre adresse IP à la liste des adresses autorisées, vous devez d'abord la connaître. Voici plusieurs méthodes:

### Méthode 1: Utiliser un service en ligne

Visitez l'un de ces sites web:
- [whatismyip.com](https://www.whatismyip.com/)
- [ifconfig.me](https://ifconfig.me/)
- [ipinfo.io](https://ipinfo.io/)

### Méthode 2: Utiliser la ligne de commande

Sur Linux/Mac:
```bash
curl ifconfig.me
```
ou
```bash
curl ipinfo.io
```

Sur Windows (PowerShell):
```powershell
(Invoke-WebRequest -uri "http://ifconfig.me/ip").Content
```

### Méthode 3: Vérifier dans les logs Nginx

Si vous avez déjà accédé au site, votre adresse IP est probablement dans les logs Nginx:

```bash
docker exec nginx grep -o '[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}' /var/log/nginx/access.log | sort | uniq
```

## Comment autoriser des adresses IP spécifiques

Les adresses IP autorisées sont définies dans une variable `$allowed_ips` dans chaque fichier de configuration Nginx (`nginx.conf`, `nginx.dev.conf` et `nginx.staging.conf`):

```nginx
# Liste des adresses IP autorisées pendant la maintenance
# Ajoutez vos adresses IP ici, séparées par des |
set $allowed_ips "127.0.0.1|192.168.1.100";
```

Pour autoriser une adresse IP, ajoutez-la à cette liste en la séparant des autres par le caractère `|`. Par exemple:

```nginx
set $allowed_ips "127.0.0.1|192.168.1.100|203.0.113.42|198.51.100.17";
```

Après avoir modifié la liste des adresses IP autorisées, redémarrez le conteneur Nginx:

```bash
docker-compose restart nginx
```

## Comment tester que votre IP est bien autorisée

1. Activez le mode maintenance:
   ```bash
   docker exec nginx touch /var/www/maintenance/maintenance.flag
   ```

2. Ajoutez votre adresse IP à la liste des adresses autorisées dans les fichiers de configuration Nginx.

3. Redémarrez Nginx:
   ```bash
   docker-compose restart nginx
   ```

4. Accédez au site depuis votre navigateur. Si vous voyez le site normal (et non la page de maintenance), cela signifie que votre adresse IP est correctement autorisée.

5. Pour vérifier que la page de maintenance s'affiche pour les autres utilisateurs, vous pouvez:
   - Utiliser un VPN pour changer votre adresse IP
   - Demander à quelqu'un d'autre d'accéder au site
   - Utiliser un proxy web anonyme

## Comment fonctionne cette solution

Les fichiers de configuration Nginx (`nginx.conf`, `nginx.dev.conf` et `nginx.staging.conf`) ont été modifiés pour inclure une directive qui vérifie la présence du fichier flag et l'adresse IP du visiteur:

```nginx
# Configuration pour la page de maintenance
# Si le fichier maintenance.flag existe ET que l'IP n'est pas dans la liste des autorisées, afficher la page de maintenance
if (-f /var/www/maintenance/maintenance.flag) {
    set $maintenance 1;
}

# Vérifier si l'IP du client est dans la liste des IPs autorisées
if ($remote_addr ~ ^($allowed_ips)$) {
    set $maintenance 0;
}

if ($maintenance = 1) {
    rewrite ^(.*)$ /maintenance.html break;
}
```

Cette directive vérifie si le fichier `/var/www/maintenance/maintenance.flag` existe. Si c'est le cas, elle vérifie ensuite si l'adresse IP du visiteur est dans la liste des adresses IP autorisées. Si l'adresse IP n'est pas autorisée, toutes les requêtes sont redirigées vers la page de maintenance.

## Personnaliser la page de maintenance

Vous pouvez personnaliser la page de maintenance en modifiant le fichier `maintenance.html`. Vous pouvez changer le texte, le style, ajouter des images, etc.
