FROM melo_dj_admin:1.2.0

WORKDIR /home/app/dj-admin

COPY ./dj-admin ./

RUN chmod +x /home/app/dj-admin/start.bash

ENTRYPOINT ["/home/app/dj-admin/start.bash"]
