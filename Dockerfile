FROM nginx:1.16-alpine

USER root

RUN apk add --no-cache bash curl

COPY default.conf /etc/nginx/conf.d/default.conf
COPY index.php  /usr/share/nginx/html/index.php

EXPOSE 80/tcp
EXPOSE 443/tcp
EXPOSE 8080/tcp

CMD ["/bin/sh", "-c", "exec nginx -g 'daemon off;';"]

WORKDIR /usr/share/nginx/html

