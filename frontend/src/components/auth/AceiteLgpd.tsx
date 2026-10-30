import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, motion, nativo, radius, spacing } from "../../constants/theme";
import { TERMO_LGPD } from "../../constants/termos";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";
import { Icone } from "../Ui";

type Props = { aceito: boolean; onAlterar: (v: boolean) => void; erro?: string };

/** Caixa de aceite do termo de consentimento (LGPD), obrigatória no cadastro. */
export function AceiteLgpd({ aceito, onAlterar, erro }: Props) {
  const reduzir = useReduzirMovimento();
  const p = useRef(new Animated.Value(aceito ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: aceito ? 1 : 0,
      duration: reduzir ? 0 : motion.padrao,
      easing: motion.desacelera,
      useNativeDriver: nativo,
    }).start();
  }, [aceito, p, reduzir]);

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        style={[styles.linha, aceito && styles.linhaMarcada, !!erro && styles.linhaErro]}
        onPress={() => onAlterar(!aceito)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: aceito }}
        accessibilityLabel={TERMO_LGPD}
      >
        <View style={[styles.caixa, aceito && styles.caixaMarcada]}>
          <Animated.View style={{ opacity: p, transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
            <Icone nome="check" tamanho={16} cor={colors.primaryText} espessura={3} />
          </Animated.View>
        </View>
        <Text style={styles.texto}>{TERMO_LGPD}</Text>
      </Pressable>
      {!!erro && <Text style={styles.erro}>{erro}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: "row",
    gap: spacing.smd,
    alignItems: "flex-start",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  linhaMarcada: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  linhaErro: { borderColor: colors.danger },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  caixaMarcada: { backgroundColor: colors.primary, borderColor: colors.primary },
  texto: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  erro: { color: colors.danger, fontSize: 13 },
});
