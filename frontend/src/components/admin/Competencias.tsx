import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { excluirCompetencia, listarCompetenciasAdmin, salvarCompetencia } from "../../api/admin";
import { colors, font, radius, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { CategoriaCompetencia, CompetenciaAdmin } from "../../types";
import { ROTULO_CATEGORIA } from "../../utils/formatos";
import { Alternar } from "../gestao/Alternar";
import { Busca } from "../gestao/Busca";
import { errosDaApi, Erros, FolhaFormulario } from "../gestao/FolhaFormulario";
import { Grupo, Linha } from "../gestao/Lista";
import { Botao, Campo, Chip, EsqueletoLista, Icone, Segmentado, useAviso, Vazio } from "../Ui";

const vazia = (): Partial<CompetenciaAdmin> => ({ nome: "", categoria: "tecnica", ativa: true, sinonimos: [] });

function usoTexto(c: CompetenciaAdmin) {
  const partes = [];
  if (c.em_uso.alunos) partes.push(`${c.em_uso.alunos} currículo${c.em_uso.alunos === 1 ? "" : "s"}`);
  if (c.em_uso.vagas) partes.push(`${c.em_uso.vagas} vaga${c.em_uso.vagas === 1 ? "" : "s"}`);
  return partes.length ? `Em ${partes.join(" e ")}` : "Sem uso ainda";
}

/** Vocabulário compartilhado por currículos e vagas: nomes, categorias e sinônimos. */
export function Competencias() {
  const avisar = useAviso();
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState<CategoriaCompetencia | null>(null);
  const [edicao, setEdicao] = useState<Partial<CompetenciaAdmin> | null>(null);
  const [novoTermo, setNovoTermo] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const { dados, carregando, erro, recarregar } = useRecurso(
    () => listarCompetenciasAdmin({ q, categoria: categoria ?? undefined }),
    [q, categoria],
  );
  const lista = dados?.results ?? [];

  function abrir(c: Partial<CompetenciaAdmin>) {
    setErros({});
    setNovoTermo("");
    setEdicao({ ...c, sinonimos: [...(c.sinonimos ?? [])] });
  }

  function adicionarTermo() {
    const t = novoTermo.trim();
    if (!t || !edicao) return;
    const ja = (edicao.sinonimos ?? []).some((s) => s.toLowerCase() === t.toLowerCase());
    if (!ja) setEdicao({ ...edicao, sinonimos: [...(edicao.sinonimos ?? []), t] });
    setNovoTermo("");
  }

  async function salvar() {
    if (!edicao) return;
    if (!edicao.nome?.trim()) {
      setErros({ nome: "Informe o nome da competência." });
      return;
    }
    const termos = [...(edicao.sinonimos ?? [])];
    if (novoTermo.trim()) termos.push(novoTermo.trim());
    setOcupado(true);
    try {
      await salvarCompetencia(
        { nome: edicao.nome.trim(), categoria: edicao.categoria, ativa: edicao.ativa, sinonimos: termos },
        edicao.id,
      );
      avisar(edicao.id ? "Competência atualizada" : "Competência adicionada ao vocabulário");
      setEdicao(null);
      recarregar();
    } catch (e) {
      setErros(errosDaApi(e));
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    if (!edicao?.id) return;
    setOcupado(true);
    try {
      await excluirCompetencia(edicao.id);
      avisar("Competência excluída");
      setEdicao(null);
      recarregar();
    } catch (e) {
      setErros(errosDaApi(e, "Não foi possível excluir."));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <View style={styles.raiz}>
      <View style={styles.barra}>
        <View style={{ flex: 1 }}>
          <Busca valor={busca} onAlterar={setBusca} placeholder="Buscar nome ou sinônimo" />
        </View>
        <Botao titulo="Nova" icone="mais" compacto onPress={() => abrir(vazia())} rotuloAcessivel="Adicionar competência" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        <Chip texto="Todas" selecionado={!categoria} onPress={() => setCategoria(null)} />
        {(Object.keys(ROTULO_CATEGORIA) as CategoriaCompetencia[]).map((c) => (
          <Chip key={c} texto={ROTULO_CATEGORIA[c]} selecionado={categoria === c} onPress={() => setCategoria(c)} />
        ))}
      </ScrollView>

      {carregando && !dados ? (
        <EsqueletoLista itens={4} />
      ) : erro && !dados ? (
        <Vazio icone="alerta" titulo="Não deu para carregar" texto={erro} acao={<Botao titulo="Tentar novamente" variante="contorno" onPress={recarregar} />} />
      ) : lista.length === 0 ? (
        <Vazio
          icone="competencia"
          titulo="Nenhuma competência encontrada"
          texto={q ? `Nada com “${q}”. Se ela deveria existir, adicione ao vocabulário.` : "Adicione as competências que alunos e vagas vão usar."}
          acao={q ? <Botao titulo={`Adicionar “${q}”`} variante="contorno" onPress={() => abrir({ ...vazia(), nome: q })} /> : undefined}
        />
      ) : (
        <Grupo titulo={`${dados?.count ?? lista.length} no vocabulário`}>
          {lista.map((c, i) => (
            <Linha
              key={c.id}
              primeira={i === 0}
              apagada={!c.ativa}
              titulo={c.nome}
              subtitulo={[ROTULO_CATEGORIA[c.categoria], c.sinonimos.length ? `também: ${c.sinonimos.join(", ")}` : null, usoTexto(c)]
                .filter(Boolean)
                .join(" · ")}
              abaixo={!c.ativa ? <Chip texto="Inativa" /> : undefined}
              onPress={() => abrir(c)}
            />
          ))}
        </Grupo>
      )}

      <FolhaFormulario
        visivel={!!edicao}
        titulo={edicao?.id ? "Editar competência" : "Nova competência"}
        subtitulo="Currículos e vagas apontam para o mesmo vocabulário."
        onFechar={() => setEdicao(null)}
        onSalvar={salvar}
        onExcluir={edicao?.id ? excluir : undefined}
        ocupado={ocupado}
        erroGeral={erros.geral}
      >
        {edicao && (
          <>
            <Campo rotulo="Nome" value={edicao.nome} onChangeText={(t) => setEdicao({ ...edicao, nome: t })} erro={erros.nome} />
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.rotulo}>Categoria</Text>
              <Segmentado
                rotuloAcessivel="Categoria"
                opcoes={(Object.keys(ROTULO_CATEGORIA) as CategoriaCompetencia[]).map((c) => ({ valor: c, rotulo: ROTULO_CATEGORIA[c] }))}
                valor={edicao.categoria ?? "tecnica"}
                onAlterar={(v) => v && setEdicao({ ...edicao, categoria: v })}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.rotulo}>Sinônimos</Text>
              <Text style={styles.ajuda}>
                Outras grafias que levam a esta competência quando o aluno digita (ex.: “JS” → JavaScript).
              </Text>
              {(edicao.sinonimos ?? []).length > 0 && (
                <View style={styles.chips}>
                  {(edicao.sinonimos ?? []).map((s) => (
                    <Chip
                      key={s}
                      texto={s}
                      removivel
                      onPress={() => setEdicao({ ...edicao, sinonimos: (edicao.sinonimos ?? []).filter((x) => x !== s) })}
                    />
                  ))}
                </View>
              )}
              <View style={styles.novoTermo}>
                <TextInput
                  style={styles.input}
                  value={novoTermo}
                  onChangeText={setNovoTermo}
                  onSubmitEditing={adicionarTermo}
                  placeholder="Novo sinônimo"
                  placeholderTextColor={colors.subtle}
                  selectionColor={colors.primary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  accessibilityLabel="Novo sinônimo"
                />
                <Pressable
                  onPress={adicionarTermo}
                  disabled={!novoTermo.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar sinônimo"
                  style={({ pressed }) => [styles.add, !novoTermo.trim() && { opacity: 0.4 }, pressed && { opacity: 0.6 }]}
                >
                  <Icone nome="mais" tamanho={20} cor={colors.primaryDark} espessura={2.2} />
                </Pressable>
              </View>
              {!!erros.sinonimos && <Text style={styles.erro}>{erros.sinonimos}</Text>}
            </View>

            <Alternar
              rotulo="Ativa"
              ajuda="Inativas somem da busca de alunos e gestores, mas continuam nos currículos que já as usam."
              valor={!!edicao.ativa}
              onAlterar={(v) => setEdicao({ ...edicao, ativa: v })}
            />
          </>
        )}
      </FolhaFormulario>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { gap: spacing.md },
  barra: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  filtros: { gap: spacing.sm, paddingRight: spacing.md },
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text },
  ajuda: { ...font.small },
  erro: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  novoTermo: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md,
  },
  input: { flex: 1, alignSelf: "stretch", fontSize: 16, color: colors.text },
  add: { width: 52, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
});
