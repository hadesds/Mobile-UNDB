import { StyleSheet, Switch, Text, View } from "react-native";

import { colors, font, spacing } from "../../constants/theme";

type Props = { rotulo: string; ajuda?: string; valor: boolean; onAlterar: (v: boolean) => void; desabilitado?: boolean };

/** Rótulo + interruptor nativo (ativo/inativo, obrigatório/desejável). */
export function Alternar({ rotulo, ajuda, valor, onAlterar, desabilitado }: Props) {
  return (
    <View style={styles.linha}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rotulo}>{rotulo}</Text>
        {!!ajuda && <Text style={styles.ajuda}>{ajuda}</Text>}
      </View>
      <Switch
        value={valor}
        onValueChange={onAlterar}
        disabled={desabilitado}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={colors.surface}
        ios_backgroundColor={colors.borderStrong}
        accessibilityLabel={rotulo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48 },
  rotulo: { fontSize: 15, fontWeight: "600", color: colors.text },
  ajuda: { ...font.small },
});
