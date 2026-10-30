---
version: 1
slug: "frontend-src-pages-gestor"
primary_target: "frontend/src/pages/gestor"
related_targets: ["frontend/src/pages/admin"]
---

# Área do gestor do TEIA e área do administrador (app mobile)

Modo: Operate. Extensão do mundo visual existente do app (tema em `frontend/src/constants/theme.ts`).

- Gestor: triagem por vaga (ranking por compatibilidade com justificativa), decisão humana (encaminhar, em processo, não selecionada, voltar à fila), cadastro de vagas com requisitos, painel inicial.
- Admin: visão geral, cadastros (empresas CRUD, vocabulário de competências e sinônimos, cursos), usuários (criar gestor, ativar/desativar).
- Restrições: o app nunca elimina; nota só ordena; currículo some para o gestor quando o aluno revoga o LGPD.

## Direction contract

THESIS: A vaga é lida por requisito. Cada candidato carrega os requisitos da vaga como uma faixa de pontos na mesma ordem, então o gestor compara de cima a baixo; recusa a lista de nomes com uma nota solta.
OWN-WORLD: O mundo incumbente: fundo #F4F5F7, cartões brancos com borda #E4E6EB, magenta #CC004C para ação e seleção, verde #00A693 para evidência, âmbar #B86A00 para "diferente do pedido", contorno cinza para "não identificado"; fonte do sistema, títulos 800.
STORY: O gestor abre o Painel, vê o que espera decisão e o que vence; entra na vaga, lê o ranking, toca numa linha para ver o que falta, decide numa folha com a etapa e uma anotação.
FIRST VIEWPORT: Vaga: título 24/800, empresa e prazo; segmentado por etapa com contagem; legenda numerada dos requisitos; lista com posição, nome, curso, nota grande tabular à direita e faixa de pontos abaixo; obrigatórios com anel escuro. Painel: fila por vaga e prazos vencendo. Abas Painel · Vagas · Conta.
FORM: Matriz de evidência, posição 4 da lista própria. seed:106dbd4295b6b363
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: tocar numa linha do ranking expande no lugar (raise da parede de catálogo) mostrando os requisitos pendentes e as ações Ver candidato / Encaminhar.
