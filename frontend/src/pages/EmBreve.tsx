import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../constants/theme";

/** Espaço reservado para as abas que ainda serão construídas. */
export default function EmBreve() {
  return (
    <View style={styles.box}>
      <Text style={styles.titulo}>Em construção</Text>
      <Text style={styles.texto}>Esta seção entra nas próximas etapas do app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  titulo: { fontSize: 18, fontWeight: "700", color: colors.text },
  texto: { fontSize: 14, color: colors.muted, textAlign: "center" },
});