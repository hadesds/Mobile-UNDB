import { forwardRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputInstance,
  TextInputProps,
  View,
} from "react-native";

import { colors, radius, spacing } from "../../constants/theme";
import { Icone } from "./Icone";

type Props = TextInputProps & {
  rotulo: string;
  erro?: string;
  /** Texto de apoio abaixo do campo (some quando há erro). */
  ajuda?: string;
};

export const Campo = forwardRef<TextInputInstance, Props>(function Campo(
  { rotulo, erro, ajuda, style, secureTextEntry, onFocus, onBlur, ...props },
  ref,
) {
  const [foco, setFoco] = useState(false);
  const [oculto, setOculto] = useState(true);
  const senha = !!secureTextEntry;

  return (
    <View style={styles.wrap}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View
        style={[
          styles.caixa,
          foco && styles.caixaFoco,
          !!erro && styles.caixaErro,
        ]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={colors.subtle}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          secureTextEntry={senha && oculto}
          accessibilityLabel={rotulo}
          accessibilityHint={erro ?? ajuda}
          onFocus={(e) => {
            setFoco(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            onBlur?.(e);
          }}
          style={[styles.input, style]}
          {...props}
        />
        {senha && (
          <Pressable
            onPress={() => setOculto((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={oculto ? "Mostrar senha" : "Ocultar senha"}
            style={styles.olho}
          >
            <Icone nome={oculto ? "olho" : "olhoFechado"} tamanho={20} cor={colors.muted} />
          </Pressable>
        )}
      </View>
      {erro ? (
        <View style={styles.linhaErro}>
          <Icone nome="alerta" tamanho={14} cor={colors.danger} espessura={2} />
          <Text style={styles.erro}>{erro}</Text>
        </View>
      ) : (
        !!ajuda && <Text style={styles.ajuda}>{ajuda}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text },
  caixa: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surface,
  },
  caixaFoco: { borderColor: colors.primary, borderWidth: 1.5 },
  caixaErro: { borderColor: colors.danger },
  input: {
    flex: 1,
    alignSelf: "stretch",
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  olho: { paddingHorizontal: spacing.smd, alignSelf: "stretch", justifyContent: "center" },
  linhaErro: { flexDirection: "row", alignItems: "center", gap: 6 },
  erro: { flex: 1, color: colors.danger, fontSize: 13, lineHeight: 18 },
  ajuda: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
