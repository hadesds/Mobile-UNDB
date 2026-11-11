import { request } from "../lib/api";
import type { Candidatura, CandidaturaResumo, RespostasFormulario } from "../types";

export const listarCandidaturas = (vaga?: number) =>
  request<CandidaturaResumo[]>(`/candidaturas/${vaga ? `?vaga=${vaga}` : ""}`);

export const buscarCandidatura = (id: number) => request<Candidatura>(`/candidaturas/${id}/`);

/**
 * Cria a candidatura; o servidor já devolve a primeira análise.
 * `respostas` = { chave: valor } do formulário (buscarFormulario). Em erro 400,
 * o corpo vem como { respostas: { chave: "mensagem" } } para marcar cada campo.
 * TODO(Ana Vitória): passar as respostas da tela nova; sem elas o backend ainda
 * aceita (modo de transição), mas não exige os campos obrigatórios da vaga.
 */
export const candidatar = (vaga: number, respostas?: RespostasFormulario) =>
  request<Candidatura>("/candidaturas/", {
    method: "POST",
    body: respostas ? { vaga, respostas } : { vaga },
  });

export const reanalisar = (id: number) =>
  request<Candidatura>(`/candidaturas/${id}/reanalisar/`, { method: "POST" });
