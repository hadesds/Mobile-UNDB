import type { ItemAnalise } from "../types";

// Hipótese do protótipo: requisitos com evidência ÷ requisitos cadastrados, todos com o mesmo peso.
export type Faixa = "alta" | "media" | "baixa";

export function calcular(itens: ItemAnalise[]) {
  const total = itens.length;
  const comEvidencia = itens.filter((i) => i.status === "encontrado").length;
  const percentual = total ? Math.round((100 * comEvidencia) / total) : 0;
  return { total, comEvidencia, percentual, faixa: faixaDe(percentual) };
}

export function faixaDe(percentual: number): Faixa {
  if (percentual >= 75) return "alta";
  if (percentual >= 50) return "media";
  return "baixa";
}

export const ROTULO_FAIXA: Record<Faixa, string> = {
  alta: "Compatibilidade alta",
  media: "Compatibilidade média",
  baixa: "Compatibilidade baixa",
};