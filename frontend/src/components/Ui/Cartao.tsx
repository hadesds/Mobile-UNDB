import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, elevation, radius, spacing } from "../../constants/theme";
import { Pressionavel } from "../Movimento/Pressionavel";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  rotuloAcessivel?: string;
};

export function Cartao({ children, style, onPress, rotuloAcessivel }: Props) {
  if (onPress) {
    return (
      <Pressionavel
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={rotuloAcessivel}
        style={[styles.cartao, style]}
      >
        {children}
      </Pressionavel>
    );
  }
  return <View style={[styles.cartao, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...elevation.low,
  },
});
