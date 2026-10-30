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
