FROM docker.arvancloud.ir/node:24-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json ./

LABEL maintainer="mysum325g@gmail.com"

RUN pnpm install --prod

RUN pnpm store prune
