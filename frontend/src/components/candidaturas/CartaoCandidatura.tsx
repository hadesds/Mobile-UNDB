import { StyleSheet, Text, View } from "react-native";

import { colors, font, spacing } from "../../constants/theme";
import type { CandidaturaResumo } from "../../types";
import { ROTULO_STATUS, TOM_STATUS } from "../../utils/compatibilidade";
import { tempoRelativo } from "../../utils/formatos";
import { Cartao, Chip } from "../Ui";
import { IndicadorCompatibilidade } from "../vagas/IndicadorCompatibilidade";

/** Uma candidatura na lista: vaga, onde ela está e a compatibilidade da última análise. */
export function CartaoCandidatura({ c, onPress }: { c: CandidaturaResumo; onPress: () => void }) {
  return (
    <Cartao
      onPress={onPress}
      rotuloAcessivel={`${c.vaga.titulo}, ${c.vaga.empresa}. ${ROTULO_STATUS[c.status]}.${c.analise ? ` Compatibilidade ${c.analise.score}%.` : ""}`}
      style={styles.cartao}
    >
      <View style={{ flex: 1, gap: spacing.sm }}>
        <View>
          <Text style={styles.titulo} numberOfLines={2}>
            {c.vaga.titulo}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {c.vaga.empresa} · enviada {tempoRelativo(c.criada_em)}
          </Text>
        </View>
        <Chip texto={ROTULO_STATUS[c.status]} tom={TOM_STATUS[c.status]} />
      </View>
      {c.analise && <IndicadorCompatibilidade percentual={c.analise.score} tamanho={58} espessura={6} />}
    </Cartao>
  );
}

const styles = StyleSheet.create({
  cartao: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  titulo: { ...font.h3 },
  meta: { ...font.small, marginTop: 2 },
});
