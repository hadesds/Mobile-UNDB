import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

import { CartaoCandidatura } from "../components/candidaturas/CartaoCandidatura";
import { CabecalhoTela } from "../components/Layout/CabecalhoTela";
import { Surgir } from "../components/Movimento/Surgir";
import { Botao, EsqueletoLista, Segmentado, Vazio } from "../components/Ui";
import { colors, spacing } from "../constants/theme";
import { useAuth } from "../lib/auth";
import { useCandidaturas } from "../lib/candidaturas";
import type { AppStackParams } from "../lib/navigation";

type Props = NativeStackScreenProps<AppStackParams, "CandidaturasLista">;
type Filtro = "andamento" | "encerradas";

export default function Candidaturas({ navigation }: Props) {
  const { usuario } = useAuth();
  const { lista, erro, carregando, recarregar } = useCandidaturas();
  const [filtro, setFiltro] = useState<Filtro>("andamento");

  // Status muda pelo TEIA: ao voltar para a aba, busca de novo.
  useFocusEffect(
    useCallback(() => {
      recarregar({ silencioso: true });
    }, [recarregar]),
  );

  const encerradas = (lista ?? []).filter((c) => c.status === "nao_selecionada");
  const andamento = (lista ?? []).filter((c) => c.status !== "nao_selecionada");
  const visiveis = encerradas.length ? (filtro === "andamento" ? andamento : encerradas) : (lista ?? []);
  const semConsentimento = !usuario?.aluno?.consentimento_vigente;

  const irParaVagas = () => navigation.getParent()?.navigate("VagasTab");

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.lista}
      data={semConsentimento ? [] : visiveis}
      keyExtractor={(c) => String(c.id)}
      ListHeaderComponent={
        <CabecalhoTela
          titulo="Candidaturas"
          subtitulo={
            lista?.length
              ? `${lista.length} enviada${lista.length === 1 ? "" : "s"} · acompanhe cada etapa`
              : "Acompanhe cada etapa das suas candidaturas."
          }
        >
          {encerradas.length > 0 && (
            <Segmentado<Filtro>
              rotuloAcessivel="Filtrar candidaturas"
              valor={filtro}
              onAlterar={(f) => f && setFiltro(f)}
              opcoes={[
                { valor: "andamento", rotulo: `Em andamento (${andamento.length})` },
                { valor: "encerradas", rotulo: `Encerradas (${encerradas.length})` },
              ]}
            />
          )}
        </CabecalhoTela>
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.smd }} />}
      renderItem={({ item, index }) => (
        <Surgir indice={index} style={styles.item}>
          <CartaoCandidatura c={item} onPress={() => navigation.navigate("Candidatura", { id: item.id })} />
        </Surgir>
      )}
      ListEmptyComponent={
        semConsentimento ? (
          <Vazio
            icone="escudo"
            titulo="Consentimento necessário"
            texto="Para analisar seu currículo e enviar candidaturas, aceite o termo LGPD na aba Conta."
            acao={<Botao titulo="Ir para Conta" variante="contorno" onPress={() => navigation.getParent()?.navigate("Conta")} />}
          />
        ) : !lista && carregando ? (
          <View style={styles.item}>
            <EsqueletoLista itens={3} />
          </View>
        ) : erro && !lista ? (
          <Vazio
            icone="alerta"
            titulo="Não deu para carregar"
            texto={erro}
            acao={<Botao titulo="Tentar novamente" icone="atualizar" variante="contorno" onPress={() => recarregar()} />}
          />
        ) : lista && lista.length === 0 ? (
          <Vazio
            icone="candidaturas"
            titulo="Nenhuma candidatura ainda"
            texto="Escolha uma vaga, veja a compatibilidade com seu currículo e envie para o TEIA. Ela aparece aqui para você acompanhar."
            acao={<Botao titulo="Explorar vagas" icone="vagas" onPress={irParaVagas} />}
          />
        ) : (
          <Vazio
            icone="check"
            titulo={filtro === "andamento" ? "Nada em andamento" : "Nenhuma encerrada"}
            texto="Troque o filtro acima para ver as outras candidaturas."
          />
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={carregando && !!lista}
          onRefresh={() => recarregar()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  lista: { paddingBottom: spacing.xl },
  item: { paddingHorizontal: spacing.md },
});
