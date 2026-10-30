import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { buscarCurriculo } from "../api/curriculo";
import { Edicao, FormularioItem } from "../components/curriculo/FormularioItem";
import { CabecalhoTela } from "../components/Layout/CabecalhoTela";
import { Carregando } from "../components/Layout/Carregando";
import { Expansivel } from "../components/Movimento/Expansivel";
import { Surgir } from "../components/Movimento/Surgir";
import { BarraProgresso, Botao, Cartao, Chip, Icone, NomeIcone, useAviso, Vazio } from "../components/Ui";
import { colors, font, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import type { AppStackParams } from "../lib/navigation";
import type { Curriculo as TCurriculo, SecaoCurriculo } from "../types";
import {
  formatarMesAno,
  formatarPeriodo,
  ROTULO_EXPERIENCIA,
  ROTULO_FORMACAO,
  ROTULO_IDIOMA,
  ROTULO_NIVEL_COMPETENCIA,
  ROTULO_NIVEL_IDIOMA,
} from "../utils/formatos";

type Props = NativeStackScreenProps<AppStackParams, "CurriculoInicio">;

type Linha = { id: number; titulo: string; detalhe: string; item: object };

type Secao = {
  chave: SecaoCurriculo;
  /** Nome da seção no campo `secoes` do backend. */
  marcador: keyof TCurriculo["secoes"];
  titulo: string;
  icone: NomeIcone;
  vazio: string;
  linhas: (c: TCurriculo) => Linha[];
};

const SECOES: Secao[] = [
  {
    chave: "experiencias",
    marcador: "experiencias",
    titulo: "Experiências e projetos",
    icone: "experiencia",
    vazio: "Estágios, empregos, projetos da faculdade e voluntariado contam como evidência.",
    linhas: (c) =>
      c.experiencias.map((e) => ({
        id: e.id,
        titulo: e.funcao,
        detalhe: [e.organizacao, ROTULO_EXPERIENCIA[e.tipo], formatarPeriodo(e.inicio, e.fim)].filter(Boolean).join(" · "),
        item: e,
      })),
  },
  {
    chave: "competencias",
    marcador: "competencias",
    titulo: "Competências",
    icone: "competencia",
    vazio: "Adicione o que você sabe fazer. É o que as vagas mais pedem.",
    linhas: (c) =>
      c.competencias.map((x) => ({
        id: x.id,
        titulo: x.competencia_nome,
        detalhe: x.nivel ? ROTULO_NIVEL_COMPETENCIA[x.nivel]! : "",
        item: x,
      })),
  },
  {
    chave: "formacoes",
    marcador: "formacao",
    titulo: "Formação",
    icone: "formacao",
    vazio: "Sua graduação e cursos técnicos ou anteriores.",
    linhas: (c) =>
      c.formacoes.map((f) => ({
        id: f.id,
        titulo: f.curso,
        detalhe: [f.instituicao, ROTULO_FORMACAO[f.nivel], formatarPeriodo(f.inicio, f.fim, "em andamento")].filter(Boolean).join(" · "),
        item: f,
      })),
  },
  {
    chave: "idiomas",
    marcador: "idiomas",
    titulo: "Idiomas",
    icone: "idioma",
    vazio: "Informe os idiomas e o seu nível em cada um.",
    linhas: (c) =>
      c.idiomas.map((i) => ({
        id: i.id,
        titulo: ROTULO_IDIOMA[i.idioma] ?? i.idioma,
        detalhe: ROTULO_NIVEL_IDIOMA[i.nivel] ?? "",
        item: i,
      })),
  },
  {
    chave: "cursos",
    marcador: "cursos",
    titulo: "Cursos complementares",
    icone: "curso",
    vazio: "Cursos online, oficinas e certificações.",
    linhas: (c) =>
      c.cursos.map((x) => ({
        id: x.id,
        titulo: x.nome,
        detalhe: [x.instituicao, x.carga_horaria ? `${x.carga_horaria}h` : "", x.concluido_em ? formatarMesAno(x.concluido_em) : ""]
          .filter(Boolean)
          .join(" · "),
        item: x,
      })),
  },
];

function BlocoSecao({ secao, curriculo, onEditar, indice }: {
  secao: Secao;
  curriculo: TCurriculo;
  onEditar: (e: NonNullable<Edicao>) => void;
  indice: number;
}) {
  const linhas = secao.linhas(curriculo);
  const competencias = secao.chave === "competencias";
  const resumo = linhas.length
    ? linhas.length === 1
      ? linhas[0]!.titulo
      : `${linhas[0]!.titulo} e mais ${linhas.length - 1}`
    : "Nada adicionado ainda";

  return (
    <Surgir indice={indice}>
      <Cartao style={styles.secao}>
        <Expansivel
          inicialAberto={!linhas.length && indice === 0}
          rotuloAcessivel={`${secao.titulo}: ${linhas.length} ${linhas.length === 1 ? "item" : "itens"}`}
          cabecalho={
            <View style={styles.secaoTopo}>
              <View style={[styles.secaoIcone, !linhas.length && styles.secaoIconeVazio]}>
                <Icone nome={secao.icone} tamanho={20} cor={linhas.length ? colors.primaryDark : colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.secaoTitulo}>{secao.titulo}</Text>
                <Text style={[styles.secaoResumo, !linhas.length && { color: colors.subtle }]} numberOfLines={1}>
                  {resumo}
                </Text>
              </View>
            </View>
          }
          conteudoStyle={styles.secaoConteudo}
        >
          {!linhas.length && <Text style={styles.vazioTexto}>{secao.vazio}</Text>}

          {competencias && linhas.length > 0 ? (
            <View style={styles.chips}>
              {linhas.map((l) => (
                <Chip
                  key={l.id}
                  texto={l.detalhe ? `${l.titulo} · ${l.detalhe.toLowerCase()}` : l.titulo}
                  tom="marca"
                  onPress={() => onEditar({ secao: secao.chave, item: l.item as never })}
                />
              ))}
            </View>
          ) : (
            linhas.map((l, i) => (
              <Pressable
                key={l.id}
                onPress={() => onEditar({ secao: secao.chave, item: l.item as never })}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${l.titulo}`}
                style={({ pressed }) => [styles.item, i > 0 && styles.itemDivisor, pressed && { opacity: 0.6 }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitulo}>{l.titulo}</Text>
                  {!!l.detalhe && <Text style={styles.itemDetalhe}>{l.detalhe}</Text>}
                </View>
                <Icone nome="editar" tamanho={18} cor={colors.subtle} />
              </Pressable>
            ))
          )}

          <Botao
            titulo="Adicionar"
            icone="mais"
            variante="suave"
            compacto
            onPress={() => onEditar({ secao: secao.chave })}
            rotuloAcessivel={`Adicionar em ${secao.titulo}`}
          />
        </Expansivel>
      </Cartao>
    </Surgir>
  );
}

export default function Curriculo({ navigation }: Props) {
  const { dados, erro, recarregar } = useRecurso(buscarCurriculo, []);
  const avisar = useAviso();
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [puxando, setPuxando] = useState(false);

  // Volta atualizado quando o aluno chega aqui vindo de uma candidatura.
  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar]),
  );

  if (!dados) {
    if (erro && erro.includes("LGPD")) {
      return (
        <View style={styles.raiz}>
          <CabecalhoTela titulo="Currículo" />
          <Vazio
            icone="escudo"
            titulo="Consentimento necessário"
            texto="Para guardar e analisar seu currículo, aceite o termo LGPD na aba Conta."
            acao={<Botao titulo="Ir para Conta" variante="contorno" onPress={() => navigation.getParent()?.navigate("Conta")} />}
          />
        </View>
      );
    }
    return <Carregando erro={erro} onTentarDeNovo={recarregar} />;
  }

  const faltando = SECOES.filter((s) => !dados.secoes[s.marcador]);
  const proxima = faltando[0];
  const completo = dados.completude >= 100;

  return (
    <View style={styles.raiz}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={
          <RefreshControl
            refreshing={puxando}
            onRefresh={async () => {
              setPuxando(true);
              await recarregar();
              setPuxando(false);
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <CabecalhoTela titulo="Currículo" subtitulo="É com ele que comparamos você às vagas." />

        <View style={styles.corpo}>
          <Surgir>
            <Cartao style={styles.progresso}>
              <View style={styles.progressoTopo}>
                <Text style={styles.progressoTitulo}>
                  {completo ? "Todas as seções preenchidas" : "Preenchimento do currículo"}
                </Text>
                <Text style={styles.progressoValor}>{dados.completude}%</Text>
              </View>
              <BarraProgresso
                valor={dados.completude}
                cor={completo ? colors.success : colors.primary}
                rotuloAcessivel={`Currículo ${dados.completude}% preenchido`}
              />
              {proxima ? (
                <Pressable
                  onPress={() => setEdicao({ secao: proxima.chave })}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.proximo, pressed && { opacity: 0.7 }]}
                >
                  <Icone nome={proxima.icone} tamanho={18} cor={colors.primary} />
                  <Text style={styles.proximoTexto}>
                    Próximo passo: adicionar {proxima.titulo.toLowerCase()}
                  </Text>
                  <Icone nome="direita" tamanho={16} cor={colors.primary} />
                </Pressable>
              ) : (
                <Text style={styles.dica}>
                  Mantenha atualizado: depois de mudar algo, use “Atualizar” nas suas candidaturas.
                </Text>
              )}
            </Cartao>
          </Surgir>

          {SECOES.map((s, i) => (
            <BlocoSecao key={s.chave} secao={s} curriculo={dados} onEditar={setEdicao} indice={i + 1} />
          ))}

          <Text style={styles.rodape}>
            O preenchimento orienta você; ele não é uma nota e não avalia seu perfil.
          </Text>
        </View>
      </ScrollView>

      <FormularioItem
        edicao={edicao}
        curriculo={dados}
        onFechar={() => setEdicao(null)}
        onConcluir={(msg) => {
          setEdicao(null);
          avisar(msg);
          recarregar();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  conteudo: { paddingBottom: spacing.xl },
  corpo: { paddingHorizontal: spacing.md, gap: spacing.smd },
  progresso: { gap: spacing.smd },
  progressoTopo: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  progressoTitulo: { ...font.h3 },
  progressoValor: { ...font.h2, color: colors.primaryDark, fontVariant: ["tabular-nums"] },
  proximo: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 36 },
  proximoTexto: { flex: 1, color: colors.primary, fontWeight: "700", fontSize: 14 },
  dica: { ...font.small },
  secao: { paddingVertical: spacing.smd },
  secaoTopo: { flexDirection: "row", alignItems: "center", gap: spacing.smd },
  secaoIcone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  secaoIconeVazio: { backgroundColor: colors.neutralSoft },
  secaoTitulo: { ...font.h3 },
  secaoResumo: { ...font.small, marginTop: 1 },
  secaoConteudo: { gap: spacing.smd, paddingTop: spacing.smd },
  vazioTexto: { ...font.small, fontSize: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingVertical: spacing.sm, minHeight: 48 },
  itemDivisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemTitulo: { ...font.body, fontWeight: "600" },
  itemDetalhe: { ...font.small },
  rodape: { ...font.tiny, textAlign: "center", marginTop: spacing.sm, paddingHorizontal: spacing.lg },
});
