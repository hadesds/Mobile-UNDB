import { StyleSheet, Text, View } from "react-native";

import { colors, font, spacing } from "../../constants/theme";
import type { Vaga } from "../../types";
import { ROTULO_IDIOMA, ROTULO_NIVEL_IDIOMA } from "../../utils/formatos";
import { Chip } from "../Ui";

function Bloco({ titulo, children, primeiro }: { titulo: string; children: React.ReactNode; primeiro?: boolean }) {
  return (
    <View style={[styles.bloco, !primeiro && styles.divisor]}>
      <Text style={styles.subtitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

function Marcador({ obrigatorio }: { obrigatorio: boolean }) {
  return <Chip texto={obrigatorio ? "Obrigatório" : "Desejável"} tom={obrigatorio ? "marca" : "neutro"} />;
}

/** Requisitos cadastrados pela empresa, completos (aberto sob demanda). */
export function ListaRequisitos({ vaga }: { vaga: Vaga }) {
  return (
    <View>
      <Bloco titulo="Cursos aceitos" primeiro>
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
              <Marcador obrigatorio={r.obrigatorio} />
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
              <Marcador obrigatorio={r.obrigatorio} />
            </View>
          ))}
        </Bloco>
      )}

      {!!vaga.disponibilidade_horario && (
        <Bloco titulo="Disponibilidade">
          <Text style={styles.texto}>{vaga.disponibilidade_horario}</Text>
        </Bloco>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: { paddingVertical: spacing.smd, gap: spacing.sm },
  divisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  subtitulo: { ...font.label },
  linha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  texto: { ...font.body, flexShrink: 1 },
});
