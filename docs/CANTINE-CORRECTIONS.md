# Cantine Associations - Corrections & Mise en service

Document de suivi des corrections apportees a l'interface cantine des associations partenaires.
Date de session : 3 mars 2026.

---

## Description du projet

L'interface **Cantine** permet aux associations partenaires d'ACDLP de :
- Creer un compte (SIREN + document justificatif)
- Commander des repas solidaires avec un systeme de quotas journaliers
- Consulter l'historique de leurs commandes
- Modifier ou annuler leurs commandes (jusqu'a la veille de livraison)
- Consulter les menus de la semaine

**Stack** : Angular 18 (frontend) / Node.js Express (backend) / MySQL 8 (BDD)
**Environnement de test** : frontend local (localhost:4200), backend local (localhost:4242), BDD distante bo.acdlp.com (217.160.141.182, base `acdlp`)

---

## Corrections appliquees

### 1. Configuration locale (serveur Node)

**Probleme** : Le backend crashait au demarrage en local (chemins Docker hardcodes).

**Corrections** :
- **Logger** (`server/node/config/logger.js`) : Le repertoire de logs etait hardcode a `/var/log/cantine/`. Ajout d'un chemin conditionnel selon `NODE_ENV` (local = `./logs/`, prod = `/var/log/cantine/`).
- **Dotenv** (`server/node/server.js`) : Le chemin `.env` pointait vers `/usr/src/app/.env` (Docker). Ajout d'une resolution relative pour le dev local.

### 2. Contrainte UNIQUE sur RNA (inscription)

**Probleme** : L'inscription echouait avec `Duplicate entry '' for key 'Assos.siren_assos_unique'`. La contrainte UNIQUE etait sur la colonne `rna` (et non `siren` malgre le nom), et `rna` avait un defaut vide `''`.

**Corrections** :
- Suppression de la contrainte UNIQUE `siren_assos_unique` sur la table `Assos` (en BDD)
- Changement du defaut de `rna` de `''` a `NULL`

### 3. Liens de verification email

**Probleme** : Les liens de verification dans les emails Mailjet pointaient vers `localhost` sans protocole.

**Correction** : `URL_ORIGIN` dans `.env` mis a `https://bo.acdlp.com`. Les liens generent maintenant des URLs de type `https://bo.acdlp.com/app/backoffice-auth/verify-email/token/{token}`.

> Note : En local, le testeur doit adapter manuellement l'URL du mail vers `http://localhost:4200/backoffice-auth/verify-email/token/{token}` (sans le prefixe `/app`).

### 4. Double card blanche (page confirmation)

**Probleme** : La page de confirmation email affichait une double card blanche (le `auth-layout` parent + le composant `confirmation` avaient chacun leur propre card).

**Correction** : Suppression des styles de card (background, border-radius, box-shadow, margin-top) dans `confirmation.component.scss` pour laisser le parent gerer l'affichage.

### 5. Horodatage des commandes

**Probleme** : Le champ `ajout` dans la table `Commandes` ne stockait que la date (heure = `00:00:00`).

**Correction** (`server/node/routes/cantine.js`) : Remplacement de `.toISOString().split('T')[0]` par `.toISOString().slice(0, 19).replace('T', ' ')` pour stocker date + heure.

### 6. Statuts de commande manquants

**Probleme** : Certains statuts (`en_attente`, `confirmee`, `en_preparation`) affichaient "Inconnu" dans la liste des commandes.

**Correction** (`historique_commandes.component.ts`) : Ajout des cases manquants dans `getStatutLabel()` et `getStatutClass()`.

### 7. Commandes annulees disparaissaient de la liste

**Probleme** : Apres annulation, la commande etait retiree de la liste au lieu d'etre marquee "Annulee".

**Correction** (`historique_commandes.component.ts`) : Remplacement de `splice(idx, 1)` par une mise a jour du statut a `'annulee'` dans le tableau local.

### 8. Commandes annulees consommaient encore le quota

**Probleme** : La requete SQL de calcul des disponibilites ne filtrait que le statut `blocked`, pas `annulee`.

**Correction** (`server/node/routes/cantine.js`) : Ajout de `'annulee'` dans la clause `NOT IN` :
```sql
WHERE livraison = ? AND statut NOT IN ("blocked", "annulee")
```

### 9. Disponibilites a 0 dans la modale de modification

**Probleme** : Quand une association modifiait sa commande, le champ "Repas disponibles" affichait 0 (ou un chiffre faux). Deux bugs combines :

1. **Format de date** : `commande.livraison` arrive du backend en ISO datetime (`2026-03-05T23:00:00.000Z`). La fonction `toIso()` ne gerait que `yyyy-MM-dd` et `dd/MM/yyyy`, donc elle renvoyait `null` et le format brut etait envoye a l'API, causant un mismatch de date.

2. **Decalage timezone** : `2026-03-05T23:00:00.000Z` correspond au `2026-03-06` en heure locale (France). Un simple `split('T')[0]` aurait donne la mauvaise date.

**Correction** (`historique_commandes.component.ts`) :
- Ajout dans `toIso()` d'un traitement des dates ISO datetime via `new Date(dateStr)` avec extraction de la date locale (getFullYear/getMonth/getDate), ce qui respecte le timezone.
- L'affichage des disponibles montre maintenant le resultat direct de l'API (repas restants reellement disponibles pour la date).

---

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `server/node/server.js` | Chemin .env conditionnel (Docker vs local) |
| `server/node/config/logger.js` | Repertoire logs conditionnel |
| `server/node/routes/cantine.js` | Horodatage ajout, filtre annulee dans quotas |
| `client/.../historique_commandes.component.ts` | Statuts, annulation UI, toIso() timezone, disponibilites |
| `client/.../historique_commandes.component.html` | Label disponibilites |
| `shared/.../confirmation.component.scss` | Suppression double card |
| BDD `Assos` | Suppression contrainte UNIQUE rna, defaut NULL |

---

## Questions en suspens

### 1. Transition automatique des statuts de commande

Actuellement, quand une association cree une commande, elle passe en statut `en_attente`. La transition vers `a_preparer` (et les autres statuts du cycle de vie) est geree par une **application externe d'administration** (non presente dans ce repo).

**Questions** :
- Quelle application gere ces transitions ? Est-ce un cron, une interface admin, ou un processus manuel ?
- Le cycle complet attendu est-il : `en_attente` -> `a_preparer` -> `a_deposer` -> `a_recuperer` -> `recupere` / `non_recupere` ?
- A quel moment interviennent les statuts `confirmee` et `en_preparation` ?
- Faut-il implementer certaines transitions automatiques cote cantine (ex: passage automatique a `a_preparer` a J-2) ?

### 2. Prefixe `/app` en production vs local

En production, Nginx sert Angular sous `/app/*`. En local (`ng serve`), il n'y a pas ce prefixe. Les liens dans les emails (verification, reset password) sont generes avec `/app/...`. Pour tester en local, il faut modifier manuellement l'URL.

**Question** : Faut-il ajouter une configuration pour gerer ce prefixe automatiquement selon l'environnement ?

### 3. Validation admin (doubleChecked)

Le champ `doubleChecked` dans `onboarding_backoffice` bloque le login tant qu'il vaut `false` (message "Votre compte est en cours de traitement"). Il est mis a `false` a l'inscription et doit etre passe a `true` manuellement (via phpMyAdmin ou appli admin externe) pour que l'association puisse se connecter. Ce controle n'intervient qu'au login, pas a la commande.
