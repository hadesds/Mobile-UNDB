import { request } from "../lib/api";
import type { Candidatura, CandidaturaResumo, RespostasFormulario } from "../types";

export const listarCandidaturas = (vaga?: number) =>
  request<CandidaturaResumo[]>(`/candidaturas/${vaga ? `?vaga=${vaga}` : ""}`);

export const buscarCandidatura = (id: number) => request<Candidatura>(`/candidaturas/${id}/`);

/**
 * Cria a candidatura; o servidor já devolve a primeira análise.
 * `respostas` = { chave: valor } do formulário (buscarFormulario). Em erro 400,
 * o corpo vem como { respostas: { chave: "mensagem" } } para marcar cada campo.
 * `certificados` (opcional) = IDs de listarCertificados() que o aluno escolheu; já contam na
 * primeira análise. Erro: { certificados: ["Certificado 7 não é seu."] }.
 */
export const candidatar = (vaga: number, respostas?: RespostasFormulario, certificados?: number[]) =>
  request<Candidatura>("/candidaturas/", {
    method: "POST",
    body: {
      vaga,
      ...(respostas ? { respostas } : {}),
      ...(certificados?.length ? { certificados } : {}),
    },
  });

export const reanalisar = (id: number) =>
  request<Candidatura>(`/candidaturas/${id}/reanalisar/`, { method: "POST" });
