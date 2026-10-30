import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { font, spacing } from "../../constants/theme";
import type { Modalidade, TipoVaga } from "../../types";
import { ROTULO_MODALIDADE, ROTULO_TIPO } from "../../utils/formatos";
import { Botao, Chip, Folha } from "../Ui";

export type Filtros = { tipo?: TipoVaga; modalidade?: Modalidade };

type Props = {
  visivel: boolean;
  filtros: Filtros;
  onAplicar: (f: Filtros) => void;
  onFechar: () => void;
};

/** Filtros da lista de vagas, guardados numa folha para não ocupar a tela. */
export function FolhaFiltros({ visivel, filtros, onAplicar, onFechar }: Props) {
  const [rascunho, setRascunho] = useState<Filtros>(filtros);
  useEffect(() => {
    if (visivel) setRascunho(filtros);
  }, [visivel, filtros]);

  const alternar = <K extends keyof Filtros>(chave: K, valor: Filtros[K]) =>
    setRascunho((f) => ({ ...f, [chave]: f[chave] === valor ? undefined : valor }));

  return (
    <Folha
      visivel={visivel}
      onFechar={onFechar}
      titulo="Filtrar vagas"
      rodape={
        <View style={styles.acoes}>
          <Botao
            titulo="Limpar"
            variante="contorno"
            style={{ flex: 1 }}
            onPress={() => setRascunho({})}
            desabilitado={!rascunho.tipo && !rascunho.modalidade}
          />
          <Botao titulo="Mostrar vagas" style={{ flex: 2 }} onPress={() => onAplicar(rascunho)} />
        </View>
      }
    >
      <View style={styles.grupo}>
        <Text style={styles.titulo}>Tipo de vaga</Text>
        <View style={styles.chips}>
          {(Object.keys(ROTULO_TIPO) as TipoVaga[]).map((t) => (
            <Chip key={t} texto={ROTULO_TIPO[t]} selecionado={rascunho.tipo === t} onPress={() => alternar("tipo", t)} />
          ))}
        </View>
      </View>
      <View style={styles.grupo}>
        <Text style={styles.titulo}>Modalidade</Text>
        <View style={styles.chips}>
          {(Object.keys(ROTULO_MODALIDADE) as Modalidade[]).map((m) => (
            <Chip
              key={m}
              texto={ROTULO_MODALIDADE[m]}
              selecionado={rascunho.modalidade === m}
              onPress={() => alternar("modalidade", m)}
            />
          ))}
        </View>
      </View>
    </Folha>
  );
}

const styles = StyleSheet.create({
  grupo: { gap: spacing.smd },
  titulo: { ...font.h3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  acoes: { flexDirection: "row", gap: spacing.smd },
});
