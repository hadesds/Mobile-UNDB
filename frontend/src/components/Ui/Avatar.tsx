import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../../constants/theme";
import { iniciais } from "../../utils/formatos";

export function Avatar({ nome, tamanho = 48 }: { nome: string; tamanho?: number }) {
  return (
    <View style={[styles.box, { width: tamanho, height: tamanho }]}>
      <Text style={[styles.texto, { fontSize: tamanho * 0.36 }]}>{iniciais(nome)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { color: colors.primaryDark, fontWeight: "800" },
});