import "./carregarTypeScript.mjs";
import assert from "node:assert/strict";
import test from "node:test";
const { errosDasRespostas, validarObrigatorios } = await import("../src/utils/formularioCandidatura.ts");

const campo = (chave, obrigatorio = true) => ({ chave, obrigatorio });

test("obrigatórios rejeitam ausência e espaços sem alterar os dados digitados", () => {
  const respostas = { nome: "  ", observacao: "", periodo: "0", disponibilidade: "nao", competencias: "Git\nReact" };
  const antes = { ...respostas };
  assert.deepEqual(validarObrigatorios([
    campo("nome"), campo("portfolio"), campo("observacao", false),
    campo("periodo"), campo("disponibilidade"), campo("competencias"),
  ], respostas), { nome: "Campo obrigatório.", portfolio: "Campo obrigatório." });
  assert.deepEqual(respostas, antes);
});

test("erros 400 preservam as mensagens por chave do backend", () => {
  assert.deepEqual(errosDasRespostas({ respostas: { portfolio: "Informe um link válido (com https://).", nome: "Campo obrigatório." } }), {
    portfolio: "Informe um link válido (com https://).", nome: "Campo obrigatório.",
  });
});

test("falhas sem erros por campo não quebram o formulário", () => {
  for (const data of [null, "Erro", {}, { detail: "Sem permissão." }, { respostas: null }, { respostas: [] }, { respostas: "Erro" }]) {
    assert.deepEqual(errosDasRespostas(data), {});
  }
  assert.deepEqual(errosDasRespostas({ respostas: { nome: 1, portfolio: "Inválido" } }), { portfolio: "Inválido" });
});
