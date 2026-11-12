import type { CampoFormulario, RespostasFormulario } from "../types";

export function validarObrigatorios(campos: CampoFormulario[], respostas: RespostasFormulario) {
  return Object.fromEntries(
    campos
      .filter((campo) => campo.obrigatorio && !respostas[campo.chave]?.trim())
      .map((campo) => [campo.chave, "Campo obrigatório."]),
  );
}

/** O backend devolve uma mensagem por chave em { respostas: { chave: mensagem } }. */
export function errosDasRespostas(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object" || !("respostas" in data)) return {};
  const respostas = data.respostas;
  if (!respostas || typeof respostas !== "object" || Array.isArray(respostas)) return {};
  return Object.fromEntries(Object.entries(respostas).filter(([, valor]) => typeof valor === "string"));
}
