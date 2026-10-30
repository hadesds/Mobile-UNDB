import { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, elevation, spacing } from "../../constants/theme";

type Props = {
  children: ReactNode;
  /** Barra fixa no rodapé (ex.: botão principal da tela). */
  rodape?: ReactNode;
  atualizando?: boolean;
  onAtualizar?: () => void;
};

/** Container padrão das telas internas: fundo, rolagem e rodapé fixo opcional. */
export function Tela({ children, rodape, atualizando, onAtualizar }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.raiz}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onAtualizar ? (
            <RefreshControl
              refreshing={!!atualizando}
              onRefresh={onAtualizar}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      {rodape && (
        <View style={[styles.rodape, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {rodape}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl },
  rodape: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.smd,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    ...elevation.low,
  },
});
