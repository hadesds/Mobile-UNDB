# Envios de vagas ao TEIA

Módulo independente. Os pontos de integração são INSTALLED_APPS, a página
`/empresas/vagas/` e a API em `/api/v1/` (`solicitacoes/api_urls.py`, descrita em
`docs/api.md`). Não altera os modelos ou migrações do backend.

Formas de operar o mesmo fluxo, com as mesmas regras (`services.py`):

- **App (aba "Envios", gestor e admin):** gera e revoga links, mostra os que aguardam
  envio, as empresas que já preencheram e os expirados/revogados. O gestor revisa a vaga
  recebida no mesmo formulário de vaga e publica ou recusa; o admin só consulta.
- **Empresa:** página HTML `/empresas/vagas/<token>/` **ou** API pública
  `empresas/formulario/<token>/` (sem conta, só com o token), para uma página externa.
- **Django Admin:** links somente para consulta (gerar/revogar é pelo app); solicitações
  podem ser revisadas e publicadas (exige `is_staff` e vínculo de gestor).

## Perguntas ao candidato

Além dos dados da vaga, a empresa pode cadastrar até 10 perguntas (`PerguntaSolicitada`).
Ao publicar, `services.publicar` cria o modelo de currículo da vaga (campos do perfil do
aluno) e acrescenta cada pergunta como `CampoModelo` de origem "vaga". Assim o aluno
confere o currículo já preenchido e responde às perguntas na candidatura. A `0004`
cria a tabela.

## Instalação

Execute `python manage.py migrate` para aplicar as migrações de `solicitacoes`
(dependência: `backend/0002_curriculo_e_vagas`). Nenhuma dependência nova.
A `0003` converte os tokens existentes em hash: links já enviados continuam válidos.

## Segurança

- **Token só na criação.** `secrets.token_urlsafe(32)` (256 bits); o banco guarda o SHA-256
  e um prefixo de 6 caracteres para identificação. Um vazamento do banco não expõe links
  utilizáveis, e o token não volta em nenhuma listagem. No app, o link fica só no estado
  da folha de criação (nada em armazenamento ou navegação) e some ao fechar.
- **Um envio por link**, validade curta (padrão 7 dias, máx. 90) e revogação com registro
  de quem e quando revogou. Quem criou o link também fica registrado.
- **Menor privilégio.** Gestor e admin geram/revogam; só o gestor edita, publica ou recusa.
  Aluno não acessa nada. Empresa, status, vaga e revisor nunca vêm do formulário público.
- **Formulário público** sem login/cookie (sem CSRF a explorar), com limite por IP,
  `Cache-Control: no-store`, `Referrer-Policy: no-referrer` e `noindex`. Expõe só o nome da
  empresa (sem contatos). Token desconhecido → 404; conhecido e indisponível → 410.
- **Geração limitada** por usuário (`GERAR_LINK_EMPRESA_THROTTLE`, padrão 60/h).
- O token vai no caminho da URL: não ative log de acesso com caminho completo em produção
  (o gunicorn não registra acessos por padrão) e trate o link como uma senha.

## Revisão pelo Django Admin

O usuário precisa estar ativo, ter `is_staff`, perfil `gestor` e um registro `backend.Gestor`.
Não é preciso atribuir permissões individuais ou de grupo do módulo.

1. Em “Solicitações de vagas”, abra o envio pendente, ajuste os campos, cursos,
   competências e idiomas e salve. Salvar a revisão ainda não publica.
2. Clique em “Revisar confirmação de publicação” e confirme na página seguinte.
   O sistema revalida os dados com VagaSerializer, cria a vaga aberta e registra
   o gestor e a data da publicação. Falhas aparecem no Admin e mantêm o envio pendente.

Após publicada ou recusada, a solicitação fica somente para consulta. Revogar/expirar um
link impede novos envios, mas não cancela um envio já recebido nem uma vaga publicada.

## Implementação e verificação

Campos escalares reutilizam as definições de Vaga. Cursos, competências e idiomas
usam os catálogos existentes. Empresa vem do link; gestores e status são definidos
no servidor. O POST público tem CSRF, não cria Vaga e redireciona após sucesso.
O formulário oferece cinco linhas de competências e três de idiomas; o gestor
pode complementar requisitos no Admin.

Publicação e envio usam transações e bloqueio de linha. A relação única com o link
impede repetir envios; a aprovação bloqueia a solicitação e retorna a mesma vaga
em novas confirmações. O bloqueio de linha é efetivo no PostgreSQL; SQLite não
oferece select_for_update e pode responder com bloqueio do banco sob concorrência.

Execute `python manage.py test solicitacoes backend` e
`python manage.py makemigrations --check --dry-run`.
Os testes cobrem envio, CSRF, adulteração, validade/revogação, revisão no Admin,
permissões, catálogos relacionados, revalidação, idempotência e visibilidade do aluno.
