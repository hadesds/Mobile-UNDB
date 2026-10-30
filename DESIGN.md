---
name: Currículo Sob Medida
description: TEIA · Núcleo de Carreiras · UNDB. Currículo comparado à vaga, requisito por requisito, com evidência.
colors:
  primary: "#CC004C"
  primary-dark: "#A3003D"
  primary-soft: "#FCE7EE"
  primary-text: "#FFFFFF"
  background: "#F4F5F7"
  surface: "#FFFFFF"
  surface-alt: "#F9FAFB"
  border: "#E4E6EB"
  border-strong: "#CDD1D8"
  text: "#1C1D22"
  muted: "#5F636D"
  subtle: "#8A8E97"
  success: "#00A693"
  success-text: "#00715F"
  success-soft: "#E6F6F3"
  warning: "#B86A00"
  warning-soft: "#FFF3DF"
  warning-text: "#7A4600"
  warning-border: "#F3DDB5"
  neutral-soft: "#EEF0F3"
  danger: "#C62828"
  danger-soft: "#FDECEC"
  overlay: "rgba(20, 16, 24, 0.42)"
typography:
  display:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: "36px"
    letterSpacing: "-0.6px"
  headline:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: "34px"
    letterSpacing: "-0.4px"
  title:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: "30px"
    letterSpacing: "-0.4px"
  h2:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "24px"
  h3:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "22px"
  body:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
  small:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  label:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "18px"
  tiny:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
  score:
    fontFamily: "system-ui, -apple-system, Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    letterSpacing: "-0.6px"
    fontFeature: "tnum"
rounded:
  xs: "6px"
  sm: "10px"
  control: "12px"
  md: "16px"
  lg: "22px"
  pill: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  smd: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "52px"
  button-primary-compact:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  button-contorno:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    height: "52px"
  button-suave:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.md}"
    height: "52px"
  button-perigo:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    height: "52px"
  button-link:
    textColor: "{colors.primary}"
    height: "44px"
  chip-filtro:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "5px 14px"
    height: "36px"
  chip-filtro-selecionado:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.pill}"
    padding: "5px 14px"
    height: "36px"
  chip-marca:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  chip-neutro:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  chip-perigo:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  cartao:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "16px"
  lista-linha:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    padding: "12px 16px"
    height: "56px"
  campo:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "52px"
  busca:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "48px"
  segmentado-trilho:
    backgroundColor: "{colors.neutral-soft}"
    rounded: "{rounded.control}"
    padding: "3px"
  segmentado-opcao-ativa:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.sm}"
    height: "40px"
  etapa-opcao-ativa:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.sm}"
    height: "60px"
  ponto-com-evidencia:
    backgroundColor: "{colors.success}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "24px"
  ponto-diferente:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
    rounded: "{rounded.pill}"
    size: "24px"
  ponto-nao-identificado:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.subtle}"
    rounded: "{rounded.pill}"
    size: "24px"
  ponto-fora-da-analise:
    backgroundColor: "{colors.neutral-soft}"
    textColor: "{colors.subtle}"
    rounded: "{rounded.pill}"
    size: "24px"
  folha:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "8px 24px 16px"
  barra-abas:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    height: "70px"
  barra-abas-ativa:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-dark}"
    rounded: "{rounded.pill}"
---

# Design System: Currículo Sob Medida

## Overview

**Creative North Star: "A Ficha de Evidência"**

O app é uma ficha de trabalho clara, não uma vitrine. Fundo cinza-claro frio, cartões brancos de borda fina e sombra mínima, um único magenta para ação e seleção, e uma gramática de pontos que mostra, requisito por requisito, o que o currículo comprova. A mesma linguagem serve o aluno (que entende o que falta), o gestor do TEIA (que compara candidatos de cima a baixo) e o administrador (que mantém a base). As três áreas compartilham tokens, barra de abas, cabeçalhos, listas agrupadas e folhas inferiores; o que muda é a densidade da informação, não o mundo.

A densidade é média e legível no polegar: alvos de 44pt no mínimo, linhas de lista de 56px, botões principais de 52px. Títulos pesados (800) em tracking levemente negativo dão firmeza; o corpo fica em 15/22 neutro. Números que se comparam (notas, contagens, totais) são sempre tabulares e na cor do texto, para que a ordem, e não a cor, conduza a leitura.

