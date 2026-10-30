import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font, spacing } from "../../constants/theme";

type Props = { titulo: string; subtitulo?: string; acao?: ReactNode; children?: ReactNode };

/** Título grande das telas principais de cada aba (substitui a barra de navegação). */
export function CabecalhoTela({ titulo, subtitulo, acao, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.linha}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          {!!subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
        </View>
        {acao}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.md, backgroundColor: colors.background },
  linha: { flexDirection: "row", alignItems: "flex-start", gap: spacing.smd },
  titulo: { ...font.title, fontSize: 28, lineHeight: 34 },
  subtitulo: { ...font.body, color: colors.muted, marginTop: 2 },
});
