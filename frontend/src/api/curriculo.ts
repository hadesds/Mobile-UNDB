import { request } from "../lib/api";
import type { Competencia, Curriculo, Paginado, SecaoCurriculo } from "../types";

export const buscarCurriculo = () => request<Curriculo>("/me/perfil/");

export function salvarItem(secao: SecaoCurriculo, dados: Record<string, unknown>, id?: number) {
  return id
    ? request(`/me/perfil/${secao}/${id}/`, { method: "PATCH", body: dados })
    : request(`/me/perfil/${secao}/`, { method: "POST", body: dados });
}

export const removerItem = (secao: SecaoCurriculo, id: number) =>
  request<void>(`/me/perfil/${secao}/${id}/`, { method: "DELETE" });

export const buscarCompetencias = (q: string) =>
  request<Paginado<Competencia>>(`/competencias/?page_size=12&q=${encodeURIComponent(q)}`);
