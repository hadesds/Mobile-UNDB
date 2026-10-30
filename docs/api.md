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
| `me/perfil/` | GET (perfil completo, `completude`, `secoes`, `arquivo`) |
| `me/perfil/formacoes/` | GET, POST, PUT, PATCH, DELETE |
| `me/perfil/experiencias/` | idem |
| `me/perfil/competencias/` | idem. POST aceita `competencia` (id) **ou** `termo` (resolvido por nome/sinônimo) |
| `me/perfil/idiomas/` | idem |
| `me/perfil/cursos/` | idem |

Cada aluno só enxerga e altera os próprios itens (outros ids retornam 404).
Datas: `fim` não pode ser anterior a `inicio`. Competência e idioma não repetem.

### Currículo em arquivo (PDF ou DOCX)

| Rota | Método | Notas |
|---|---|---|
| `me/perfil/arquivo/` | POST | multipart com `arquivo` (PDF ou `.docx`, até 5 MB e 30 páginas). Lê todas as páginas (no Word, também tabelas, listas e cabeçalho) e devolve 201 com `{arquivo, texto, sugestoes}`. Um arquivo por aluno: o novo substitui o anterior. `.doc` antigo, PDF escaneado (sem texto), PDF com senha → 400 com a mensagem em `arquivo` |
| `me/perfil/arquivo/` | GET | `{arquivo, texto, sugestoes}`: o texto completo lido e as sugestões recalculadas (vocabulário e perfil atuais). 404 se não houver arquivo |
| `me/perfil/arquivo/` | DELETE | apaga o registro e o arquivo do disco |
| `me/perfil/arquivo/original/` | GET | o arquivo como foi enviado (`?baixar=1` para download) |
| `me/perfil/importar/` | POST | `{formacoes, experiencias, competencias, idiomas, cursos}` com os campos de cada seção. Cria os válidos, ignora repetidos e devolve `{criados, ignorados, erros, perfil}` |

A extração é por regras, no próprio servidor (o arquivo não vai para serviços externos):
títulos de seção usuais (Formação, Experiência, Projetos, Habilidades, Idiomas, Cursos,
Voluntariado...), datas em vários formatos (`03/2024`, `mar 2024`, `2022.1`, "atual"),
competências pelo vocabulário (nome e sinônimos, no texto inteiro), idiomas com nível
(`B2`, "avançado", "fluente") e contato (e-mail, telefone, LinkedIn, GitHub; só informativo).
Cada sugestão traz `trecho` (de onde veio), `faltando` (campos obrigatórios não achados) e
`ja_existe`. Nada entra no perfil sem o aluno confirmar pelo `importar/`. Os arquivos ficam
em `MEDIA_ROOT` (padrão `media/`), fora do acesso público.

## Catálogos

| Rota | Acesso | Notas |
|---|---|---|
| `GET cursos/` | público | só cursos ativos, sem paginação |
| `GET competencias/?q=&categoria=` | logado | busca por nome ou sinônimo, paginada |
| `GET opcoes/` | público | valores válidos de idiomas, níveis, tipos e modalidades de vaga etc. |

## Empresas e vagas

| Rota | Acesso | Notas |
|---|---|---|
| `GET empresas/` | gestor, admin | filtros `q`, `ativa` |
| `POST/PUT/PATCH/DELETE empresas/` | admin | DELETE só sem vagas cadastradas (409 caso contrário: desative) |
| `GET vagas/`, `GET vagas/{id}/` | aluno | só `aberta` e no prazo. Sem contato da empresa, gestor ou status. Filtros `tipo, modalidade, curso, q` |
| `GET/POST/PUT/PATCH vagas/` | gestor | todas as vagas, filtro `status`. Sem DELETE (405). Cada vaga traz `candidaturas: {total, aguardando}` |

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

## Triagem (gestor)

| Rota | Método | Notas |
|---|---|---|
| `gestor/painel/` | GET | resumo do painel: candidaturas aguardando decisão por vaga, vagas abertas, encaminhadas em 30 dias |
| `vagas/{id}/candidatos/` | GET | `{requisitos, contagem, candidatos}`. Candidatos ordenados por score (maior primeiro), **nunca filtrados por nota**. Filtro `?status=` |
| `gestor/candidaturas/{id}/` | GET | candidato completo: vaga, análise, histórico e currículo (`curriculo = null` se o aluno revogou o termo LGPD) |
| `gestor/candidaturas/{id}/decidir/` | POST | `{status, observacao?}`. `encaminhada`/`em_processo` criam o encaminhamento; `analisada` desfaz e volta para a fila |

## Administração (perfil admin ou superusuário)

| Rota | Método | Notas |
|---|---|---|
| `admin/resumo/` | GET | contagens de pessoas, candidaturas por status, consentimento LGPD, vagas e convênios que pedem atenção |
| `admin/usuarios/` | GET, PATCH | filtros `perfil`, `ativo`, `q` (nome, e-mail, matrícula). `ativo=false` bloqueia o login; não é possível desativar a própria conta. Sem DELETE |
| `admin/usuarios/` | POST | cria **gestor**: `{nome, email, password, nucleo, cargo?}` |
| `admin/nucleos/` | GET | núcleos de carreiras, sem paginação |
| `admin/competencias/` | CRUD | filtros `q` (nome ou sinônimo), `categoria`, `ativa`. `sinonimos` (lista) substitui os anteriores; `em_uso` indica currículos/vagas. DELETE em uso → 409 |
| `admin/cursos/` | CRUD | sem paginação. DELETE com alunos → 409 |

## Paginação e erros

Listas paginadas: `{count, next, previous, results}` (`?page=`, `?page_size=` até 100).
Erros de validação: 400 com `{campo: [mensagens]}`. 401 sem/expirado token, 403 sem permissão.

## Exemplo

```bash
curl -s localhost:8000/api/v1/auth/login/ -H 'Content-Type: application/json' \
  -d '{"email":"ana@aluno.undb.edu.br","password":"Senha-Forte-123"}'
```