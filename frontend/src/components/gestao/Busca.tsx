import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { colors, elevation, radius, spacing } from "../../constants/theme";
import { Icone } from "../Ui";

type Props = { valor: string; onAlterar: (t: string) => void; placeholder: string; rotuloAcessivel?: string };

/** Campo de busca das listas (mesmo desenho da busca de vagas do aluno). */
export function Busca({ valor, onAlterar, placeholder, rotuloAcessivel }: Props) {
  return (
    <View style={styles.busca}>
      <Icone nome="busca" tamanho={19} cor={colors.muted} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        selectionColor={colors.primary}
        value={valor}
        onChangeText={onAlterar}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel={rotuloAcessivel ?? placeholder}
      />
      {!!valor && (
        <Pressable onPress={() => onAlterar("")} hitSlop={12} accessibilityRole="button" accessibilityLabel="Limpar busca">
          <Icone nome="fechar" tamanho={18} cor={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  busca: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.smd,
    ...elevation.low,
  },
  input: { flex: 1, minWidth: 0, alignSelf: "stretch", fontSize: 15, color: colors.text },
});
