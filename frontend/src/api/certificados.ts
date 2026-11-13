import { request } from "../lib/api";
import type { Certificado } from "../types";
import type { ArquivoEscolhido } from "./curriculo";

// Formato combinado com o backend: ver docs/api.md, "Certificados".

export const listarCertificados = () => request<Certificado[]>("/me/certificados/");

export type NovoCertificado = {
  titulo: string;
  instituicao?: string;
  /** Em horas. */
  carga_horaria?: number;
  /** "AAAA-MM-DD". */
  data?: string;
  arquivo: ArquivoEscolhido;
};

/** Envia o certificado (multipart). PDF, JPG ou PNG, até 5 MB. */
export function enviarCertificado({ arquivo, ...campos }: NovoCertificado) {
  const dados = new FormData();
  dados.append("titulo", campos.titulo);
  if (campos.instituicao) dados.append("instituicao", campos.instituicao);
  if (campos.carga_horaria) dados.append("carga_horaria", String(campos.carga_horaria));
  if (campos.data) dados.append("data", campos.data);
  if (arquivo.file) {
    dados.append("arquivo", arquivo.file, arquivo.name);
  } else {
    // React Native aceita {uri, name, type} no FormData para enviar o arquivo do aparelho.
    dados.append("arquivo", { uri: arquivo.uri, name: arquivo.name, type: arquivo.mimeType ?? "application/octet-stream" } as unknown as Blob);
  }
  return request<Certificado>("/me/certificados/", { method: "POST", body: dados });
}

export const removerCertificado = (id: number) => request<void>(`/me/certificados/${id}/`, { method: "DELETE" });
