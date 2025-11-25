FROM base_melo_nginx:1.0.0

RUN mkdir -p certbot/api.meloricdns.com && \
    mkdir -p /etc/letsencrypt && \
    mkdir -p /var/www/static/flower && \
    mkdir -p /var/log/nginx

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf


ENTRYPOINT ["nginx", "-g", "daemon off;"]