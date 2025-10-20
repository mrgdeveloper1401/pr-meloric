FROM melo_nginx:1.0.0

RUN mkdir -p certbot/api.meloricdns.com && \
    mkdir -p /var/www/static/flower && \
    mkdir -p /var/log/nginx

COPY ./certbot/api.meloricdns.com/* /certbot/api.meloricdns.com/

COPY ./nginx.conf /etc/nginx/nginx.conf

ENTRYPOINT ["nginx", "-g", "daemon off;"]