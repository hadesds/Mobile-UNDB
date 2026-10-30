import { useEffect, useRef } from "react";
import { Animated, StyleSheet } from "react-native";

import { colors, motion, nativo } from "../../constants/theme";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";
import { Icone, NomeIcone } from "../Ui";

/** Ícone da barra de abas: a aba ativa ganha uma pílula que cresce por trás. */
export function IconeAba({ nome, focado, cor }: { nome: NomeIcone; focado: boolean; cor: string }) {
  const reduzir = useReduzirMovimento();
  const p = useRef(new Animated.Value(focado ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: focado ? 1 : 0,
      duration: reduzir ? 0 : motion.padrao,
      easing: motion.desacelera,
      useNativeDriver: nativo,
    }).start();
  }, [focado, p, reduzir]);

  return (
    <Animated.View style={styles.wrap}>
      <Animated.View
        style={[
          styles.pilula,
          { opacity: p, transform: [{ scaleX: p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] },
        ]}
      />
      <Animated.View style={styles.icone}>
        <Icone nome={nome} tamanho={22} cor={cor} espessura={focado ? 2.1 : 1.8} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 56, height: 30, alignItems: "center", justifyContent: "center" },
  icone: { zIndex: 1 },
  pilula: { ...StyleSheet.absoluteFill, borderRadius: 15, backgroundColor: colors.primarySoft },
});
