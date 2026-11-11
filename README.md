# TEIA · Currículo Sob Medida

Backend (Django), app mobile (Expo) e site de apresentação do **Currículo Sob Medida**, aplicativo desenvolvido na disciplina
Programação Mobile (Engenharia de Software · UNDB · 2026.2) para o **Núcleo de Carreiras TEIA**.

O app compara o currículo do aluno com os requisitos de cada vaga, devolve feedback ao
aluno e entrega ao gestor do TEIA uma lista de candidatos ordenada por compatibilidade,
com justificativa. **A decisão final é sempre humana.**

> **Estado atual:** API REST com JWT, motor de compatibilidade por regras (faixas
> provisórias), modelo de currículo por vaga com formulário de candidatura já preenchido,
> importação de currículo em PDF/Word, envio de vagas pelas empresas por link, armazenamento
> de arquivos no Supabase Storage, seed de demonstração, app mobile (aluno, gestor do TEIA e
> administração) e site de apresentação com download do APK.
>
> Como as peças se encaixam e o andamento de cada tarefa do time:
> [`docs/arquitetura.md`](docs/arquitetura.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [`docs/arquitetura.md`](docs/arquitetura.md) | visão geral, fluxos principais, onde mexer para cada coisa, status das tarefas T0–T6 |
| [`docs/api.md`](docs/api.md) | todos os endpoints, com formatos de entrada e saída |
| [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md) | diagrama e dicionário de campos |
| [`docs/conectar-expo-qrcode.md`](docs/conectar-expo-qrcode.md) | rodar o app no celular (WSL + Expo Go) |
| [`solicitacoes/README.md`](solicitacoes/README.md) | módulo de envio de vagas pelas empresas (links com token) |
| [`site/README.md`](site/README.md) | site de apresentação, APK e deploy na Vercel |
| [`PRODUCT.md`](PRODUCT.md) / [`DESIGN.md`](DESIGN.md) | produto (público, princípios) e sistema visual do app |

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | Django 5.2 + Django REST Framework + simplejwt |
| Banco | PostgreSQL 17 (Supabase em produção; SQLite como alternativa rápida em dev) |
| Arquivos enviados | disco local em dev; Supabase Storage (API S3, `django-storages`) em produção |
| App mobile (`frontend/`) | React Native + Expo SDK 58 + TypeScript |
| Site de apresentação (`site/`) | HTML + CSS estático, servido por nginx |
| Containers | Docker + Docker Compose (ambiente de desenvolvimento) |
| Deploy | Render (backend) + Supabase (banco e storage) + Vercel (site) |

## Pré-requisitos

- Docker e Docker Compose (caminho recomendado)
- Opcional, para rodar fora do Docker: Python 3.14 (mesma versão do `Dockerfile.dev`)
- Para o app: Node 20+

## Primeiros passos (Docker, recomendado)

```bash
# 1. clonar e entrar na pasta
git clone <url-do-repositorio> MobileUNDB
cd MobileUNDB

# 2. criar o arquivo de variáveis de ambiente
cp .env.example .env

# 3. subir banco + backend + site (aplica as migrações e, com SEED_DEMO=1, popula dados de demo)
docker compose -f docker-compose.dev.yml up --build

# 4. em outro terminal: criar o superusuário do admin (opcional: o seed já cria um admin)
docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser
```

Pronto:

| Serviço | Endereço |
| --- | --- |
| Admin do Django | <http://localhost:8000/admin/> |
| API | <http://localhost:8000/api/v1/> |
| Formulário de vagas para empresas | `http://localhost:8000/empresas/vagas/<token>/` |
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
dcdev exec backend python manage.py test      # roda os testes
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
python manage.py seed       # opcional: dados de demonstração
python manage.py runserver
```

Para usar SQLite (sem Postgres), deixe `POSTGRES_DB` vazio no `.env`.

## Variáveis de ambiente (`.env`)

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Chave secreta do Django | `.env.example`: `senha-forte-para-docker` |
| `DJANGO_DEBUG` | Modo debug (sem a variável = `False`) | `True` |
| `DJANGO_ALLOWED_HOSTS` | Hosts permitidos, separados por vírgula (inclua o IP da máquina para testar no celular) | `localhost,127.0.0.1,IP_WIN` |
| `CSRF_TRUSTED_ORIGINS` | Origens confiáveis para formulários (admin, página das empresas) | vazio |
| `CORS_ALLOWED_ORIGINS` | Origens liberadas para o Expo Web | `http://localhost:8081` |
| `DATABASE_URL` | URI do banco (produção). Tem prioridade sobre `POSTGRES_*` | vazio |
| `POSTGRES_DB` | Nome do banco. **Vazio (e sem `DATABASE_URL`) = usa SQLite** | `teia` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Usuário e senha do banco | `postgres` / `postgres` |
| `POSTGRES_HOST` / `POSTGRES_PORT` | Host e porta (no compose o host vira `db`) | `localhost` / `5432` |
| `COMPOSE_FILE` | Arquivo usado pelo `docker compose` (dispensa o `-f`) | `docker-compose.dev.yml` |
| `ALUNO_EMAIL_DOMINIOS` | Domínios aceitos no auto-cadastro, separados por vírgula | `aluno.undb.edu.br` |
| `JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS` | Validade dos tokens | `30` min / `7` dias |
| `SEED_DEMO` | `1` = popula dados de demonstração ao subir o container | `1` |
| `SEED_SENHA` | Senha dos usuários criados pelo seed (só na criação) | `Teia@Demo2026` |
| `SOLICITACOES_FORMULARIO_URL` | Página externa do formulário das empresas. Vazio = usa a página do próprio Django | vazio |
| `FORMULARIO_EMPRESA_THROTTLE` / `GERAR_LINK_EMPRESA_THROTTLE` | Limites do formulário público e da geração de links | `30/min` / `60/hour` |
| `MEDIA_ROOT` | Pasta dos arquivos enviados quando não há Supabase Storage | `<projeto>/media` |
| `SUPABASE_STORAGE_BUCKET` | Bucket **privado** do Supabase Storage. **Vazio = arquivos ficam no disco** | vazio |
| `SUPABASE_S3_ENDPOINT` | `https://<project-ref>.supabase.co/storage/v1/s3` | vazio |
| `SUPABASE_S3_REGION` | Região do projeto no Supabase | `us-east-1` |
| `SUPABASE_S3_ACCESS_KEY_ID` / `SUPABASE_S3_SECRET_ACCESS_KEY` | Chave de Storage › Settings › S3 Connection | vazio |

O `.env` **não** é versionado. Se a porta 5432 já estiver ocupada na sua máquina,
mude o mapeamento em `docker-compose.dev.yml` (ex.: `"5433:5432"`) e o `POSTGRES_PORT`.
O mesmo vale para a 8080 do site (ex.: `"8081:80"`).

## Estrutura do projeto

```
MobileUNDB/
├── backend/                     # app Django principal
│   ├── api/                     # API REST (DRF): serializers, views, urls, permissões, paginação
│   ├── management/              # comando `seed` e dados fictícios (seed_dados.py)
│   ├── migrations/
│   ├── models/                  # um arquivo por domínio, exportados em __init__.py
│   │   ├── faculdade.py         # Faculdade, Curso, NucleoCarreiras
│   │   ├── usuarios.py          # Usuario, Aluno, Gestor
│   │   ├── curriculo.py         # Competencia, PerfilCompetencias e seções, ArquivoCurriculo
│   │   ├── vagas.py             # Empresa, Vaga, Candidatura, Analise, Encaminhamento
│   │   └── modelo_curriculo.py  # ModeloCurriculo, CampoModelo, RespostaCandidatura
│   ├── tests/                   # testes da API, candidaturas, formulário, gestão, importação e seed
│   ├── compatibilidade.py       # motor de compatibilidade por regras
│   ├── formulario_candidatura.py  # monta o formulário da vaga e valida as respostas
│   ├── leitura_curriculo.py     # lê PDF/DOCX e sugere seções do perfil
│   └── admin.py
├── solicitacoes/                # módulo de envio de vagas pelas empresas (links com token)
├── config/                      # settings, urls, wsgi/asgi
├── docker/
│   └── entrypoint.dev.sh        # migrações + seed ao subir o container (também usado no Render)
├── docs/                        # arquitetura, API, modelo de dados, Expo no celular
├── frontend/                    # app mobile (Expo / React Native)
├── site/                        # site de apresentação + download do APK
├── Dockerfile.dev
├── docker-compose.dev.yml       # serviços: db, backend, site
├── render.yaml                  # deploy do backend no Render
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
Cria faculdade, cursos, o núcleo TEIA, competências com sinônimos, empresas, 6 vagas (cada
uma com o seu **modelo de currículo**) e usuários. Logins (senha = `SEED_SENHA`, padrão
`Teia@Demo2026`):

| Perfil | E-mail |
| --- | --- |
| Admin | `admin@undb.edu.br` |
| Gestor do TEIA | `gestor.teia@undb.edu.br` |
| Aluno | `marina.costa@aluno.undb.edu.br` (há outros alunos `@aluno.undb.edu.br`) |

Os dados ficam em `backend/management/seed_dados.py`; as perguntas de cada vaga, em
`MODELOS_CURRICULO` no mesmo arquivo.

## O que cada perfil faz no app

- **Aluno:** monta o currículo (ou importa um PDF/Word e confere as sugestões), vê as vagas
  abertas, abre o formulário da vaga já preenchido com os dados do perfil, responde às
  perguntas da vaga e recebe a análise de compatibilidade com nota, justificativa e feedback.
  Acompanha a etapa de cada candidatura.
- **Gestor do TEIA:** cadastra e publica vagas, gera links para empresas enviarem vagas,
  vê o ranking de candidatos com a evidência de cada requisito e as respostas do formulário,
  e decide a etapa de cada candidatura.
- **Admin:** cria gestores, ativa ou desativa contas e mantém empresas, competências (com
  sinônimos) e cursos, sem precisar do admin do Django.

Gestores só são criados pela administração (não existe auto-cadastro de gestor).

## Populando dados na mão (pelo admin do Django)

A ordem importa por causa das chaves estrangeiras:

1. **Faculdade** → **Curso** → **Núcleo de carreiras**
2. **Usuário** com perfil *Gestor de vagas* → **Gestor** (vincula ao núcleo)
3. **Competências** (com **sinônimos**, ex.: "JS" → JavaScript)
4. **Empresa** → **Vaga** (com requisitos de competência e idioma)
5. **Modelo de currículo** da vaga, com os campos que ela pede (opcional: sem modelo, a vaga
   ganha um padrão só com os campos de perfil quando o primeiro aluno abrir o formulário)
6. **Usuário** com perfil *Aluno* → **Aluno** → **Perfil de competências**

## Convenções

- **Usuário customizado:** `AUTH_USER_MODEL = "backend.Usuario"` (login por e-mail).
  Nunca importe `django.contrib.auth.models.User`; use `get_user_model()`.
  Essa configuração não pode mudar depois da primeira migração.
- **Models em pacote:** crie o model no arquivo do domínio e exporte em
  `backend/models/__init__.py`. Depois rode `makemigrations` e **commite a migração**.
- **Migrações combinadas:** avise o time antes de criar uma migração. Duas pessoas criando
  migrações ao mesmo tempo geram conflito de numeração.
- **Regra de negócio fora das views:** lógica com regras próprias fica em módulos de serviço
  (`compatibilidade.py`, `formulario_candidatura.py`, `leitura_curriculo.py`,
  `solicitacoes/services.py`); as views só orquestram.
- **Vocabulário de competências:** perfil do aluno e requisitos da vaga apontam para a
  mesma tabela `Competencia`. Use `Competencia.resolver("texto")` para achar por nome
  ou sinônimo (ignora acento, maiúsculas e espaços extras).
- **Arquivos:** use `FileField` e `.open()`/`.delete()`; nunca `.path` (não existe no
  Supabase Storage).
- **Campos em português** (nomes de models e campos), código e comentários também.
- **Fluxo do time:** uma branch por tarefa (ex.: `feat/t1-certificados`), PR para
  `01-backend` revisado por outra pessoa.

## Princípios do produto (não negociáveis)

1. A decisão final é humana: o gestor do TEIA decide quem é encaminhado.
2. Nenhum candidato é eliminado automaticamente; pontuação baixa só ordena.
3. Todo score vem com justificativa (requisitos atendidos e não atendidos).
4. LGPD: consentimento explícito no cadastro, finalidade clara, acesso restrito.
5. Simplicidade: enviar currículo, escolher vaga e entender o resultado em poucos passos.

## API (backend)

Autenticação JWT (simplejwt). Prefixo `/api/v1/`. Documentação completa dos
endpoints em [docs/api.md](docs/api.md).

```bash
pip install -r requirements.txt
python manage.py migrate        # inclui as tabelas de blacklist do JWT
python manage.py test           # testes do backend e do módulo solicitacoes
```

### Motor de compatibilidade

`backend/compatibilidade.py` compara o perfil do aluno com os requisitos da vaga (curso,
semestre mínimo, competências e idiomas). Cada requisito recebe um status (`encontrado`,
`diferente` ou `nao_identificado`) com detalhe. O score é a fração de requisitos com
evidência, todos com o mesmo peso.

| Faixa | Score |
| --- | --- |
| Alta | 75% ou mais |
| Média | 50% a 74% |
| Baixa | abaixo de 50% |

A resposta traz **nota** (`score` + `faixa`), **justificativa** (quantos requisitos têm
evidência e quais obrigatórios faltam) e **feedback** (o que revisar no currículo).
**Provisório:** pesos e faixas ainda serão confirmados com o TEIA. As faixas ficam em
`Analise.FAIXA_*` (`backend/models/vagas.py`) e são repetidas no app em
`frontend/src/utils/compatibilidade.ts`. O resultado só orienta; nunca aprova nem elimina
ninguém.

### Formulário de candidatura ("cada vaga tem um currículo")

Cada vaga tem um `ModeloCurriculo` com a lista de campos que ela pede. Campos **de perfil**
(nome, curso, competências...) chegam preenchidos e editáveis; campos **específicos da vaga**
(portfólio, motivação...) chegam em branco. O app busca o formulário em
`GET vagas/{id}/formulario/` e envia as respostas junto com a candidatura em
`POST candidaturas/`. Formato completo em [docs/api.md](docs/api.md#formulário-de-candidatura-cada-vaga-tem-um-currículo).

## Deploy do backend (Render + Supabase)

Backend no **Render** (plano grátis); banco e arquivos no **Supabase**. A configuração
está em [`render.yaml`](render.yaml).

1. **Banco (Supabase):** crie um projeto e anote a senha do banco. Em **Connect → Connection
   string**, copie a URI do **Session pooler** (porta 5432, host `aws-...pooler.supabase.com`).
   Não use a "Direct connection": ela só funciona via IPv6, e o Render não tem saída IPv6.
   Troque `[YOUR-PASSWORD]` pela senha.
2. **Arquivos (Supabase Storage):** em **Storage**, crie um bucket **privado** (ex.: `arquivos`).
   Em **Storage → Settings → S3 Connection**, gere uma chave de acesso e anote o endpoint e a
   região.
3. **Render:** **New → Blueprint**, escolha este repositório e a branch. Ele lê o `render.yaml`
   e pede `DATABASE_URL` (passo 1), `SEED_SENHA` e as variáveis `SUPABASE_*` (passo 2).
4. No primeiro deploy o start roda as migrações e o seed (`SEED_DEMO=1`). A API fica em
   `https://teia-api.onrender.com/api/v1/` (o nome pode variar se já existir).
5. **APK:** troque `EXPO_PUBLIC_API_URL` no `frontend/eas.json` pela URL do Render e gere o APK
   de novo.

Variáveis de produção (o `render.yaml` já declara todas):

| Variável | Valor |
| --- | --- |
| `DATABASE_URL` | URI do Session pooler do Supabase (SSL obrigatório) |
| `SUPABASE_STORAGE_BUCKET`, `SUPABASE_S3_*` | bucket e chave do passo 2 |
| `DJANGO_SECRET_KEY` | gerada pelo Render |
| `DJANGO_DEBUG` | `False` (padrão quando a variável não existe) |
| `DJANGO_ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS` | opcionais: o domínio `*.onrender.com` é incluído automaticamente |
| `SEED_DEMO` / `SEED_SENHA` | dados de demonstração |

Limitações do plano grátis:

- O serviço do Render **dorme após ~15 min sem uso**; a primeira requisição leva de 30 a 60 s.
  Antes de uma apresentação, abra a URL da API para acordá-lo.
- O projeto do Supabase **pausa após uma semana sem uso**; reative pelo painel.
- O disco do Render é temporário. **Sem as variáveis `SUPABASE_*`, os arquivos enviados
  (currículos) somem a cada deploy ou reinício.**

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
| `api/` | chamadas HTTP por domínio (auth, vagas, currículo, candidaturas, cursos, gestor, admin, envios) |
| `pages/` | telas do aluno (Login, Cadastro, Inicio (vagas + resumo das candidaturas), VagaDetalhe, Currículo, ImportarCurriculo, Candidaturas, CandidaturaDetalhe, Conta) |
| `pages/gestor/` | Painel, VagasGestor, VagaGestor (ranking), EditarVaga, CandidatoDetalhe, Envios |
| `pages/admin/` | VisaoGeral, Cadastros, Usuarios, Envios |
| `components/` | `Ui/` (botões, campos, chips…), `Layout/`, `Movimento/` (animações) e componentes por domínio |
| `lib/` | cliente da API, autenticação, candidaturas, navegação, armazenamento, `env.ts` |
| `constants/` | tema visual (`theme.ts`) e texto do termo LGPD (`termos.ts`) |
| `hooks/`, `utils/`, `types/` | hooks, formatação/compatibilidade e tipos compartilhados |

## Site de apresentação e download do APK

Pasta `site/`: página estática que apresenta o app e tem o botão para baixar o APK.
Sobe junto com o compose (serviço `site`, nginx) em <http://localhost:8080>. Sem Docker:

```bash
cd site && python3 -m http.server 8080
```

**APK:** os botões baixam o APK do release mais recente no GitHub
(`releases/latest/download/curriculo-sob-medida.apk`). Para publicar uma versão nova, gere
o APK com `npx eas-cli build -p android --profile preview` (em `frontend/`) e crie um release
com `gh release create` anexando o arquivo com esse nome exato.

**Deploy na Vercel:** importe o repositório com **Root Directory** = `site` e
**Framework Preset** = Other (sem build). Ao lançar versão nova, atualize o texto da
versão em `site/index.html`. Detalhes em [site/README.md](site/README.md).
