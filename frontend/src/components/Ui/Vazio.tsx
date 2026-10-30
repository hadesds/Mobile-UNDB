import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, font, spacing } from "../../constants/theme";
import { Surgir } from "../Movimento/Surgir";
import { Icone, NomeIcone } from "./Icone";

type Props = { icone: NomeIcone; titulo: string; texto: string; acao?: ReactNode };

/** Estado vazio que ensina o próximo passo, em vez de só dizer "nada aqui". */
export function Vazio({ icone, titulo, texto, acao }: Props) {
  return (
    <Surgir style={styles.box}>
      <View style={styles.icone}>
        <Icone nome={icone} tamanho={28} cor={colors.primary} />
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.texto}>{texto}</Text>
      {acao && <View style={styles.acao}>{acao}</View>}
    </Surgir>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  icone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  titulo: { ...font.h2, textAlign: "center" },
  texto: { ...font.body, color: colors.muted, textAlign: "center", maxWidth: 320 },
  acao: { marginTop: spacing.md, alignSelf: "stretch" },
});
