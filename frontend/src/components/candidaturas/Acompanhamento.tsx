import { StyleSheet, Text, View } from "react-native";

import { colors, font, spacing } from "../../constants/theme";
import type { Candidatura } from "../../types";
import { ETAPAS } from "../../utils/compatibilidade";
import { formatarData } from "../../utils/formatos";
import { Icone } from "../Ui";

/** Linha do tempo da candidatura: o que já aconteceu e o que vem a seguir. */
export function Acompanhamento({ candidatura: c }: { candidatura: Candidatura }) {
  const encerrada = c.status === "nao_selecionada";
  const atual = encerrada ? 0 : ETAPAS.findIndex((e) => e.status === c.status);
  const datas: Record<string, string | null> = {
    analisada: c.criada_em,
    encaminhada: c.encaminhada_em,
    em_processo: null,
  };

  const etapas = encerrada
    ? [
        ETAPAS[0]!,
        {
          status: c.status,
          titulo: "Não selecionada",
          texto: "Desta vez a candidatura não seguiu. Isso não afeta suas outras candidaturas.",
        },
      ]
    : ETAPAS;

  return (
    <View>
      {etapas.map((e, i) => {
        const feita = encerrada ? true : i <= atual;
        const corrente = encerrada ? i === etapas.length - 1 : i === atual;
        const ultima = i === etapas.length - 1;
        const data = datas[e.status];
        return (
          <View key={e.status} style={styles.etapa} accessible accessibilityLabel={`${e.titulo}${feita ? ", concluída" : ", pendente"}`}>
            <View style={styles.trilho}>
              <View
                style={[
                  styles.marca,
                  feita && styles.marcaFeita,
                  corrente && encerrada && styles.marcaEncerrada,
                ]}
              >
                {feita && (
                  <Icone nome={corrente && encerrada ? "fechar" : "check"} tamanho={12} cor="#FFFFFF" espessura={3} />
                )}
              </View>
              {!ultima && <View style={[styles.linha, i < atual && styles.linhaFeita]} />}
            </View>
            <View style={[styles.texto, !ultima && { paddingBottom: spacing.md }]}>
              <Text style={[styles.titulo, !feita && styles.pendente]}>
                {e.titulo}
                {data && feita ? <Text style={styles.data}>{`  ${formatarData(data)}`}</Text> : null}
              </Text>
              {(corrente || !feita) && <Text style={styles.descricao}>{e.texto}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  etapa: { flexDirection: "row", gap: spacing.smd },
  trilho: { alignItems: "center", width: 22 },
  marca: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  marcaFeita: { backgroundColor: colors.primary, borderColor: colors.primary },
  marcaEncerrada: { backgroundColor: colors.warning, borderColor: colors.warning },
  linha: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  linhaFeita: { backgroundColor: colors.primary },
  texto: { flex: 1, gap: 2 },
  titulo: { ...font.h3, fontSize: 15, lineHeight: 22 },
  pendente: { color: colors.subtle, fontWeight: "600" },
  data: { ...font.tiny, fontWeight: "400" },
  descricao: { ...font.small },
});
