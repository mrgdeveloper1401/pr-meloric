FROM melo_dj_admin:1.1.0

WORKDIR /home/app

COPY ./dj-admin ./dj-admin/

RUN chmod +x ./dj-admin/start.bash

ENTRYPOINT ["./dj-admin/start.bash"]
