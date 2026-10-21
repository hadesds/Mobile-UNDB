import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";

/** Bloco "rótulo / valor" usado na grade de informações da vaga. */
export function InfoTile({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={styles.valor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 6,
  },
  rotulo: { fontSize: 13, color: colors.muted },
  valor: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 },
});