import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "../../constants/theme";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";
import type { ItemAnalise, StatusRequisito } from "../../types";
import { animarLayout } from "../Movimento/Expansivel";
import { Icone, NomeIcone } from "../Ui";

export const ESTILO_STATUS: Record<StatusRequisito, { icone: NomeIcone; cor: string; fundo: string; rotulo: string }> = {
  encontrado: { icone: "check", cor: colors.successText, fundo: colors.successSoft, rotulo: "Encontrado" },
  diferente: { icone: "diferente", cor: colors.warning, fundo: colors.warningSoft, rotulo: "Diferente do pedido" },
  nao_identificado: { icone: "ajuda", cor: colors.muted, fundo: colors.neutralSoft, rotulo: "Não identificado" },
};

/** Um requisito da devolutiva. Compacto por padrão; o toque revela a evidência. */
export function LinhaRequisito({ item, ultimo }: { item: ItemAnalise; ultimo?: boolean }) {
  const reduzir = useReduzirMovimento();
  const [aberto, setAberto] = useState(false);
  const e = ESTILO_STATUS[item.status];

  return (
    <View style={[styles.wrap, !ultimo && styles.divisor]}>
      <Pressable
        onPress={() => {
          animarLayout(reduzir);
          setAberto((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${item.requisito}, ${item.categoria}: ${e.rotulo}`}
        accessibilityState={{ expanded: aberto }}
        accessibilityHint="Toque para ver o detalhe"
        style={({ pressed }) => [styles.linha, pressed && { opacity: 0.7 }]}
      >
        <View style={[styles.marca, { backgroundColor: e.fundo }]}>
          <Icone nome={e.icone} tamanho={15} cor={e.cor} espessura={2.4} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.requisito}>{item.requisito}</Text>
          <Text style={styles.categoria}>
            {item.categoria}
            {item.obrigatorio === false ? " · desejável" : ""}
          </Text>
        </View>
        <Icone nome={aberto ? "fechar" : "mais"} tamanho={16} cor={colors.subtle} />
      </Pressable>
      {aberto && (
        <View style={[styles.detalhe, { backgroundColor: e.fundo }]}>
          <Text style={[styles.detalheTexto, { color: e.cor }]}>{item.detalhe}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xs },
  divisor: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  linha: { flexDirection: "row", alignItems: "center", gap: spacing.smd, minHeight: 52 },
  marca: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  requisito: { ...font.h3, fontSize: 15 },
  categoria: { ...font.tiny },
  detalhe: { borderRadius: radius.sm, padding: spacing.smd, marginBottom: spacing.sm, marginLeft: 42 },
  detalheTexto: { fontSize: 14, lineHeight: 20 },
});
