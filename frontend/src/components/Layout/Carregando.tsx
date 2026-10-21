import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "../../constants/theme";
import { Botao } from "../Ui";

type Props = { erro?: string | null; onTentarDeNovo?: () => void };

/** Estado de carregamento/erro de tela inteira. */
export function Carregando({ erro, onTentarDeNovo }: Props) {
  return (
    <View style={styles.box}>
      {erro ? (
        <>
          <Text style={styles.erro}>{erro}</Text>
          {onTentarDeNovo && (
            <Botao titulo="Tentar novamente" variante="contorno" onPress={onTentarDeNovo} />
          )}
        </>
      ) : (
        <ActivityIndicator size="large" color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  erro: { color: colors.text, fontSize: 15, textAlign: "center" },
});