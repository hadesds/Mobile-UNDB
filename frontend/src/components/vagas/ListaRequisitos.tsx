import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../constants/theme";
import type { Vaga } from "../../types";
import { ROTULO_IDIOMA, ROTULO_NIVEL_IDIOMA } from "../../utils/formatos";
import { Cartao, Chip } from "../Ui";

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.bloco}>
      <Text style={styles.subtitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

/** Requisitos cadastrados pela empresa, como o estudante os vê. */
export function ListaRequisitos({ vaga }: { vaga: Vaga }) {
  return (
    <Cartao>
      <Text style={styles.titulo}>Requisitos da empresa</Text>

      <Bloco titulo="Cursos aceitos">
        <Text style={styles.texto}>
          {vaga.cursos.length ? vaga.cursos.map((c) => c.nome).join(", ") : "Qualquer curso"}
        </Text>
      </Bloco>

      {!!vaga.periodo_minimo && (
        <Bloco titulo="Semestre mínimo">
          <Text style={styles.texto}>A partir do {vaga.periodo_minimo}º semestre</Text>
        </Bloco>
      )}

      {vaga.requisitos_competencia.length > 0 && (
        <Bloco titulo="Competências">
          {vaga.requisitos_competencia.map((r) => (
            <View key={r.id} style={styles.linha}>
              <Text style={styles.texto}>{r.competencia_nome}</Text>
              <Chip
                texto={r.obrigatorio ? "Obrigatório" : "Desejável"}
                tom={r.obrigatorio ? "marca" : "neutro"}
              />
            </View>
          ))}
        </Bloco>
      )}

      {vaga.requisitos_idioma.length > 0 && (
        <Bloco titulo="Idiomas">
          {vaga.requisitos_idioma.map((r) => (
            <View key={r.id} style={styles.linha}>
              <Text style={styles.texto}>
                {ROTULO_IDIOMA[r.idioma] ?? r.idioma} · {ROTULO_NIVEL_IDIOMA[r.nivel_minimo]}
              </Text>
              <Chip
                texto={r.obrigatorio ? "Obrigatório" : "Desejável"}
                tom={r.obrigatorio ? "marca" : "neutro"}
              />
            </View>
          ))}
        </Bloco>
      )}

      {!!vaga.disponibilidade_horario && (
        <Bloco titulo="Disponibilidade">
          <Text style={styles.texto}>{vaga.disponibilidade_horario}</Text>
        </Bloco>
      )}
    </Cartao>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 17, fontWeight: "700", color: colors.text },
  bloco: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm + 4,
    paddingTop: spacing.sm + 4,
    gap: spacing.sm,
  },
  subtitulo: { fontSize: 13, fontWeight: "600", color: colors.muted },
  linha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  texto: { fontSize: 15, color: colors.text, flexShrink: 1 },
});