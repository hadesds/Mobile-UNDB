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
| `me/perfil/arquivo/` | DELETE | apaga o registro e o arquivo guardado |
| `me/perfil/arquivo/original/` | GET | o arquivo como foi enviado (`?baixar=1` para download) |
| `me/perfil/importar/` | POST | `{formacoes, experiencias, competencias, idiomas, cursos}` com os campos de cada seção. Cria os válidos, ignora repetidos e devolve `{criados, ignorados, erros, perfil}` |

A extração é por regras, no próprio servidor (o arquivo não vai para serviços externos):
títulos de seção usuais (Formação, Experiência, Projetos, Habilidades, Idiomas, Cursos,
Voluntariado...), datas em vários formatos (`03/2024`, `mar 2024`, `2022.1`, "atual"),
competências pelo vocabulário (nome e sinônimos, no texto inteiro), idiomas com nível
(`B2`, "avançado", "fluente") e contato (e-mail, telefone, LinkedIn, GitHub; só informativo).
Cada sugestão traz `trecho` (de onde veio), `faltando` (campos obrigatórios não achados) e
`ja_existe`. Nada entra no perfil sem o aluno confirmar pelo `importar/`. Os arquivos ficam
no Supabase Storage (bucket privado) quando `SUPABASE_STORAGE_BUCKET` está definida; senão,
em `MEDIA_ROOT` (padrão `media/`). Nos dois casos ficam fora do acesso público: só saem pela API, com login.

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
| `vagas/{id}/formulario/` | GET | formulário de candidatura da vaga já preenchido com o perfil (ver abaixo) |
| `candidaturas/` | POST | `{vaga, respostas?}` → 201 com a candidatura, as respostas e a primeira análise. Vaga precisa estar aberta; uma candidatura por vaga |
| `candidaturas/{id}/` | GET | detalhe: `status`, `analise` (com `itens`), `historico`, `encaminhada_em`, `respostas` |
| `candidaturas/{id}/reanalisar/` | POST | nova análise com o currículo atual; as anteriores ficam no `historico` |

Cada item da análise: `requisito, categoria, tipo, status (encontrado | diferente | nao_identificado), detalhe, obrigatorio`.
`score` = requisitos com evidência ÷ requisitos cadastrados (mesmo peso). `faixa`:
**alta ≥ 75**, **media 50–74**, **baixa < 50** (`Analise.FAIXA_*`, falta confirmar com o TEIA).
A análise traz a nota (`score` + `faixa`), a `justificativa` (uma frase: quantos requisitos
têm evidência e quais obrigatórios faltam) e o `feedback_texto` (o que revisar no currículo).
O status da candidatura só muda por decisão do gestor.

### Formulário de candidatura ("cada vaga tem um currículo")

Cada vaga tem um modelo de currículo com a lista de campos que ela pede. Vaga sem
modelo ganha um padrão, só com os campos de perfil, na primeira vez que for aberta.

`GET vagas/{id}/formulario/`:

```json
{
  "vaga": 3,
  "instrucoes": "Seus dados do perfil já vieram preenchidos. Complete as perguntas da Lumen.",
  "candidatura": null,
  "campos": [
    {"chave": "nome", "rotulo": "Nome completo", "ajuda": "", "origem": "perfil",
     "formato": "texto", "obrigatorio": true, "valor": "Marina Costa", "autopreenchido": true},
    {"chave": "competencias", "rotulo": "Competências", "ajuda": "", "origem": "perfil",
     "formato": "texto_longo", "obrigatorio": false, "valor": "Git (avançado)\nReact (intermediário)", "autopreenchido": true},
    {"chave": "portfolio", "rotulo": "Link do GitHub ou portfólio", "ajuda": "Ex.: https://github.com/seu-usuario",
     "origem": "vaga", "formato": "url", "obrigatorio": true, "valor": "", "autopreenchido": false}
  ]
}
```

- `origem`: `perfil` = veio preenchido e é editável; `vaga` = pergunta específica, vem em branco (destacar).
- `formato`: `texto | texto_longo | numero | sim_nao | url`. Só muda o desenho; **o valor é sempre string**.
  `sim_nao` usa `"sim"`/`"nao"`. Listas do perfil vêm com uma linha por item (`\n`).
- Os campos chegam na ordem de exibição.
- `candidatura` preenchido = o aluno já se candidatou; `valor` passa a ser o que ele enviou.

`POST candidaturas/`:

```json
{"vaga": 3, "respostas": {"nome": "Marina Costa", "portfolio": "https://github.com/marina"}}
```

- Campo de perfil omitido = grava o valor do perfil. Campo de perfil alterado sai com `editado: true`.
- Erro de validação → 400 `{"respostas": {"portfolio": "Campo obrigatório."}}` (uma mensagem por chave;
  também para formato inválido e chave que não existe no formulário). Nada é gravado.
- **Transição:** sem `respostas` (app antigo) a candidatura ainda é aceita, sem exigir os
  obrigatórios da vaga. Remover quando a tela nova estiver no ar.

Respostas na candidatura (aluno e `gestor/candidaturas/{id}/`; para o gestor é `null` se o aluno revogou o termo LGPD):
`[{chave, rotulo, origem, valor, editado}]`. Rótulo e origem são copiados no envio, então a
resposta continua legível mesmo se o gestor mudar o modelo depois.

