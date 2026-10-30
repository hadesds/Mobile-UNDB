# TEIA · Currículo Sob Medida

Backend (Django), app mobile (Expo) e site de apresentação do **Currículo Sob Medida**, aplicativo desenvolvido na disciplina
Programação Mobile (Engenharia de Software · UNDB · 2026.2) para o **Núcleo de Carreiras TEIA**.

O app compara o currículo do aluno com os requisitos de cada vaga, devolve feedback ao
aluno e entrega ao gestor do TEIA uma lista de candidatos ordenada por compatibilidade,
com justificativa. **A decisão final é sempre humana.**

> Estado atual: modelos, admin, API REST com JWT, motor de compatibilidade por regras
> (provisório), seed de demonstração, app mobile e site de apresentação com download do APK.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | Django 5.2 + Django REST Framework |
| Banco | PostgreSQL 17 (SQLite como alternativa rápida em dev) |
| App mobile (`frontend/`) | React Native + Expo SDK 58 + TypeScript |
| Site de apresentação (`site/`) | HTML + CSS estático, servido por nginx |
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

# 3. subir banco + backend + site (aplica as migrações e, com SEED_DEMO=1, popula dados de demo)
docker compose -f docker-compose.dev.yml up --build

# 4. em outro terminal: criar o superusuário do admin
docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
```

Pronto:

| Serviço | Endereço |
| --- | --- |
| Admin do Django | <http://localhost:8000/admin/> |
| API | <http://localhost:8000/api/v1/> |
| Site de apresentação | <http://localhost:8080> |
| PostgreSQL | `localhost:5432` |

Com `SEED_DEMO=1` (padrão do `.env.example`) já existem usuários de teste; veja
[Dados de demonstração](#dados-de-demonstração-seed).

Dica: o `.env.example` já define `COMPOSE_FILE=docker-compose.dev.yml`, então
`docker compose up` funciona sem `-f`. Outra opção é um alias:

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
ao salvar arquivos. O mesmo vale para o site: editou algo em `site/`, é só recarregar a página.

Ao subir, o container do backend roda `docker/entrypoint.dev.sh`: aplica as migrações e,
se `SEED_DEMO=1`, executa `python manage.py seed`.

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
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos, separados por vírgula (inclua o IP da máquina para testar no celular) | `localhost,127.0.0.1,IP_WIN` |
| `POSTGRES_DB` | Nome do banco. **Vazio = usa SQLite** | `teia` |
| `POSTGRES_USER` | Usuário do banco | `postgres` |
| `POSTGRES_PASSWORD` | Senha do banco | `postgres` |
| `POSTGRES_HOST` | Host do banco (no compose é sobrescrito para `db`) | `localhost` |
| `POSTGRES_PORT` | Porta do banco | `5432` |
| `COMPOSE_FILE` | Arquivo usado pelo `docker compose` (dispensa o `-f`) | `docker-compose.dev.yml` |
| `ALUNO_EMAIL_DOMINIOS` | Domínios aceitos no auto-cadastro. Vazio = qualquer e-mail | `aluno.undb.edu.br` |
| `JWT_ACCESS_MINUTES` | Validade do access token (minutos) | `30` (padrão do settings) |
| `JWT_REFRESH_DAYS` | Validade do refresh token (dias) | `7` (padrão do settings) |
| `SEED_DEMO` | `1` = popula dados de demonstração ao subir o container | `1` |
| `SEED_SENHA` | Senha dos usuários criados pelo seed (só na criação) | `Teia@Demo2026` |

O `.env` **não** é versionado. Se a porta 5432 já estiver ocupada na sua máquina,
mude o mapeamento em `docker-compose.dev.yml` (ex.: `"5433:5432"`) e o `POSTGRES_PORT`.
O mesmo vale para a 8080 do site (ex.: `"8081:80"`).

## Estrutura do projeto

```
MobileUNDB/
├── backend/                  # app Django principal
│   ├── api/                  # API REST (DRF): serializers, views, urls, permissões
│   ├── management/           # comando `seed` e dados fictícios (seed_dados.py)
│   ├── migrations/
│   ├── models/               # um arquivo por domínio, exportados em __init__.py
│   │   ├── faculdade.py      # Faculdade, Curso, NucleoCarreiras
│   │   ├── usuarios.py       # Usuario, Aluno, Gestor
│   │   ├── curriculo.py      # Competencia, PerfilCompetencias e seções
│   │   └── vagas.py          # Empresa, Vaga, Candidatura, Analise, Encaminhamento
│   ├── tests/                # testes da API, candidaturas e seed
│   ├── compatibilidade.py    # motor de compatibilidade por regras
│   └── admin.py
├── config/                   # settings, urls, wsgi/asgi
├── docker/
│   └── entrypoint.dev.sh     # migrações + seed ao subir o container
├── docs/
│   ├── api.md                # endpoints da API
│   ├── modelo-de-dados.md    # diagrama e dicionário de campos
│   └── conectar-expo-qrcode.md  # rodar o app no celular (WSL + Expo Go)
├── frontend/                 # app mobile (Expo / React Native)
├── site/                     # site de apresentação + download do APK
│   ├── index.html
│   ├── styles.css
│   └── downloads/            # coloque aqui o curriculo-sob-medida.apk
├── Dockerfile.dev
├── docker-compose.dev.yml    # serviços: db, backend, site
├── .env.example
├── manage.py
└── requirements.txt
```

## Dados de demonstração (seed)

Com `SEED_DEMO=1` o seed roda sozinho ao subir o backend. Para rodar na mão:

```bash
dcdev exec backend python manage.py seed               # cria/atualiza tudo
dcdev exec backend python manage.py seed --sem-usuarios
```

É idempotente: pode rodar várias vezes; senhas de usuários existentes não são alteradas.
Cria faculdade, cursos, o núcleo TEIA, competências com sinônimos, empresas, vagas e
usuários. Logins (senha = `SEED_SENHA`, padrão `Teia@Demo2026`):

| Perfil | E-mail |
| --- | --- |
| Admin | `admin@undb.edu.br` |
| Gestor do TEIA | `gestor.teia@undb.edu.br` |
| Aluno | `marina.costa@aluno.undb.edu.br` (há outros alunos `@aluno.undb.edu.br`) |

## Populando dados na mão (pelo admin)

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

## API (backend)

Autenticação JWT (simplejwt). Prefixo `/api/v1/`. Documentação completa dos
endpoints em [docs/api.md](docs/api.md).

```bash
pip install -r requirements.txt
python manage.py migrate        # inclui as tabelas de blacklist do JWT
python manage.py test           # testes de API, candidaturas e seed
```

As variáveis da API (`ALUNO_EMAIL_DOMINIOS`, `JWT_*`) estão na tabela de
[variáveis de ambiente](#variáveis-de-ambiente-env).

### Motor de compatibilidade

`backend/compatibilidade.py` compara o perfil do aluno com os requisitos da vaga
(competências e idiomas). Cada requisito recebe um status (`encontrado`, `diferente` ou
`nao_identificado`) com detalhe, e o score é a fração de requisitos com evidência.
**Provisório:** pesos e faixas ainda serão validados com o TEIA. O resultado só orienta;
nunca aprova nem elimina ninguém.

## Frontend (React Native + Expo)

Pasta `frontend/` (Expo SDK 58, TypeScript). Requer Node 20+.

```bash
cd frontend
npm install
echo "EXPO_PUBLIC_API_URL=http://localhost:8000" > .env   # ver opções abaixo
npx expo start
```

Valores de `EXPO_PUBLIC_API_URL` (comentados em `src/lib/env.ts`):

- Emulador Android: `http://10.0.2.2:8000`
- Simulador iOS / Expo Web: `http://localhost:8000`
- Celular físico: `http://<IP-da-sua-máquina>:8000` (o IP também precisa estar em `DJANGO_ALLOWED_HOSTS`)

