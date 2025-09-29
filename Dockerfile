FROM meloric:1.1.0

WORKDIR /home/app

COPY . .

RUN npm i && \
    npm audit fix

ENTRYPOINT [ "npm", "run", "start" ]