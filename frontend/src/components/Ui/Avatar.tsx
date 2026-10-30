import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../../constants/theme";
import { iniciais } from "../../utils/formatos";

export function Avatar({ nome, tamanho = 48, redondo }: { nome: string; tamanho?: number; redondo?: boolean }) {
  return (
    <View
      style={[
        styles.box,
        { width: tamanho, height: tamanho, borderRadius: redondo ? tamanho / 2 : radius.sm + tamanho / 16 },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.texto, { fontSize: tamanho * 0.36 }]}>{iniciais(nome)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  texto: { color: colors.primaryDark, fontWeight: "800" },
});
