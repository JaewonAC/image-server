# FixtureInspector

## Requirement ##
### Linux ###
Follow instruction in
https://www.tensorflow.org/install/docker

### Windows ###
 - Docker

#### If you want to run server yourself ####
1. Install python 3.7.5
2. In 'config' directory, run
    pip install -r requirements.txt
    pip install tensorflow==2.1.0
3. In 'jalabel_site' directory, run
```
    python manage.py makemigrations jalabel_app
    python manage.py migrate
    python manage.py runserver
```
4. For GPU support, follow instruction below
https://www.tensorflow.org/install/gpu


## How to start ##
 1. move to parent directory you want to place project
 2. git clone https://gitlab.cybermed.co.kr/jaewonac/fixtureinspector.git
 3. cd fixtureinspector
 4. docker-compose up.
 5. wait about 5 minute.
 6. visit http://localhost:8000/dashboard

## Future Work ##
- seperate Docker to development and product
https://www.codementor.io/@samueljames/nginx-setting-up-a-simple-proxy-server-using-docker-and-python-django-f7hy4e6jv

## References ##
- dockerizing django project
https://ruddra.com/posts/docker-django-nginx-postgres/