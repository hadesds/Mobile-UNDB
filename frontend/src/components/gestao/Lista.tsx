import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, elevation, font, radius, spacing } from "../../constants/theme";
import { Icone } from "../Ui";

/** Grupo de linhas num cartão só, com título opcional acima (lista agrupada). */
export function Grupo({ titulo, acao, children }: { titulo?: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <View style={styles.grupo}>
      {(titulo || acao) && (
        <View style={styles.topo}>
          {!!titulo && (
            <Text style={styles.titulo} accessibilityRole="header">
              {titulo}
            </Text>
          )}
          {acao}
        </View>
      )}
      <View style={styles.cartao}>{children}</View>
    </View>
  );
}

type LinhaProps = {
  titulo: string;
  subtitulo?: string;
  /** Avatar ou ícone à esquerda. */
  inicio?: ReactNode;
  /** Valor, chip ou nota à direita. */
  fim?: ReactNode;
  /** Chips de estado abaixo do subtítulo (não disputam largura com o título). */
  abaixo?: ReactNode;
  onPress?: () => void;
  rotuloAcessivel?: string;
  primeira?: boolean;
  apagada?: boolean;
};

/** Linha de lista: tocável quando tem `onPress` (mostra o chevron). */
export function Linha({ titulo, subtitulo, inicio, fim, abaixo, onPress, rotuloAcessivel, primeira, apagada }: LinhaProps) {
  const conteudo = (
    <>
      {inicio}
      <View style={[styles.textos, apagada && { opacity: 0.55 }]}>
        <Text style={styles.linhaTitulo} numberOfLines={2}>
          {titulo}
        </Text>
        {!!subtitulo && (
          <Text style={styles.linhaSub} numberOfLines={2}>
            {subtitulo}
          </Text>
        )}
        {abaixo && <View style={styles.abaixo}>{abaixo}</View>}
      </View>
      {fim}
      {onPress && <Icone nome="direita" tamanho={18} cor={colors.subtle} />}
    </>
  );
  const estilo = [styles.linha, !primeira && styles.divisor];
  if (!onPress) return <View style={estilo}>{conteudo}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? [titulo, subtitulo].filter(Boolean).join(", ")}
      style={({ pressed }) => [...estilo, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      {conteudo}
    </Pressable>
  );
}

/** Valor numérico alinhado à direita de uma linha. */
export function Valor({ n, tom }: { n: number | string; tom?: "alerta" | "perigo" | "sucesso" }) {
  const cor =
    tom === "alerta" ? colors.warning : tom === "perigo" ? colors.danger : tom === "sucesso" ? colors.successText : colors.text;
  return <Text style={[styles.valor, { color: cor }]}>{n}</Text>;
}

const styles = StyleSheet.create({
  grupo: { gap: spacing.sm },
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xs },
  titulo: { ...font.label, fontSize: 14, color: colors.muted },
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...elevation.low,
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.smd,
  },
  divisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  textos: { flex: 1, gap: 2 },
  linhaTitulo: { ...font.body, fontWeight: "600" },
  linhaSub: { ...font.small },
  abaixo: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  valor: { fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
