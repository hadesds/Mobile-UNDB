import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, elevation, font, motion, nativo, radius, spacing } from "../../constants/theme";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";
import { Icone } from "./Icone";

type Props = {
  visivel: boolean;
  onFechar: () => void;
  titulo?: string;
  subtitulo?: string;
  children: ReactNode;
  /** Área fixa no rodapé da folha (botões de ação). */
  rodape?: ReactNode;
};

const ALTURA_TELA = Dimensions.get("window").height;

/**
 * Folha inferior: detalhe ou formulário sem sair da tela.
 * Sobe com desaceleração, fecha arrastando para baixo, tocando fora ou no X.
 */
export function Folha({ visivel, onFechar, titulo, subtitulo, children, rodape }: Props) {
  const insets = useSafeAreaInsets();
  const reduzir = useReduzirMovimento();
  const [montada, setMontada] = useState(visivel);
  const p = useRef(new Animated.Value(0)).current; // 0 fechada · 1 aberta
  const arrasto = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visivel) {
      setMontada(true);
      arrasto.setValue(0);
      Animated.timing(p, {
        toValue: 1,
        duration: reduzir ? motion.rapido : motion.entrada,
        easing: motion.desacelera,
        useNativeDriver: nativo,
      }).start();
    } else if (montada) {
      Animated.timing(p, {
        toValue: 0,
        duration: reduzir ? motion.rapido : motion.padrao,
        easing: motion.acelera,
        useNativeDriver: nativo,
      }).start(() => setMontada(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => arrasto.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1.1) onFechar();
        else
          Animated.timing(arrasto, {
            toValue: 0,
            duration: motion.padrao,
            easing: motion.desacelera,
            useNativeDriver: nativo,
          }).start();
      },
    }),
  ).current;

  if (!montada) return null;

  const deslocamento = p.interpolate({
    inputRange: [0, 1],
    outputRange: [reduzir ? 0 : ALTURA_TELA * 0.5, 0],
  });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onFechar} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.raiz}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.fundo, { opacity: p }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onFechar}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.folha,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
            { opacity: reduzir ? p : 1, transform: [{ translateY: Animated.add(deslocamento, arrasto) }] },
          ]}
          accessibilityViewIsModal
        >
          <View {...pan.panHandlers} style={styles.topo}>
            <View style={styles.alca} />
            {(titulo || subtitulo) && (
              <View style={styles.cabecalho}>
                <View style={{ flex: 1 }}>
                  {!!titulo && (
                    <Text style={styles.titulo} accessibilityRole="header">
                      {titulo}
                    </Text>
                  )}
                  {!!subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}
                </View>
                <Pressable
                  onPress={onFechar}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar"
                  style={({ pressed }) => [styles.fechar, pressed && { opacity: 0.6 }]}
                >
                  <Icone nome="fechar" tamanho={20} cor={colors.muted} />
                </Pressable>
              </View>
            )}
          </View>

          <ScrollView
            style={styles.corpo}
            contentContainerStyle={styles.corpoConteudo}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {children}
          </ScrollView>

          {rodape && <View style={styles.rodape}>{rodape}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, justifyContent: "flex-end" },
  fundo: { backgroundColor: colors.overlay },
  folha: {
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    ...elevation.high,
  },
  topo: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg },
  alca: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.smd,
  },
  cabecalho: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingBottom: spacing.sm },
  titulo: { ...font.h2, fontSize: 20, lineHeight: 26, fontWeight: "800" },
  subtitulo: { ...font.small, marginTop: 2 },
  fechar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutralSoft,
  },
  corpo: { flexGrow: 0 },
  corpoConteudo: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.md },
  rodape: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
});
