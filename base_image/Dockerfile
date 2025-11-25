FROM docker.arvancloud.ir/node:24-alpine

RUN npm install -g pnpm

COPY ./package.json .

LABEL maintainer="mysum325g@gmail.com"

RUN pnpm i && \
    pnpm audit fix
