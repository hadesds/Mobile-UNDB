# TEIA · Currículo Sob Medida — Backend

API (Django) do aplicativo mobile **Currículo Sob Medida**, desenvolvido na disciplina
Programação Mobile (Engenharia de Software · UNDB · 2026.2) para o **Núcleo de Carreiras TEIA**.

O app compara o currículo do aluno com os requisitos de cada vaga, devolve feedback ao
aluno e entrega ao gestor do TEIA uma lista de candidatos ordenada por compatibilidade,
com justificativa. **A decisão final é sempre humana.**

> Estado atual: modelos de dados e admin prontos. API REST, autenticação por token e
> motor de compatibilidade ainda não foram implementados.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | Django 5.2 + Django REST Framework |
| Banco | PostgreSQL 17 (SQLite como alternativa rápida em dev) |
| Frontend (outro repositório/pasta) | React Native + Expo |
| Containers | Docker + Docker Compose (ambiente de desenvolvimento) |

## Pré-requisitos

- Docker e Docker Compose (caminho recomendado)
- Opcional, para rodar fora do Docker: Python 3.14 (mesma versão do `Dockerfile.dev`)

## Primeiros passos (Docker — recomendado)

```bash
# 1. clonar e entrar na pasta
git clone <url-do-repositorio> MobileUNDB
cd MobileUNDB

# 2. criar o arquivo de variáveis de ambiente
cp .env.example .env

# 3. subir banco + backend (aplica as migrações automaticamente)
docker compose -f docker-compose.dev.yml up --build

# 4. em outro terminal: criar o superusuário do admin
docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
```

Pronto: o admin fica em <http://localhost:8000/admin/>.

Dica: para não digitar `-f` sempre, use um alias:

```bash
alias dcdev='docker compose -f docker-compose.dev.yml'
```

### Comandos do dia a dia

```bash
dcdev up -d                                   # sobe em segundo plano
dcdev logs -f backend                         # acompanha os logs
dcdev exec backend python manage.py shell     # shell do Django
dcdev exec backend python manage.py makemigrations backend
dcdev exec backend python manage.py migrate
dcdev down                                    # para os containers (dados ficam no volume)
```

O código é montado por volume dentro do container, então o servidor recarrega sozinho
ao salvar arquivos.

## Rodando sem Docker (venv)

```bash
# sobe só o banco no Docker
docker compose -f docker-compose.dev.yml up -d db

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # POSTGRES_HOST deve ser "localhost"
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Para usar SQLite (sem Postgres), deixe `POSTGRES_DB` vazio no `.env`.

## Variáveis de ambiente (`.env`)

| Variável | Descrição | Padrão no `.env.example` |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Chave secreta do Django | `dev-only-troque-em-producao` |
| `DJANGO_DEBUG` | Modo debug | `True` |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos, separados por vírgula | `localhost,127.0.0.1` |
| `POSTGRES_DB` | Nome do banco. **Vazio = usa SQLite** | `teia` |
| `POSTGRES_USER` | Usuário do banco | `postgres` |
| `POSTGRES_PASSWORD` | Senha do banco | `postgres` |
| `POSTGRES_HOST` | Host do banco (no compose é sobrescrito para `db`) | `localhost` |
| `POSTGRES_PORT` | Porta do banco | `5432` |

O `.env` **não** é versionado. Se a porta 5432 já estiver ocupada na sua máquina,
mude o mapeamento em `docker-compose.dev.yml` (ex.: `"5433:5432"`) e o `POSTGRES_PORT`.

## Estrutura do projeto

```
MobileUNDB/
├── backend/                  # app Django principal
│   ├── migrations/
│   ├── models/               # um arquivo por domínio, exportados em __init__.py
│   │   ├── faculdade.py      # Faculdade, Curso, NucleoCarreiras
│   │   ├── usuarios.py       # Usuario, Aluno, Gestor
│   │   ├── curriculo.py      # Competencia, PerfilCompetencias e seções
│   │   └── vagas.py          # Empresa, Vaga, Candidatura, Analise, Encaminhamento
│   └── admin.py
├── config/                   # settings, urls, wsgi/asgi
├── docs/
│   └── modelo-de-dados.md    # diagrama e dicionário de campos
├── Dockerfile.dev
├── docker-compose.dev.yml
├── .env.example
├── manage.py
└── requirements.txt
```

## Populando dados para testar (pelo admin)

A ordem importa por causa das chaves estrangeiras:

1. **Faculdade** → **Curso** → **Núcleo de carreiras**
2. **Usuário** com perfil *Gestor de vagas* → **Gestor** (vincula ao núcleo)
3. **Competências** (com **sinônimos**, ex.: "JS" → JavaScript)
4. **Empresa** → **Vaga** (com requisitos de competência e idioma)
5. **Usuário** com perfil *Aluno* → **Aluno** → **Perfil de competências**

Gestores só são criados pela administração (não existe auto-cadastro de gestor).

## Convenções

- **Usuário customizado:** `AUTH_USER_MODEL = "backend.Usuario"` (login por e-mail).
  Nunca importe `django.contrib.auth.models.User`; use `get_user_model()`.
  Essa configuração não pode mudar depois da primeira migração.
- **Models em pacote:** crie o model no arquivo do domínio e exporte em
  `backend/models/__init__.py`. Depois rode `makemigrations` e **commite a migração**.
- **Vocabulário de competências:** perfil do aluno e requisitos da vaga apontam para a
  mesma tabela `Competencia`. Use `Competencia.resolver("texto")` para achar por nome
  ou sinônimo (ignora acento, maiúsculas e espaços extras).
- **Campos em português** (nomes de models e campos), código e comentários também.

## Princípios do produto (não negociáveis)

1. A decisão final é humana: o gestor do TEIA decide quem é encaminhado.
2. Nenhum candidato é eliminado automaticamente; pontuação baixa só ordena.
3. Todo score vem com justificativa (requisitos atendidos e não atendidos).
4. LGPD: consentimento explícito no cadastro, finalidade clara, acesso restrito.
5. Simplicidade: enviar currículo, escolher vaga e entender o resultado em poucos passos.

## Modelo de dados

Diagrama e dicionário de campos em [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md).