Para rodar no celular com Expo Go (Windows + WSL2), siga
[docs/conectar-expo-qrcode.md](docs/conectar-expo-qrcode.md).

Estrutura de `frontend/src`:

| Pasta | Conteúdo |
| --- | --- |
| `api/` | chamadas HTTP por domínio (auth, vagas, currículo, candidaturas, cursos) |
| `pages/` | telas: Login, Cadastro, Vagas, VagaDetalhe, Currículo, Candidaturas, Conta |
| `components/` | `Ui/` (botões, campos, chips…), `Layout/`, `Movimento/` (animações) e componentes por domínio |
| `lib/` | cliente da API, autenticação, navegação, armazenamento, `env.ts` |
| `constants/` | tema visual (`theme.ts`) e texto do termo LGPD (`termos.ts`) |
| `hooks/`, `utils/`, `types/` | hooks, formatação/compatibilidade e tipos compartilhados |

## Site de apresentação e download do APK

Pasta `site/`: página estática que apresenta o app e tem o botão para baixar o APK.
Sobe junto com o compose (serviço `site`, nginx) em <http://localhost:8080>. Sem Docker:

```bash
cd site && python3 -m http.server 8080
```

**Publicar o APK:** os botões apontam para `site/downloads/curriculo-sob-medida.apk`.
Enquanto o arquivo não existir, a página desativa os botões e mostra "disponível em breve".
Para gerar o APK com o EAS:

```bash
cd frontend
npx eas-cli login
npx eas-cli build -p android --profile preview   # perfil com "buildType": "apk" no eas.json
```

Salve o arquivo gerado como `site/downloads/curriculo-sob-medida.apk`. Para um link
público, publique a pasta `site/` em hospedagem estática (Netlify, GitHub Pages, Vercel).
Ao lançar versão nova, atualize o texto "versão 1.0.0" em `site/index.html`.
Detalhes em [site/README.md](site/README.md).
