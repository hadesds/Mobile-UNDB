import { request } from "../lib/api";
import type { Candidatura, CandidaturaResumo } from "../types";

export const listarCandidaturas = (vaga?: number) =>
  request<CandidaturaResumo[]>(`/candidaturas/${vaga ? `?vaga=${vaga}` : ""}`);

export const buscarCandidatura = (id: number) => request<Candidatura>(`/candidaturas/${id}/`);

/** Cria a candidatura; o servidor já devolve a primeira análise. */
export const candidatar = (vaga: number) =>
  request<Candidatura>("/candidaturas/", { method: "POST", body: { vaga } });

export const reanalisar = (id: number) =>
  request<Candidatura>(`/candidaturas/${id}/reanalisar/`, { method: "POST" });
