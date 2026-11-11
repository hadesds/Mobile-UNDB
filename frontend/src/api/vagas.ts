import { request } from "../lib/api";
import type { FormularioCandidatura, Modalidade, Paginado, TipoVaga, Vaga } from "../types";

export type FiltrosVaga = { q?: string; tipo?: TipoVaga; modalidade?: Modalidade };

export function listarVagas(filtros: FiltrosVaga = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => v && params.append(k, v));
  const qs = params.toString();
  return request<Paginado<Vaga>>(`/vagas/${qs ? `?${qs}` : ""}`);
}

export const buscarVaga = (id: number) => request<Vaga>(`/vagas/${id}/`);

/** Formulário da vaga com os dados do perfil já preenchidos (só aluno com termo LGPD). */
export const buscarFormulario = (id: number) =>
  request<FormularioCandidatura>(`/vagas/${id}/formulario/`);
