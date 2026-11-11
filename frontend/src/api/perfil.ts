import { request } from "../lib/api";
import type { CompetenciaPerfil, Paginado } from "../types";

/** Competência do vocabulário comum (o mesmo usado nos requisitos das vagas). */
export type CompetenciaCatalogo = { id: number; nome: string; categoria: string };

/** Parte do perfil do aluno (GET /me/perfil/) que a tela de competências usa. */
export type PerfilAluno = {
  id: number;
  completude: number;
  secoes: Record<string, boolean>;
  competencias: CompetenciaPerfil[];
  atualizado_em: string;
};

export const buscarPerfil = () => request<PerfilAluno>("/me/perfil/");

export const listarCatalogo = () => request<Paginado<CompetenciaCatalogo>>("/competencias/");

/** `termo` aceita o nome ou um sinônimo (ex.: "JS"); o servidor resolve no vocabulário. */
export const adicionarCompetencia = (termo: string) =>
  request<CompetenciaPerfil>("/me/perfil/competencias/", { method: "POST", body: { termo } });