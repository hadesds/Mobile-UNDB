import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";

export function Cartao({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.cartao, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
});