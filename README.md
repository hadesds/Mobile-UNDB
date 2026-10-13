# Mobile-UNDB

Utilizar para subir local:
`docker compose -f docker-compose.dev.yml up --build`
`docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser`
`docker compose -f docker-compose.dev.yml logs -f backend`
`docker compose -f docker-compose.dev.yml down`

ou usar a variavel no .env pra não digitar -f toda vez
COMPOSE_FILE=docker-compose.dev.yml