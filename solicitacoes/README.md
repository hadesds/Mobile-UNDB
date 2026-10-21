# Envios de vagas ao TEIA

Módulo independente. Os únicos pontos de integração são INSTALLED_APPS e a URL
`/empresas/vagas/`. Não altera os modelos ou migrações do backend.

## Instalação

Execute `python manage.py migrate` para aplicar `solicitacoes/0001_initial.py`
(dependência: `backend/0002_curriculo_e_vagas`). Nenhuma dependência nova.

## Acesso e uso

O usuário precisa estar ativo, ter `is_staff`, perfil `gestor` e um registro
`backend.Gestor`. No Admin de usuários/grupos, conceda:

- Links para empresas: adicionar, visualizar e alterar.
- Solicitações de vagas: visualizar, alterar e “Pode confirmar publicação de solicitações”.

As permissões dos requisitos inline seguem a permissão de alteração da solicitação.
Não é necessário conceder acesso de escrita aos modelos atuais de Vaga/Empresa.
Um administrador sem perfil e vínculo de gestor não pode operar este módulo.
As empresas são as já cadastradas; o módulo não cria empresas.

1. Em `/admin/`, abra “Envios de vagas — TEIA” → “Links para empresas”.
2. Adicione um link, escolha uma empresa ativa e a validade (padrão: sete dias).
3. Salve, reabra e copie o endereço completo exibido. Envie manualmente à empresa.
4. A empresa preenche o formulário sem conta. Cada link aceita um único envio;
   para outra vaga, gere outro link. Para invalidá-lo, marque “Revogado”.
5. Em “Solicitações de vagas”, abra o envio pendente, ajuste os campos, cursos,
   competências e idiomas e salve. Salvar a revisão ainda não publica.
6. Clique em “Revisar confirmação de publicação” e confirme na página seguinte.
   O sistema revalida os dados com VagaSerializer, cria a vaga aberta e registra
   o gestor e a data da publicação. Falhas aparecem no Admin e mantêm o envio pendente.

Após publicada, a solicitação fica somente para consulta. Revogar/expirar um link
impede novos envios, mas não cancela um envio já recebido nem uma vaga publicada.
O endereço usa o domínio/protocolo da requisição ao Admin: copie-o no ambiente
que será acessado pela empresa. Trate o link como credencial; qualquer pessoa
que o receber poderá usar o formulário enquanto estiver válido.

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
