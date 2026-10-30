import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";

import { listarVagas } from "../api/vagas";
import { CabecalhoTela } from "../components/Layout/CabecalhoTela";
import { Carregando } from "../components/Layout/Carregando";
import { Surgir } from "../components/Movimento/Surgir";
import { Botao, Chip, EsqueletoLista, Icone, Vazio } from "../components/Ui";
import { CartaoVaga } from "../components/vagas/CartaoVaga";
import { Filtros, FolhaFiltros } from "../components/vagas/FolhaFiltros";
import { colors, elevation, radius, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import { useAuth } from "../lib/auth";
import { useCandidaturas } from "../lib/candidaturas";
import type { AppStackParams } from "../lib/navigation";
import { ROTULO_MODALIDADE, ROTULO_TIPO } from "../utils/formatos";

type Props = NativeStackScreenProps<AppStackParams, "VagasLista">;

export default function Vagas({ navigation }: Props) {
  const { usuario } = useAuth();
  const candidaturas = useCandidaturas();
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [filtros, setFiltros] = useState<Filtros>({});
  const [filtrando, setFiltrando] = useState(false);

  // Busca enquanto digita, sem disparar uma chamada por tecla.
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);

  const { dados, erro, carregando, recarregar } = useRecurso(
    () => listarVagas({ q, ...filtros }),
    [q, filtros.tipo, filtros.modalidade],
  );

  const primeiroNome = usuario?.nome.split(" ")[0];
  const ativos = [filtros.tipo, filtros.modalidade].filter(Boolean).length;
  const temFiltro = !!(q || ativos);

  if (erro && !dados) return <Carregando erro={erro} onTentarDeNovo={recarregar} />;

  const cabecalho = (
    <CabecalhoTela titulo={`Olá, ${primeiroNome}`} subtitulo="Vagas abertas para você se candidatar.">
      <View style={styles.buscaLinha}>
        <View style={styles.busca}>
          <Icone nome="busca" tamanho={19} cor={colors.muted} />
          <TextInput
            style={styles.buscaInput}
            placeholder="Buscar por cargo ou empresa"
            placeholderTextColor={colors.subtle}
            selectionColor={colors.primary}
            value={busca}
            onChangeText={setBusca}
            onSubmitEditing={() => setQ(busca.trim())}
            returnKeyType="search"
            accessibilityLabel="Buscar vagas por cargo ou empresa"
          />
          {!!busca && (
            <Pressable onPress={() => setBusca("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpar busca">
              <Icone nome="fechar" tamanho={18} cor={colors.muted} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setFiltrando(true)}
          accessibilityRole="button"
          accessibilityLabel={ativos ? `Filtros, ${ativos} ativo${ativos > 1 ? "s" : ""}` : "Filtros"}
          style={({ pressed }) => [styles.filtroBotao, ativos > 0 && styles.filtroAtivo, pressed && { opacity: 0.7 }]}
        >
          <Icone nome="filtros" tamanho={20} cor={ativos ? colors.primaryText : colors.text} />
          {ativos > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>{ativos}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {ativos > 0 && (
        <View style={styles.ativos}>
          {filtros.tipo && (
            <Chip texto={ROTULO_TIPO[filtros.tipo]} removivel onPress={() => setFiltros((f) => ({ ...f, tipo: undefined }))} />
          )}
          {filtros.modalidade && (
            <Chip
              texto={ROTULO_MODALIDADE[filtros.modalidade]}
              removivel
              onPress={() => setFiltros((f) => ({ ...f, modalidade: undefined }))}
            />
          )}
        </View>
      )}

      {!!dados && (
        <Text style={styles.contagem} accessibilityLiveRegion="polite">
          {dados.count} vaga{dados.count === 1 ? "" : "s"}
          {temFiltro ? ` encontrada${dados.count === 1 ? "" : "s"}` : ` aberta${dados.count === 1 ? "" : "s"}`}
        </Text>
      )}
    </CabecalhoTela>
  );

  return (
    <>
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
            <CartaoVaga
              vaga={item}
              candidatado={!!candidaturas.daVaga(item.id)}
              onPress={() => navigation.navigate("VagaDetalhe", { id: item.id })}
            />
          </Surgir>
        )}
        ListEmptyComponent={
          carregando && !dados ? (
            <View style={styles.item}>
              <EsqueletoLista />
            </View>
          ) : carregando ? undefined : temFiltro ? (
            <Vazio
              icone="busca"
              titulo="Nenhuma vaga com esses critérios"
              texto="Tente outra palavra ou remova algum filtro."
              acao={
                <Botao
                  titulo="Limpar busca e filtros"
                  variante="contorno"
                  onPress={() => {
                    setBusca("");
                    setQ("");
                    setFiltros({});
                  }}
                />
              }
            />
          ) : (
            <Vazio
              icone="vagas"
              titulo="Nenhuma vaga aberta agora"
              texto="Quando o TEIA publicar novas oportunidades, elas aparecem aqui. Enquanto isso, deixe seu currículo em dia."
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={carregando && !!dados}
            onRefresh={() => {
              recarregar();
              candidaturas.recarregar();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <FolhaFiltros
        visivel={filtrando}
        filtros={filtros}
        onFechar={() => setFiltrando(false)}
        onAplicar={(f) => {
          setFiltros(f);
          setFiltrando(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  lista: { paddingBottom: spacing.xl },
  item: { paddingHorizontal: spacing.md },
  buscaLinha: { flexDirection: "row", gap: spacing.sm },
  busca: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.smd,
    ...elevation.low,
  },
  buscaInput: { flex: 1, alignSelf: "stretch", fontSize: 15, color: colors.text },
  filtroBotao: {
    width: 48,
    height: 48,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.low,
  },
  filtroAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeTexto: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  ativos: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: -spacing.xs },
  contagem: { fontSize: 13, color: colors.muted, fontWeight: "600" },
});
