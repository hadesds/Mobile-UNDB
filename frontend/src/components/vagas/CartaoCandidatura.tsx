import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";
import type { CandidaturaResumo, StatusCandidatura } from "../../types";
import { formatarData } from "../../utils/formatos";
import { ROTULO_STATUS } from "../../utils/compatibilidade";
import { Avatar, Chip } from "../Ui";

type Tom = "alerta" | "sucesso" | "marca" | "neutro";

const TOM_STATUS: Record<StatusCandidatura, Tom> = {
  analisada: "alerta",
  encaminhada: "sucesso",
  em_processo: "marca",
  nao_selecionada: "neutro",
};

type Props = { candidatura: CandidaturaResumo; onPress: () => void };

export function CartaoCandidatura({ candidatura, onPress }: Props) {
  const status = ROTULO_STATUS[candidatura.status];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${candidatura.vaga.titulo}, ${candidatura.vaga.empresa}, ${status}`}
      style={({ pressed }) => [styles.cartao, pressed && { opacity: 0.9 }]}
    >
      <Avatar nome={candidatura.vaga.empresa} tamanho={44} />
      {/* minWidth: 0 deixa a coluna encolher em vez de empurrar o conteúdo para fora da tela */}
      <View style={styles.coluna}>
        <Text style={styles.titulo} numberOfLines={2}>
          {candidatura.vaga.titulo}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {candidatura.vaga.empresa} · enviada em {formatarData(candidatura.criada_em)}
        </Text>
        <View style={styles.status}>
          <Chip texto={status} tom={TOM_STATUS[candidatura.status]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cartao: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  coluna: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  status: { flexDirection: "row", marginTop: spacing.sm },
});