#!/bin/bash

python manage.py collectstatic --noinput
python manage.py makemigrations
python manage.py migrate
gunicorn melo_music.wsgi -w 3 -b 0.0.0.0:8000
