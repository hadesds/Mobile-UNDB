import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors } from "../../constants/theme";

type Props = { percentual: number; legenda?: string; tamanho?: number };

/** Anel de progresso com o percentual de requisitos com evidência. */
export function IndicadorCompatibilidade({ percentual, legenda, tamanho = 112 }: Props) {
  const espessura = 12;
  const r = (tamanho - espessura) / 2;
  const circ = 2 * Math.PI * r;
  const cor =
    percentual >= 75 ? colors.success : percentual >= 50 ? colors.warning : colors.muted;

  return (
    <View
      style={{ width: tamanho, height: tamanho }}
      accessible
      accessibilityLabel={`Compatibilidade de ${percentual} por cento`}
    >
      <Svg width={tamanho} height={tamanho}>
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          stroke={colors.neutralSoft}
          strokeWidth={espessura}
          fill="none"
        />
        <Circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          stroke={cor}
          strokeWidth={espessura}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - percentual / 100)}
          strokeLinecap="round"
          rotation={-90}
          origin={`${tamanho / 2}, ${tamanho / 2}`}
        />
      </Svg>
      <View style={styles.centro}>
        <Text style={styles.percentual}>{percentual}%</Text>
        {!!legenda && <Text style={styles.legenda}>{legenda}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  percentual: { fontSize: 28, fontWeight: "800", color: colors.text },
  legenda: { fontSize: 12, color: colors.muted },
});