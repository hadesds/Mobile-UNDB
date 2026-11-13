# Certificados e o banco de atividades extras da UNDB

Status: **em investigação**. Enquanto não houver resposta oficial da UNDB, o aluno
**envia o certificado por upload** (opção c). O código já separa a *origem* do certificado
para trocar isso depois sem refazer nada.

## O que ainda não sabemos

Como o aluno enxerga hoje suas atividades extras no portal da UNDB, e se existe um caminho
**oficial** para o app receber esses dados. Ninguém do time tem acesso de teste ao portal, e
o app **nunca** pede nem guarda a senha do aluno no portal.

Perguntas em aberto:

1. Existe API ou integração oficial com o banco de atividades extras?
2. Se não, existe uma exportação oficial (PDF, Excel, CSV) que o próprio aluno possa gerar?
3. Quem na UNDB autoriza o uso, e existe termo a seguir?
4. Cada atividade tem um comprovante (arquivo/link) e um código de verificação?

## Opções comparadas

| Opção | Esforço | Confiabilidade do dado | Risco (LGPD / autorização) | Quando escolher |
| --- | --- | --- | --- | --- |
| **(a)** API ou integração oficial | alto | alta (a UNDB valida) | baixo, **se a UNDB autorizar por escrito** | a UNDB oferecer e liberar |
| **(b)** Aluno envia a exportação oficial (PDF/Excel) | médio (um leitor por formato) | média-alta | baixo (o aluno entrega o próprio dado) | existir exportação estável |
| **(c)** Aluno envia o certificado (upload) | baixo | baixa (ninguém valida o arquivo) | baixo | **sempre disponível; é o que fazemos agora** |

**Recomendação:** seguir com **(c)** agora e buscar **(b)** ou **(a)** conforme a resposta da
UNDB. Fora de cogitação: *scraping* do portal, uso de API interna sem autorização e qualquer
coisa que exija a senha do aluno.

## Como o código está preparado

- Campo `Certificado.origem`: `upload` (aluno enviou) ou `undb` (veio de importação).
  Hoje só `upload` é criado.
- Camada separada `backend/importacao_certificados.py`: define o que uma fonte de
  importação devolve (`CertificadoNovo`). O endpoint de upload já passa por ela; uma fonte
  `undb` futura (opção a ou b) entra ali, sem mexer nos modelos nem nos endpoints.
- O cálculo de compatibilidade só enxerga `Certificado`, nunca a fonte.

## Roteiro para investigar no navegador (F12)

Faça logado no portal, no seu próprio computador.

1. **Chamadas JSON.** F12 > *Network*, filtro *Fetch/XHR*, marque *Preserve log*, abra a
   página de atividades extras. Se aparecer algo como `GET /api/atividades?...` com resposta
   JSON, existe uma API interna. **Só anote que existe; não use sem autorização da UNDB.**
2. **Página pronta do servidor.** Filtro *Doc*. Se a lista vem num `.php`, `.aspx` ou `.jsp`
   e não há XHR, o servidor entrega a tela pronta (não há JSON para integrar).
3. **Exportação.** Procure "Exportar", "Imprimir", "Declaração" ou "Histórico de atividades
   complementares". Baixe e veja o formato (PDF, XLS, CSV). Em PDF, tente selecionar o texto:
   se for imagem, é pior de ler. Veja se há código de verificação ou QR.
4. **Login.** Se a URL passa por outro domínio ("Entrar com Microsoft/Google"), é SSO, bom
   sinal para integração oficial. Em *Application > Cookies*, olhe só **nomes** e colunas
   `HttpOnly`/`Secure`. `JSESSIONID`/`PHPSESSID` indica sessão por cookie; header
   `Authorization: Bearer` indica token.
5. **Campos.** Anote se cada atividade tem título, carga horária, data, instituição, status
   de validação e link do comprovante.

### O que pode e o que nunca pode ser compartilhado

| Pode compartilhar | Nunca compartilhar |
| --- | --- |
| URL **sem** query string, com IDs trocados (`/atividades/{id}`) | Valor de `Cookie` e `Set-Cookie` |
| Método e status (`GET 200`) | Header `Authorization` e qualquer `?token=` na URL |
| **Nomes** e tipos dos campos (`carga_horaria: número`) | Sua senha |
| Uma resposta com 1 item **anonimizado** | "Copy as cURL" e "Save all as HAR" (levam seus cookies) |
| Nome do botão e formato do arquivo exportado | Nome, CPF, matrícula, e-mail ou foto de qualquer aluno |
| Print com dados borrados | |

Anonimizar assim: `"aluno": "<NOME>", "matricula": "<MATRICULA>", "titulo": "Minicurso de Python", "carga_horaria": 20`.

## Rascunho de mensagem para a coordenação / TI da UNDB

> **Assunto:** Consulta sobre exportação/integração de atividades complementares: projeto
> TEIA Currículo Sob Medida
>
> Prezados,
>
> Somos alunos de Engenharia de Software e desenvolvemos, na disciplina Programação Mobile,
> o app *Currículo Sob Medida* para o Núcleo de Carreiras TEIA. O app compara o currículo do
> aluno com os requisitos das vagas e entrega ao gestor do TEIA uma lista ordenada com
> justificativa. A decisão final é sempre humana.
>
> Gostaríamos de permitir que o aluno inclua suas atividades complementares e certificados
> na candidatura. Perguntamos:
>
> 1. Existe API ou integração oficial com o banco de atividades extras?
> 2. Se não, existe exportação oficial (PDF, Excel ou CSV) que o próprio aluno possa gerar e
>    anexar ao app?
> 3. Quem seria o responsável por autorizar, e há algum termo a seguir?
>
> Sobre a LGPD: trataríamos esses dados apenas com **consentimento explícito e revogável do
> aluno**, para a finalidade única de apoiar a candidatura, com acesso restrito ao próprio
> aluno e ao gestor do TEIA, e **sem coletar credenciais do portal**. Enquanto não houver
> resposta, o aluno envia o certificado manualmente.
>
> Atenciosamente,
> [nome], [curso/turma]

## Próximos passos

- [ ] Fazer o roteiro do F12 e trazer o resultado **anonimizado** (ver tabela acima).
- [ ] Enviar a mensagem acima e registrar aqui a resposta e a data.
- [ ] Com a resposta, escolher entre (a), (b) e (c) e atualizar este documento.
