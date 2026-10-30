import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { buscarCompetencias, removerItem, salvarItem } from "../../api/curriculo";
import { colors, font, radius, spacing } from "../../constants/theme";
import { ApiError } from "../../lib/api";
import type {
  Competencia,
  CompetenciaPerfil,
  CursoComplementar,
  Curriculo,
  Experiencia,
  Formacao,
  IdiomaPerfil,
  SecaoCurriculo,
} from "../../types";
import {
  isoParaMesAno,
  mascararMesAno,
  mesAnoParaIso,
  ROTULO_EXPERIENCIA,
  ROTULO_FORMACAO,
  ROTULO_IDIOMA,
  ROTULO_NIVEL_COMPETENCIA,
  ROTULO_NIVEL_IDIOMA,
} from "../../utils/formatos";
import { Botao, Campo, Chip, Folha, Icone, Segmentado } from "../Ui";

type ItemQualquer = Formacao | Experiencia | CompetenciaPerfil | IdiomaPerfil | CursoComplementar;

/** `item` edita um existente; `inicial` abre um novo já preenchido (ex.: sugestão do arquivo). */
export type Edicao = { secao: SecaoCurriculo; item?: ItemQualquer; inicial?: Record<string, unknown> } | null;

type Props = {
  edicao: Edicao;
  curriculo: Curriculo;
  onFechar: () => void;
  /** Chamado depois de salvar ou remover, com a mensagem de confirmação. */
  onConcluir: (mensagem: string) => void;
};

const TITULOS: Record<SecaoCurriculo, [string, string]> = {
  formacoes: ["Nova formação", "Editar formação"],
  experiencias: ["Nova experiência", "Editar experiência"],
  competencias: ["Nova competência", "Editar competência"],
  idiomas: ["Novo idioma", "Editar idioma"],
  cursos: ["Novo curso complementar", "Editar curso"],
};

// [adicionado, atualizado, removido], com a concordância de cada seção.
const MENSAGENS: Record<SecaoCurriculo, [string, string, string]> = {
  formacoes: ["Formação adicionada", "Formação atualizada", "Formação removida"],
  experiencias: ["Experiência adicionada", "Experiência atualizada", "Experiência removida"],
  competencias: ["Competência adicionada", "Competência atualizada", "Competência removida"],
  idiomas: ["Idioma adicionado", "Idioma atualizado", "Idioma removido"],
  cursos: ["Curso adicionado", "Curso atualizado", "Curso removido"],
};

type Valores = Record<string, string>;
type Erros = Partial<Record<string, string>>;

function valoresIniciais(secao: SecaoCurriculo, item?: ItemQualquer | Record<string, unknown>): Valores {
  const i = (item ?? {}) as Record<string, unknown>;
  const s = (k: string) => (i[k] == null ? "" : String(i[k]));
  switch (secao) {
    case "formacoes":
      return { nivel: s("nivel") || "graduacao", curso: s("curso"), instituicao: s("instituicao"), inicio: isoParaMesAno(i.inicio as string), fim: isoParaMesAno(i.fim as string) };
    case "experiencias":
      return { tipo: s("tipo") || "projeto", funcao: s("funcao"), organizacao: s("organizacao"), descricao: s("descricao"), inicio: isoParaMesAno(i.inicio as string), fim: isoParaMesAno(i.fim as string) };
    case "competencias":
      return { competencia: s("competencia"), competencia_nome: s("competencia_nome"), nivel: s("nivel") };
    case "idiomas":
      return { idioma: s("idioma"), nivel: s("nivel") || "2" };
    case "cursos":
      return { nome: s("nome"), instituicao: s("instituicao"), carga_horaria: s("carga_horaria"), concluido_em: isoParaMesAno(i.concluido_em as string) };
  }
}

