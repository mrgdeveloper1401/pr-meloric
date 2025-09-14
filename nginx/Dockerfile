FROM docker.arvancloud.ir/nginx:1.29-alpine

RUN mkdir -p certbot/api.meloricdns.com && \
    mkdir -p /var/www/static/

COPY ./certbot/api.meloricdns.com/* /certbot/api.meloricdns.com/

COPY ./nginx.conf /etc/nginx/nginx.conf

ENTRYPOINT ["nginx", "-g", "daemon off;"]