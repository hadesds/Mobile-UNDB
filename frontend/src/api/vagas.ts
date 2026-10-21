import { request } from "../lib/api";
import type { Modalidade, Paginado, TipoVaga, Vaga } from "../types";

export type FiltrosVaga = { q?: string; tipo?: TipoVaga; modalidade?: Modalidade };

export function listarVagas(filtros: FiltrosVaga = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => v && params.append(k, v));
  const qs = params.toString();
  return request<Paginado<Vaga>>(`/vagas/${qs ? `?${qs}` : ""}`);
}

export const buscarVaga = (id: number) => request<Vaga>(`/vagas/${id}/`);