/** Folha com o formulário de uma seção do currículo (criar, editar e remover). */
export function FormularioItem({ edicao, curriculo, onFechar, onConcluir }: Props) {
  // Mantém a última edição enquanto a folha anima para fora.
  const ultima = useRef<NonNullable<Edicao>>({ secao: "formacoes" });
  if (edicao) ultima.current = edicao;
  const { secao, item, inicial } = ultima.current;
  const [v, setV] = useState<Valores>(() => valoresIniciais(secao, item ?? inicial));
  const [atual, setAtual] = useState(true); // "em andamento"/"atual" para datas finais
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  useEffect(() => {
    if (!edicao) return;
    const iniciais = valoresIniciais(edicao.secao, edicao.item ?? edicao.inicial);
    setV(iniciais);
    setAtual(!iniciais.fim);
    setErros({});
    setConfirmandoRemocao(false);
  }, [edicao]);

  const muda = (campo: string) => (texto: string) => setV((x) => ({ ...x, [campo]: texto }));
  const mudaData = (campo: string) => (texto: string) => setV((x) => ({ ...x, [campo]: mascararMesAno(texto) }));

  function montar(): Record<string, unknown> | null {
    const e: Erros = {};
    const data = (campo: string, obrigatoria = false) => {
      const iso = mesAnoParaIso(v[campo] ?? "");
      if (iso === undefined) e[campo] = "Use o formato MM/AAAA.";
      else if (obrigatoria && !iso) e[campo] = "Informe o mês e o ano.";
      return iso ?? null;
    };
    let dados: Record<string, unknown> = {};

    switch (secao) {
      case "formacoes":
        if (!v.curso?.trim()) e.curso = "Informe o curso.";
        if (!v.instituicao?.trim()) e.instituicao = "Informe a instituição.";
        dados = { nivel: v.nivel, curso: v.curso?.trim(), instituicao: v.instituicao?.trim(), inicio: data("inicio"), fim: atual ? null : data("fim", true) };
        break;
      case "experiencias":
        if (!v.funcao?.trim()) e.funcao = "Informe sua função.";
        if (!v.organizacao?.trim()) e.organizacao = "Informe onde foi.";
        dados = { tipo: v.tipo, funcao: v.funcao?.trim(), organizacao: v.organizacao?.trim(), descricao: v.descricao?.trim() ?? "", inicio: data("inicio"), fim: atual ? null : data("fim", true) };
        break;
      case "competencias":
        if (!v.competencia) e.competencia = "Escolha uma competência da lista.";
        dados = { competencia: Number(v.competencia), nivel: v.nivel ? Number(v.nivel) : null };
        break;
      case "idiomas":
        if (!v.idioma) e.idioma = "Escolha o idioma.";
        dados = { idioma: v.idioma, nivel: Number(v.nivel) };
        break;
      case "cursos":
        if (!v.nome?.trim()) e.nome = "Informe o nome do curso.";
        dados = {
          nome: v.nome?.trim(),
          instituicao: v.instituicao?.trim() ?? "",
          carga_horaria: v.carga_horaria ? Number(v.carga_horaria) : null,
          concluido_em: data("concluido_em"),
        };
        break;
    }
    setErros(e);
    return Object.keys(e).length ? null : dados;
  }

  async function onSalvar() {
    const dados = montar();
    if (!dados) return;
    setSalvando(true);
    try {
      await salvarItem(secao, dados, item?.id);
      onConcluir(MENSAGENS[secao][item ? 1 : 0]);
    } catch (err) {
      if (err instanceof ApiError && err.data && typeof err.data === "object") {
        const doServidor: Erros = {};
        for (const [campo, msgs] of Object.entries(err.data as Record<string, unknown>)) {
          doServidor[campo === "termo" ? "competencia" : campo] = Array.isArray(msgs) ? String(msgs[0]) : String(msgs);
        }
        setErros(doServidor);
      } else {
        setErros({ geral: err instanceof Error ? err.message : "Não foi possível salvar." });
      }
    } finally {
      setSalvando(false);
    }
  }

  async function onRemover() {
    if (!item) return;
    if (!confirmandoRemocao) {
      setConfirmandoRemocao(true);
      return;
    }
    setSalvando(true);
    try {
      await removerItem(secao, item.id);
      onConcluir(MENSAGENS[secao][2]);
    } catch (err) {
      setErros({ geral: err instanceof Error ? err.message : "Não foi possível remover." });
    } finally {
      setSalvando(false);
    }
  }

  const geral = erros.geral ?? erros.detail ?? erros.non_field_errors;

  return (
    <Folha
      visivel={!!edicao}
      onFechar={() => !salvando && onFechar()}
      titulo={TITULOS[secao][item ? 1 : 0]}
      rodape={
        <>
          {!!geral && (
            <View style={styles.erroGeral}>
              <Icone nome="alerta" tamanho={16} cor={colors.danger} />
              <Text style={styles.erroTexto}>{geral}</Text>
            </View>
          )}
          <View style={styles.acoes}>
            {item && (
              <Botao
                titulo={confirmandoRemocao ? "Confirmar" : "Remover"}
                icone="lixeira"
                variante="perigo"
                style={{ flex: 1 }}
                onPress={onRemover}
                desabilitado={salvando}
                rotuloAcessivel={confirmandoRemocao ? "Confirmar remoção" : "Remover item"}
              />
            )}
            <Botao titulo="Salvar" icone="check" style={{ flex: 1.6 }} onPress={onSalvar} carregando={salvando} />
          </View>
        </>
      }
    >
      {secao === "formacoes" && (
        <>
          <Grupo titulo="Nível">
            <View style={styles.chips}>
              {Object.entries(ROTULO_FORMACAO).map(([valor, rotulo]) => (
                <Chip key={valor} texto={rotulo} selecionado={v.nivel === valor} onPress={() => muda("nivel")(valor)} />
              ))}
            </View>
          </Grupo>
          <Campo rotulo="Curso" value={v.curso} onChangeText={muda("curso")} erro={erros.curso} placeholder="Ex.: Engenharia de Software" />
          <Campo rotulo="Instituição" value={v.instituicao} onChangeText={muda("instituicao")} erro={erros.instituicao} placeholder="Ex.: UNDB" />
          <Periodo v={v} erros={erros} atual={atual} setAtual={setAtual} mudaData={mudaData} rotuloAtual="Em andamento" />
        </>
      )}

      {secao === "experiencias" && (
        <>
          <Grupo titulo="Tipo">
            <View style={styles.chips}>
              {Object.entries(ROTULO_EXPERIENCIA).map(([valor, rotulo]) => (
                <Chip key={valor} texto={rotulo} selecionado={v.tipo === valor} onPress={() => muda("tipo")(valor)} />
              ))}
            </View>
          </Grupo>
          <Campo rotulo="Função" value={v.funcao} onChangeText={muda("funcao")} erro={erros.funcao} placeholder="Ex.: Desenvolvedora front-end" />
          <Campo rotulo="Organização ou projeto" value={v.organizacao} onChangeText={muda("organizacao")} erro={erros.organizacao} placeholder="Ex.: UNDB" />
          <Campo
            rotulo="O que você fez"
            value={v.descricao}
            onChangeText={muda("descricao")}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 96, paddingTop: 14 }}
            ajuda="Cite as tecnologias e competências que usou: a análise das vagas procura por elas aqui."
          />
          <Periodo v={v} erros={erros} atual={atual} setAtual={setAtual} mudaData={mudaData} rotuloAtual="Trabalho atual" />
        </>
      )}

      {secao === "competencias" && (
        <SeletorCompetencia v={v} setV={setV} erro={erros.competencia} edicao={!!item} curriculo={curriculo} />
      )}

      {secao === "idiomas" && (
        <>
          <Grupo titulo="Idioma" erro={erros.idioma}>
            <View style={styles.chips}>
              {Object.entries(ROTULO_IDIOMA)
                .filter(([valor]) => valor === v.idioma || !curriculo.idiomas.some((i) => i.idioma === valor))
                .map(([valor, rotulo]) => (
                  <Chip key={valor} texto={rotulo} selecionado={v.idioma === valor} onPress={() => muda("idioma")(valor)} />
                ))}
            </View>
          </Grupo>
          <Grupo titulo="Nível">
            <View style={styles.chips}>
              {Object.entries(ROTULO_NIVEL_IDIOMA).map(([valor, rotulo]) => (
                <Chip key={valor} texto={rotulo} selecionado={v.nivel === valor} onPress={() => muda("nivel")(valor)} />
              ))}
            </View>
          </Grupo>
        </>
      )}

      {secao === "cursos" && (
        <>
          <Campo rotulo="Nome do curso" value={v.nome} onChangeText={muda("nome")} erro={erros.nome} placeholder="Ex.: Fundamentos de Testes" />
          <Campo rotulo="Instituição (opcional)" value={v.instituicao} onChangeText={muda("instituicao")} erro={erros.instituicao} />
          <View style={styles.linha}>
            <View style={{ flex: 1 }}>
              <Campo
                rotulo="Carga horária"
                value={v.carga_horaria}
                onChangeText={(t) => muda("carga_horaria")(t.replace(/\D/g, ""))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="horas"
                erro={erros.carga_horaria}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Campo
                rotulo="Concluído em"
                value={v.concluido_em}
                onChangeText={mudaData("concluido_em")}
                keyboardType="number-pad"
                placeholder="MM/AAAA"
                erro={erros.concluido_em}
              />
            </View>
          </View>
        </>
      )}
    </Folha>
  );
}

