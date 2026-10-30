import { request } from "../lib/api";
import type {
  CompetenciaAdmin,
  CursoAdmin,
  Empresa,
  Nucleo,
  Paginado,
  Perfil,
  ResumoAdmin,
  UsuarioAdmin,
} from "../types";

const qs = (filtros: Record<string, string | undefined>) => {
  const p = new URLSearchParams({ page_size: "100" });
  Object.entries(filtros).forEach(([k, v]) => v && p.append(k, v));
  return p.toString();
};

export const buscarResumo = () => request<ResumoAdmin>("/admin/resumo/");

// Usuários
export const listarUsuarios = (f: { q?: string; perfil?: Perfil; ativo?: "true" | "false" } = {}) =>
  request<Paginado<UsuarioAdmin>>(`/admin/usuarios/?${qs(f)}`);

export const atualizarUsuario = (id: number, dados: { nome?: string; ativo?: boolean; cargo?: string }) =>
  request<UsuarioAdmin>(`/admin/usuarios/${id}/`, { method: "PATCH", body: dados });

export type NovoGestor = { nome: string; email: string; password: string; nucleo: number; cargo: string };
export const criarGestor = (dados: NovoGestor) =>
  request<UsuarioAdmin>("/admin/usuarios/", { method: "POST", body: dados });

export const listarNucleos = () => request<Nucleo[]>("/admin/nucleos/");

// Empresas
export const listarEmpresas = (f: { q?: string; ativa?: "true" | "false" } = {}) =>
  request<Paginado<Empresa>>(`/empresas/?${qs(f)}`);

export const salvarEmpresa = (dados: Partial<Empresa>, id?: number) =>
  id
    ? request<Empresa>(`/empresas/${id}/`, { method: "PATCH", body: dados })
    : request<Empresa>("/empresas/", { method: "POST", body: dados });

export const excluirEmpresa = (id: number) => request<void>(`/empresas/${id}/`, { method: "DELETE" });

// Vocabulário de competências
export const listarCompetenciasAdmin = (f: { q?: string; categoria?: string } = {}) =>
  request<Paginado<CompetenciaAdmin>>(`/admin/competencias/?${qs(f)}`);

export const salvarCompetencia = (dados: Partial<CompetenciaAdmin>, id?: number) =>
  id
    ? request<CompetenciaAdmin>(`/admin/competencias/${id}/`, { method: "PATCH", body: dados })
    : request<CompetenciaAdmin>("/admin/competencias/", { method: "POST", body: dados });

export const excluirCompetencia = (id: number) =>
  request<void>(`/admin/competencias/${id}/`, { method: "DELETE" });

// Cursos
export const listarCursosAdmin = () => request<CursoAdmin[]>("/admin/cursos/");

export const salvarCurso = (dados: Partial<CursoAdmin>, id?: number) =>
  id
    ? request<CursoAdmin>(`/admin/cursos/${id}/`, { method: "PATCH", body: dados })
    : request<CursoAdmin>("/admin/cursos/", { method: "POST", body: dados });

export const excluirCurso = (id: number) => request<void>(`/admin/cursos/${id}/`, { method: "DELETE" });
