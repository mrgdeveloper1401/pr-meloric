FROM base_melo_nodejs:3.0.0

WORKDIR /home/app

COPY . .

RUN pnpm install --dev && \
    chmod +x ./scripts/* 

ENTRYPOINT ["/home/app/scripts/start.sh"]