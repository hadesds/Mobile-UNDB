import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listarCandidaturas } from "../api/candidaturas";
import { listarVagas } from "../api/vagas";
import { Carregando } from "../components/Layout/Carregando";
import { Abas } from "../components/Ui/Abas";
import { ResumoCartao, ResumoFaixa } from "../components/Ui/ResumoCartao";
import { Botao, Chip, EsqueletoLista, Vazio } from "../components/Ui";
import { CartaoCandidatura } from "../components/vagas/CartaoCandidatura";
import { CartaoVaga } from "../components/vagas/CartaoVaga";
import { colors, font, radius, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import { request } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { AlunoTabsParams, AppStackParams } from "../lib/navigation";
import type { CandidaturaResumo, Modalidade, TipoVaga, Vaga } from "../types";
import { ROTULO_MODALIDADE, ROTULO_TIPO } from "../utils/formatos";

type Props = NativeStackScreenProps<AppStackParams, "VagasLista">;
type AbaInicio = "abertas" | "encerrando" | "candidaturas";

const ABAS: { chave: AbaInicio; rotulo: string }[] = [
  { chave: "abertas", rotulo: "Abertas" },
  { chave: "encerrando", rotulo: "Encerrando" },
  { chave: "candidaturas", rotulo: "Enviadas" },
];

/** Vagas com prazo nos próximos N dias entram na aba "Encerrando". */
const DIAS_ENCERRANDO = 7;

/** Candidaturas já analisadas, mas ainda sem encaminhamento do TEIA, contam como "em espera". */
const STATUS_EM_ESPERA = ["analisada"];

type PerfilResumo = { completude: number; competencias: { id: number }[] };

function diasAteOPrazo(prazo: string | null): number | null {
  if (!prazo) return null;
  const [a, m, d] = prazo.slice(0, 10).split("-").map(Number);
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((new Date(a, m - 1, d).getTime() - inicioHoje.getTime()) / 86_400_000);
}

export default function Inicio({ navigation }: Props) {
  const { usuario } = useAuth();
  const insets = useSafeAreaInsets();
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [aba, setAba] = useState<AbaInicio>("abertas");
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<TipoVaga | undefined>();
  const [modalidade, setModalidade] = useState<Modalidade | undefined>();

  const vagas = useRecurso(() => listarVagas({ q, tipo, modalidade }), [q, tipo, modalidade]);
  const candidaturas = useRecurso(() => listarCandidaturas(), []);
  const perfil = useRecurso(() => request<PerfilResumo>("/me/perfil/"), []);

  const lista = candidaturas.dados ?? [];
  const emEspera = lista.filter((c) => STATUS_EM_ESPERA.includes(c.status)).length;
  const qtdCompetencias = perfil.dados?.competencias.length ?? 0;
  const primeiroNome = usuario?.nome.split(" ")[0];

  const abertas = vagas.dados?.results ?? [];
  const encerrando = abertas.filter((v) => {
    const dias = diasAteOPrazo(v.prazo);
    return dias !== null && dias >= 0 && dias <= DIAS_ENCERRANDO;
  });

  const carregando = vagas.carregando || candidaturas.carregando || perfil.carregando;
  const carregandoLista = aba === "candidaturas" ? candidaturas.carregando && !candidaturas.dados : vagas.carregando && !vagas.dados;
  const erroLista = aba === "candidaturas" ? candidaturas.erro : vagas.erro;
  const recarregarTudo = () => {
    vagas.recarregar();
    candidaturas.recarregar();
    perfil.recarregar();
  };

  // As abas inferiores (Candidaturas, Currículo) ficam um nível acima desta pilha.
  const irParaAba = (destino: keyof AlunoTabsParams) =>
    navigation.getParent<BottomTabNavigationProp<AlunoTabsParams>>()?.navigate(destino);

  if (vagas.erro && !vagas.dados) {
    return <Carregando erro={vagas.erro} onTentarDeNovo={vagas.recarregar} />;
  }

  const qtdFiltros = (tipo ? 1 : 0) + (modalidade ? 1 : 0);

  const cabecalho = (
    <View style={styles.cabecalho}>
      <View style={{ gap: 4 }}>
        <Text style={styles.ola} accessibilityRole="header">Olá, {primeiroNome}</Text>
        <Text style={styles.subtitulo}>Acompanhe suas candidaturas e deixe seu currículo em dia.</Text>
      </View>

      <View style={styles.resumo}>
        <View style={styles.resumoLinha}>
          <ResumoCartao
            valor={lista.length}
            rotulo="Candidaturas enviadas"
            tom="marca"
            onPress={() => setAba("candidaturas")}
          />
          <ResumoCartao
            valor={emEspera}
            rotulo="Em espera de encaminhamento"
            tom="alerta"
            onPress={() => setAba("candidaturas")}
          />
        </View>
        <ResumoFaixa
          valor={qtdCompetencias}
          rotulo={qtdCompetencias === 1 ? "competência no currículo" : "competências no currículo"}
          acao="+ Adicionar"
          onPress={() => irParaAba("CurriculoTab")}
        />
      </View>

      <Abas abas={ABAS} ativa={aba} onChange={setAba} />

      {aba !== "candidaturas" && (
        <View style={styles.filtrosBloco}>
          <View style={styles.buscaLinha}>
            <TextInput
              style={styles.busca}
              placeholder="Buscar cargo ou empresa"
              placeholderTextColor={colors.muted}
              value={busca}
              onChangeText={setBusca}
              onSubmitEditing={() => setQ(busca.trim())}
              returnKeyType="search"
              accessibilityLabel="Buscar vagas por cargo ou empresa"
            />
            <Chip
              texto={qtdFiltros ? `Filtros (${qtdFiltros})` : "Filtros"}
              selecionado={filtrosAbertos || qtdFiltros > 0}
              onPress={() => setFiltrosAbertos(!filtrosAbertos)}
            />
          </View>

          {filtrosAbertos && (
            <View style={styles.painelFiltros}>
              <Text style={styles.rotuloFiltro}>Tipo de vaga</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
                {(Object.keys(ROTULO_TIPO) as TipoVaga[]).map((t) => (
                  <Chip
                    key={t}
                    texto={ROTULO_TIPO[t]}
                    selecionado={tipo === t}
                    onPress={() => setTipo(tipo === t ? undefined : t)}
                  />
                ))}
              </ScrollView>
              <Text style={styles.rotuloFiltro}>Modalidade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
                {(Object.keys(ROTULO_MODALIDADE) as Modalidade[]).map((m) => (
                  <Chip
                    key={m}
                    texto={ROTULO_MODALIDADE[m]}
                    selecionado={modalidade === m}
                    onPress={() => setModalidade(modalidade === m ? undefined : m)}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          <Text style={styles.contagem}>
            {aba === "encerrando"
              ? `${encerrando.length} vaga${encerrando.length === 1 ? "" : "s"} com prazo nos próximos ${DIAS_ENCERRANDO} dias`
              : `${vagas.dados?.count ?? 0} vaga${vagas.dados?.count === 1 ? "" : "s"} aberta${vagas.dados?.count === 1 ? "" : "s"}`}
          </Text>
        </View>
      )}
    </View>
  );

  const itens: (Vaga | CandidaturaResumo)[] =
    aba === "abertas" ? abertas : aba === "encerrando" ? encerrando : lista;

  return (
    <FlatList<Vaga | CandidaturaResumo>
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.lista, { paddingTop: insets.top + spacing.md }]}
      data={itens}
      keyExtractor={(item) => ("vaga" in item ? `c-${item.id}` : `v-${item.id}`)}
      ListHeaderComponent={cabecalho}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 4 }} />}
      renderItem={({ item }) =>
        "vaga" in item ? (
          <CartaoCandidatura candidatura={item} onPress={() => navigation.navigate("Candidatura", { id: item.id })} />
        ) : (
          <CartaoVaga vaga={item} onPress={() => navigation.navigate("VagaDetalhe", { id: item.id })} />
        )
      }
      ListEmptyComponent={
        carregandoLista ? (
          <EsqueletoLista itens={3} />
        ) : erroLista ? (
          <Vazio
            icone="alerta"
            titulo="Não deu para carregar"
            texto={erroLista}
            acao={<Botao titulo="Tentar novamente" variante="contorno" icone="atualizar" onPress={recarregarTudo} />}
          />
        ) : aba === "candidaturas" ? (
          <Vazio
            icone="candidaturas"
            titulo="Nenhuma candidatura ainda"
            texto="Quando você se candidatar a uma vaga, ela aparece aqui com o andamento."
            acao={<Botao titulo="Ver vagas abertas" variante="contorno" onPress={() => setAba("abertas")} />}
          />
        ) : aba === "encerrando" ? (
          <Vazio
            icone="calendario"
            titulo="Nada encerrando por agora"
            texto={`Nenhuma vaga tem prazo nos próximos ${DIAS_ENCERRANDO} dias.`}
          />
        ) : (
          <Vazio
            icone="vagas"
            titulo="Nenhuma vaga por aqui"
            texto={q || tipo || modalidade
              ? "Tente remover algum filtro ou mudar a busca."
              : "Ainda não há vagas abertas. Quando o TEIA publicar novas oportunidades, elas aparecem aqui."}
          />
        )
      }
      refreshControl={<RefreshControl refreshing={carregando && !!vagas.dados} onRefresh={recarregarTudo} tintColor={colors.primary} colors={[colors.primary]} />}
    />
  );
}

const styles = StyleSheet.create({
  lista: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  cabecalho: { gap: spacing.md, marginBottom: spacing.md },
  ola: { ...font.title, fontSize: 28, lineHeight: 34 },
  subtitulo: { ...font.body, color: colors.muted },
  resumo: { gap: spacing.sm + 2 },
  resumoLinha: { flexDirection: "row", gap: spacing.sm + 2 },
  filtrosBloco: { gap: spacing.sm + 4 },
  buscaLinha: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  busca: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: radius.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  painelFiltros: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rotuloFiltro: { fontSize: 13, fontWeight: "700", color: colors.muted },
  filtros: { gap: spacing.sm },
  contagem: { ...font.small, fontVariant: ["tabular-nums"] },
});
