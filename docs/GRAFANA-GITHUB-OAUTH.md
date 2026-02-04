# 🔐 Authentification GitHub OAuth2 pour Grafana

## Vue d'ensemble

Grafana est configuré pour utiliser **GitHub OAuth2** comme méthode d'authentification principale, offrant une sécurité renforcée avec support du 2FA/TOTP.

## 🎯 Avantages

- ✅ **Sécurité renforcée** : Si vous avez activé 2FA sur GitHub, il sera requis pour accéder à Grafana
- ✅ **Gratuit** : GitHub OAuth est totalement gratuit
- ✅ **Simple** : Une seule connexion pour dev et prod
- ✅ **Centralisé** : Gestion des accès via GitHub

## 🚀 Utilisation

### Première connexion

1. **Accéder à Grafana**
   - Dev : http://localhost:3001
   - Prod : https://acdlp.com/grafana

2. **Page de connexion**
   
   Vous verrez deux options :
   - **Sign in with GitHub** ← Recommandé
   - Login classique (admin/password) ← Fallback

3. **Connexion via GitHub**
   
   a. Cliquer sur **"Sign in with GitHub"**
   
   b. Vous serez redirigé vers GitHub pour autoriser l'application
   
   c. Si 2FA activé, GitHub demandera votre code
   
   d. Cliquer sur **"Authorize"**
   
   e. Retour automatique sur Grafana, connecté ! 🎉

### Connexions suivantes

Après la première autorisation :
- Cliquer sur "Sign in with GitHub"
- Redirection automatique (si déjà connecté à GitHub)
- Accès instantané à Grafana !

## 🔧 Configuration technique

### OAuth App GitHub

**Nom** : Grafana Myamana

**Homepage URL** : `https://acdlp.com`

**Callback URLs** :
- `http://localhost:3001/login/github` (dev)
- `https://acdlp.com/grafana/login/github` (prod)

### Variables d'environnement (.env)

```env
# GitHub OAuth (Grafana uniquement)
GITHUB_CLIENT_ID=Ov23liRf8UMfoV6DEu7S
GITHUB_CLIENT_SECRET=847e3508993be8eb43b8809f825a45fbff24f26b

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
```

### Configuration Grafana

**Dev (docker-compose.dev.yml)** :
```yaml
grafana:
  environment:
    - GF_SERVER_ROOT_URL=http://localhost:3001
    - GF_AUTH_GITHUB_ENABLED=true
    - GF_AUTH_GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
    - GF_AUTH_GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
    - GF_AUTH_GITHUB_ALLOW_SIGN_UP=true
    - GF_AUTH_DISABLE_LOGIN_FORM=false
```

**Prod (docker-compose.yml)** :
```yaml
grafana:
  environment:
    - GF_SERVER_ROOT_URL=https://acdlp.com/grafana
    - GF_AUTH_GITHUB_ENABLED=true
    - GF_AUTH_GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
    - GF_AUTH_GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
    - GF_AUTH_GITHUB_ALLOW_SIGN_UP=true
    - GF_AUTH_DISABLE_LOGIN_FORM=false
```

## 🛡️ Sécurité

### OAuth ne concerne QUE Grafana

**Important** : GitHub OAuth est **uniquement** pour Grafana (port 3001)

**Ne change PAS** :
- ❌ Votre application MyAmana
- ❌ Votre API Node.js
- ❌ PhpMyAdmin
- ❌ Votre système d'auth actuel (bénévoles, etc.)

### Méthodes d'authentification disponibles

1. **GitHub OAuth** (Recommandé)
   - Sécurisé avec 2FA
   - Simple et rapide

2. **Login classique** (Fallback)
   - Username : admin
   - Password : admin (ou celui du .env)

## 🔐 Activer 2FA sur GitHub

Pour une sécurité maximale :

1. Aller sur https://github.com/settings/security
2. Cliquer sur "Enable two-factor authentication"
3. Choisir "Authenticator app" (Google Authenticator, Authy, etc.)
4. Scanner le QR code
5. Valider avec un code

Une fois 2FA activé :
- ✅ Grafana demandera le code à chaque connexion
- ✅ Sécurité renforcée automatiquement

## 🔄 Gestion des accès

### Ajouter un utilisateur

L'utilisateur doit :
1. Avoir un compte GitHub
2. Se connecter à Grafana via "Sign in with GitHub"
3. Autoriser l'application au premier login

### Révoquer un accès

1. Aller sur https://github.com/settings/applications
2. Trouver "Grafana Myamana"
3. Cliquer sur "Revoke"

OU

Dans Grafana (admin) :
1. Configuration → Users
2. Supprimer l'utilisateur

## 🆘 Dépannage

### "Failed to authenticate"

**Causes possibles** :
- Client ID ou Secret incorrect
- Callback URL mal configuré sur GitHub
- Credentials pas dans le .env

**Solution** :
1. Vérifier `.env` contient bien GITHUB_CLIENT_ID et GITHUB_CLIENT_SECRET
2. Redémarrer Grafana : `docker restart grafana`

### "Redirect URI mismatch"

**Cause** : URL de callback incorrecte

**Solution** :
1. Aller sur https://github.com/settings/developers
2. Éditer l'OAuth App "Grafana Myamana"
3. Vérifier les URLs de callback :
   - `http://localhost:3001/login/github`
   - `https://acdlp.com/grafana/login/github`
4. **Pas de trailing slash !**

### "Ce site est inaccessible" après autorisation

**Cause** : `GF_SERVER_ROOT_URL` manquant ou incorrect

**Solution** :
1. Vérifier que `GF_SERVER_ROOT_URL` est défini dans docker-compose :
   - Dev : `http://localhost:3001`
   - Prod : `https://acdlp.com/grafana`
2. Redémarrer Grafana : `docker restart grafana`

### Utiliser le login classique

Si GitHub OAuth ne fonctionne pas :

1. Sur la page de connexion, ignorer "Sign in with GitHub"
2. Remplir :
   - Username : `admin`
   - Password : `admin` (ou celui du .env)
3. Connexion classique

## 📝 Notes

- **Même OAuth App** fonctionne en dev ET prod (callback URLs multiples)
- **2FA GitHub** = 2FA Grafana automatique
- **Pas de coût** supplémentaire
- **Login classique** toujours disponible en fallback
- **GF_SERVER_ROOT_URL** est critique pour que les redirects fonctionnent

## 🔗 Liens utiles

- [Gérer mes OAuth Apps](https://github.com/settings/developers)
- [Sécurité GitHub](https://github.com/settings/security)
- [Documentation Grafana OAuth](https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/github/)
