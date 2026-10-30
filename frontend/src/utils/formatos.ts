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

export const ROTULO_NIVEL_COMPETENCIA: Record<number, string> = {
  1: "Básico",
  2: "Intermediário",
  3: "Avançado",
};

export const ROTULO_FORMACAO: Record<string, string> = {
  medio: "Ensino médio",
  tecnico: "Técnico",
  graduacao: "Graduação",
  especializacao: "Especialização",
  mestrado: "Mestrado",
  doutorado: "Doutorado",
};

export const ROTULO_EXPERIENCIA: Record<string, string> = {
  estagio: "Estágio",
  emprego: "Emprego",
  projeto: "Projeto",
  voluntariado: "Voluntariado",
  academica: "Atividade acadêmica",
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
    .filter((p) => /^\p{L}/u.test(p))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2025-03-01" → "mar 2025" */
export function formatarMesAno(iso: string | null): string {
  if (!iso) return "";
  const [a, m] = iso.slice(0, 10).split("-");
  return `${MESES[Number(m) - 1]} ${a}`;
}

/** Intervalo legível: "mar 2025 – dez 2025" ou "mar 2025 – atual". */
export function formatarPeriodo(inicio: string | null, fim: string | null, atual = "atual"): string {
  if (!inicio && !fim) return "";
  return `${formatarMesAno(inicio) || "?"} – ${fim ? formatarMesAno(fim) : atual}`;
}

/** "03/2025" → "2025-03-01" (ou null quando vazio/inválido). */
export function mesAnoParaIso(texto: string): string | null | undefined {
  const t = texto.trim();
  if (!t) return null;
  const m = /^(\d{1,2})\/(\d{4})$/.exec(t);
  if (!m) return undefined;
  const mes = Number(m[1]);
  if (mes < 1 || mes > 12) return undefined;
  return `${m[2]}-${String(mes).padStart(2, "0")}-01`;
}

/** "2025-03-01" → "03/2025" (para preencher o campo de edição). */
export function isoParaMesAno(iso: string | null): string {
  if (!iso) return "";
  const [a, m] = iso.slice(0, 10).split("-");
  return `${m}/${a}`;
}

/** Máscara enquanto digita: "032025" → "03/2025". */
export function mascararMesAno(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 6);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** Dias até a data (negativo se já passou). Sem fuso: compara datas locais. */
export function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const alvo = new Date(a!, m! - 1, d!);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/** "Encerra hoje", "Encerra em 3 dias", "Até 30/10/2026". */
export function rotuloPrazo(iso: string | null): { texto: string; urgente: boolean } {
  const dias = diasAte(iso);
  if (dias === null) return { texto: "Sem prazo definido", urgente: false };
  if (dias <= 0) return { texto: "Encerra hoje", urgente: true };
  if (dias === 1) return { texto: "Encerra amanhã", urgente: true };
  if (dias <= 7) return { texto: `Encerra em ${dias} dias`, urgente: true };
  return { texto: `Até ${formatarData(iso)}`, urgente: false };
}

/** "há 2 dias", "hoje", "ontem" — para datas de envio e atualização. */
export function tempoRelativo(iso: string): string {
  const dias = -(diasAte(iso) ?? 0);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return `em ${formatarData(iso)}`;
}