function Grupo({ titulo, erro, children }: { titulo: string; erro?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.rotulo}>{titulo}</Text>
      {children}
      {!!erro && <Text style={styles.erroTexto}>{erro}</Text>}
    </View>
  );
}

function Periodo({ v, erros, atual, setAtual, mudaData, rotuloAtual }: {
  v: Valores;
  erros: Erros;
  atual: boolean;
  setAtual: (b: boolean) => void;
  mudaData: (c: string) => (t: string) => void;
  rotuloAtual: string;
}) {
  return (
    <>
      <Pressable style={styles.alternar} onPress={() => setAtual(!atual)} accessibilityRole="switch" accessibilityState={{ checked: atual }}>
        <Text style={styles.alternarTexto}>{rotuloAtual}</Text>
        <Switch
          value={atual}
          onValueChange={setAtual}
          trackColor={{ true: colors.primary, false: colors.borderStrong }}
          thumbColor="#FFFFFF"
          {...({ activeThumbColor: "#FFFFFF" } as object)}
          accessibilityLabel={rotuloAtual}
        />
      </Pressable>
      <View style={styles.linha}>
        <View style={{ flex: 1 }}>
          <Campo rotulo="Início" value={v.inicio} onChangeText={mudaData("inicio")} keyboardType="number-pad" placeholder="MM/AAAA" erro={erros.inicio} />
        </View>
        {!atual && (
          <View style={{ flex: 1 }}>
            <Campo rotulo="Fim" value={v.fim} onChangeText={mudaData("fim")} keyboardType="number-pad" placeholder="MM/AAAA" erro={erros.fim} />
          </View>
        )}
      </View>
    </>
  );
}

