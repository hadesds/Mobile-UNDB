import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, elevation, motion, nativo, radius, spacing } from "../../constants/theme";
import { Icone } from "./Icone";

type Tipo = "sucesso" | "erro";
type Mensagem = { id: number; texto: string; tipo: Tipo };

const AvisoContext = createContext<(texto: string, tipo?: Tipo) => void>(() => {});

/** Confirmação passageira no topo da tela ("Formação adicionada"). */
export function AvisoProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<Mensagem | null>(null);
  const avisar = useCallback((texto: string, tipo: Tipo = "sucesso") => {
    setMsg({ id: Date.now(), texto, tipo });
    AccessibilityInfo.announceForAccessibility(texto);
  }, []);

  return (
    <AvisoContext.Provider value={avisar}>
      {children}
      {msg && <Faixa key={msg.id} msg={msg} onFim={() => setMsg(null)} />}
    </AvisoContext.Provider>
  );
}

function Faixa({ msg, onFim }: { msg: Mensagem; onFim: () => void }) {
  const insets = useSafeAreaInsets();
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(p, { toValue: 1, duration: motion.entrada, easing: motion.desacelera, useNativeDriver: nativo }),
      Animated.delay(2600),
      Animated.timing(p, { toValue: 0, duration: motion.padrao, easing: motion.acelera, useNativeDriver: nativo }),
    ]);
    anim.start(({ finished }) => finished && onFim());
    return () => anim.stop();
  }, [p, onFim]);

  const erro = msg.tipo === "erro";
  return (
    <View pointerEvents="none" style={[styles.raiz, { top: insets.top + spacing.sm }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.faixa,
          {
            opacity: p,
            transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }],
          },
        ]}
      >
        <View style={[styles.marca, { backgroundColor: erro ? colors.danger : colors.success }]}>
          <Icone nome={erro ? "alerta" : "check"} tamanho={14} cor="#FFFFFF" espessura={2.6} />
        </View>
        <Text style={styles.texto}>{msg.texto}</Text>
      </Animated.View>
    </View>
  );
}

export const useAviso = () => useContext(AvisoContext);

const styles = StyleSheet.create({
  raiz: { position: "absolute", left: spacing.md, right: spacing.md, alignItems: "center" },
  faixa: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    backgroundColor: colors.text,
    borderRadius: radius.md,
    paddingVertical: spacing.smd,
    paddingHorizontal: spacing.md,
    maxWidth: 480,
    ...elevation.high,
  },
  marca: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  texto: { flexShrink: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "600", lineHeight: 20 },
});
