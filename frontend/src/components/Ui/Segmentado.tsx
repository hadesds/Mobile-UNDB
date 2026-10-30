import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../../constants/theme";

type Opcao<T> = { valor: T; rotulo: string };

type Props<T> = {
  opcoes: Opcao<T>[];
  valor: T | null;
  onAlterar: (v: T | null) => void;
  rotuloAcessivel: string;
  /** Tocar na opção já escolhida desmarca (para campos opcionais). */
  opcional?: boolean;
};

/** Escolha única entre poucas opções curtas (níveis, tipos). */
export function Segmentado<T extends string | number>({ opcoes, valor, onAlterar, rotuloAcessivel, opcional }: Props<T>) {
  return (
    <View style={styles.trilho} accessibilityRole="radiogroup" accessibilityLabel={rotuloAcessivel}>
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            onPress={() => onAlterar(ativo && opcional ? null : o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
            accessibilityLabel={o.rotulo}
            style={({ pressed }) => [styles.opcao, ativo && styles.ativo, pressed && !ativo && { opacity: 0.6 }]}
          >
            <Text style={[styles.texto, ativo && styles.textoAtivo]} numberOfLines={1}>
              {o.rotulo}
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
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  ativo: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  texto: { fontSize: 13, fontWeight: "600", color: colors.muted },
  textoAtivo: { color: colors.primaryDark, fontWeight: "800" },
});
