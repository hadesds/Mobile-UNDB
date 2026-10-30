import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";
import type { StatusCandidatura } from "../../types";
import { ROTULO_STATUS_GESTOR } from "../../utils/compatibilidade";

const ETAPAS: StatusCandidatura[] = ["analisada", "encaminhada", "em_processo", "nao_selecionada"];
const ROTULO: Record<StatusCandidatura, string> = { ...ROTULO_STATUS_GESTOR, analisada: "Aguardando" };

type Props = {
  contagem: Record<StatusCandidatura, number>;
  /** `null` = nenhuma etapa selecionada (lista com todas). */
  valor: StatusCandidatura | null;
  onAlterar: (etapa: StatusCandidatura) => void;
};

/** Segmentos das quatro etapas, com a contagem de cada uma sempre visível. */
export function Etapas({ contagem, valor, onAlterar }: Props) {
  return (
    <View style={styles.trilho} accessibilityRole="radiogroup" accessibilityLabel="Etapa">
      {ETAPAS.map((e) => {
        const ativo = e === valor;
        return (
          <Pressable
            key={e}
            onPress={() => onAlterar(e)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
            accessibilityLabel={`${ROTULO_STATUS_GESTOR[e]}: ${contagem[e]}`}
            style={({ pressed }) => [styles.opcao, ativo && styles.ativo, pressed && !ativo && { opacity: 0.6 }]}
          >
            <Text style={[styles.numero, ativo && styles.numeroAtivo, contagem[e] === 0 && !ativo && styles.zero]}>
              {contagem[e]}
            </Text>
            <Text style={[styles.rotulo, ativo && styles.rotuloAtivo]} numberOfLines={2}>
              {ROTULO[e]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    flexDirection: "row",
    backgroundColor: colors.neutralSoft,
    borderRadius: radius.sm + 2,
    padding: 3,
    gap: 3,
  },
  opcao: {
    flex: 1,
    minHeight: 60,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 2,
    paddingVertical: spacing.sm,
  },
  ativo: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  numero: { fontSize: 18, lineHeight: 22, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  numeroAtivo: { color: colors.primaryDark },
  zero: { color: colors.subtle },
  // Duas linhas reservadas para que os números fiquem alinhados entre os segmentos.
  rotulo: { fontSize: 11, lineHeight: 14, minHeight: 28, fontWeight: "600", color: colors.muted, textAlign: "center" },
  rotuloAtivo: { color: colors.primaryDark },
});
