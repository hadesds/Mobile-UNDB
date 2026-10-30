import { ReactNode, useRef } from "react";
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

import { motion, nativo } from "../../constants/theme";

const PressableAnimado = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Escala ao pressionar (1 = sem escala). */
  escala?: number;
};

/** Pressable com resposta tátil: encolhe levemente enquanto o dedo está em cima. */
export function Pressionavel({ children, style, escala = 0.98, ...props }: Props) {
  const s = useRef(new Animated.Value(1)).current;

  const ir = (valor: number, duracao: number) =>
    Animated.timing(s, {
      toValue: valor,
      duration: duracao,
      easing: motion.desacelera,
      useNativeDriver: nativo,
    }).start();

  return (
    <PressableAnimado
      {...props}
      onPressIn={(e) => {
        ir(escala, motion.rapido);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        ir(1, motion.padrao);
        props.onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale: s }] }]}
    >
      {children}
    </PressableAnimado>
  );
}
