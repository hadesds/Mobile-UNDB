import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useLayoutEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { buscarTriagem, buscarVagaGestor } from "../../api/gestor";
import { Etapas } from "../../components/gestao/Etapas";
import { LegendaEstados } from "../../components/gestao/FaixaEvidencia";
import { FolhaDecisao } from "../../components/gestao/FolhaDecisao";
import { LinhaRanking } from "../../components/gestao/LinhaRanking";
import { Carregando } from "../../components/Layout/Carregando";
import { Surgir } from "../../components/Movimento/Surgir";
import { Botao, Chip, EsqueletoLista, Icone, Tom, Vazio } from "../../components/Ui";
import { colors, font, radius, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { GestorStackParams } from "../../lib/navigation";
import type { Candidato, StatusCandidatura, StatusVaga } from "../../types";
import { ROTULO_STATUS_GESTOR } from "../../utils/compatibilidade";
import { ROTULO_MODALIDADE, ROTULO_STATUS_VAGA, ROTULO_TIPO, rotuloPrazo } from "../../utils/formatos";

type Props = NativeStackScreenProps<GestorStackParams, "VagaGestor">;
type Filtro = StatusCandidatura | "todas";

const TOM_VAGA: Record<StatusVaga, Tom> = { rascunho: "neutro", aberta: "sucesso", encerrada: "alerta" };

export default function VagaGestor({ route, navigation }: Props) {
  const { id } = route.params;
  const vaga = useRecurso(() => buscarVagaGestor(id), [id]);
  const triagem = useRecurso(() => buscarTriagem(id), [id]);
  const [filtro, setFiltro] = useState<Filtro>("analisada");
  const [decidindo, setDecidindo] = useState<Candidato | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "",
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate("EditarVaga", { id })}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Editar vaga"
          style={({ pressed }) => [styles.editar, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.editarTexto}>Editar</Text>
        </Pressable>
      ),
    });
  }, [navigation, id]);

  const v = vaga.dados;
  const t = triagem.dados;
  if (!v || !t) return <Carregando erro={vaga.erro ?? triagem.erro} onTentarDeNovo={() => (vaga.recarregar(), triagem.recarregar())} />;

  const total = t.candidatos.length;
  // Sem nada aguardando, abre direto em "Todas" para não começar numa lista vazia.
  const filtroEfetivo: Filtro = filtro === "analisada" && t.contagem.analisada === 0 && total > 0 ? "todas" : filtro;
  const posicoes = new Map(t.candidatos.map((c, i) => [c.id, i + 1]));
  const lista = filtroEfetivo === "todas" ? t.candidatos : t.candidatos.filter((c) => c.status === filtroEfetivo);
  const prazo = rotuloPrazo(v.prazo);
  const atualizar = () => {
    vaga.recarregar();
    triagem.recarregar();
  };

  const cabecalho = (
    <View style={styles.cabecalho}>
      <View style={{ gap: spacing.xs }}>
        <Text style={styles.titulo} accessibilityRole="header">
          {v.titulo}
        </Text>
        <Text style={styles.meta}>
          {v.empresa_nome} · {ROTULO_TIPO[v.tipo]} · {ROTULO_MODALIDADE[v.modalidade]}
        </Text>
        <View style={styles.linha}>
          <Chip texto={ROTULO_STATUS_VAGA[v.status]!} tom={TOM_VAGA[v.status]} />
          {v.status === "aberta" && (
            <Text style={[styles.meta, prazo.urgente && styles.urgente]}>{prazo.texto}</Text>
          )}
        </View>
      </View>

      {total > 0 && (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.etapasTopo}>
            <Text style={styles.etapasTitulo}>
              {total} {total === 1 ? "candidatura" : "candidaturas"}
            </Text>
            <Pressable
              onPress={() => setFiltro(filtroEfetivo === "todas" ? "analisada" : "todas")}
              accessibilityRole="switch"
              accessibilityState={{ checked: filtroEfetivo === "todas" }}
              accessibilityLabel="Ver todas as etapas juntas"
              hitSlop={10}
              style={({ pressed }) => [styles.todas, filtroEfetivo === "todas" && styles.todasAtiva, pressed && { opacity: 0.6 }]}
            >
              {filtroEfetivo === "todas" && <Icone nome="check" tamanho={14} cor={colors.primaryDark} />}
              <Text style={[styles.todasTexto, filtroEfetivo === "todas" && { color: colors.primaryDark }]}>Ver todas</Text>
            </Pressable>
          </View>
          <Etapas contagem={t.contagem} valor={filtroEfetivo === "todas" ? null : filtroEfetivo} onAlterar={setFiltro} />
        </View>
      )}

      {t.requisitos.length > 0 && total > 0 && (
        <View style={styles.legenda}>
          <Text style={styles.requisitos}>
            {t.requisitos.map((r, i) => (
              <Text key={r.requisito}>
                {/* Espaços inquebráveis: número e nome nunca se separam na quebra de linha. */}
                <Text style={styles.reqNumero}>{i + 1}</Text>
                {`\u00A0${r.requisito.replace(/ /g, "\u00A0")}${r.obrigatorio ? "" : "*"}`}
                {i < t.requisitos.length - 1 ? "   " : ""}
              </Text>
            ))}
          </Text>
          <LegendaEstados comForaDaAnalise={t.candidatos.some((c) => !c.analise)} />
          {t.requisitos.some((r) => !r.obrigatorio) && <Text style={styles.nota}>* desejável</Text>}
        </View>
      )}
    </View>
  );

  const vazio =
    total === 0 ? (
      v.status === "rascunho" ? (
        <Vazio
          icone="enviar"
          titulo="Rascunho ainda não publicado"
          texto="Os alunos só veem a vaga e se candidatam depois que ela é publicada."
          acao={<Botao titulo="Revisar e publicar" onPress={() => navigation.navigate("EditarVaga", { id })} />}
        />
      ) : (
        <Vazio
          icone="candidaturas"
          titulo="Nenhuma candidatura ainda"
          texto={
            v.status === "aberta"
              ? "Quando um aluno se candidatar, ele aparece aqui já com a compatibilidade calculada."
              : "Esta vaga foi encerrada sem candidaturas."
          }
        />
      )
    ) : (
      <Vazio
        icone="check"
        titulo={`Nenhuma em “${filtroEfetivo === "todas" ? "Todas" : ROTULO_STATUS_GESTOR[filtroEfetivo]}”`}
        texto="Troque o filtro acima para ver as outras etapas."
      />
    );

  return (
    <>
      <FlatList
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.lista}
        data={lista}
        keyExtractor={(c) => String(c.id)}
        ListHeaderComponent={cabecalho}
        ItemSeparatorComponent={() => <View style={{ height: spacing.smd }} />}
        renderItem={({ item, index }) => (
          <Surgir indice={index} style={styles.item}>
            <LinhaRanking
              c={item}
              posicao={posicoes.get(item.id)!}
              requisitos={t.requisitos}
              mostrarEtapa={filtroEfetivo === "todas"}
              onAbrir={() => navigation.navigate("Candidato", { id: item.id })}
              onDecidir={() => setDecidindo(item)}
            />
          </Surgir>
        )}
        ListEmptyComponent={triagem.carregando ? <View style={styles.item}><EsqueletoLista itens={3} /></View> : vazio}
        ListFooterComponent={
          total > 1 ? (
            <Text style={styles.rodape}>
              Ordem por compatibilidade, do maior para o menor. Ninguém sai da lista pela nota: a decisão é sua.
            </Text>
          ) : undefined
        }
        refreshControl={
          <RefreshControl refreshing={triagem.carregando && !!t} onRefresh={atualizar} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />
      <FolhaDecisao
        alvo={
          decidindo
            ? { id: decidindo.id, nome: decidindo.aluno.nome, status: decidindo.status, observacao: decidindo.encaminhamento?.observacao }
            : null
        }
        sugestao={decidindo?.status === "analisada" ? "encaminhada" : decidindo?.status}
        onFechar={() => setDecidindo(null)}
        onDecidido={() => {
          setDecidindo(null);
          triagem.recarregar();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  lista: { paddingBottom: spacing.xl },
  item: { paddingHorizontal: spacing.md },
  cabecalho: { padding: spacing.md, paddingTop: spacing.xs, gap: spacing.md },
  titulo: { ...font.title },
  meta: { ...font.small, fontSize: 14 },
  urgente: { color: colors.warning, fontWeight: "700" },
  linha: { flexDirection: "row", alignItems: "center", gap: spacing.smd, marginTop: spacing.xs },
  etapasTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  etapasTitulo: { ...font.label },
  todas: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.smd,
    borderRadius: radius.pill,
  },
  todasAtiva: { backgroundColor: colors.primarySoft },
  todasTexto: { fontSize: 14, fontWeight: "700", color: colors.primary },
  legenda: { gap: spacing.xs, paddingHorizontal: spacing.xxs },
  requisitos: { fontSize: 13, lineHeight: 20, fontWeight: "600", color: colors.text },
  reqNumero: { fontWeight: "800", color: colors.primaryDark, fontVariant: ["tabular-nums"] },
  nota: { ...font.tiny },
  rodape: { ...font.small, textAlign: "center", paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  editar: { minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: spacing.xs },
  editarTexto: { color: colors.primary, fontWeight: "700", fontSize: 16 },
});
