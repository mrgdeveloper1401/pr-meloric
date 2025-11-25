FROM docker.arvancloud.ir/node:24-alpine

COPY ./package.json .

LABEL maintainer="mysum325g@gmail.com"

RUN npm i && \
    npm audit fix
