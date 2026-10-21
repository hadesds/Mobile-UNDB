import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radius } from "../../constants/theme";

type Tom = "marca" | "sucesso" | "alerta" | "neutro";

const TONS: Record<Tom, { bg: string; fg: string }> = {
  marca: { bg: colors.primarySoft, fg: colors.primaryDark },
  sucesso: { bg: colors.successSoft, fg: colors.successText },
  alerta: { bg: colors.warningSoft, fg: colors.warning },
  neutro: { bg: colors.neutralSoft, fg: colors.muted },
};

type Props = {
  texto: string;
  tom?: Tom;
  /** Quando informado, o chip vira um filtro selecionável. */
  selecionado?: boolean;
  onPress?: () => void;
};

export function Chip({ texto, tom = "neutro", selecionado, onPress }: Props) {
  const filtro = onPress !== undefined;
  const t = filtro
    ? selecionado
      ? { bg: colors.primary, fg: colors.primaryText }
      : { bg: colors.surface, fg: colors.text }
    : TONS[tom];

  return (
    <Pressable
      disabled={!filtro}
      onPress={onPress}
      accessibilityRole={filtro ? "button" : "text"}
      accessibilityState={filtro ? { selected: !!selecionado } : undefined}
      style={[
        styles.chip,
        { backgroundColor: t.bg },
        filtro && !selecionado && styles.contorno,
      ]}
    >
      <Text style={[styles.texto, { color: t.fg }]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contorno: { borderWidth: 1, borderColor: colors.border },
  texto: { fontSize: 13, fontWeight: "700" },
});