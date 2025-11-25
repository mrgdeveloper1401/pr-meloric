FROM base_melo_nodejs:3.0.0

WORKDIR /home/app

COPY . .

ENTRYPOINT [ "npm", "run", "start" ]