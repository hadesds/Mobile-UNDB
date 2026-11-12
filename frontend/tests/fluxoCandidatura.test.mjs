import "./carregarTypeScript.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { FluxoCandidatura } = await import("../src/lib/fluxoCandidatura.ts");
const { criarRascunhosCandidatura } = await import("../src/lib/rascunhoCandidatura.ts");
const { request, aoSessaoExpirar, definirToken, ApiError } = await import("../src/lib/api.ts");
const { useRecurso } = await import("../src/hooks/useRecurso.ts");

const campo = (chave, extras = {}) => ({
  chave, rotulo: chave, ajuda: "", origem: "vaga", formato: "texto", obrigatorio: true,
  valor: "", autopreenchido: false, ...extras,
});
const modelo = () => ({ vaga: 7, candidatura: null, instrucoes: "Responda", campos: [
  campo("nome", { origem: "perfil", valor: "Ana", autopreenchido: true }), campo("motivacao"),
] });
const resultado = { id: 42, vaga: { id: 7 }, analise: { score: 75, faixa: "alta", itens: [] }, respostas: [{ chave: "motivacao", valor: "Quero aprender" }] };
const adiar = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
function ambiente() {
  const dados = new Map();
  const storage = {
    get: async (chave) => dados.get(chave) ?? null,
    set: async (chave, valor) => { dados.set(chave, valor); },
    remove: async (chave) => { dados.delete(chave); },
  };
  const rascunhos = criarRascunhosCandidatura(storage);
  const destinos = [];
  const posts = [];
  const deps = {
    rascunhos, buscarFormulario: async () => modelo(),
    candidatar: async (vaga, respostas) => { posts.push({ vaga, respostas }); return resultado; },
    abrirResultado: (destino) => destinos.push(destino),
  };
  return { dados, storage, rascunhos, destinos, posts, deps, fluxo: (usuario = 1, vaga = 7) => new FluxoCandidatura(usuario, vaga, deps) };
}
async function preencher(fluxo) {
  await fluxo.carregar();
  fluxo.alterar("motivacao", "Quero aprender");
  fluxo.revisar();
}

test("POST confirmado mantém o resultado e bloqueia reenvio mesmo se a limpeza falhar", async () => {
  const a = ambiente();
  const fluxo = a.fluxo();
  await preencher(fluxo);
  a.storage.remove = async () => { throw new Error("Armazenamento indisponível"); };
  await fluxo.enviar();
  assert.deepEqual(a.destinos, [{ id: 42, recemCriada: true, resultado }]);
  assert.equal(a.destinos[0].resultado, resultado);
  assert.equal(fluxo.snapshot().erro, null);
  assert.match(fluxo.snapshot().aviso, /rascunho/);
  assert.equal(fluxo.snapshot().enviando, false);
  fluxo.revisar();
  await fluxo.enviar();
  await fluxo.carregar();
  assert.equal(a.posts.length, 1);
  assert.equal(a.destinos.length, 1);
  assert.equal(a.destinos[0].resultado, resultado);

  // O rascunho residual não deve voltar ao editor numa nova montagem.
  assert.notEqual(await a.rascunhos.carregar(1, 7), null);
  a.deps.buscarFormulario = async () => ({ ...modelo(), candidatura: 42 });
  const remontado = a.fluxo();
  await remontado.carregar();
  assert.deepEqual(a.destinos[1], { id: 42 });
  assert.equal(remontado.snapshot().formulario, null);
  assert.deepEqual(remontado.snapshot().respostas, {});
  assert.equal(a.posts.length, 1);
});

