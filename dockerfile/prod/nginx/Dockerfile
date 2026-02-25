FROM base_melo_nginx:1.0.0

RUN mkdir -p /etc/letsencrypt/ && \
    mkdir -p /var/www/static/

COPY ./nginx.conf /etc/nginx/nginx.conf


ENTRYPOINT ["nginx", "-g", "daemon off;"]