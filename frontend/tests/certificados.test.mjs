import "./carregarTypeScript.mjs";
import assert from "node:assert/strict";
import test from "node:test";

const { candidatar } = await import("../src/api/candidaturas.ts");

/** Troca o fetch e devolve o corpo (já em objeto) de cada chamada. */
function espionar() {
  const corpos = [];
  globalThis.fetch = async (_url, opcoes) => {
    corpos.push(JSON.parse(opcoes.body));
    return new Response(JSON.stringify({ id: 1 }), { status: 201, headers: { "Content-Type": "application/json" } });
  };
  return corpos;
}

test("candidatar sem certificados mantém o corpo de antes", async () => {
  const corpos = espionar();
  await candidatar(7);
  await candidatar(7, { nome: "Ana" });
  assert.deepEqual(corpos, [{ vaga: 7 }, { vaga: 7, respostas: { nome: "Ana" } }]);
});

test("candidatar envia a lista de certificados escolhidos", async () => {
  const corpos = espionar();
  await candidatar(7, { nome: "Ana" }, [3, 7]);
  await candidatar(8, undefined, [3]);
  assert.deepEqual(corpos, [
    { vaga: 7, respostas: { nome: "Ana" }, certificados: [3, 7] },
    { vaga: 8, certificados: [3] },
  ]);
});

test("lista vazia de certificados não vai no corpo", async () => {
  const corpos = espionar();
  await candidatar(7, undefined, []);
  assert.deepEqual(corpos, [{ vaga: 7 }]);
});
