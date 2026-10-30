import { ReactNode, useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

import { motion, nativo } from "../../constants/theme";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";

type Props = {
  children: ReactNode;
  /** Posição na lista: escalona a entrada (limitado a ~6 itens). */
  indice?: number;
  deslocamento?: number;
  style?: StyleProp<ViewStyle>;
};

/** Entrada curta (opacidade + leve subida) para conteúdo que acabou de chegar. */
export function Surgir({ children, indice = 0, deslocamento = 10, style }: Props) {
  const reduzir = useReduzirMovimento();
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: reduzir ? motion.rapido : motion.entrada,
      delay: reduzir ? 0 : Math.min(indice, 6) * 45,
      easing: motion.desacelera,
      useNativeDriver: nativo,
    }).start();
  }, [p, indice, reduzir]);

  const translateY = p.interpolate({
    inputRange: [0, 1],
    outputRange: [reduzir ? 0 : deslocamento, 0],
  });

  return (
    <Animated.View style={[style, { opacity: p, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
