import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors, motion } from "../../constants/theme";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";
import { FAIXA_ALTA_MIN, FAIXA_MEDIA_MIN } from "../../utils/compatibilidade";

const AnelAnimado = Animated.createAnimatedComponent(Circle);

type Props = { percentual: number; legenda?: string; tamanho?: number; espessura?: number };

export function corDoPercentual(p: number) {
  return p >= FAIXA_ALTA_MIN ? colors.success : p >= FAIXA_MEDIA_MIN ? colors.warning : colors.subtle;
}

/** Anel com o percentual de requisitos com evidência: preenche e conta ao aparecer. */
export function IndicadorCompatibilidade({ percentual, legenda, tamanho = 120, espessura = 12 }: Props) {
  const reduzir = useReduzirMovimento();
  const r = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * r;
  const v = useRef(new Animated.Value(0)).current;
  const [mostrado, setMostrado] = useState(reduzir ? percentual : 0);
  const pequeno = tamanho < 70;

  useEffect(() => {
    const id = v.addListener(({ value }) => setMostrado(Math.round(value)));
    Animated.timing(v, {
      toValue: percentual,
      duration: reduzir ? 0 : 900,
      delay: reduzir ? 0 : 150,
      easing: motion.desacelera,
      useNativeDriver: false,
    }).start();
    return () => v.removeListener(id);
  }, [v, percentual, reduzir]);

  const offset = v.interpolate({ inputRange: [0, 100], outputRange: [circ, 0] });

  return (
    <View
      style={{ width: tamanho, height: tamanho }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Compatibilidade de ${percentual} por cento${legenda ? `, ${legenda}` : ""}`}
    >
      <Svg width={tamanho} height={tamanho}>
        <Circle cx={tamanho / 2} cy={tamanho / 2} r={r} stroke={colors.neutralSoft} strokeWidth={espessura} fill="none" />
        <AnelAnimado
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          stroke={corDoPercentual(percentual)}
          strokeWidth={espessura}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${tamanho / 2}, ${tamanho / 2}`}
        />
      </Svg>
      <View style={styles.centro}>
        <Text style={[styles.percentual, pequeno && styles.pequeno]}>
          {mostrado}
          <Text style={[styles.sinal, pequeno && styles.sinalPequeno]}>%</Text>
        </Text>
        {!!legenda && !pequeno && <Text style={styles.legenda}>{legenda}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  percentual: { fontSize: 32, fontWeight: "800", color: colors.text, letterSpacing: -1, fontVariant: ["tabular-nums"] },
  sinal: { fontSize: 18, fontWeight: "700", color: colors.muted },
  pequeno: { fontSize: 14, letterSpacing: -0.3 },
  sinalPequeno: { fontSize: 10 },
  legenda: { fontSize: 12, color: colors.muted, marginTop: -2 },
});
