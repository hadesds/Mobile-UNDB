import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import { colors, motion, nativo, spacing } from "../../constants/theme";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";
import { Icone } from "../Ui/Icone";

/** Anima a próxima mudança de layout (abrir/fechar, inserir/remover itens). */
export function animarLayout(reduzir = false) {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      reduzir ? 0 : motion.padrao,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity,
    ),
  );
}

type Props = {
  /** Conteúdo da linha clicável (o chevron é adicionado à direita). */
  cabecalho: ReactNode;
  children: ReactNode;
  inicialAberto?: boolean;
  rotuloAcessivel: string;
  style?: StyleProp<ViewStyle>;
  conteudoStyle?: StyleProp<ViewStyle>;
};

/** Seção que abre e fecha no lugar: detalhe sob demanda, sem trocar de tela. */
export function Expansivel({
  cabecalho,
  children,
  inicialAberto = false,
  rotuloAcessivel,
  style,
  conteudoStyle,
}: Props) {
  const reduzir = useReduzirMovimento();
  const [aberto, setAberto] = useState(inicialAberto);
  const giro = useRef(new Animated.Value(inicialAberto ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(giro, {
      toValue: aberto ? 1 : 0,
      duration: reduzir ? 0 : motion.padrao,
      easing: motion.desacelera,
      useNativeDriver: nativo,
    }).start();
  }, [aberto, giro, reduzir]);

  const rotate = giro.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View style={style}>
      <Pressable
        onPress={() => {
          animarLayout(reduzir);
          setAberto((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityLabel={rotuloAcessivel}
        accessibilityState={{ expanded: aberto }}
        style={({ pressed }) => [styles.linha, pressed && styles.pressionado]}
      >
        <View style={{ flex: 1 }}>{cabecalho}</View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Icone nome="baixo" tamanho={20} cor={colors.muted} />
        </Animated.View>
      </Pressable>
      {aberto && <View style={conteudoStyle}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44 },
  pressionado: { opacity: 0.7 },
});
