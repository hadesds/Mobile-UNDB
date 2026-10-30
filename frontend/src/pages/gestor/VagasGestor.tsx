import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { listarVagasGestor } from "../../api/gestor";
import { Busca } from "../../components/gestao/Busca";
import { CabecalhoTela } from "../../components/Layout/CabecalhoTela";
import { Surgir } from "../../components/Movimento/Surgir";
import { Avatar, Botao, Cartao, Chip, EsqueletoLista, Icone, Tom, Vazio } from "../../components/Ui";
import { colors, font, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { GestorStackParams } from "../../lib/navigation";
import type { StatusVaga, VagaGestor } from "../../types";
import { ROTULO_STATUS_VAGA, rotuloPrazo } from "../../utils/formatos";

type Props = NativeStackScreenProps<GestorStackParams, "VagasGestorLista">;
type Filtro = StatusVaga | "todas";

const TOM_VAGA: Record<StatusVaga, Tom> = { rascunho: "neutro", aberta: "sucesso", encerrada: "alerta" };
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: "aberta", rotulo: "Abertas" },
  { valor: "rascunho", rotulo: "Rascunhos" },
  { valor: "encerrada", rotulo: "Encerradas" },
  { valor: "todas", rotulo: "Todas" },
];

export default function VagasGestor({ navigation, route }: Props) {
  const [filtro, setFiltro] = useState<Filtro>(route.params?.status ?? "aberta");
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (route.params?.status) setFiltro(route.params.status);
  }, [route.params?.status, route.params?.pedido]);
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 300);
    return () => clearTimeout(t);
  }, [busca]);
  // Volta da edição: recarrega para refletir status e contagens.
  const { dados, carregando, erro, recarregar } = useRecurso(
    () => listarVagasGestor({ q, status: filtro === "todas" ? undefined : filtro }),
    [q, filtro],
  );
  useEffect(() => navigation.addListener("focus", recarregar), [navigation, recarregar]);

  const cabecalho = (
    <CabecalhoTela
      titulo="Vagas"
      subtitulo="Cadastre, publique e acompanhe as candidaturas."
      acao={<Botao titulo="Nova" icone="mais" compacto onPress={() => navigation.navigate("EditarVaga", {})} rotuloAcessivel="Nova vaga" />}
    >
      <Busca valor={busca} onAlterar={setBusca} placeholder="Buscar por título ou empresa" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {FILTROS.map((f) => (
          <Chip key={f.valor} texto={f.rotulo} selecionado={filtro === f.valor} onPress={() => setFiltro(f.valor)} />
        ))}
      </ScrollView>
    </CabecalhoTela>
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.lista}
      data={dados?.results ?? []}
      keyExtractor={(v) => String(v.id)}
      ListHeaderComponent={cabecalho}
      ItemSeparatorComponent={() => <View style={{ height: spacing.smd }} />}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item, index }) => (
        <Surgir indice={index} style={styles.item}>
          <CartaoVagaGestor vaga={item} onPress={() => navigation.navigate("VagaGestor", { id: item.id })} />
        </Surgir>
      )}
      ListEmptyComponent={
        carregando && !dados ? (
          <View style={styles.item}>
            <EsqueletoLista />
          </View>
        ) : erro && !dados ? (
          <Vazio icone="alerta" titulo="Não deu para carregar" texto={erro} acao={<Botao titulo="Tentar novamente" variante="contorno" onPress={recarregar} />} />
        ) : carregando ? undefined : (
          <Vazio
            icone="vagas"
            titulo={q ? "Nenhuma vaga encontrada" : filtro === "aberta" ? "Nenhuma vaga aberta" : `Nenhuma vaga em “${FILTROS.find((f) => f.valor === filtro)?.rotulo}”`}
            texto={q ? "Tente outro título ou empresa." : "Cadastre uma vaga com os requisitos e publique para os alunos se candidatarem."}
            acao={!q ? <Botao titulo="Nova vaga" icone="mais" onPress={() => navigation.navigate("EditarVaga", {})} /> : undefined}
          />
        )
      }
      refreshControl={
        <RefreshControl refreshing={carregando && !!dados} onRefresh={recarregar} tintColor={colors.primary} colors={[colors.primary]} />
      }
    />
  );
}

function CartaoVagaGestor({ vaga, onPress }: { vaga: VagaGestor; onPress: () => void }) {
  const prazo = rotuloPrazo(vaga.prazo);
  const { total, aguardando } = vaga.candidaturas;
  const nReq = vaga.requisitos_competencia.length + vaga.requisitos_idioma.length;
  return (
    <Cartao
      onPress={onPress}
      rotuloAcessivel={`${vaga.titulo}, ${vaga.empresa_nome}. ${ROTULO_STATUS_VAGA[vaga.status]}. ${aguardando} aguardando decisão de ${total}`}
      style={styles.cartao}
    >
      <View style={styles.topo}>
        <Avatar nome={vaga.empresa_nome} tamanho={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo} numberOfLines={2}>
            {vaga.titulo}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {vaga.empresa_nome} · {nReq} requisito{nReq === 1 ? "" : "s"}
          </Text>
        </View>
        <Icone nome="direita" tamanho={18} cor={colors.subtle} />
      </View>
      <View style={styles.rodape}>
        {vaga.status === "aberta" ? (
          <View style={styles.prazo}>
            <Icone nome="calendario" tamanho={15} cor={prazo.urgente ? colors.warning : colors.subtle} />
            <Text style={[styles.meta, prazo.urgente && styles.urgente]}>{prazo.texto}</Text>
          </View>
        ) : (
          <Chip texto={ROTULO_STATUS_VAGA[vaga.status]!} tom={TOM_VAGA[vaga.status]} />
        )}
        <Text style={styles.contagem}>
          {aguardando > 0 ? (
            <>
              <Text style={styles.aguardando}>{aguardando} aguardando</Text> de {total}
            </>
          ) : (
            `${total} candidatura${total === 1 ? "" : "s"}`
          )}
        </Text>
      </View>
    </Cartao>
  );
}

const styles = StyleSheet.create({
  lista: { paddingBottom: spacing.xl },
  item: { paddingHorizontal: spacing.md },
  chips: { gap: spacing.sm, paddingRight: spacing.md },
  cartao: { gap: spacing.smd },
  topo: { flexDirection: "row", alignItems: "center", gap: spacing.smd },
  titulo: { ...font.h3 },
  meta: { ...font.small },
  rodape: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  prazo: { flexDirection: "row", alignItems: "center", gap: 6 },
  urgente: { color: colors.warning, fontWeight: "700" },
  contagem: { ...font.small, fontVariant: ["tabular-nums"] },
  aguardando: { color: colors.primaryDark, fontWeight: "800" },
});