O movimento é curto e desacelerado, a saída mais rápida que a entrada, e respeita "reduzir movimento" em todo componente animado.

**Key Characteristics:**
- Um acento (magenta `primary`) para ação, seleção e navegação ativa; o resto é neutro.
- Evidência codificada por pontos numerados na ordem da vaga, com anel escuro para obrigatório.
- Cartões brancos com borda `border` e sombra baixa sobre fundo `background`.
- Listas agrupadas em um cartão só, linhas separadas por fio fino.
- Folhas inferiores para decidir e editar sem sair da tela.
- Números tabulares em `text`; nada de nota colorida.

## Colors

Neutros frios com um magenta institucional e uma família semântica (verde, âmbar, vermelho) usada com parcimônia.

### Primary
- **Magenta TEIA** (`primary`): botão principal, chips de filtro selecionados, links de ação ("Editar", "Ver todas"), borda da linha do ranking expandida, foco de campo, cursor e seleção de texto.
- **Magenta Profundo** (`primary-dark`): texto sobre `primary-soft`, rótulo e número da opção ativa no segmentado e nas etapas, rótulo da aba ativa, iniciais do avatar.
- **Rosa Névoa** (`primary-soft`): fundo do botão suave, do avatar, da pílula da aba ativa, do ícone de estado vazio e do resumo de topo do Painel do gestor.
- **Branco sobre Magenta** (`primary-text`): texto e ícone sobre `primary`.

### Secondary
- **Verde Evidência** (`success`, `success-text`, `success-soft`): na faixa de requisitos, o ponto preenchido "com evidência". Fora dela, o tom `sucesso` de chips e as notas de confirmação (aviso de vaga publicada, acesso ativo).

### Tertiary
- **Âmbar Divergência** (`warning`, `warning-soft`, `warning-text`, `warning-border`): na faixa, o ponto contornado "diferente do pedido". Fora dela, prazos que vencem, pendências do admin e a nota de LGPD revogado (`warning-text` sobre `warning-soft`, com `warning-border` quando o bloco precisa de contorno).

### Neutral
- **Cinza Ficha** (`background`): fundo de toda tela e do cabeçalho.
- **Branco Cartão** (`surface`): cartões, listas, campos, folhas, barra de abas, ponto "não identificado".
- **Branco Pressionado** (`surface-alt`): fundo da linha de lista enquanto pressionada.
- **Fio** (`border`): borda de cartões e campos, divisores finos entre linhas.
- **Fio Forte** (`border-strong`): contorno dos chips de filtro não selecionados, alça da folha, anel do ponto "não identificado".
- **Grafite** (`text`): texto principal, notas e contagens tabulares, anel de obrigatório, fundo do aviso passageiro.
- **Cinza Médio** (`muted`): subtítulos, rótulos, títulos de grupo, abas inativas.
- **Cinza Claro** (`subtle`): placeholder, chevrons, posição no ranking, contagem zero, nota ausente ("–").
- **Névoa Neutra** (`neutral-soft`): trilho do segmentado e das etapas, chip neutro, botão de fechar da folha, ponto "fora da análise", fundo de trilhos de progresso.
- **Vermelho Perigo** (`danger`, `danger-soft`): erro de campo, botão e chip de perigo, convênio vencido, conta desativada.
- **Véu** (`overlay`): fundo escurecido atrás das folhas.

### Named Rules
**A Regra da Evidência Reservada.** A gramática da faixa é exclusiva da evidência: ponto preenchido em `success` = com evidência; ponto `warning-soft` contornado em `warning` = diferente do pedido; ponto `surface` contornado em `border-strong` = não identificado; ponto `neutral-soft` = fora da análise; anel de 1.5px em `text` = requisito obrigatório. Nenhum outro elemento usa pontos nessas cores. Notas são escritas em `text`, tabulares, nunca coloridas pela faixa; o controle de etapas usa só `primary-dark` e neutros. Divergência conhecida: chips de status (candidatura, vaga, convênio) ainda usam os tons `sucesso`/`alerta`; isso é herança, não modelo, e novos indicadores de etapa ou status não ampliam esse reuso.

**A Regra do Acento Único.** Magenta é ação e seleção. Não é decoração, não é categoria, não é estado de dado.

**A Regra do Token.** Toda cor vem de `frontend/src/constants/theme.ts`. Hex ou rgba literal fora desse arquivo não é permitido; se faltar um tom, ele entra no tema primeiro.

