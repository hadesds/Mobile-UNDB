import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";
import type { Vaga } from "../../types";
import { formatarData, ROTULO_MODALIDADE, ROTULO_TIPO } from "../../utils/formatos";
import { Avatar, Chip } from "../Ui";

export function CartaoVaga({ vaga, onPress }: { vaga: Vaga; onPress: () => void }) {
  const qtdRequisitos = vaga.requisitos_competencia.length + vaga.requisitos_idioma.length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${vaga.titulo}, ${vaga.empresa}`}
      style={({ pressed }) => [styles.cartao, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.topo}>
        <Avatar nome={vaga.empresa} tamanho={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo} numberOfLines={2}>
            {vaga.titulo}
          </Text>
          <Text style={styles.empresa}>{vaga.empresa}</Text>
        </View>
      </View>

      <View style={styles.chips}>
        <Chip texto={ROTULO_TIPO[vaga.tipo]} tom="marca" />
        <Chip texto={ROTULO_MODALIDADE[vaga.modalidade]} />
      </View>

      <View style={styles.rodape}>
        <Text style={styles.meta}>Inscrições até {formatarData(vaga.prazo)}</Text>
        <Text style={styles.meta}>
          {qtdRequisitos} requisito{qtdRequisitos === 1 ? "" : "s"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  topo: { flexDirection: "row", gap: spacing.sm + 4, alignItems: "center" },
  titulo: { fontSize: 16, fontWeight: "700", color: colors.text },
  empresa: { fontSize: 14, color: colors.muted, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rodape: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm + 2,
  },
  meta: { fontSize: 13, color: colors.muted },
});