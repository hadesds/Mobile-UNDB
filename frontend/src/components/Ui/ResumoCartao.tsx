import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";

type Tom = "marca" | "alerta" | "sucesso";

const TONS: Record<Tom, { fundo: string; numero: string }> = {
  marca: { fundo: colors.primarySoft, numero: colors.primaryDark },
  alerta: { fundo: colors.warningSoft, numero: colors.warning },
  sucesso: { fundo: colors.successSoft, numero: colors.successText },
};

type Props = {
  valor: string | number;
  rotulo: string;
  tom?: Tom;
  onPress?: () => void;
};

/** Bloco com um número em destaque. Dois deles cabem lado a lado, e o texto quebra em vez de cortar. */
export function ResumoCartao({ valor, rotulo, tom = "marca", onPress }: Props) {
  const t = TONS[tom];
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={`${valor} ${rotulo}`}
      style={({ pressed }) => [
        styles.bloco,
        { backgroundColor: t.fundo },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.valor, { color: t.numero }]}>{valor}</Text>
      <Text style={styles.rotulo}>{rotulo}</Text>
    </Pressable>
  );
}

type FaixaProps = {
  valor: string | number;
  rotulo: string;
  acao: string;
  tom?: Tom;
  onPress: () => void;
};

/** Faixa de largura total: número + texto + chamada para ação (ex.: "+ Adicionar"). */
export function ResumoFaixa({ valor, rotulo, acao, tom = "sucesso", onPress }: FaixaProps) {
  const t = TONS[tom];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${valor} ${rotulo}. ${acao}`}
      style={({ pressed }) => [styles.faixa, { backgroundColor: t.fundo }, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.valor, { color: t.numero }]}>{valor}</Text>
      <Text style={[styles.rotulo, { flex: 1 }]}>{rotulo}</Text>
      <View style={[styles.botaoFaixa, { backgroundColor: t.numero }]}>
        <Text style={styles.botaoFaixaTexto}>{acao}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bloco: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  valor: { fontSize: 30, fontWeight: "800", lineHeight: 34 },
  rotulo: { fontSize: 14, color: colors.text, lineHeight: 19 },
  faixa: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 4,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
  },
  botaoFaixa: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  botaoFaixaTexto: { fontSize: 14, fontWeight: "700", color: colors.primaryText },
});