Modelos e campos são editados no Django admin (**Modelos de currículo**). O seed cria um
para cada uma das 6 vagas de demonstração (`seed_dados.MODELOS_CURRICULO`).

## Triagem (gestor)

| Rota | Método | Notas |
|---|---|---|
| `gestor/painel/` | GET | resumo do painel: candidaturas aguardando decisão por vaga, vagas abertas, encaminhadas em 30 dias |
| `vagas/{id}/candidatos/` | GET | `{requisitos, contagem, candidatos}`. Candidatos ordenados por score (maior primeiro), **nunca filtrados por nota**. Filtro `?status=` |
| `gestor/candidaturas/{id}/` | GET | candidato completo: vaga, análise, histórico, currículo e respostas do formulário (`curriculo` e `respostas` = `null` se o aluno revogou o termo LGPD) |
| `gestor/candidaturas/{id}/decidir/` | POST | `{status, observacao?}`. `encaminhada`/`em_processo` criam o encaminhamento; `analisada` desfaz e volta para a fila |

## Vagas enviadas por empresas (módulo `solicitacoes`)

A empresa não tem conta: a equipe do TEIA gera um **link com token** (um envio por link,
validade padrão de 7 dias, mín. 30 min, máx. 90 dias) e envia à empresa. O envio fica
`pendente` até o gestor revisar e publicar; só então vira uma `Vaga` aberta.

**O token aparece uma única vez**, na resposta da criação (`token` e `url`). O banco guarda
só o SHA-256 e os 6 primeiros caracteres (`token_prefixo`) para identificar o link na lista.
Perdeu o link? Revogue e gere outro.

### Equipe (JWT)

Links: **gestor ou admin**. Vagas recebidas: gestor revisa, publica e recusa; admin só consulta.

| Rota | Método | Quem | Notas |
|---|---|---|---|
| `gestor/links-empresa/` | GET | gestor, admin | filtros `empresa`, `situacao` (`ativo`, `utilizado`, `expirado`, `revogado`, `encerrado` = expirado ou revogado sem envio). Sem token |
| `gestor/links-empresa/` | POST | gestor, admin | `{empresa, expira_em?}` → 201 com `token` e `url` (só aqui). Empresa ativa. Limite `GERAR_LINK_EMPRESA_THROTTLE` (padrão 60/h por usuário) |
| `gestor/links-empresa/{id}/` | GET | gestor, admin | `criado_por_nome`, `revogado_em`, `revogado_por_nome` e `solicitacao: {id, status, titulo, criada_em, vaga}` quando preenchido |
| `gestor/links-empresa/{id}/revogar/` | POST | gestor, admin | invalida o link e registra quem e quando (idempotente). Não cancela envio já recebido. Sem PATCH/DELETE |
| `gestor/solicitacoes/` | GET | gestor, admin | filtros `status` (`pendente`, `publicada`, `recusada`), `empresa`, `q` |
| `gestor/solicitacoes/{id}/` | GET | gestor, admin | |
| `gestor/solicitacoes/{id}/` | PATCH | gestor | revisão: mesmos campos da vaga. Listas enviadas substituem, omitidas mantêm. Só `pendente` (409 caso contrário) |
| `gestor/solicitacoes/{id}/publicar/` | POST | gestor | revalida com as regras de vaga aberta (≥1 requisito, prazo válido, empresa ativa) e cria a vaga. Idempotente. 400 com os erros |
| `gestor/solicitacoes/{id}/recusar/` | POST | gestor | marca como `recusada` (não pode ser publicada nem editada depois) |

`url` usa `SOLICITACOES_FORMULARIO_URL` se definida (ex.: `https://teia.app/empresa?token={token}`,
para uma página externa que consome a API abaixo); senão aponta para a página HTML do
próprio Django (`/empresas/vagas/<token>/`).

### Empresa (público, somente com o token)

Sem login, sem cookie e sem CSRF; limite de `FORMULARIO_EMPRESA_THROTTLE` (padrão 30/min por IP).
Token inexistente → 404. Token conhecido, mas `revogado`/`utilizado`/`expirado`/`empresa_inativa`
→ **410** `{detail, situacao}`.

| Rota | Método | Notas |
|---|---|---|
| `empresas/formulario/{token}/` | GET | `{empresa: {nome}, expira_em, limites, opcoes: {vaga_tipos, vaga_modalidades, idiomas, niveis_idioma, cursos}}` |
| `empresas/formulario/{token}/` | POST | `{titulo, tipo, modalidade, descricao?, prazo?, periodo_minimo?, disponibilidade_horario?, cursos?, requisitos_competencia?: [{competencia, obrigatorio}], requisitos_idioma?: [{idioma, nivel_minimo, obrigatorio}]}` → 201. Até 20 competências e 10 idiomas. `empresa`, `status` etc. são ignorados |
| `empresas/formulario/{token}/competencias/?q=` | GET | busca no vocabulário (nome ou sinônimo), até 30 itens |

Página externa em outro domínio: inclua a origem em `CORS_ALLOWED_ORIGINS`.

```bash
curl -s -X POST localhost:8000/api/v1/empresas/formulario/$TOKEN/ -H 'Content-Type: application/json' \
  -d '{"titulo":"Estágio Dev","tipo":"estagio_nao_obrigatorio","modalidade":"remoto",
       "requisitos_competencia":[{"competencia":1,"obrigatorio":true}]}'
```

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