for (const etapa of ["carregamento", "envio"]) test(`candidatura existente no ${etapa} abre resultado mesmo se a limpeza falhar`, async () => {
  const a = ambiente();
  const fluxo = a.fluxo();
  await preencher(fluxo);
  a.deps.buscarFormulario = async () => ({ ...modelo(), candidatura: 42 });
  // Simula também o adaptador web que silencia a falha de remoção.
  a.storage.remove = async () => {};
  const recuperado = etapa === "carregamento" ? a.fluxo() : fluxo;
  if (etapa === "carregamento") await recuperado.carregar();
  else await recuperado.enviar();
  assert.deepEqual(a.destinos, [{ id: 42 }]);
  assert.equal(recuperado.snapshot().erro, null);
  assert.match(recuperado.snapshot().aviso, /rascunho/);
  recuperado.revisar();
  await recuperado.enviar();
  await recuperado.carregar();
  assert.equal(a.posts.length, 0);
  assert.equal(a.destinos.length, 1);
});

for (const etapa of ["consulta", "post"]) test(`401 real no ${etapa} encerra a sessão; remontagem da mesma conta restaura o rascunho`, async () => {
  const a = ambiente();
  const fluxo = a.fluxo();
  await preencher(fluxo);
  const fetchOriginal = globalThis.fetch;
  let sessaoEncerrada = false;
  let haviaRascunho = false;
  aoSessaoExpirar(() => {
    sessaoEncerrada = true;
    haviaRascunho = a.dados.has("teia.candidatura.1.7");
  });
  definirToken("token-apenas-no-cliente-http");
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: "Token expirado" }), { status: 401 });
  if (etapa === "consulta") a.deps.buscarFormulario = () => request("/vagas/7/formulario/");
  else a.deps.candidatar = (vaga, respostas) => request("/candidaturas/", { method: "POST", body: { vaga, respostas } });
  try {
    await fluxo.enviar();
    assert.equal(sessaoEncerrada, true);
    assert.equal(haviaRascunho, true);
    assert.equal(a.posts.length, 0);
    assert.equal([...a.dados.values()].join("").includes("token-apenas-no-cliente-http"), false);
    a.deps.buscarFormulario = async () => modelo();
    const remontado = a.fluxo();
    await remontado.carregar();
    assert.equal(remontado.snapshot().respostas.motivacao, "Quero aprender");
    assert.match(remontado.snapshot().aviso, /restaurado/);
  } finally {
    globalThis.fetch = fetchOriginal;
    aoSessaoExpirar(null);
    definirToken(null);
  }
});

test("rascunhos ficam isolados por usuário e vaga; descarte remove só o atual", async () => {
  const a = ambiente();
  const primeiro = a.fluxo();
  await preencher(primeiro);
  const outroUsuario = a.fluxo(2);
  await outroUsuario.carregar();
  assert.equal(outroUsuario.snapshot().respostas.motivacao, "");
  outroUsuario.alterar("motivacao", "Outro aluno");
  const outraVaga = a.fluxo(1, 8);
  await outraVaga.carregar();
  assert.equal(outraVaga.snapshot().respostas.motivacao, "");
  outraVaga.alterar("motivacao", "Outra vaga");
  await primeiro.descartar();
  assert.equal(await a.rascunhos.carregar(1, 7), null);
  assert.equal((await a.rascunhos.carregar(2, 7)).respostas.motivacao, "Outro aluno");
  assert.equal((await a.rascunhos.carregar(1, 8)).respostas.motivacao, "Outra vaga");
  const remontado = a.fluxo();
  await remontado.carregar();
  assert.equal(remontado.snapshot().respostas.motivacao, "");
});

test("modelo atualizado preserva compatíveis, remove antigas e exige revisão dos novos campos", async () => {
  const a = ambiente();
  const original = { ...modelo(), campos: [...modelo().campos, campo("removido"), campo("mudou")] };
  let formulario = original;
  a.deps.buscarFormulario = async () => formulario;
  const fluxo = a.fluxo();
  await preencher(fluxo);
  fluxo.alterar("removido", "Resposta antiga");
  fluxo.alterar("mudou", "Sentido anterior");
  fluxo.revisar();
  formulario = { ...modelo(), instrucoes: "Novas instruções", campos: [
    ...modelo().campos.map((c) => c.chave === "motivacao" ? { ...c, formato: "texto_longo", ajuda: "Detalhe" } : c),
    campo("mudou", { rotulo: "Outra pergunta" }), campo("novo"),
  ] };
  await fluxo.enviar();
  assert.equal(a.posts.length, 0);
  assert.equal(fluxo.snapshot().confirmando, false);
  assert.match(fluxo.snapshot().aviso, /mudou/);
  assert.deepEqual(fluxo.snapshot().respostas, { nome: "Ana", motivacao: "Quero aprender", mudou: "", novo: "" });
  fluxo.revisar();
  assert.equal(fluxo.snapshot().erros.novo, "Campo obrigatório.");
  fluxo.alterar("mudou", "Resposta revisada");
  fluxo.alterar("novo", "Nova resposta");
  fluxo.revisar();
  await fluxo.enviar();
  assert.equal(a.posts.length, 1);
  assert.equal("removido" in a.posts[0].respostas, false);
  assert.equal(a.posts[0].respostas.motivacao, "Quero aprender");
  assert.equal(await a.rascunhos.carregar(1, 7), null);
});

