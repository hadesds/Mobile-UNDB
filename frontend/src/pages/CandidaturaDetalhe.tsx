import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { buscarCandidatura, reanalisar } from "../api/candidaturas";
import { Carregando } from "../components/Layout/Carregando";
import { Tela } from "../components/Layout/Tela";
import { Expansivel } from "../components/Movimento/Expansivel";
import { Surgir } from "../components/Movimento/Surgir";
import { Avatar, Botao, Cartao, Chip, Icone, useAviso } from "../components/Ui";
import { Acompanhamento } from "../components/candidaturas/Acompanhamento";
import { IndicadorCompatibilidade } from "../components/vagas/IndicadorCompatibilidade";
import { LinhaRequisito } from "../components/vagas/LinhaRequisito";
import { colors, font, radius, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import { useCandidaturas } from "../lib/candidaturas";
import type { AppStackParams } from "../lib/navigation";
import {
  FAIXA_ALTA_MIN,
  FAIXA_MEDIA_MIN,
  ROTULO_FAIXA,
  ROTULO_STATUS,
  TOM_FAIXA,
  TOM_STATUS,
} from "../utils/compatibilidade";
import { formatarDataHora } from "../utils/formatos";

type Props = NativeStackScreenProps<AppStackParams, "Candidatura">;

function Grupo({ titulo, total, ajuda, aberto, children }: {
  titulo: string;
  total: number;
  ajuda?: string;
  aberto: boolean;
  children: React.ReactNode;
}) {
  return (
    <Cartao style={styles.grupo}>
      <Expansivel
        inicialAberto={aberto}
        rotuloAcessivel={`${titulo}, ${total} ${total === 1 ? "requisito" : "requisitos"}`}
        cabecalho={
          <View style={styles.grupoTopo}>
            <Text style={styles.grupoTitulo}>{titulo}</Text>
            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>{total}</Text>
            </View>
          </View>
        }
      >
        {!!ajuda && <Text style={styles.ajuda}>{ajuda}</Text>}
        {children}
      </Expansivel>
    </Cartao>
  );
}

export default function CandidaturaDetalhe({ route, navigation }: Props) {
  const { id, recemCriada } = route.params;
  const { dados: c, setDados, erro, carregando, recarregar } = useRecurso(() => buscarCandidatura(id), [id]);
  const { sincronizar } = useCandidaturas();
  const avisar = useAviso();
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    if (c) sincronizar(c);
  }, [c, sincronizar]);

  if (!c) return <Carregando erro={erro} onTentarDeNovo={recarregar} />;

  const a = c.analise;
  const itens = a?.itens ?? [];
  const encontrados = itens.filter((i) => i.status === "encontrado");
  const pendentes = itens
    .filter((i) => i.status !== "encontrado")
    .sort((x, y) => Number(y.obrigatorio !== false) - Number(x.obrigatorio !== false));

  async function onReanalisar() {
    setAtualizando(true);
    const antes = a?.score;
    try {
      const nova = await reanalisar(c!.id);
      setDados(nova);
      const depois = nova.analise?.score;
      avisar(
        antes !== undefined && depois !== undefined && antes !== depois
          ? `Análise atualizada: ${antes}% → ${depois}%`
          : "Análise atualizada com seu currículo atual",
      );
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível atualizar a análise.", "erro");
    } finally {
      setAtualizando(false);
    }
  }

  return (
    <Tela
      atualizando={carregando}
      onAtualizar={recarregar}
      rodape={
        <View style={styles.acoes}>
          <Botao
            titulo="Atualizar"
            icone="atualizar"
            variante="contorno"
            style={{ flex: 1 }}
            carregando={atualizando}
            onPress={onReanalisar}
            rotuloAcessivel="Atualizar análise com o currículo atual"
          />
          <Botao
            titulo="Melhorar currículo"
            icone="curriculo"
            style={{ flex: 1.4 }}
            onPress={() => navigation.getParent()?.navigate("CurriculoTab")}
          />
        </View>
      }
    >
      {recemCriada && (
        <Surgir style={styles.sucesso}>
          <View style={styles.sucessoIcone}>
            <Icone nome="check" tamanho={18} cor="#FFFFFF" espessura={2.6} />
          </View>
          <Text style={styles.sucessoTexto}>
            Candidatura enviada. A equipe do TEIA vai avaliar e decidir os encaminhamentos.
          </Text>
        </Surgir>
      )}

      <Cartao
        onPress={() => navigation.navigate("VagaDetalhe", { id: c.vaga.id })}
        rotuloAcessivel={`Vaga ${c.vaga.titulo}, ${c.vaga.empresa}. Abrir detalhes`}
        style={styles.vaga}
      >
        <Avatar nome={c.vaga.empresa} tamanho={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.vagaTitulo} numberOfLines={2}>
            {c.vaga.titulo}
          </Text>
          <Text style={styles.meta}>{c.vaga.empresa}</Text>
        </View>
        <Icone nome="direita" tamanho={18} cor={colors.subtle} />
      </Cartao>

      <Cartao style={{ paddingVertical: spacing.sm }}>
        <Expansivel
          rotuloAcessivel={`Acompanhamento: ${ROTULO_STATUS[c.status]}`}
          cabecalho={
            <View style={styles.statusLinha}>
              <Text style={styles.rotuloPequeno}>Acompanhamento</Text>
              <Chip texto={ROTULO_STATUS[c.status]} tom={TOM_STATUS[c.status]} />
            </View>
          }
          conteudoStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.xs }}
        >
          <Acompanhamento candidatura={c} />
        </Expansivel>
      </Cartao>

      {a ? (
        <>
          <Cartao style={{ gap: spacing.md }}>
            <View style={styles.resumo}>
              <IndicadorCompatibilidade
                percentual={a.score}
                legenda={`${encontrados.length} de ${itens.length}`}
              />
              <View style={{ flex: 1, gap: spacing.sm }}>
                <Chip texto={ROTULO_FAIXA[a.faixa]} tom={TOM_FAIXA[a.faixa]} />
                <Text style={styles.resumoTexto}>
                  {encontrados.length} de {itens.length} requisitos com evidência no seu currículo
                </Text>
              </View>
            </View>
            <Text style={styles.explicacao}>
              <Text style={styles.negrito}>Não é aprovação nem previsão de contratação.</Text> Quem
              avalia e decide os encaminhamentos é a equipe do TEIA.
            </Text>
            <Expansivel
              rotuloAcessivel="Como calculamos"
              cabecalho={<Text style={styles.link}>Como calculamos</Text>}
              conteudoStyle={{ gap: spacing.sm }}
            >
              <Text style={styles.explicacao}>
                Compatibilidade = requisitos com evidência ÷ requisitos cadastrados. Curso, semestre,
                cada competência e cada idioma valem o mesmo peso. Alta: {FAIXA_ALTA_MIN}% ou mais ·
                Média: {FAIXA_MEDIA_MIN} a {FAIXA_ALTA_MIN - 1}% · Baixa: abaixo de {FAIXA_MEDIA_MIN}%.
                O resultado não bloqueia a candidatura.
              </Text>
              <Text style={styles.explicacao}>Analisado em {formatarDataHora(a.criada_em)}.</Text>
            </Expansivel>
          </Cartao>

          {pendentes.length > 0 && (
            <Grupo
              titulo="Para revisar"
              total={pendentes.length}
              aberto
              ajuda="“Não identificado” indica ausência de registro no currículo, não ausência da competência."
            >
              {pendentes.map((item, i) => (
                <LinhaRequisito key={`p-${item.requisito}`} item={item} ultimo={i === pendentes.length - 1} />
              ))}
            </Grupo>
          )}

          {encontrados.length > 0 && (
            <Grupo titulo="Encontrados no seu currículo" total={encontrados.length} aberto={!pendentes.length}>
              {encontrados.map((item, i) => (
                <LinhaRequisito key={`e-${item.requisito}`} item={item} ultimo={i === encontrados.length - 1} />
              ))}
            </Grupo>
          )}

          {c.historico.length > 1 && (
            <Cartao style={{ paddingVertical: spacing.sm }}>
              <Expansivel
                rotuloAcessivel="Histórico de análises"
                cabecalho={<Text style={styles.grupoTitulo}>Histórico de análises</Text>}
                conteudoStyle={{ paddingBottom: spacing.sm }}
              >
                {c.historico.map((h, i) => (
                  <View key={h.id} style={[styles.historico, i > 0 && styles.historicoDivisor]}>
                    <Text style={styles.historicoData}>
                      {formatarDataHora(h.criada_em)}
                      {i === 0 ? " · atual" : ""}
                    </Text>
                    <Text style={styles.historicoScore}>{h.score}%</Text>
                  </View>
                ))}
              </Expansivel>
            </Cartao>
          )}
        </>
      ) : (
        <Text style={styles.explicacao}>A análise desta candidatura ainda não foi gerada.</Text>
      )}
    </Tela>
  );
}

const styles = StyleSheet.create({
  acoes: { flexDirection: "row", gap: spacing.smd },
  sucesso: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sucessoIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  sucessoTexto: { flex: 1, ...font.body, color: colors.successText, fontWeight: "600" },
  vaga: { flexDirection: "row", alignItems: "center", gap: spacing.smd },
  vagaTitulo: { ...font.h3 },
  meta: { ...font.small, marginTop: 2 },
  statusLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rotuloPequeno: { ...font.h3 },
  resumo: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  resumoTexto: { ...font.h3, fontSize: 16, lineHeight: 22 },
  explicacao: { ...font.small, fontSize: 14, lineHeight: 21 },
  negrito: { fontWeight: "700", color: colors.text },
  link: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  grupo: { paddingVertical: spacing.sm },
  grupoTopo: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  grupoTitulo: { ...font.h3 },
  contador: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    backgroundColor: colors.neutralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  contadorTexto: { fontSize: 13, fontWeight: "800", color: colors.muted },
  ajuda: { ...font.small, marginBottom: spacing.xs },
  historico: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  historicoDivisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  historicoData: { ...font.small, fontSize: 14 },
  historicoScore: { ...font.h3, fontVariant: ["tabular-nums"] },
});
