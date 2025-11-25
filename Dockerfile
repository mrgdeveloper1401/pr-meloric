FROM base_melo_nodejs:1.0.0

WORKDIR /home/app

COPY ./melo .

ENTRYPOINT [ "npm", "run", "start" ]