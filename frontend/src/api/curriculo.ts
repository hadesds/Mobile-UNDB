import { request } from "../lib/api";
import type { Competencia, Curriculo, LeituraCurriculo, Paginado, ResultadoImportacao, SecaoCurriculo } from "../types";

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

// ---- Currículo em arquivo (PDF/DOCX) ----------------------------------------

/** Arquivo escolhido no seletor de documentos. No web vem o `File`; no app, a `uri`. */
export type ArquivoEscolhido = { uri: string; name: string; mimeType?: string | null; file?: File };

export function enviarArquivo(arquivo: ArquivoEscolhido) {
  const dados = new FormData();
  if (arquivo.file) {
    dados.append("arquivo", arquivo.file, arquivo.name);
  } else {
    // React Native aceita {uri, name, type} no FormData para enviar o arquivo do aparelho.
    dados.append("arquivo", { uri: arquivo.uri, name: arquivo.name, type: arquivo.mimeType ?? "application/octet-stream" } as unknown as Blob);
  }
  return request<LeituraCurriculo>("/me/perfil/arquivo/", { method: "POST", body: dados });
}

export const buscarLeitura = () => request<LeituraCurriculo>("/me/perfil/arquivo/");

export const removerArquivo = () => request<void>("/me/perfil/arquivo/", { method: "DELETE" });

export const importarSugestoes = (dados: Partial<Record<SecaoCurriculo, Record<string, unknown>[]>>) =>
  request<ResultadoImportacao>("/me/perfil/importar/", { method: "POST", body: dados });
