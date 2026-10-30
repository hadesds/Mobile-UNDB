import { request } from "../lib/api";
import type {
  CandidatoDetalhe,
  Competencia,
  Empresa,
  Paginado,
  PainelGestor,
  StatusCandidatura,
  StatusVaga,
  Triagem,
  VagaGestor,
} from "../types";

export const buscarPainel = () => request<PainelGestor>("/gestor/painel/");

export type FiltrosVagaGestor = { q?: string; status?: StatusVaga };

export function listarVagasGestor(filtros: FiltrosVagaGestor = {}) {
  const params = new URLSearchParams({ page_size: "100" });
  Object.entries(filtros).forEach(([k, v]) => v && params.append(k, v));
  return request<Paginado<VagaGestor>>(`/vagas/?${params}`);
}

export const buscarVagaGestor = (id: number) => request<VagaGestor>(`/vagas/${id}/`);

export type DadosVaga = Partial<
  Omit<VagaGestor, "id" | "gestor" | "empresa_nome" | "candidaturas" | "criada_em" | "atualizada_em">
>;

export function salvarVaga(dados: DadosVaga, id?: number) {
  return id
    ? request<VagaGestor>(`/vagas/${id}/`, { method: "PATCH", body: dados })
    : request<VagaGestor>("/vagas/", { method: "POST", body: dados });
}

export const buscarTriagem = (vaga: number) => request<Triagem>(`/vagas/${vaga}/candidatos/`);

export const buscarCandidato = (id: number) =>
  request<CandidatoDetalhe>(`/gestor/candidaturas/${id}/`);

export const decidir = (id: number, status: StatusCandidatura, observacao?: string) =>
  request<CandidatoDetalhe>(`/gestor/candidaturas/${id}/decidir/`, {
    method: "POST",
    body: observacao === undefined ? { status } : { status, observacao },
  });

export const listarEmpresasAtivas = () =>
  request<Paginado<Empresa>>("/empresas/?ativa=true&page_size=100");

export const buscarCompetenciasVocabulario = (q: string) =>
  request<Paginado<Competencia>>(`/competencias/?page_size=12&q=${encodeURIComponent(q)}`);
