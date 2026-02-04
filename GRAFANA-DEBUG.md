# Guide de débogage Grafana - Voir les logs

## Étape 1: Accéder à Grafana
1. Ouvrez http://localhost:3001 dans votre navigateur
2. Connectez-vous avec:
   - Username: `admin`
   - Password: `admin`

## Étape 2: Aller dans "Explore"
1. Dans le menu de gauche, cliquez sur l'icône "boussole" (Explore)
2. En haut, sélectionnez la datasource "Loki" si ce n'est pas déjà fait

## Étape 3: Faire une requête simple
Dans le champ de requête, entrez:
```
{job="acdlp-api"}
```

Puis cliquez sur "Run query" (bouton bleu en haut à droite)

## Que devriez-vous voir?
- Une liste de logs en format JSON
- Des timestamps
- Les messages de vos logs

## Si vous ne voyez rien:

### Test 1: Vérifier que Loki reçoit des données
Dans un terminal, exécutez:
```bash
curl -s "http://localhost:3100/loki/api/v1/labels"
```

Vous devriez voir: `{"status":"success","data":["filename","job","level","service"]}`

### Test 2: Vérifier que les logs sont générés
```bash
# Générer du trafic
for i in {1..10}; do curl -s http://localhost:4242/api/test > /dev/null; done

# Vérifier les logs
docker exec node tail -20 /var/log/acdlp/application-*.log
```

### Test 3: Vérifier Promtail
```bash
docker logs promtail --tail 20
```

Vous devriez voir des lignes comme:
- "tail routine: started"
- "Adding target"

## Requêtes alternatives à essayer dans Grafana Explore:

1. **Tous les logs**:
   ```
   {job="acdlp-api"}
   ```

2. **Seulement les logs d'info**:
   ```
   {job="acdlp-api"} | json | level="info"
   ```

3. **Logs avec le mot "test"**:
   ```
   {job="acdlp-api"} |= "test"
   ```

4. **Compter les logs**:
   ```
   count_over_time({job="acdlp-api"}[5m])
   ```

## Si le dashboard ne fonctionne pas:

Le dashboard provisionné pourrait ne pas se charger. Créez un nouveau dashboard manuellement:

1. Dans Grafana, cliquez sur "+" → "Dashboard"
2. Cliquez sur "Add visualization"
3. Sélectionnez "Loki" comme datasource
4. Dans le champ de requête, entrez: `{job="acdlp-api"}`
5. Changez le type de visualisation en "Logs" (en haut à droite)
6. Cliquez sur "Apply"

Vous devriez maintenant voir vos logs!

## Plage de temps

⚠️ **IMPORTANT**: Vérifiez la plage de temps en haut à droite de Grafana!
- Assurez-vous qu'elle est réglée sur "Last 1 hour" ou "Last 6 hours"
- Pas "Last 5 minutes" car les logs de test peuvent être plus anciens

## Support supplémentaire

Si après tous ces tests vous ne voyez toujours rien, exécutez ce script de diagnostic:
```bash
./test-grafana-query.sh
```

Et partagez-moi le résultat.