test("restauração compara modelo salvo ao atual sem perder valores compatíveis", async () => {
  const a = ambiente();
  await preencher(a.fluxo());
  a.deps.buscarFormulario = async () => ({ ...modelo(), campos: [...modelo().campos, campo("novo")] });
  const remontado = a.fluxo();
  await remontado.carregar();
  assert.equal(remontado.snapshot().respostas.motivacao, "Quero aprender");
  assert.equal(remontado.snapshot().respostas.novo, "");
  assert.match(remontado.snapshot().aviso, /mudou/);
});

test("resposta perdida após gravação recupera candidatura no retry sem novo POST", async () => {
  const a = ambiente();
  let gravou = false;
  a.deps.buscarFormulario = async () => ({ ...modelo(), candidatura: gravou ? 42 : null });
  a.deps.candidatar = async () => { a.posts.push({}); gravou = true; throw new ApiError(0, null, "Conexão perdida"); };
  const fluxo = a.fluxo();
  await preencher(fluxo);
  await fluxo.enviar();
  assert.equal(fluxo.snapshot().respostas.motivacao, "Quero aprender");
  assert.match(fluxo.snapshot().erro, /Conexão perdida/);
  assert.equal(a.destinos.length, 0);
  fluxo.revisar();
  await fluxo.enviar();
  assert.equal(a.posts.length, 1);
  assert.deepEqual(a.destinos, [{ id: 42 }]);
  assert.equal(await a.rascunhos.carregar(1, 7), null);
});

test("dois toques durante envio geram um POST e navegam com a resposta real", async () => {
  const a = ambiente();
  const pendente = adiar();
  a.deps.candidatar = async (vaga, respostas) => { a.posts.push({ vaga, respostas }); return pendente.promise; };
  const fluxo = a.fluxo();
  await preencher(fluxo);
  const envio = fluxo.enviar();
  await fluxo.enviar();
  // Drena as operações de persistência e consulta anteriores ao POST.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(a.posts.length, 1);
  fluxo.alterar("motivacao", "Não deve mudar durante envio");
  assert.equal(fluxo.snapshot().respostas.motivacao, "Quero aprender");
  pendente.resolve(resultado);
  await envio;
  await fluxo.enviar();
  assert.equal(a.posts.length, 1);
  assert.deepEqual(a.destinos, [{ id: 42, recemCriada: true, resultado }]);
  assert.equal(a.destinos[0].resultado, resultado);
  assert.equal(await a.rascunhos.carregar(1, 7), null);
});

test("400 exibe mensagens por campo, mantém respostas e permite corrigir e reenviar", async () => {
  const a = ambiente();
  a.deps.candidatar = async () => { throw new ApiError(400, { respostas: { motivacao: "Resposta inválida." } }, "Erro 400"); };
  const fluxo = a.fluxo();
  await preencher(fluxo);
  await fluxo.enviar();
  assert.deepEqual(fluxo.snapshot().erros, { motivacao: "Resposta inválida." });
  assert.equal(fluxo.snapshot().respostas.motivacao, "Quero aprender");
  assert.equal(fluxo.snapshot().enviando, false);
  fluxo.alterar("motivacao", "Resposta corrigida");
  assert.equal(fluxo.snapshot().erros.motivacao, "");
  a.deps.candidatar = async () => resultado;
  fluxo.revisar();
  await fluxo.enviar();
  assert.equal(a.destinos[0].resultado, resultado);
});

