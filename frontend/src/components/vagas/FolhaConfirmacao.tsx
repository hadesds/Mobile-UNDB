import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../../constants/theme";
import { Botao } from "../Ui";

type Props = {
  visivel: boolean;
  tituloVaga: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

/** Folha inferior que explica o que acontece antes de enviar a candidatura. */
export function FolhaConfirmacao({ visivel, tituloVaga, onConfirmar, onCancelar }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={onCancelar}>
      <Pressable style={styles.fundo} onPress={onCancelar} accessibilityLabel="Fechar" />
      <View style={[styles.folha, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.alca} />
        <Text style={styles.titulo}>Analisar e se candidatar</Text>
        <Text style={styles.vaga}>{tituloVaga}</Text>

        {[
          "Comparamos os requisitos da vaga com o que está no seu currículo.",
          "Você vê o resultado por requisito, com a evidência de cada um.",
          "Sua candidatura vai para a equipe do TEIA, que decide os encaminhamentos.",
        ].map((t, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.numero}>{i + 1}</Text>
            <Text style={styles.texto}>{t}</Text>
          </View>
        ))}

        <Text style={styles.aviso}>
          O resultado não é aprovação nem previsão de contratação. Você pode editar o currículo
          e atualizar a análise depois.
        </Text>

        <Botao titulo="Confirmar e analisar" onPress={onConfirmar} />
        <Botao titulo="Agora não" variante="link" onPress={onCancelar} style={{ marginTop: 4 }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  folha: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm + 4,
  },
  alca: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  titulo: { fontSize: 20, fontWeight: "800", color: colors.text },
  vaga: { fontSize: 14, color: colors.muted, marginBottom: spacing.sm },
  item: { flexDirection: "row", gap: spacing.sm + 4, alignItems: "flex-start" },
  numero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    color: colors.primaryDark,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "800",
    fontSize: 13,
    overflow: "hidden",
  },
  texto: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 21 },
  aviso: { fontSize: 13, color: colors.muted, lineHeight: 19, marginVertical: spacing.sm },
});