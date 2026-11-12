import type { CampoFormulario, FormularioCandidatura, RespostasFormulario } from "../types";

type CampoRascunho = Pick<CampoFormulario, "chave" | "rotulo" | "ajuda" | "origem" | "formato" | "obrigatorio">;
export type RascunhoCandidatura = {
  instrucoes: string;
  campos: CampoRascunho[];
  respostas: RespostasFormulario;
};

type Armazenamento = {
  get: (chave: string) => Promise<string | null>;
  set: (chave: string, valor: string) => Promise<void>;
  remove: (chave: string) => Promise<void>;
};

export function modeloDoFormulario(formulario: FormularioCandidatura) {
  return {
    instrucoes: formulario.instrucoes,
    campos: formulario.campos.map(({ chave, rotulo, ajuda, origem, formato, obrigatorio }) =>
      ({ chave, rotulo, ajuda, origem, formato, obrigatorio })),
  };
}

export function restaurarRespostas(formulario: FormularioCandidatura, rascunho: RascunhoCandidatura | null) {
  return Object.fromEntries(formulario.campos.map((campo) => {
    const anterior = rascunho?.campos.find((c) => c.chave === campo.chave);
    const texto = (formato: string) => formato === "texto" || formato === "texto_longo";
    // Sem versão/id do campo na API, mudança de pergunta exige uma nova resposta.
    const compativel = anterior && anterior.rotulo === campo.rotulo && anterior.origem === campo.origem
      && (anterior.formato === campo.formato || (texto(anterior.formato) && texto(campo.formato)));
    return [campo.chave, compativel && typeof rascunho?.respostas[campo.chave] === "string"
      ? rascunho.respostas[campo.chave]
      : campo.origem === "perfil" ? campo.valor : ""];
  }));
}

function lerRascunho(texto: string | null): RascunhoCandidatura | null {
  if (!texto) return null;
  try {
    const dado = JSON.parse(texto);
    if (typeof dado?.instrucoes !== "string" || !Array.isArray(dado.campos)
      || !dado.respostas || typeof dado.respostas !== "object" || Array.isArray(dado.respostas)) return null;
    if (!dado.campos.every((c: CampoRascunho) => c && typeof c.chave === "string" && typeof c.rotulo === "string"
      && typeof c.ajuda === "string" && typeof c.obrigatorio === "boolean"
      && ["perfil", "vaga"].includes(c.origem)
      && ["texto", "texto_longo", "numero", "sim_nao", "url"].includes(c.formato))) return null;
    if (!Object.values(dado.respostas).every((v) => typeof v === "string")) return null;
    return dado;
  } catch {
    return null;
  }
}

/** Serializa gravações e remoções por usuário/vaga, inclusive entre montagens da tela. */
export function criarRascunhosCandidatura(storage: Armazenamento) {
  const filas = new Map<string, Promise<unknown>>();
  const chave = (usuario: number, vaga: number) => `teia.candidatura.${usuario}.${vaga}`;
  function executar<T>(id: string, operacao: () => Promise<T>): Promise<T> {
    const tarefa = (filas.get(id) ?? Promise.resolve()).catch(() => {}).then(operacao);
    filas.set(id, tarefa);
    void tarefa.finally(() => {
      if (filas.get(id) === tarefa) filas.delete(id);
    }).catch(() => {});
    return tarefa;
  }
  return {
    carregar: (usuario: number, vaga: number) => executar(chave(usuario, vaga), async () =>
      lerRascunho(await storage.get(chave(usuario, vaga)))),
    salvar: (usuario: number, vaga: number, dado: RascunhoCandidatura) => {
      const texto = JSON.stringify(dado);
      return executar(chave(usuario, vaga), async () => {
        await storage.set(chave(usuario, vaga), texto);
        // O adaptador web existente silencia falhas de localStorage.
        if (await storage.get(chave(usuario, vaga)) !== texto) throw new Error("Não foi possível salvar o rascunho neste dispositivo.");
      });
    },
    limpar: (usuario: number, vaga: number) => executar(chave(usuario, vaga), async () => {
      await storage.remove(chave(usuario, vaga));
      if (await storage.get(chave(usuario, vaga)) !== null) throw new Error("Não foi possível apagar o rascunho neste dispositivo.");
    }),
  };
}