test("persistência ordenada termina antes do descarte, sem recriar rascunho", async () => {
  const a = ambiente();
  const pendente = adiar();
  const gravar = a.storage.set;
  a.storage.set = async (...args) => { await pendente.promise; return gravar(...args); };
  const fluxo = a.fluxo();
  await preencher(fluxo);
  fluxo.alterar("motivacao", "Última edição");
  const descarte = fluxo.descartar();
  pendente.resolve();
  await descarte;
  assert.equal(await a.rascunhos.carregar(1, 7), null);
});

test("falha silenciosa do armazenamento é detectada antes de qualquer POST", async () => {
  const a = ambiente();
  a.storage.set = async () => {};
  const fluxo = a.fluxo();
  await preencher(fluxo);
  await fluxo.enviar();
  assert.equal(a.posts.length, 0);
  assert.match(fluxo.snapshot().erro, /salvar o rascunho/);
  assert.equal(fluxo.snapshot().respostas.motivacao, "Quero aprender");
});

test("detalhe pode renderizar imediatamente o resultado do POST mesmo sem rede", () => {
  let consultas = 0;
  function Detalhe() {
    const recurso = useRecurso(async () => { consultas++; throw new Error("Sem rede"); }, [], resultado);
    assert.equal(recurso.carregando, false);
    return createElement("p", null, `Compatibilidade: ${recurso.dados.analise.score}%`);
  }
  assert.match(renderToStaticMarkup(createElement(Detalhe)), /75%/);
  assert.equal(consultas, 0);
});


test("rascunho é preservado mesmo se outra chamada HTTP expirar a sessão antes do envio", async () => {
  const a = ambiente();
  const fluxo = a.fluxo();
  await preencher(fluxo);
  const fetchOriginal = globalThis.fetch;
  aoSessaoExpirar(() => {});
  globalThis.fetch = async () => new Response("{}", { status: 401 });
  try {
    await assert.rejects(request("/me/"), (e) => e.status === 401);
    const remontado = a.fluxo();
    await remontado.carregar();
    assert.equal(remontado.snapshot().respostas.motivacao, "Quero aprender");
  } finally {
    globalThis.fetch = fetchOriginal;
    aoSessaoExpirar(null);
  }
});

test("mudança de origem ou formato incompatível não reutiliza resposta para outra pergunta", async () => {
  const a = ambiente();
  const fluxo = a.fluxo();
  await preencher(fluxo);
  a.deps.buscarFormulario = async () => ({ ...modelo(), campos: [
    campo("nome", { origem: "vaga" }), campo("motivacao", { formato: "sim_nao" }),
  ] });
  await fluxo.enviar();
  assert.deepEqual(fluxo.snapshot().respostas, { nome: "", motivacao: "" });
  assert.equal(a.posts.length, 0);
});

test("valores novos do perfil não são confundidos com alteração no modelo", async () => {
  const a = ambiente();
  const fluxo = a.fluxo();
  await preencher(fluxo);
  fluxo.alterar("nome", "Nome revisado");
  a.deps.buscarFormulario = async () => ({ ...modelo(), campos: modelo().campos.map((c) => ({ ...c, valor: c.origem === "perfil" ? "Novo perfil" : "" })) });
  await fluxo.enviar();
  assert.equal(a.posts.length, 1);
  assert.equal(a.posts[0].respostas.nome, "Nome revisado");
});

test("rascunho inválido é ignorado sem vazar campos para o POST", async () => {
  const a = ambiente();
  a.dados.set("teia.candidatura.1.7", '{"campos":null,"respostas":{"inventado":"x"}}');
  const fluxo = a.fluxo();
  await preencher(fluxo);
  assert.equal("inventado" in fluxo.snapshot().respostas, false);
  await fluxo.enviar();
  assert.equal("inventado" in a.posts[0].respostas, false);
});
