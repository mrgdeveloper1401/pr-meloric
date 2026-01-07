FROM base_melo_nodejs:3.0.0

WORKDIR /home/app

COPY . .

RUN chmod +x ./scripts/* 

EXPOSE 8000

ENTRYPOINT ["/home/app/scripts/start.sh"]