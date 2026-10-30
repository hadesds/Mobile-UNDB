import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { buscarCandidato } from "../../api/gestor";
import { FolhaDecisao } from "../../components/gestao/FolhaDecisao";
import { Carregando } from "../../components/Layout/Carregando";
import { Tela } from "../../components/Layout/Tela";
import { Expansivel } from "../../components/Movimento/Expansivel";
import { Avatar, Botao, Cartao, Chip, Icone, NomeIcone } from "../../components/Ui";
import { IndicadorCompatibilidade } from "../../components/vagas/IndicadorCompatibilidade";
import { LinhaRequisito } from "../../components/vagas/LinhaRequisito";
import { colors, font, radius, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { GestorStackParams } from "../../lib/navigation";
import type { Curriculo, StatusCandidatura } from "../../types";
import {
  detalheParaGestor,
  ROTULO_FAIXA,
  ROTULO_STATUS_GESTOR,
  TOM_FAIXA,
  TOM_STATUS,
} from "../../utils/compatibilidade";
import {
  formatarDataHora,
  formatarPeriodo,
  ROTULO_EXPERIENCIA,
  ROTULO_FORMACAO,
  ROTULO_IDIOMA,
  ROTULO_NIVEL_COMPETENCIA,
  ROTULO_NIVEL_IDIOMA,
  tempoRelativo,
} from "../../utils/formatos";

type Props = NativeStackScreenProps<GestorStackParams, "Candidato">;

/** Próximo passo natural de cada etapa (o botão principal do rodapé). */
const PROXIMO: Record<StatusCandidatura, { status: StatusCandidatura; titulo: string; icone: NomeIcone }> = {
  analisada: { status: "encaminhada", titulo: "Encaminhar", icone: "enviar" },
  encaminhada: { status: "em_processo", titulo: "Em processo", icone: "check" },
  em_processo: { status: "em_processo", titulo: "Anotar", icone: "editar" },
  nao_selecionada: { status: "analisada", titulo: "Voltar à fila", icone: "desfazer" },
};

export default function CandidatoDetalhe({ route }: Props) {
  const { dados: c, setDados, erro, carregando, recarregar } = useRecurso(() => buscarCandidato(route.params.id), [route.params.id]);
  const [decidindo, setDecidindo] = useState<StatusCandidatura | null>(null);

  if (!c) return <Carregando erro={erro} onTentarDeNovo={recarregar} />;

  const a = c.analise;
  const itens = (a?.itens ?? []).map((i) => ({ ...i, detalhe: detalheParaGestor(i.detalhe, i.status) }));
  const encontrados = itens.filter((i) => i.status === "encontrado");
  const pendentes = itens
    .filter((i) => i.status !== "encontrado")
    .sort((x, y) => Number(y.obrigatorio !== false) - Number(x.obrigatorio !== false));
  const proximo = PROXIMO[c.status];

  return (
    <Tela
      atualizando={carregando}
      onAtualizar={recarregar}
      rodape={
        <View style={styles.acoes}>
          <Botao titulo="Outra etapa" variante="contorno" style={{ flex: 1 }} onPress={() => setDecidindo(c.status)} />
          <Botao titulo={proximo.titulo} icone={proximo.icone} style={{ flex: 1.3 }} onPress={() => setDecidindo(proximo.status)} />
        </View>
      }
    >
      <View style={styles.pessoa}>
        <Avatar nome={c.aluno.nome} tamanho={56} redondo />
        <View style={{ flex: 1 }}>
          <Text style={styles.nome} accessibilityRole="header">
            {c.aluno.nome}
          </Text>
          <Text style={styles.meta}>
            {c.aluno.curso} · {c.aluno.periodo}º semestre
          </Text>
          <Text style={styles.meta} selectable>
            {c.aluno.email} · {c.aluno.matricula}
          </Text>
        </View>
      </View>

      <Cartao style={styles.etapa}>
        <Text style={styles.rotulo}>{c.vaga.titulo}</Text>
        <Text style={styles.meta}>
          {c.vaga.empresa} · candidatura {tempoRelativo(c.criada_em)}
        </Text>
        <View style={styles.etapaChip}>
          <Chip texto={ROTULO_STATUS_GESTOR[c.status]} tom={TOM_STATUS[c.status]} />
        </View>
        {c.encaminhamento && (
          <View style={styles.nota}>
            <Text style={styles.notaTitulo}>
              Encaminhada por {c.encaminhamento.gestor} em {formatarDataHora(c.encaminhamento.criado_em)}
            </Text>
            {!!c.encaminhamento.observacao && <Text style={styles.notaTexto}>{c.encaminhamento.observacao}</Text>}
          </View>
        )}
      </Cartao>

      {!c.aluno.consentimento_vigente && (
        <View style={styles.lgpd}>
          <Icone nome="escudo" tamanho={20} cor={colors.warning} />
          <Text style={styles.lgpdTexto}>
            O aluno revogou o consentimento LGPD. O currículo não fica visível; a análise abaixo é a que ele autorizou na época.
          </Text>
        </View>
      )}

      {a ? (
        <Cartao style={{ gap: spacing.md }}>
          <View style={styles.resumo}>
            <IndicadorCompatibilidade percentual={a.score} legenda={`${encontrados.length} de ${itens.length}`} tamanho={104} espessura={11} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Chip texto={ROTULO_FAIXA[a.faixa]} tom={TOM_FAIXA[a.faixa]} />
              <Text style={styles.resumoTexto}>
                {encontrados.length} de {itens.length} requisitos com evidência
              </Text>
              <Text style={styles.meta}>Analisado {tempoRelativo(a.criada_em)}</Text>
            </View>
          </View>
          {pendentes.length > 0 && (
            <View>
              <Text style={styles.grupoTitulo}>Para revisar · {pendentes.length}</Text>
              {pendentes.map((item, i) => (
                <LinhaRequisito key={`p-${item.requisito}`} item={item} ultimo={i === pendentes.length - 1} />
              ))}
            </View>
          )}
          {encontrados.length > 0 && (
            <View>
              <Text style={styles.grupoTitulo}>Com evidência · {encontrados.length}</Text>
              {encontrados.map((item, i) => (
                <LinhaRequisito key={`e-${item.requisito}`} item={item} ultimo={i === encontrados.length - 1} />
              ))}
            </View>
          )}
        </Cartao>
      ) : (
        <Text style={styles.meta}>Esta candidatura ainda não tem análise.</Text>
      )}

      {c.curriculo && <CurriculoResumo cv={c.curriculo} />}

      {c.historico.length > 1 && (
        <Cartao style={{ paddingVertical: spacing.sm }}>
          <Expansivel rotuloAcessivel="Histórico de análises" cabecalho={<Text style={styles.grupoTitulo}>Histórico de análises</Text>}>
            {c.historico.map((h, i) => (
              <View key={h.id} style={[styles.historico, i > 0 && styles.divisor]}>
                <Text style={styles.meta}>
                  {formatarDataHora(h.criada_em)}
                  {i === 0 ? " · atual" : ""}
                </Text>
                <Text style={styles.score}>{h.score}%</Text>
              </View>
            ))}
          </Expansivel>
        </Cartao>
      )}

      <FolhaDecisao
        alvo={
          decidindo
            ? { id: c.id, nome: c.aluno.nome, status: c.status, observacao: c.encaminhamento?.observacao }
            : null
        }
        sugestao={decidindo ?? undefined}
        onFechar={() => setDecidindo(null)}
        onDecidido={(novo) => {
          setDados(novo);
          setDecidindo(null);
        }}
      />
    </Tela>
  );
}

function CurriculoResumo({ cv }: { cv: Curriculo }) {
  const secoes: { titulo: string; icone: NomeIcone; total: number; conteudo: React.ReactNode }[] = [
    {
      titulo: "Experiências",
      icone: "experiencia",
      total: cv.experiencias.length,
      conteudo: cv.experiencias.map((e) => (
        <Item
          key={e.id}
          titulo={`${e.funcao} · ${e.organizacao}`}
          meta={[ROTULO_EXPERIENCIA[e.tipo], formatarPeriodo(e.inicio, e.fim)].filter(Boolean).join(" · ")}
          texto={e.descricao}
        />
      )),
    },
    {
      titulo: "Formação",
      icone: "formacao",
      total: cv.formacoes.length,
      conteudo: cv.formacoes.map((f) => (
        <Item
          key={f.id}
          titulo={f.curso}
          meta={[ROTULO_FORMACAO[f.nivel], f.instituicao, formatarPeriodo(f.inicio, f.fim, "em andamento")].filter(Boolean).join(" · ")}
        />
      )),
    },
    {
      titulo: "Cursos complementares",
      icone: "curso",
      total: cv.cursos.length,
      conteudo: cv.cursos.map((k) => (
        <Item key={k.id} titulo={k.nome} meta={[k.instituicao, k.carga_horaria ? `${k.carga_horaria}h` : null].filter(Boolean).join(" · ")} />
      )),
    },
  ];

  return (
    <Cartao style={{ gap: spacing.md }}>
      <Text style={styles.grupoTitulo}>Currículo · {cv.completude}% preenchido</Text>
      {cv.competencias.length > 0 && (
        <View style={styles.chips}>
          {cv.competencias.map((k) => (
            <Chip key={k.id} texto={k.nivel ? `${k.competencia_nome} · ${ROTULO_NIVEL_COMPETENCIA[k.nivel]}` : k.competencia_nome} />
          ))}
        </View>
      )}
      {cv.idiomas.length > 0 && (
        <View style={styles.chips}>
          {cv.idiomas.map((i) => (
            <Chip key={i.id} icone="idioma" texto={`${ROTULO_IDIOMA[i.idioma] ?? i.idioma} · ${ROTULO_NIVEL_IDIOMA[i.nivel]}`} />
          ))}
        </View>
      )}
      {secoes
        .filter((s) => s.total > 0)
        .map((s) => (
          <Expansivel
            key={s.titulo}
            inicialAberto={s.titulo === "Experiências"}
            rotuloAcessivel={`${s.titulo}, ${s.total}`}
            cabecalho={
              <View style={styles.secaoTopo}>
                <Icone nome={s.icone} tamanho={18} cor={colors.muted} />
                <Text style={styles.secaoTitulo}>
                  {s.titulo} · {s.total}
                </Text>
              </View>
            }
            conteudoStyle={{ gap: spacing.smd, paddingBottom: spacing.sm }}
          >
            {s.conteudo}
          </Expansivel>
        ))}
      {cv.completude === 0 && <Text style={styles.meta}>O aluno ainda não preencheu o currículo.</Text>}
    </Cartao>
  );
}

function Item({ titulo, meta, texto }: { titulo: string; meta?: string; texto?: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemTitulo}>{titulo}</Text>
      {!!meta && <Text style={styles.meta}>{meta}</Text>}
      {!!texto && <Text style={styles.itemTexto}>{texto}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  acoes: { flexDirection: "row", gap: spacing.smd },
  pessoa: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  nome: { ...font.h2, fontSize: 21, lineHeight: 27 },
  meta: { ...font.small, marginTop: 1 },
  etapa: { gap: spacing.xs },
  etapaChip: { marginTop: spacing.sm },
  rotulo: { ...font.h3 },
  nota: { marginTop: spacing.sm, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.smd, gap: 2 },
  notaTitulo: { ...font.label },
  notaTexto: { ...font.body, fontSize: 14, lineHeight: 20 },
  lgpd: { flexDirection: "row", gap: spacing.smd, backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: spacing.md },
  lgpdTexto: { flex: 1, ...font.small, color: colors.warningText, lineHeight: 19 },
  resumo: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  resumoTexto: { ...font.h3 },
  grupoTitulo: { ...font.h3, marginBottom: spacing.xs },
  historico: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm },
  divisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  score: { ...font.h3, fontVariant: ["tabular-nums"] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  secaoTopo: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  secaoTitulo: { ...font.h3, fontSize: 15 },
  item: { gap: 2, paddingLeft: spacing.lg + 2 },
  itemTitulo: { ...font.body, fontWeight: "600" },
  itemTexto: { ...font.body, fontSize: 14, lineHeight: 20, color: colors.muted },
});
