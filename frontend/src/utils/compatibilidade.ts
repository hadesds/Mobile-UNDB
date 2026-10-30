import type { Faixa, StatusCandidatura } from "../types";
import type { Tom } from "../components/Ui/Chip";

// Faixas definidas pelo backend (Analise.FAIXA_*). Provisórias até validação com o TEIA.
export const FAIXA_ALTA_MIN = 70;
export const FAIXA_MEDIA_MIN = 40;

export const ROTULO_FAIXA: Record<Faixa, string> = {
  alta: "Compatibilidade alta",
  media: "Compatibilidade média",
  baixa: "Compatibilidade baixa",
};

export const TOM_FAIXA: Record<Faixa, Tom> = { alta: "sucesso", media: "alerta", baixa: "neutro" };

export const ROTULO_STATUS: Record<StatusCandidatura, string> = {
  analisada: "Em análise pelo TEIA",
  encaminhada: "Encaminhada à empresa",
  em_processo: "Em processo seletivo",
  nao_selecionada: "Não selecionada",
};

export const TOM_STATUS: Record<StatusCandidatura, Tom> = {
  analisada: "neutro",
  encaminhada: "marca",
  em_processo: "sucesso",
  nao_selecionada: "alerta",
};

/** Etapas do acompanhamento, na ordem em que acontecem. */
export const ETAPAS: { status: StatusCandidatura; titulo: string; texto: string }[] = [
  { status: "analisada", titulo: "Candidatura enviada", texto: "A equipe do TEIA recebeu sua análise." },
  { status: "encaminhada", titulo: "Encaminhada", texto: "O TEIA enviou seu currículo à empresa." },
  { status: "em_processo", titulo: "Em processo", texto: "A empresa está conduzindo a seleção." },
];

/** Status na voz do gestor (o aluno lê ROTULO_STATUS). */
export const ROTULO_STATUS_GESTOR: Record<StatusCandidatura, string> = {
  analisada: "Aguardando decisão",
  encaminhada: "Encaminhada",
  em_processo: "Em processo",
  nao_selecionada: "Não selecionada",
};

export const ROTULO_ETAPA_CURTO: Record<StatusCandidatura, string> = {
  analisada: "Aguardando",
  encaminhada: "Encaminh.",
  em_processo: "Processo",
  nao_selecionada: "Não sel.",
};

/** O que cada decisão significa, explicado ao gestor antes de confirmar. */
export const SIGNIFICADO_DECISAO: Record<StatusCandidatura, string> = {
  analisada: "Volta para a fila. O aluno vê “Em análise pelo TEIA”.",
  encaminhada: "Você enviou o currículo à empresa. O aluno vê a etapa no acompanhamento.",
  em_processo: "A empresa está conduzindo a seleção com este aluno.",
  nao_selecionada: "Encerra a candidatura nesta vaga. Só você decide isso; o app nunca elimina ninguém.",
};

/** O motor escreve a evidência para o aluno ("seu currículo"); aqui a voz vira a do gestor. */
export function detalheParaGestor(detalhe: string, status: string): string {
  if (status === "nao_identificado" && detalhe.startsWith("Não encontramos registro")) {
    return "Sem registro no currículo do aluno. Pode ser falta de preenchimento, não falta da competência.";
  }
  return detalhe
    .replace("Nas suas competências", "Nas competências do aluno")
    .replace(/Seu curso:/g, "Curso do aluno:")
    .replace("não informado no currículo", "não informado pelo aluno");
}
