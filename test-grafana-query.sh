#!/bin/bash

echo "=== Test 1: Vérifier que Grafana est accessible ==="
curl -s http://localhost:3001/api/health | head -20

echo -e "\n=== Test 2: Vérifier les datasources dans Grafana ==="
curl -s -u admin:admin http://localhost:3001/api/datasources | jq '.'

echo -e "\n=== Test 3: Vérifier les dashboards ==="
curl -s -u admin:admin http://localhost:3001/api/search | jq '.'

echo -e "\n=== Test 4: Requête directe à Loki depuis Grafana ==="
curl -s -u admin:admin -G http://localhost:3001/api/datasources/proxy/1/loki/api/v1/labels | jq '.'

echo -e "\n=== Test 5: Query logs depuis Grafana ==="
curl -s -u admin:admin -G http://localhost:3001/api/datasources/proxy/1/loki/api/v1/query \
  --data-urlencode 'query={job="myamana-api"}' \
  --data-urlencode 'limit=5' | jq '.data.result[0:2]'
