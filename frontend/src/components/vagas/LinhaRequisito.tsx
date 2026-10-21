import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";
import type { ItemAnalise, StatusRequisito } from "../../types";

const ESTILO: Record<StatusRequisito, { icone: string; cor: string; fundo: string }> = {
  encontrado: { icone: "✓", cor: colors.successText, fundo: colors.successSoft },
  nao_identificado: { icone: "?", cor: colors.muted, fundo: colors.neutralSoft },
  diferente: { icone: "≠", cor: colors.warning, fundo: colors.warningSoft },
};

/** Um requisito da devolutiva: nome, categoria e a evidência (ou a falta dela). */
export function LinhaRequisito({ item }: { item: ItemAnalise }) {
  const e = ESTILO[item.status];
  return (
    <View style={styles.cartao}>
      <View style={styles.topo}>
        <Text style={[styles.icone, { color: e.cor }]}>{e.icone}</Text>
        <Text style={styles.requisito}>{item.requisito}</Text>
        <Text style={styles.categoria}>{item.categoria}</Text>
      </View>
      <View style={[styles.detalhe, { backgroundColor: e.fundo }]}>
        <Text style={[styles.detalheTexto, { color: e.cor }]}>{item.detalhe}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topo: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  icone: { fontSize: 18, fontWeight: "800", width: 20, textAlign: "center" },
  requisito: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
  categoria: { fontSize: 13, color: colors.muted },
  detalhe: { borderRadius: radius.sm, padding: spacing.sm + 4 },
  detalheTexto: { fontSize: 14, lineHeight: 20 },
});