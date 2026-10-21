import type { Modalidade, TipoVaga } from "../types";

export const ROTULO_TIPO: Record<TipoVaga, string> = {
  estagio_obrigatorio: "Estágio obrigatório",
  estagio_nao_obrigatorio: "Estágio não obrigatório",
  clt: "Emprego (CLT)",
};

export const ROTULO_MODALIDADE: Record<Modalidade, string> = {
  presencial: "Presencial",
  remoto: "Remoto",
  hibrido: "Híbrido",
};

export const ROTULO_IDIOMA: Record<string, string> = {
  ingles: "Inglês",
  espanhol: "Espanhol",
  frances: "Francês",
  alemao: "Alemão",
  italiano: "Italiano",
  libras: "Libras",
  outro: "Outro",
};

export const ROTULO_NIVEL_IDIOMA: Record<number, string> = {
  1: "Básico",
  2: "Intermediário",
  3: "Avançado",
  4: "Fluente",
};

/** "2026-10-30" → "30/10/2026" (sem passar por Date, para não sofrer com fuso). */
export function formatarData(iso: string | null): string {
  if (!iso) return "Sem prazo";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "Lumen Tecnologia" → "LT" */
export function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}