## Typography

**Display Font:** fonte do sistema (San Francisco no iOS, Roboto no Android)
**Body Font:** fonte do sistema
**Label/Mono Font:** não há face distinta; números usam `tabular-nums`.

**Character:** Uma família só, trabalhando por peso: 800 com tracking negativo nos títulos, 700 nos rótulos de ação, 400 no corpo. Escala de razão aproximada 1.2.

### Hierarchy
- **Display** (800, 30/36, -0.6): números de destaque e marca em telas de entrada.
- **Headline** (800, 28/34, -0.4): título do cabeçalho de tela (`CabecalhoTela`), ex. "Cadastros", "Olá, Ana".
- **Title** (800, 24/30, -0.4): título de vaga no detalhe do gestor e do aluno.
- **H2** (700, 18/24): títulos de seção e de estado vazio; título de folha sobe para 20/26 em 800.
- **H3** (700, 16/22): nome do candidato na linha do ranking, títulos de cartão.
- **Body** (400, 15/22): texto corrido; título de linha de lista em 600.
- **Small** (400, 13/18, `muted`): subtítulos de linha, metadados ("Curso · 6º sem."), ajuda de campo.
- **Label** (600, 13/18, `muted`): rótulos; títulos de grupo de lista em 14. Sempre em caixa normal.
- **Tiny** (400, 12/16): legenda dos estados da faixa, rótulos da barra de abas (600).
- **Score** (800, 24, -0.6, tabular, `text`): nota no ranking, com o sinal "%" em 14/700 `muted`. No indicador do aluno a nota é 32/800.

### Named Rules
**A Regra do Número Tabular.** Toda nota, contagem, posição e total usa `tabular-nums` para alinhar em coluna.

**A Regra da Caixa Normal.** Rótulos e títulos de grupo ficam em caixa normal, frase curta, sem caixa-alta espaçada.

## Layout

Coluna única de largura total, pensada para 390pt. Telas usam `Tela`: fundo `background`, conteúdo com respiro de 16px nas laterais, 16px entre blocos e 32px no fim; rodapé fixo opcional em `surface` com fio superior e sombra baixa. O cabeçalho de tela fica sobre o próprio fundo, título 28/34 com subtítulo em `muted`, ação primária compacta à direita quando existe ("+ Vaga", "+ Nova").

Ritmo: 4, 8, 12, 16, 24, 32 (tokens `xs` a `xl`); 12 (`smd`) separa ícone e texto dentro de linhas, 8 separa título de grupo e cartão. Linhas de lista têm altura mínima de 56px; alvos tocáveis, 44px.

Listas longas são agrupadas (`Grupo`): título de grupo em label `muted` com 4px de recuo, depois um único cartão com as linhas. Filtros em chip ficam numa faixa horizontal que rola, sem quebrar linha; a última pílula aparece cortada para indicar a rolagem.

Na linha do ranking, a faixa de pontos e o chip de etapa ficam recuados ao alinhamento do nome (24px da posição + 12px), e a nota grande ocupa a borda direita.

### Named Rules
**A Regra do Estado Abaixo.** Chips de status vão abaixo do subtítulo da linha (`Linha abaixo`), nunca ao lado do título disputando largura.

**A Regra do Filtro que Rola.** Filtros em chip numa linha horizontal rolável, indicador de rolagem oculto.

## Elevation & Depth

Híbrido discreto: profundidade vem principalmente de tom (cartão branco sobre fundo cinza) e de borda fina; a sombra só confirma. Duas alturas, sempre com deslocamento vertical e desfoque suave, nunca halo.

### Shadow Vocabulary
- **Baixa** (`0 1px 2px rgba(28,29,34,0.06), 0 2px 8px rgba(28,29,34,0.04)`; nativo: opacidade 0.06, raio 8, deslocamento 2, elevation 1): cartões, grupos de lista, busca, rodapé de tela.
- **Alta** (`0 8px 28px rgba(28,29,34,0.14)`; nativo: opacidade 0.14, raio 24, deslocamento 8, elevation 8): folhas inferiores e aviso passageiro.

### Named Rules
**A Regra da Sombra que Confirma.** Toda superfície elevada também tem borda ou contraste de tom; a sombra nunca é o único limite.

