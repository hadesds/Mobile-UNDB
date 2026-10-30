# API · TEIA Currículo Sob Medida

Base: `/api/v1/` · JSON · Autenticação: `Authorization: Bearer <access>`.

## Autenticação

| Método | Rota | Acesso | Corpo / resposta |
|---|---|---|---|
| POST | `auth/register/` | público (20/min) | `email, nome, password, matricula, curso, periodo, aceite_lgpd` → 201 `{access, refresh, usuario}` |
| POST | `auth/login/` | público (20/min) | `email, password` → `{access, refresh, usuario}` |
| POST | `auth/refresh/` | público (20/min) | `refresh` → novo `access` e novo `refresh` (rotaciona) |
| POST | `auth/logout/` | logado | `refresh` → 204 (token vai para a blacklist) |
| GET | `me/` | logado | dados do usuário + aluno ou gestor |
| POST | `me/consentimento/` | aluno | `{aceito: bool}` aceita ou revoga o termo LGPD vigente |

Regras: o cadastro cria sempre perfil **aluno** (gestores só pelo admin);
e-mail restrito a `ALUNO_EMAIL_DOMINIOS`; `aceite_lgpd` deve ser `true`.

## Perfil do aluno (exige termo LGPD vigente → 403 caso contrário)

| Rota | Métodos |
|---|---|
| `me/perfil/` | GET (perfil completo, `completude`, `secoes`) |
| `me/perfil/formacoes/` | GET, POST, PUT, PATCH, DELETE |
| `me/perfil/experiencias/` | idem |
| `me/perfil/competencias/` | idem. POST aceita `competencia` (id) **ou** `termo` (resolvido por nome/sinônimo) |
| `me/perfil/idiomas/` | idem |
| `me/perfil/cursos/` | idem |

Cada aluno só enxerga e altera os próprios itens (outros ids retornam 404).
Datas: `fim` não pode ser anterior a `inicio`. Competência e idioma não repetem.

## Catálogos

| Rota | Acesso | Notas |
|---|---|---|
| `GET cursos/` | público | só cursos ativos, sem paginação |
| `GET competencias/?q=&categoria=` | logado | busca por nome ou sinônimo, paginada |
| `GET opcoes/` | público | valores válidos de idiomas, níveis, tipos e modalidades de vaga etc. |

## Empresas e vagas

| Rota | Acesso | Notas |
|---|---|---|
| `GET/POST/PUT/PATCH empresas/` | gestor | filtros `q`, `ativa`. Sem DELETE (405) |
| `GET vagas/`, `GET vagas/{id}/` | aluno | só `aberta` e no prazo. Sem contato da empresa, gestor ou status. Filtros `tipo, modalidade, curso, q` |
| `GET/POST/PUT/PATCH vagas/` | gestor | todas as vagas, filtro `status`. Sem DELETE (405) |

Vaga (gestor): `requisitos_competencia` e `requisitos_idioma` são aninhados; ao
enviar a lista, ela **substitui** a anterior (campo omitido = mantém). Para
`status = aberta` é preciso ao menos um requisito e prazo não vencido.

## Candidaturas (aluno com termo LGPD vigente)

| Rota | Método | Notas |
|---|---|---|
| `candidaturas/` | GET | candidaturas do próprio aluno, sem paginação. Filtro `?vaga=<id>` |
| `candidaturas/` | POST | `{vaga}` → 201 com a candidatura e a primeira análise. Vaga precisa estar aberta; uma candidatura por vaga |
| `candidaturas/{id}/` | GET | detalhe: `status`, `analise` (com `itens`), `historico`, `encaminhada_em` |
| `candidaturas/{id}/reanalisar/` | POST | nova análise com o currículo atual; as anteriores ficam no `historico` |

Cada item da análise: `requisito, categoria, tipo, status (encontrado | diferente | nao_identificado), detalhe, obrigatorio`.
`score` = requisitos com evidência ÷ requisitos cadastrados (mesmo peso); `faixa` segue
`Analise.FAIXA_*` (provisório). O status da candidatura só muda por decisão do gestor.

## Paginação e erros

Listas paginadas: `{count, next, previous, results}` (`?page=`, `?page_size=` até 100).
Erros de validação: 400 com `{campo: [mensagens]}`. 401 sem/expirado token, 403 sem permissão.

## Exemplo

```bash
curl -s localhost:8000/api/v1/auth/login/ -H 'Content-Type: application/json' \
  -d '{"email":"ana@aluno.undb.edu.br","password":"Senha-Forte-123"}'
```