import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";

type Aba<T extends string> = { chave: T; rotulo: string };

type Props<T extends string> = {
  abas: Aba<T>[];
  ativa: T;
  onChange: (chave: T) => void;
};

/** Seletor de abas em segmentos (as abas dividem a largura igualmente). */
export function Abas<T extends string>({ abas, ativa, onChange }: Props<T>) {
  return (
    <View style={styles.trilho} accessibilityRole="tablist">
      {abas.map((a) => {
        const selecionada = a.chave === ativa;
        return (
          <Pressable
            key={a.chave}
            accessibilityRole="tab"
            accessibilityState={{ selected: selecionada }}
            onPress={() => onChange(a.chave)}
            style={[styles.aba, selecionada && styles.abaAtiva]}
          >
            <Text style={[styles.texto, selecionada && styles.textoAtivo]}>
              {a.rotulo}
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
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  aba: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  abaAtiva: { backgroundColor: colors.surface },
  texto: { fontSize: 13, lineHeight: 18, textAlign: "center", fontWeight: "600", color: colors.muted },
  textoAtivo: { color: colors.primary, fontWeight: "700" },
});