## Shapes

Cantos suaves e consistentes: 16px (`md`) para cartões, grupos e botões grandes; 12px (`control`, derivado de `sm + 2` no código) para campos, busca, seletor, trilhos de segmentado e botões compactos; 10px (`sm`) para a opção interna do segmentado; 22px (`lg`) só no topo das folhas; pílula para chips, pílula da aba ativa e trilhos de progresso. Círculos para avatares, pontos de evidência e o botão de fechar da folha.

Bordas de 1px em `border` em quase toda superfície; 1.5px marca estado (foco de campo, botão contorno, anel de obrigatório). Divisores entre linhas usam fio fino nativo (`hairlineWidth`).

Ícones são desenhados em SVG numa grade de 24, traço único de 1.8 e pontas arredondadas (2 a 2.6 em tamanhos pequenos).

## Components

### Buttons
Firmes e diretos, rótulo 16/700.
- **Shape:** cantos suaves (16px); compacto em 12px.
- **Primary:** `primary` com texto `primary-text`, altura mínima 52px, 16px de lateral, ícone opcional de 20px à esquerda; compacto 44px, rótulo 15.
- **Contorno:** `surface` com borda 1.5px e texto em `primary`. **Suave:** `primary-soft` com `primary-dark`. **Perigo:** `danger-soft` com `danger`. **Link:** sem fundo, texto `primary`, 44px.
- **Pressão:** escala para 0.97 (link não escala). Desabilitado ou carregando: opacidade 0.5, indicador de atividade na cor do rótulo.

### Chips
- **Estado (não tocável):** pílula 5/10, texto 13/700, tons `marca`, `sucesso`, `alerta`, `neutro`, `perigo` (fundo soft, texto forte).
- **Filtro:** 36px de altura, 14px de lateral. Não selecionado: `surface`, borda `border-strong`, texto `text`. Selecionado: `primary`, texto `primary-text`, ícone de check à esquerda.
- **Removível:** `primary-soft` com X à direita.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** `surface` sobre `background`.
- **Shadow Strategy:** sombra baixa.
- **Border:** 1px `border`.
- **Internal Padding:** 16px.
- **Resumo de topo (Painel do gestor):** bloco `primary-soft` com o número principal em `primary-dark` 800, frase em body e indicadores secundários em `primary-dark`.
- **Nota de atenção:** bloco `warning-soft` com texto `warning-text` (LGPD revogado, pendências); nota de confirmação em `success-soft` com `success-text`.

### Inputs / Fields
- **Style:** rótulo 14/600 `text` acima; caixa `surface` de 52px, borda 1px `border`, cantos 12px, texto 16.
- **Focus:** borda passa a 1.5px `primary`; cursor e seleção em `primary`.
- **Error / Disabled:** borda `danger`, linha de erro com ícone de alerta 14px e texto 13 `danger`; ajuda em 13 `muted` some quando há erro.
- **Busca:** 48px, ícone de lupa à esquerda, sombra baixa, mesma borda.
- **Seletor:** aparência de campo com chevron; abre uma folha com opções de 52px separadas por fio.

### Segmented Control
- **Trilho:** `neutral-soft`, 3px de respiro, cantos 12px. **Opção ativa:** `surface` com borda `border`, texto `primary-dark` 800. **Inativa:** texto 13/600 `muted`. Escolha única entre poucas opções curtas.

### Etapas (controle de etapa do gestor)
Variante do segmentado para as quatro etapas da candidatura: cada segmento mostra a contagem (18/800 tabular) sobre o rótulo (11/600, duas linhas reservadas para alinhar os números). Ativo em `primary-dark`; contagem zero em `subtle`. Anuncia "Etapa: contagem" a leitores de tela. Toda etapa mostra sua contagem.

### Lists
- **Grupo:** título em label 14 `muted`, ação opcional à direita, um cartão com todas as linhas.
- **Linha:** 56px mínimo, 12/16 de respiro; início opcional (avatar ou ícone), título body 600 até duas linhas, subtítulo small, chips de estado abaixo, valor ou nota à direita, chevron `subtle` quando tocável. Pressionada: `surface-alt`. Inativa: textos a 55%.
- **Valor:** número 17/800 tabular à direita, em `text` por padrão.

