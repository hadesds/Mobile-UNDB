import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";

type Props = TextInputProps & { rotulo: string; erro?: string };

export function Campo({ rotulo, erro, style, ...props }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, !!erro && styles.inputErro, style]}
        {...props}
      />
      {!!erro && <Text style={styles.erro}>{erro}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 6 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputErro: { borderColor: colors.danger },
  erro: { color: colors.danger, fontSize: 13, marginTop: 4 },
});