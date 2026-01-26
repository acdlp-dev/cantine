#!/bin/bash

if ! [ -x "$(command -v docker-compose)" ]; then
  echo 'Error: docker-compose is not installed.' >&2
  exit 1
fi

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <staging|prod> <domain> <docker-compose-file>"
  exit 1
fi

mode=$1
domain=$2
docker_compose_file=$3

rsa_key_size=4096
data_path="./certbot"
email="rachidboulsane@gmail.com"
staging=1

if [ "$mode" = "prod" ]; then
  echo "Mode production activé. Un vrai certificat SSL sera généré."
  staging=0
fi

if [ -d "$data_path" ]; then
  read -p "Des données existantes ont été trouvées pour $domain. Continuer et remplacer le certificat existant ? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

mkdir -p "$data_path/conf"
mkdir -p "$data_path/www"

echo "### Activation du bootstrap NGINX pour ACME..."
cp ./nginx/nginx.bootstrap.conf ./nginx/current.conf

echo "### Démarrage nginx (bootstrap)..."
docker-compose -f "$docker_compose_file" up --force-recreate -d nginx

echo "### Demande du certificat Let's Encrypt pour $domain ..."
domain_args="-d $domain"

if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker-compose -f "$docker_compose_file" run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    --email $email \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot

echo "### Restauration du nginx staging..."
cp ./nginx/nginx.staging.conf ./nginx/current.conf

echo "### Rechargement final de nginx..."
docker-compose -f "$docker_compose_file" up --force-recreate -d nginx

echo "### Installation terminée !"
