import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "../../constants/theme";
import { Folha, Icone } from "../Ui";

type Opcao<T> = { valor: T; rotulo: string; detalhe?: string };

type Props<T> = {
  rotulo: string;
  opcoes: Opcao<T>[];
  valor: T | null;
  onAlterar: (v: T) => void;
  placeholder?: string;
  erro?: string;
};

/** Campo que abre uma folha com a lista de opções (empresa, núcleo…). */
export function Seletor<T extends string | number>({ rotulo, opcoes, valor, onAlterar, placeholder = "Escolher", erro }: Props<T>) {
  const [aberto, setAberto] = useState(false);
  const atual = opcoes.find((o) => o.valor === valor);

  return (
    <View style={styles.wrap}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Pressable
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${atual?.rotulo ?? "nenhum selecionado"}`}
        accessibilityHint="Abre a lista de opções"
        style={({ pressed }) => [styles.caixa, !!erro && styles.erroBorda, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.valor, !atual && styles.placeholder]} numberOfLines={1}>
          {atual?.rotulo ?? placeholder}
        </Text>
        <Icone nome="baixo" tamanho={18} cor={colors.muted} />
      </Pressable>
      {!!erro && <Text style={styles.erro}>{erro}</Text>}

      <Folha visivel={aberto} onFechar={() => setAberto(false)} titulo={rotulo}>
        <View>
          {opcoes.map((o, i) => {
            const ativo = o.valor === valor;
            return (
              <Pressable
                key={String(o.valor)}
                onPress={() => {
                  onAlterar(o.valor);
                  setAberto(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
                accessibilityLabel={o.rotulo}
                style={({ pressed }) => [styles.opcao, i > 0 && styles.divisor, pressed && { opacity: 0.6 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.opcaoTexto, ativo && { color: colors.primaryDark, fontWeight: "700" }]}>{o.rotulo}</Text>
                  {!!o.detalhe && <Text style={styles.detalhe}>{o.detalhe}</Text>}
                </View>
                {ativo && <Icone nome="check" tamanho={20} cor={colors.primary} espessura={2.4} />}
              </Pressable>
            );
          })}
        </View>
      </Folha>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text },
  caixa: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surface,
  },
  erroBorda: { borderColor: colors.danger },
  valor: { flex: 1, fontSize: 16, color: colors.text },
  placeholder: { color: colors.subtle },
  erro: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  opcao: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 52, paddingVertical: spacing.sm },
  divisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  opcaoTexto: { ...font.body },
  detalhe: { ...font.small },
});
