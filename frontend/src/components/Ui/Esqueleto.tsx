import { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleSheet, View } from "react-native";

import { colors, elevation, motion, nativo, radius, spacing } from "../../constants/theme";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";

/** Bloco cinza pulsante que ocupa o lugar do conteúdo enquanto ele carrega. */
export function Bloco({ largura = "100%", altura = 14, raio = 6 }: { largura?: DimensionValue; altura?: number; raio?: number }) {
  return <View style={{ width: largura, height: altura, borderRadius: raio, backgroundColor: colors.neutralSoft }} />;
}

export function Pulso({ children }: { children: React.ReactNode }) {
  const reduzir = useReduzirMovimento();
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduzir) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 0.45, duration: motion.foco, easing: motion.desacelera, useNativeDriver: nativo }),
        Animated.timing(o, { toValue: 1, duration: motion.foco, easing: motion.desacelera, useNativeDriver: nativo }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o, reduzir]);
  return (
    <Animated.View style={{ opacity: o }} accessibilityLabel="Carregando" accessibilityRole="progressbar">
      {children}
    </Animated.View>
  );
}

/** Esqueleto de um cartão de lista (avatar, duas linhas e rodapé). */
export function EsqueletoCartao() {
  return (
    <View style={styles.cartao}>
      <View style={styles.linha}>
        <Bloco largura={44} altura={44} raio={radius.sm} />
        <View style={{ flex: 1, gap: 8 }}>
          <Bloco largura="80%" altura={16} />
          <Bloco largura="45%" altura={12} />
        </View>
      </View>
      <Bloco largura="60%" altura={12} />
    </View>
  );
}

export function EsqueletoLista({ itens = 4 }: { itens?: number }) {
  return (
    <Pulso>
      <View style={{ gap: spacing.smd }}>
        {Array.from({ length: itens }, (_, i) => (
          <EsqueletoCartao key={i} />
        ))}
      </View>
    </Pulso>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...elevation.low,
  },
  linha: { flexDirection: "row", gap: spacing.smd, alignItems: "center" },
});
