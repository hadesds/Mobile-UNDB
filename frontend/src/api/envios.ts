import { request } from "../lib/api";
import type { LinkCriado, LinkEmpresa, Paginado, SolicitacaoVaga, StatusSolicitacao } from "../types";

/** Filtro de links: "encerrado" junta expirados e revogados que não receberam envio. */
export type FiltroLinks = "ativo" | "utilizado" | "encerrado";

export const listarLinks = (situacao?: FiltroLinks) =>
  request<Paginado<LinkEmpresa>>(`/gestor/links-empresa/?page_size=100${situacao ? `&situacao=${situacao}` : ""}`);

/** O token volta só nesta resposta: não guarde em armazenamento nem em parâmetros de navegação. */
export const gerarLink = (empresa: number, expiraEm: Date) =>
  request<LinkCriado>("/gestor/links-empresa/", {
    method: "POST",
    body: { empresa, expira_em: expiraEm.toISOString() },
  });

export const revogarLink = (id: number) =>
  request<LinkEmpresa>(`/gestor/links-empresa/${id}/revogar/`, { method: "POST" });

export const listarSolicitacoes = (status?: StatusSolicitacao) =>
  request<Paginado<SolicitacaoVaga>>(`/gestor/solicitacoes/?page_size=100${status ? `&status=${status}` : ""}`);

export const buscarSolicitacao = (id: number) => request<SolicitacaoVaga>(`/gestor/solicitacoes/${id}/`);

export type RevisaoSolicitacao = Partial<
  Pick<
    SolicitacaoVaga,
    "titulo" | "tipo" | "modalidade" | "descricao" | "prazo" | "periodo_minimo" | "disponibilidade_horario" | "cursos"
  > & {
    requisitos_competencia: { competencia: number; obrigatorio: boolean }[];
    requisitos_idioma: { idioma: string; nivel_minimo: number; obrigatorio: boolean }[];
  }
>;

export const revisarSolicitacao = (id: number, dados: RevisaoSolicitacao) =>
  request<SolicitacaoVaga>(`/gestor/solicitacoes/${id}/`, { method: "PATCH", body: dados });

export const publicarSolicitacao = (id: number) =>
  request<SolicitacaoVaga>(`/gestor/solicitacoes/${id}/publicar/`, { method: "POST" });

export const recusarSolicitacao = (id: number) =>
  request<SolicitacaoVaga>(`/gestor/solicitacoes/${id}/recusar/`, { method: "POST" });
