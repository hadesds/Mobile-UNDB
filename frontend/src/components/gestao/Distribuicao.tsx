import { StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "../../constants/theme";

export type Fatia = { rotulo: string; valor: number; cor: string };

/** Barra empilhada com legenda: como um total se divide entre categorias. */
export function Distribuicao({ fatias, rotuloAcessivel }: { fatias: Fatia[]; rotuloAcessivel: string }) {
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  const descricao = fatias.map((f) => `${f.rotulo}: ${f.valor}`).join(", ");
  return (
    <View style={{ gap: spacing.smd }} accessible accessibilityLabel={`${rotuloAcessivel}. ${descricao}`}>
      <View style={styles.trilho}>
        {total === 0 ? null : (
          fatias
            .filter((f) => f.valor > 0)
            .map((f, i) => (
              <View
                key={f.rotulo}
                style={{ flex: f.valor, backgroundColor: f.cor, marginLeft: i === 0 ? 0 : 2 }}
              />
            ))
        )}
      </View>
      <View style={styles.legenda}>
        {fatias.map((f) => (
          <View key={f.rotulo} style={styles.item}>
            <View style={[styles.marca, { backgroundColor: f.cor }]} />
            <Text style={styles.rotulo}>{f.rotulo}</Text>
            <Text style={styles.valor}>{f.valor}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: {
    flexDirection: "row",
    height: 12,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: colors.neutralSoft,
  },
  legenda: { gap: spacing.xs },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 28 },
  marca: { width: 10, height: 10, borderRadius: 3 },
  rotulo: { ...font.body, fontSize: 14, flex: 1, color: colors.muted },
  valor: { ...font.body, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
