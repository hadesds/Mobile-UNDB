import type { Analise, Vaga } from "../types";
import { ROTULO_IDIOMA, ROTULO_NIVEL_IDIOMA } from "../utils/formatos";

/**
 * SIMULAÇÃO: o motor de compatibilidade ainda não existe no backend.
 * Monta uma análise a partir dos requisitos reais da vaga, usando o caso
 * fictício do protótipo (Marina Costa, Engenharia de Software, 6º semestre).
 * Trocar por uma chamada à API quando o endpoint de candidatura existir.
 */
export function analiseSimulada(vaga: Vaga): Analise {
  const itens: Analise["itens"] = [];

  if (vaga.cursos.length) {
    itens.push({
      requisito: "Curso",
      categoria: "Formação",
      status: "encontrado",
      detalhe: "Formação informada: Engenharia de Software · UNDB",
    });
  }
  if (vaga.periodo_minimo) {
    itens.push({
      requisito: "Semestre mínimo",
      categoria: "Formação",
      status: 6 >= vaga.periodo_minimo ? "encontrado" : "diferente",
      detalhe: `Requisito: a partir do ${vaga.periodo_minimo}º semestre · informado: 6º semestre`,
    });
  }
  vaga.requisitos_competencia.forEach((r, i) => {
    const naoTem = i % 4 === 3; // um em cada quatro fica sem registro, para mostrar o caso
    itens.push({
      requisito: r.competencia_nome,
      categoria: "Competência",
      status: naoTem ? "nao_identificado" : "encontrado",
      detalhe: naoTem
        ? "Não encontramos registro no seu currículo. Se você tem essa competência, associe-a a um projeto ou experiência."
        : `Evidência: projeto "Agenda Clínica-Escola" (${r.competencia_nome}).`,
    });
  });
  vaga.requisitos_idioma.forEach((r) => {
    const informado = 2;
    itens.push({
      requisito: ROTULO_IDIOMA[r.idioma] ?? r.idioma,
      categoria: "Idioma",
      status: informado >= r.nivel_minimo ? "encontrado" : "diferente",
      detalhe: `Pedido: ${ROTULO_NIVEL_IDIOMA[r.nivel_minimo]} · informado: ${ROTULO_NIVEL_IDIOMA[informado]}`,
    });
  });
  if (vaga.disponibilidade_horario) {
    itens.push({
      requisito: "Disponibilidade",
      categoria: "Disponibilidade",
      status: "encontrado",
      detalhe: `Pedido: ${vaga.disponibilidade_horario} · informado: manhã e tarde`,
    });
  }

  return { vagaId: vaga.id, criadaEm: new Date().toISOString(), itens };
}