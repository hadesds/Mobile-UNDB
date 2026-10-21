import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../constants/theme";

type Props = { aceito: boolean; onAlterar: (v: boolean) => void; erro?: string };

/** Caixa de aceite do termo de consentimento (LGPD), obrigatória no cadastro. */
export function AceiteLgpd({ aceito, onAlterar, erro }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.linha}
        onPress={() => onAlterar(!aceito)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: aceito }}
      >
        <View style={[styles.caixa, aceito && styles.caixaMarcada]}>
          {aceito && <Text style={styles.check}>✓</Text>}
        </View>
        <Text style={styles.texto}>
          Autorizo o Núcleo de Carreiras TEIA a tratar os dados do meu currículo para analisar
          compatibilidade com vagas e realizar encaminhamentos, conforme a LGPD. Posso revogar
          este consentimento a qualquer momento.
        </Text>
      </Pressable>
      {!!erro && <Text style={styles.erro}>{erro}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  linha: { flexDirection: "row", gap: spacing.sm + 4, alignItems: "flex-start" },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  caixaMarcada: { backgroundColor: colors.primary, borderColor: colors.primary },
  check: { color: colors.primaryText, fontWeight: "800", fontSize: 14 },
  texto: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  erro: { color: colors.danger, fontSize: 13, marginTop: 4 },
});