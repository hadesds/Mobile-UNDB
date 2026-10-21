import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";

type Variante = "primario" | "contorno" | "link";

type Props = {
  titulo: string;
  onPress?: () => void;
  variante?: Variante;
  carregando?: boolean;
  desabilitado?: boolean;
  style?: ViewStyle;
};

export function Botao({
  titulo,
  onPress,
  variante = "primario",
  carregando,
  desabilitado,
  style,
}: Props) {
  const inativo = desabilitado || carregando;
  const corTexto = variante === "primario" ? colors.primaryText : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        styles.base,
        fundo[variante],
        pressed && !inativo && styles.pressionado,
        inativo && styles.inativo,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <Text style={[styles.rotulo, { color: corTexto }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  rotulo: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  pressionado: { opacity: 0.85 },
  inativo: { opacity: 0.5 },
});

const fundo = StyleSheet.create({
  primario: { backgroundColor: colors.primary },
  contorno: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  link: { backgroundColor: "transparent", minHeight: 40 },
});