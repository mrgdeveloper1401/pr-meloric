FROM docker.arvancloud.ir/node:24-alpine

WORKDIR /home/app

COPY ./melo .

RUN npm i && \
    npm audit fix