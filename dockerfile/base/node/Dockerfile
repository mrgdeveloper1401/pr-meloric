FROM docker.arvancloud.ir/node:24-alpine

COPY . .

WORKDIR /home/app

LABEL maintainer="mysum325g@gmail.com"

RUN cp /dev/null /etc/apk/repositories && \
    echo "https://mirror.mobinhost.com/alpine/v3.22/main" >> /etc/apk/repositories && \
    echo "https://mirror.mobinhost.com/alpine/v3.22/community" >> /etc/apk/repositories && \
    apk update && \
    apk upgrade && \
    apk add --no-cache bash postgresql17-client curl gcc musl-dev linux-headers libpq && \
    npm install -g npm@latest && \
    npm install -g typescript@latest && \
    # npm i -g @adminjs/cli && \
    npm i