### Navigation
- **Barra de abas:** a mesma para aluno, gestor e admin. `surface`, fio superior `border`, 70px mais a área segura. Rótulo 12/600; ativo em `primary-dark` com pílula `primary-soft` de 56x30 atrás do ícone; inativo em `muted`. Troca de aba com fade.
- **Cabeçalho de pilha:** fundo `background`, título 17/700, voltar nativo; ação de texto em `primary` à direita.

### Folha inferior
Detalhe, decisão e formulário sem sair da tela. `surface`, topo 22px, sombra alta, até 88% da altura, alça 40x5 em `border-strong`, título 20/800 com botão de fechar circular de 36px em `neutral-soft`, rodapé fixo para ações. Sobe com desaceleração (320ms), fecha mais rápido (220ms), por arrasto, toque fora ou X; com "reduzir movimento", só esmaece (140ms).

### Faixa de Evidência (assinatura)
Um ponto por requisito da vaga, sempre na ordem da vaga, para comparar candidatos de cima a baixo. Ponto de 24px numerado (número 800 tabular a 46% do diâmetro) com borda de 2px; compacto de 12px sem número nas listas do Painel; 2px entre pontos, quebrando linha se preciso. Obrigatórios ganham anel externo de 1.5px em `text`. Uma legenda (`LegendaEstados`) aparece uma vez acima do ranking, com a legenda numerada dos requisitos e "* desejável".
- **Acessibilidade:** a faixa é oculta para tecnologia assistiva; o contêiner que a mostra anuncia `resumoEvidencia()` no próprio rótulo acessível.

### Linha do Ranking (assinatura)
Cartão com posição (14/800 `subtle`, tabular), nome h3, curso e semestre em small, nota 24/800 em `text` à direita, faixa de evidência abaixo e chip de etapa sob a faixa quando a lista mistura etapas. Toque expande no lugar: a borda vira `primary`, um fio separa a lista do que falta (obrigatórios primeiro) e duas ações compactas, "Ver candidato" (contorno) e "Encaminhar"/"Decidir" (primária). O ranking só ordena: nenhum candidato é escondido ou filtrado por nota.

### Indicador de Compatibilidade (aluno)
Anel SVG de 120px e traço 12 sobre trilho `neutral-soft`, preenchendo em 900ms; percentual 32/800 tabular em `text` no centro. O traço do anel segue a faixa de compatibilidade (`success` a partir de 70, `warning` a partir de 40, `subtle` abaixo): é incumbente na área do aluno e não se estende a outras superfícies.

### Aviso passageiro
Faixa `text` no topo com cantos 16px, sombra alta, marca circular de 24px (`success` ou `danger`) e texto 15/600 branco; entra em 320ms, fica 2.6s, sai em 220ms; anuncia o texto a leitores de tela.

## Do's and Don'ts

### Do:
- **Do** tirar toda cor, raio, espaço, fonte e sombra de `frontend/src/constants/theme.ts`.
- **Do** usar `primary` só para ação, seleção e navegação ativa.
- **Do** desenhar a faixa de evidência na ordem dos requisitos da vaga, com anel escuro nos obrigatórios, e anunciar `resumoEvidencia()` no rótulo do contêiner.
- **Do** escrever notas e contagens em `text`, 800, `tabular-nums`.
- **Do** ordenar candidatos por nota e mostrar todos; a decisão fica com o gestor.
- **Do** mostrar a contagem em cada controle de etapa.
- **Do** pôr chips de status abaixo do subtítulo da linha.
- **Do** colocar filtros em chip numa faixa horizontal que rola.
- **Do** usar folha inferior para decidir, editar e escolher.
- **Do** manter alvos de toque de 44pt e respeitar "reduzir movimento".

### Don't:
- **Don't** usar hex ou rgba literal fora de `theme.ts`.
- **Don't** usar os pontos verde, âmbar ou contornados para outra coisa que não evidência de requisito.
- **Don't** colorir o número da nota; ele fica em `text`.
- **Don't** criar novos indicadores de etapa ou status em `success` ou `warning`.
- **Don't** filtrar ou esconder candidatos pela nota.
- **Don't** reordenar a faixa por estado, nota ou nome.
- **Don't** pôr chip de status ao lado do título da linha.
- **Don't** usar sombra sem borda ou contraste de tom, nem sombra em halo sem deslocamento.
- **Don't** escrever rótulos em caixa-alta espaçada acima de títulos.
