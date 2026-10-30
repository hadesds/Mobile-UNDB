# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Um único app Expo/React Native para Android e iOS, os dois com o mesmo peso. O visual é
próprio e compartilhado entre os sistemas; as convenções nativas de cada um (voltar,
folhas, teclado, áreas seguras) são respeitadas. A distribuição atual é por APK.

## Users

- **Aluno da UNDB**: monta o currículo estruturado, vê vagas abertas, se candidata e
  entende por que é ou não compatível com cada requisito.
- **Gestor do TEIA** (Núcleo de Carreiras): cadastra e mantém vagas com requisitos,
  revisa os candidatos de cada vaga ordenados por compatibilidade, com justificativa,
  e decide quem é encaminhado à empresa.
- **Administrador**: mantém a base do sistema: usuários e contas de gestor, empresas
  parceiras (cadastro completo), vocabulário de competências e sinônimos, cursos, e
  acompanha os números gerais.

## Product Purpose

Currículo Sob Medida compara o currículo do aluno com os requisitos de cada vaga,
devolve feedback ao aluno e entrega ao gestor do TEIA uma lista de candidatos
ordenada por compatibilidade, com justificativa. Sucesso: o aluno entende o que falta
e o gestor decide encaminhamentos mais rápido e com evidência.

## Positioning

A compatibilidade é calculada por requisito, com evidência do próprio currículo, e
nunca decide sozinha: o sistema ordena, o gestor do TEIA decide.

## Operating Context

Projeto da disciplina Programação Mobile (Engenharia de Software · UNDB · 2026.2) para o
Núcleo de Carreiras TEIA. Backend Django + DRF com JWT; empresas não têm login no MVP
(o gestor intermedeia). Contas de gestor são criadas só pela administração.

## Capabilities and Constraints

- Perfis: `aluno`, `gestor`, `admin`. Aluno se cadastra sozinho; gestor e admin não.
- Vagas e empresas não são apagadas no fluxo normal: vagas são encerradas, empresas
  desativadas.
- Status da candidatura: analisada → encaminhada → em processo; ou não selecionada.
  Só o gestor muda o status.
- Score = requisitos com evidência ÷ requisitos cadastrados; faixas alta ≥ 70,
  média ≥ 40 (provisórias, a validar com o TEIA).

## Brand Commitments

Nome do app: "Currículo Sob Medida"; marca: TEIA · Núcleo de Carreiras · UNDB.
Textos em português do Brasil.

## Product Principles

1. A decisão final é humana: o gestor do TEIA decide quem é encaminhado.
2. Nenhum candidato é eliminado automaticamente; pontuação baixa só ordena.
3. Todo score vem com justificativa (requisitos atendidos e não atendidos).
4. LGPD: consentimento explícito, finalidade clara, acesso restrito aos dados do aluno.
5. Simplicidade: poucos passos para cada tarefa.

## Accessibility & Inclusion

Rótulos acessíveis em todos os controles, alvo de toque mínimo de 44pt, respeito a
"reduzir movimento" (já implementado no app).
