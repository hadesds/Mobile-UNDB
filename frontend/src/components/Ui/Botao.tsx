import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";
import { Pressionavel } from "../Movimento/Pressionavel";
import { Icone, NomeIcone } from "./Icone";

type Variante = "primario" | "contorno" | "suave" | "link" | "perigo";

type Props = {
  titulo: string;
  onPress?: () => void;
  variante?: Variante;
  icone?: NomeIcone;
  carregando?: boolean;
  desabilitado?: boolean;
  compacto?: boolean;
  style?: StyleProp<ViewStyle>;
  rotuloAcessivel?: string;
};

const CORES: Record<Variante, { fundo: string; texto: string; borda?: string }> = {
  primario: { fundo: colors.primary, texto: colors.primaryText },
  contorno: { fundo: colors.surface, texto: colors.primary, borda: colors.primary },
  suave: { fundo: colors.primarySoft, texto: colors.primaryDark },
  link: { fundo: "transparent", texto: colors.primary },
  perigo: { fundo: colors.dangerSoft, texto: colors.danger },
};

export function Botao({
  titulo,
  onPress,
  variante = "primario",
  icone,
  carregando,
  desabilitado,
  compacto,
  style,
  rotuloAcessivel,
}: Props) {
  const inativo = desabilitado || carregando;
  const c = CORES[variante];

  return (
    <Pressionavel
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel ?? titulo}
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      onPress={onPress}
      disabled={inativo}
      escala={variante === "link" ? 1 : 0.97}
      style={[
        styles.base,
        compacto && styles.compacto,
        variante === "link" && styles.link,
        { backgroundColor: c.fundo },
        c.borda && { borderWidth: 1.5, borderColor: c.borda },
        inativo && styles.inativo,
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={c.texto} />
      ) : (
        <View style={styles.conteudo}>
          {icone && <Icone nome={icone} tamanho={compacto ? 18 : 20} cor={c.texto} espessura={2} />}
          <Text style={[styles.rotulo, compacto && styles.rotuloCompacto, { color: c.texto }]}>
            {titulo}
          </Text>
        </View>
      )}
    </Pressionavel>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  compacto: { minHeight: 44, borderRadius: radius.sm + 2, paddingHorizontal: spacing.smd },
  link: { minHeight: 44 },
  conteudo: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rotulo: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  rotuloCompacto: { fontSize: 15 },
  inativo: { opacity: 0.5 },
});
