import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radius } from "../../constants/theme";
import { Icone, NomeIcone } from "./Icone";

export type Tom = "marca" | "sucesso" | "alerta" | "neutro" | "perigo";

export const TONS: Record<Tom, { bg: string; fg: string }> = {
  marca: { bg: colors.primarySoft, fg: colors.primaryDark },
  sucesso: { bg: colors.successSoft, fg: colors.successText },
  alerta: { bg: colors.warningSoft, fg: colors.warning },
  neutro: { bg: colors.neutralSoft, fg: colors.muted },
  perigo: { bg: colors.dangerSoft, fg: colors.danger },
};

type Props = {
  texto: string;
  tom?: Tom;
  icone?: NomeIcone;
  /** Quando informado, o chip vira um filtro selecionável. */
  selecionado?: boolean;
  onPress?: () => void;
  /** Mostra um X: o toque remove o filtro. */
  removivel?: boolean;
};

export function Chip({ texto, tom = "neutro", icone, selecionado, onPress, removivel }: Props) {
  const filtro = onPress !== undefined && !removivel;
  const t = removivel
    ? { bg: colors.primarySoft, fg: colors.primaryDark }
    : filtro
      ? selecionado
        ? { bg: colors.primary, fg: colors.primaryText }
        : { bg: colors.surface, fg: colors.text }
      : TONS[tom];

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      hitSlop={onPress ? 4 : undefined}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={removivel ? `Remover filtro ${texto}` : texto}
      accessibilityState={filtro ? { selected: !!selecionado } : undefined}
      style={({ pressed }) => [
        styles.chip,
        onPress && styles.tocavel,
        { backgroundColor: t.bg },
        filtro && !selecionado && styles.contorno,
        pressed && { opacity: 0.75 },
      ]}
    >
      {selecionado && filtro && <Icone nome="check" tamanho={14} cor={t.fg} espessura={2.4} />}
      {icone && <Icone nome={icone} tamanho={14} cor={t.fg} espessura={2} />}
      <Text style={[styles.texto, { color: t.fg }]}>{texto}</Text>
      {removivel && <Icone nome="fechar" tamanho={14} cor={t.fg} espessura={2.2} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tocavel: { minHeight: 36, paddingHorizontal: 14 },
  contorno: { borderWidth: 1, borderColor: colors.borderStrong },
  texto: { fontSize: 13, fontWeight: "700" },
});
