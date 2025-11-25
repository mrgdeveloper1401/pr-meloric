FROM docker.arvancloud.ir/node:24-alpine

RUN npm install -g pnpm typescript ts-node

WORKDIR /app

COPY package.json ./

LABEL maintainer="mysum325g@gmail.com"

RUN cp /dev/null /etc/apk/repositories && \
    echo "https://mirror.mobinhost.com/alpine/v3.22/main" >> /etc/apk/repositories && \
    echo "https://mirror.mobinhost.com/alpine/v3.22/community" >> /etc/apk/repositories && \
    apk update && \
    apk upgrade && \
    apk add bash && \
    pnpm install --prod


RUN pnpm add -D @types/node @types/express @types/cors @types/bcrypt @types/jsonwebtoken @types/multer

RUN pnpm store prune
