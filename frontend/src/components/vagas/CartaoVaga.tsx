import { StyleSheet, Text, View } from "react-native";

import { colors, font, spacing } from "../../constants/theme";
import type { Vaga } from "../../types";
import { ROTULO_MODALIDADE, ROTULO_TIPO, rotuloPrazo } from "../../utils/formatos";
import { Avatar, Cartao, Chip, Icone } from "../Ui";

type Props = { vaga: Vaga; onPress: () => void; candidatado?: boolean };

/** Resumo da vaga na lista: só o que ajuda a decidir se vale abrir. */
export function CartaoVaga({ vaga, onPress, candidatado }: Props) {
  const prazo = rotuloPrazo(vaga.prazo);

  return (
    <Cartao
      onPress={onPress}
      rotuloAcessivel={`${vaga.titulo}, ${vaga.empresa}. ${ROTULO_MODALIDADE[vaga.modalidade]}. ${prazo.texto}${candidatado ? ". Você já se candidatou" : ""}`}
      style={styles.cartao}
    >
      <View style={styles.topo}>
        <Avatar nome={vaga.empresa} tamanho={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo} numberOfLines={2}>
            {vaga.titulo}
          </Text>
          <Text style={styles.empresa} numberOfLines={1}>
            {vaga.empresa}
          </Text>
        </View>
        <Icone nome="direita" tamanho={18} cor={colors.subtle} />
      </View>

      <View style={styles.chips}>
        {candidatado ? (
          <Chip texto="Candidatura enviada" tom="sucesso" icone="check" />
        ) : (
          <Chip texto={ROTULO_TIPO[vaga.tipo]} tom="marca" />
        )}
        <Chip texto={ROTULO_MODALIDADE[vaga.modalidade]} icone="local" />
      </View>

      <View style={styles.rodape}>
        <Icone nome="calendario" tamanho={15} cor={prazo.urgente ? colors.warning : colors.subtle} />
        <Text style={[styles.meta, prazo.urgente && styles.urgente]}>{prazo.texto}</Text>
      </View>
    </Cartao>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: spacing.smd },
  topo: { flexDirection: "row", gap: spacing.smd, alignItems: "center" },
  titulo: { ...font.h3 },
  empresa: { ...font.small, fontSize: 14, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rodape: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { ...font.small },
  urgente: { color: colors.warning, fontWeight: "700" },
});
