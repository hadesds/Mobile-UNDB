import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { colors, motion, radius } from "../../constants/theme";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";

type Props = { valor: number; cor?: string; altura?: number; rotuloAcessivel: string };

/** Barra horizontal de 0 a 100 que preenche ao montar e ao mudar de valor. */
export function BarraProgresso({ valor, cor = colors.primary, altura = 8, rotuloAcessivel }: Props) {
  const reduzir = useReduzirMovimento();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: Math.max(0, Math.min(100, valor)),
      duration: reduzir ? 0 : motion.foco,
      easing: motion.desacelera,
      useNativeDriver: false,
    }).start();
  }, [v, valor, reduzir]);

  return (
    <View
      style={[styles.trilho, { height: altura }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={rotuloAcessivel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(valor) }}
    >
      <Animated.View
        style={[
          styles.barra,
          { backgroundColor: cor, width: v.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trilho: { borderRadius: radius.pill, backgroundColor: colors.neutralSoft, overflow: "hidden" },
  barra: { height: "100%", borderRadius: radius.pill },
});
