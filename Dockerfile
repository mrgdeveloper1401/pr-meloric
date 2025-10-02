FROM meloric:1.1.0

WORKDIR /home/app

COPY . .

ENTRYPOINT [ "npm", "run", "start" ]