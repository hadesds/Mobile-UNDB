#!/bin/sh
# Entrypoint do container de desenvolvimento do backend.
# 1) aplica as migrações; 2) roda o seed se SEED_DEMO=1; 3) executa o comando do container.
# O seed roda em segundo plano: com o banco remoto (Supabase) ele leva minutos e, rodando
# antes do servidor, o Render não detecta a porta aberta e derruba o deploy.
set -e

echo "[entrypoint] Aplicando migrações..."
python manage.py migrate --noinput

if [ "${SEED_DEMO:-0}" = "1" ]; then
  echo "[entrypoint] SEED_DEMO=1: populando dados de demonstração..."
  python manage.py seed &
fi

exec "$@"