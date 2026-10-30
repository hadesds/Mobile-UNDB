import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buscarCurriculo, buscarLeitura, importarSugestoes } from "../api/curriculo";
import { Edicao, FormularioItem } from "../components/curriculo/FormularioItem";
import { descreverArquivo } from "../components/curriculo/ImportarArquivo";
import { Carregando } from "../components/Layout/Carregando";
import { Expansivel } from "../components/Movimento/Expansivel";
import { Botao, Cartao, Chip, Icone, useAviso, Vazio } from "../components/Ui";
import { colors, font, radius, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import type { AppStackParams } from "../lib/navigation";
import type { LeituraCurriculo, SecaoCurriculo, SugestoesCurriculo } from "../types";
import {
  formatarMesAno,
  formatarPeriodo,
  ROTULO_EXPERIENCIA,
  ROTULO_FORMACAO,
  ROTULO_IDIOMA,
  ROTULO_NIVEL_COMPETENCIA,
  ROTULO_NIVEL_IDIOMA,
} from "../utils/formatos";

type Props = NativeStackScreenProps<AppStackParams, "ImportarCurriculo">;
type Listas = Pick<SugestoesCurriculo, SecaoCurriculo>;
type Chave = `${SecaoCurriculo}:${number}`;

const ROTULO_CAMPO: Record<string, string> = {
  curso: "curso",
  instituicao: "instituição",
  funcao: "função",
  organizacao: "onde foi",
  nome: "nome",
};

/** Campos que o backend aceita em cada seção (o resto da sugestão é contexto). */
const CAMPOS: Record<SecaoCurriculo, string[]> = {
  formacoes: ["nivel", "curso", "instituicao", "inicio", "fim"],
  experiencias: ["tipo", "funcao", "organizacao", "descricao", "inicio", "fim"],
  competencias: ["competencia", "nivel"],
  idiomas: ["idioma", "nivel"],
  cursos: ["nome", "instituicao", "carga_horaria", "concluido_em"],
};

type SecaoLista = Exclude<SecaoCurriculo, "competencias">;
const TITULO_SECAO: Record<SecaoLista, string> = {
  experiencias: "Experiências e projetos",
  formacoes: "Formação",
  idiomas: "Idiomas",
  cursos: "Cursos complementares",
};

function so(campos: string[], item: object): Record<string, unknown> {
  const i = item as Record<string, unknown>;
  return Object.fromEntries(campos.map((c) => [c, i[c] ?? null]));
}

/** O que entra marcado de saída: o que está completo, é novo e não é ambíguo. */
function selecaoInicial(s: Listas): Set<Chave> {
  const marcadas = new Set<Chave>();
  (Object.keys(CAMPOS) as SecaoCurriculo[]).forEach((secao) => {
    s[secao].forEach((item, i) => {
      if (item.ja_existe) return;
      if ("faltando" in item && item.faltando.length) return;
      // Comportamentais citadas fora da lista de habilidades costumam ser nome de curso ou empresa.
      if (secao === "competencias" && "origem" in item && item.origem === "texto" && item.categoria === "comportamental") return;
      marcadas.add(`${secao}:${i}`);
    });
  });
  return marcadas;
}

function titulo(secao: SecaoCurriculo, item: Record<string, unknown>): { titulo: string; detalhe: string } {
  const t = (k: string) => (item[k] ? String(item[k]) : "");
  switch (secao) {
    case "experiencias":
      return {
        titulo: t("funcao") || "Função não identificada",
        detalhe: [t("organizacao"), ROTULO_EXPERIENCIA[t("tipo")], formatarPeriodo(item.inicio as string, item.fim as string)]
          .filter(Boolean)
          .join(" · "),
      };
    case "formacoes":
      return {
        titulo: t("curso") || "Curso não identificado",
        detalhe: [t("instituicao"), ROTULO_FORMACAO[t("nivel")], formatarPeriodo(item.inicio as string, item.fim as string, "em andamento")]
          .filter(Boolean)
          .join(" · "),
      };
    case "cursos":
      return {
        titulo: t("nome"),
        detalhe: [t("instituicao"), item.carga_horaria ? `${item.carga_horaria}h` : "", item.concluido_em ? formatarMesAno(item.concluido_em as string) : ""]
          .filter(Boolean)
          .join(" · "),
      };
    default:
      return { titulo: ROTULO_IDIOMA[t("idioma")] ?? t("idioma"), detalhe: "" };
  }
}

export default function ImportarCurriculo({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const avisar = useAviso();
  const leitura = useRecurso(buscarLeitura, []);
  const curriculo = useRecurso(buscarCurriculo, []);
  const [marcadas, setMarcadas] = useState<Set<Chave>>(new Set());
  const [niveis, setNiveis] = useState<Record<number, number>>({});
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [editando, setEditando] = useState<Chave | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const l: LeituraCurriculo | null = leitura.dados;
  const iniciou = useRef(false);
  useEffect(() => {
    if (!l) return;
    if (!iniciou.current) {
      iniciou.current = true;
      setMarcadas(selecaoInicial(l.sugestoes));
      return;
    }
    // Releitura (depois de salvar): mantém as escolhas, tirando o que já entrou no currículo.
    setMarcadas((m) => new Set([...m].filter((k) => {
      const [secao, i] = k.split(":") as [SecaoCurriculo, string];
      return !l.sugestoes[secao][Number(i)]?.ja_existe;
    })));
  }, [l]);

  const total = useMemo(() => {
    if (!l) return 0;
    return (Object.keys(CAMPOS) as SecaoCurriculo[]).reduce((n, s) => n + l.sugestoes[s].length, 0);
  }, [l]);

  if (!l || !curriculo.dados) {
    return <Carregando erro={leitura.erro ?? curriculo.erro} onTentarDeNovo={() => (leitura.recarregar(), curriculo.recarregar())} />;
  }
  const s = l.sugestoes;

  const alternar = (k: Chave) =>
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  function abrirFormulario(secao: SecaoCurriculo, i: number) {
    const item = { ...(s[secao][i] as object) } as Record<string, unknown>;
    if (secao === "idiomas" && niveis[i]) item.nivel = niveis[i];
    setEditando(`${secao}:${i}`);
    setEdicao({ secao, inicial: item });
  }

  async function adicionar() {
    const corpo: Partial<Record<SecaoCurriculo, Record<string, unknown>[]>> = {};
    (Object.keys(CAMPOS) as SecaoCurriculo[]).forEach((secao) => {
      const itens = s[secao]
        .map((item, i) => ({ item, i }))
        .filter(({ i }) => marcadas.has(`${secao}:${i}`))
        .map(({ item, i }) => {
          const dados = so(CAMPOS[secao], item);
          if (secao === "idiomas" && niveis[i]) dados.nivel = niveis[i];
          return dados;
        });
      if (itens.length) corpo[secao] = itens;
    });
    setSalvando(true);
    setErroGeral(null);
    try {
      const r = await importarSugestoes(corpo);
      const criados = Object.values(r.criados).reduce((a, b) => a + b, 0);
      if (r.erros.length) {
        setErroGeral(
          `${r.erros.length} ${r.erros.length === 1 ? "item não pôde ser adicionado" : "itens não puderam ser adicionados"}. ` +
            "Toque em Corrigir para completar os dados.",
        );
        leitura.recarregar();
        curriculo.recarregar();
        if (criados) avisar(`${criados} ${criados === 1 ? "item adicionado" : "itens adicionados"} ao currículo`);
        return;
      }
      avisar(criados ? `${criados} ${criados === 1 ? "item adicionado" : "itens adicionados"} ao currículo` : "Nada novo para adicionar");
      navigation.goBack();
    } catch (e) {
      setErroGeral(e instanceof Error ? e.message : "Não foi possível adicionar.");
    } finally {
      setSalvando(false);
    }
  }

  const contato = [
    s.contato.email && "e-mail",
    s.contato.telefone && "telefone",
    s.contato.linkedin && "LinkedIn",
    s.contato.github && "GitHub",
  ].filter(Boolean) as string[];
  const novos = total - (Object.keys(CAMPOS) as SecaoCurriculo[]).reduce((n, sec) => n + s[sec].filter((x) => x.ja_existe).length, 0);

  return (
    <View style={styles.raiz}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.arquivo}>
          <Icone nome="curriculo" tamanho={20} cor={colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.arquivoNome} numberOfLines={1}>
              {l.arquivo.nome_original}
            </Text>
            <Text style={styles.arquivoMeta}>{descreverArquivo(l.arquivo)}</Text>
          </View>
        </View>

        {total === 0 ? (
          <Vazio
            icone="curriculo"
            titulo="Nada para sugerir"
            texto="Lemos o arquivo, mas não reconhecemos seções como Formação, Experiência ou Habilidades. Você pode preencher o currículo pelas seções."
          />
        ) : (
          <Text style={styles.intro}>
            {novos > 0
              ? `Encontramos ${total} ${total === 1 ? "item" : "itens"} no arquivo. Os marcados entram no currículo quando você confirmar; toque em Corrigir para ajustar um item antes.`
              : "Tudo o que encontramos no arquivo já está no seu currículo."}
          </Text>
        )}

        {s.experiencias.length > 0 && secaoLista("experiencias")}

        {s.competencias.length > 0 && (
          <View style={styles.grupo}>
            <Text style={styles.grupoTitulo} accessibilityRole="header">
              Competências
            </Text>
            <Cartao style={styles.competencias}>
              <View style={styles.chips}>
                {/* Novas primeiro; as que já estão no currículo ficam no fim, só como referência. */}
                {s.competencias
                  .map((c, i) => ({ c, i }))
                  .sort((a, b) => Number(a.c.ja_existe) - Number(b.c.ja_existe))
                  .map(({ c, i }) => {
                  const k: Chave = `competencias:${i}`;
                  const nivel = c.nivel ? ` · ${ROTULO_NIVEL_COMPETENCIA[c.nivel]?.toLowerCase()}` : "";
                  return c.ja_existe ? (
                    <Chip key={k} texto={`${c.competencia_nome} · já no currículo`} />
                  ) : (
                    <Chip key={k} texto={`${c.competencia_nome}${nivel}`} selecionado={marcadas.has(k)} onPress={() => alternar(k)} />
                  );
                })}
              </View>
              <Text style={styles.nota}>
                Toque para marcar ou desmarcar. Competências comportamentais citadas fora da sua lista de habilidades vêm desmarcadas.
              </Text>
              {s.termos_nao_reconhecidos.length > 0 && (
                <Text style={styles.nota}>
                  Não estão no vocabulário do TEIA e não entram na análise das vagas:{" "}
                  <Text style={styles.notaForte}>{s.termos_nao_reconhecidos.join(", ")}</Text>.
                </Text>
              )}
            </Cartao>
          </View>
        )}

        {(["formacoes", "idiomas", "cursos"] as const).filter((c) => s[c].length > 0).map(secaoLista)}

        <Cartao style={styles.lido}>
          <Expansivel
            rotuloAcessivel="Texto completo lido do arquivo"
            cabecalho={
              <View>
                <Text style={styles.lidoTitulo}>Texto lido do arquivo</Text>
                <Text style={styles.lidoMeta}>
                  {l.texto.length.toLocaleString("pt-BR")} caracteres
                  {s.secoes_encontradas.length ? ` · ${s.secoes_encontradas.length} seções reconhecidas` : ""}
                </Text>
              </View>
            }
            conteudoStyle={{ paddingTop: spacing.smd }}
          >
            <Text style={styles.texto} selectable>
              {l.texto}
            </Text>
          </Expansivel>
        </Cartao>

        {contato.length > 0 && (
          <Text style={styles.rodape}>
            Também encontramos {juntar(contato)} no arquivo. Esses dados não entram no currículo do TEIA.
          </Text>
        )}
      </ScrollView>

      {novos > 0 && (
        <View style={[styles.barra, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {!!erroGeral && (
            <View style={styles.erro} accessibilityLiveRegion="polite">
              <Icone nome="alerta" tamanho={16} cor={colors.danger} />
              <Text style={styles.erroTexto}>{erroGeral}</Text>
            </View>
          )}
          <Botao
            titulo={marcadas.size ? `Adicionar ${marcadas.size} ${marcadas.size === 1 ? "item" : "itens"} ao currículo` : "Marque o que quer adicionar"}
            icone="check"
            onPress={adicionar}
            carregando={salvando}
            desabilitado={!marcadas.size}
          />
        </View>
      )}

      <FormularioItem
        edicao={edicao}
        curriculo={curriculo.dados}
        onFechar={() => setEdicao(null)}
        onConcluir={(msg) => {
          setEdicao(null);
          avisar(msg);
          // O item salvo pelo formulário passa a "já no currículo" na releitura.
          if (editando) setMarcadas((m) => new Set([...m].filter((k) => k !== editando)));
          setEditando(null);
          leitura.recarregar();
          curriculo.recarregar();
        }}
      />
    </View>
  );

  function secaoLista(chave: SecaoLista) {
    const itens = s[chave] as unknown as (Record<string, unknown> & { ja_existe: boolean; trecho: string; faltando?: string[] })[];
    return (
      <View key={chave} style={styles.grupo}>
        <Text style={styles.grupoTitulo} accessibilityRole="header">
          {TITULO_SECAO[chave]}
        </Text>
        <Cartao style={styles.lista}>
          {itens.map((item, i) => {
            const k: Chave = `${chave}:${i}`;
            const { titulo: t, detalhe } = titulo(chave, item);
            const faltando = item.faltando ?? [];
            const marcado = marcadas.has(k);
            const idioma = chave === "idiomas" ? s.idiomas[i]! : null;
            const nivel = idioma ? (niveis[i] ?? idioma.nivel) : null;
            return (
              <View key={k} style={[styles.item, i > 0 && styles.itemDivisor, item.ja_existe && styles.itemApagado]}>
                <Pressable
                  onPress={() => !item.ja_existe && !faltando.length && alternar(k)}
                  disabled={item.ja_existe || faltando.length > 0}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marcado, disabled: item.ja_existe || faltando.length > 0 }}
                  accessibilityLabel={`${t}. ${detalhe}`}
                  style={styles.itemToque}
                >
                  <View style={[styles.caixa, marcado && styles.caixaMarcada, (item.ja_existe || faltando.length > 0) && styles.caixaInativa]}>
                    {marcado && <Icone nome="check" tamanho={16} cor={colors.primaryText} espessura={2.4} />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.itemTitulo}>{t}</Text>
                    {!!detalhe && <Text style={styles.itemDetalhe}>{detalhe}</Text>}
                    {item.ja_existe ? (
                      <Text style={styles.itemEstado}>Já está no currículo</Text>
                    ) : faltando.length > 0 ? (
                      <Text style={styles.itemEstado}>
                        Falta informar {juntar(faltando.map((c) => ROTULO_CAMPO[c] ?? c))}
                      </Text>
                    ) : null}
                    {!!item.trecho && (
                      <Text style={styles.trecho} numberOfLines={2}>
                        No arquivo: “{item.trecho}”
                      </Text>
                    )}
                  </View>
                </Pressable>

                {idioma && !item.ja_existe && (
                  <View style={styles.nivel}>
                    {!idioma.nivel_informado && <Text style={styles.itemEstado}>O arquivo não diz o nível. Confira:</Text>}
                    <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={`Nível de ${t}`}>
                      {Object.entries(ROTULO_NIVEL_IDIOMA).map(([v, r]) => (
                        <Chip key={v} texto={r} selecionado={nivel === Number(v)} onPress={() => setNiveis((n) => ({ ...n, [i]: Number(v) }))} />
                      ))}
                    </View>
                  </View>
                )}

                {!item.ja_existe && chave !== "idiomas" && (
                  <Pressable
                    onPress={() => abrirFormulario(chave, i)}
                    accessibilityRole="button"
                    accessibilityLabel={faltando.length ? `Completar ${t}` : `Corrigir ${t} e adicionar`}
                    hitSlop={8}
                    style={({ pressed }) => [styles.corrigir, pressed && { opacity: 0.6 }]}
                  >
                    <Icone nome="editar" tamanho={16} cor={colors.primary} />
                    <Text style={styles.corrigirTexto}>{faltando.length ? "Completar e adicionar" : "Corrigir antes"}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </Cartao>
      </View>
    );
  }
}

function juntar(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  conteudo: { padding: spacing.md, paddingTop: spacing.xs, gap: spacing.lg, paddingBottom: spacing.xl },
  arquivo: { flexDirection: "row", alignItems: "center", gap: spacing.smd },
  arquivoNome: { ...font.body, fontWeight: "700" },
  arquivoMeta: { ...font.small },
  intro: { ...font.body, color: colors.muted, marginTop: -spacing.sm },
  grupo: { gap: spacing.sm },
  grupoTitulo: { ...font.label, fontSize: 14, paddingHorizontal: spacing.xs },
  lista: { paddingVertical: 0 },
  item: { paddingVertical: spacing.smd, gap: spacing.smd },
  itemDivisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemApagado: { opacity: 0.6 },
  itemToque: { flexDirection: "row", gap: spacing.smd, alignItems: "flex-start", minHeight: 44 },
  caixa: {
    width: 24,
    height: 24,
    marginTop: 1,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  caixaMarcada: { backgroundColor: colors.primary, borderColor: colors.primary },
  caixaInativa: { backgroundColor: colors.neutralSoft, borderColor: colors.neutralSoft },
  itemTitulo: { ...font.body, fontWeight: "700" },
  itemDetalhe: { ...font.small },
  itemEstado: { ...font.small, fontWeight: "600", color: colors.text },
  trecho: { ...font.tiny, fontStyle: "italic", marginTop: 2 },
  nivel: { gap: spacing.sm, paddingLeft: 24 + spacing.smd },
  corrigir: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginLeft: 24 + spacing.smd, minHeight: 32 },
  corrigirTexto: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  competencias: { gap: spacing.smd },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  nota: { ...font.small },
  notaForte: { fontWeight: "700", color: colors.text },
  lido: { paddingVertical: spacing.smd },
  lidoTitulo: { ...font.h3 },
  lidoMeta: { ...font.small, marginTop: 1 },
  texto: { ...font.small, color: colors.text, lineHeight: 19 },
  rodape: { ...font.tiny, textAlign: "center", paddingHorizontal: spacing.lg },
  barra: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.smd,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  erro: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  erroTexto: { ...font.small, color: colors.danger, flex: 1 },
});