function SeletorCompetencia({ v, setV, erro, edicao, curriculo }: {
  v: Valores;
  setV: React.Dispatch<React.SetStateAction<Valores>>;
  erro?: string;
  edicao: boolean;
  curriculo: Curriculo;
}) {
  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<Competencia[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const jaTem = useMemo(() => new Set(curriculo.competencias.map((c) => c.competencia)), [curriculo]);

  useEffect(() => {
    if (edicao || v.competencia) return;
    let ativo = true;
    setBuscando(true);
    const t = setTimeout(() => {
      buscarCompetencias(busca.trim())
        .then((r) => ativo && setSugestoes(r.results.filter((c) => !jaTem.has(c.id))))
        .catch(() => ativo && setSugestoes([]))
        .finally(() => ativo && setBuscando(false));
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [busca, edicao, v.competencia, jaTem]);

  return (
    <>
      {v.competencia ? (
        <View style={styles.escolhida}>
          <Icone nome="competencia" tamanho={20} cor={colors.primaryDark} />
          <Text style={styles.escolhidaTexto}>{v.competencia_nome}</Text>
          {!edicao && (
            <Pressable
              onPress={() => setV((x) => ({ ...x, competencia: "", competencia_nome: "" }))}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Trocar competência"
            >
              <Text style={styles.trocar}>Trocar</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Campo
            rotulo="Buscar competência"
            value={busca}
            onChangeText={setBusca}
            placeholder="Ex.: React, SQL, Comunicação"
            autoCapitalize="none"
            erro={erro}
            ajuda="Escolha da lista: assim a análise reconhece a competência nas vagas."
          />
          <View style={styles.sugestoes}>
            {buscando && !sugestoes ? (
              <ActivityIndicator color={colors.primary} />
            ) : sugestoes?.length ? (
              sugestoes.map((c) => (
                <Chip
                  key={c.id}
                  texto={c.nome}
                  icone="mais"
                  onPress={() => setV((x) => ({ ...x, competencia: String(c.id), competencia_nome: c.nome }))}
                />
              ))
            ) : (
              <Text style={font.small}>Nenhuma competência encontrada com esse nome.</Text>
            )}
          </View>
        </View>
      )}
      <Grupo titulo="Seu nível (opcional)">
        <Segmentado
          rotuloAcessivel="Nível na competência"
          opcional
          valor={v.nivel || null}
          onAlterar={(n) => setV((x) => ({ ...x, nivel: n ?? "" }))}
          opcoes={Object.entries(ROTULO_NIVEL_COMPETENCIA).map(([valor, rotulo]) => ({ valor, rotulo }))}
        />
        <Text style={font.tiny}>Toque de novo no nível escolhido para deixar sem nível.</Text>
      </Grupo>
    </>
  );
}

const styles = StyleSheet.create({
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  linha: { flexDirection: "row", gap: spacing.smd },
  acoes: { flexDirection: "row", gap: spacing.smd },
  alternar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  alternarTexto: { ...font.body, fontWeight: "600" },
  erroGeral: { flexDirection: "row", gap: 6, alignItems: "center" },
  erroTexto: { color: colors.danger, fontSize: 13, lineHeight: 18, flex: 1 },
  escolhida: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    padding: spacing.md,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySoft,
  },
  escolhidaTexto: { flex: 1, ...font.h3, color: colors.primaryDark },
  trocar: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  sugestoes: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, minHeight: 36 },
});
