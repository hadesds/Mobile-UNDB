import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { listarCursos } from "../../api/cursos";
import { buscarSolicitacao, publicarSolicitacao, recusarSolicitacao, revisarSolicitacao } from "../../api/envios";
import {
  buscarCompetenciasVocabulario,
  buscarVagaGestor,
  DadosVaga,
  listarEmpresasAtivas,
  salvarVaga,
} from "../../api/gestor";
import { errosDaApi, Erros } from "../../components/gestao/FolhaFormulario";
import { Seletor } from "../../components/gestao/Seletor";
import { Carregando } from "../../components/Layout/Carregando";
import { Tela } from "../../components/Layout/Tela";
import { Botao, Campo, Cartao, Chip, Icone, Segmentado, useAviso } from "../../components/Ui";
import { colors, font, radius, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { GestorStackParams } from "../../lib/navigation";
import type { Competencia, Curso, Empresa, Modalidade, SolicitacaoVaga, StatusVaga, TipoVaga, VagaGestor } from "../../types";
import {
  dataParaIso,
  formatarData,
  mascararData,
  ROTULO_IDIOMA,
  ROTULO_MODALIDADE,
  ROTULO_NIVEL_IDIOMA,
  ROTULO_TIPO,
  tempoRelativo,
} from "../../utils/formatos";

type Props = NativeStackScreenProps<GestorStackParams, "EditarVaga">;

type ReqComp = { competencia: number; competencia_nome: string; obrigatorio: boolean };
type ReqIdioma = { idioma: string; nivel_minimo: number; obrigatorio: boolean };

type Form = {
  titulo: string;
  empresa: number | null;
  tipo: TipoVaga;
  modalidade: Modalidade;
  prazo: string; // DD/MM/AAAA
  descricao: string;
  cursos: number[];
  periodo_minimo: string;
  disponibilidade_horario: string;
  competencias: ReqComp[];
  idiomas: ReqIdioma[];
  status: StatusVaga;
};

const NOVO: Form = {
  titulo: "",
  empresa: null,
  tipo: "estagio_nao_obrigatorio",
  modalidade: "presencial",
  prazo: "",
  descricao: "",
  cursos: [],
  periodo_minimo: "",
  disponibilidade_horario: "",
  competencias: [],
  idiomas: [],
  status: "rascunho",
};

export default function EditarVaga({ route, navigation }: Props) {
  const id = route.params?.id;
  // Revisão de vaga enviada por empresa: mesmo formulário, salva na solicitação e publica no fim.
  const solicitacaoId = route.params?.solicitacao;
  const revisao = !!solicitacaoId;
  const avisar = useAviso();
  const [form, setForm] = useState<Form | null>(id || revisao ? null : NOVO);
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState<StatusVaga | "recusar" | null>(null);
  const [confirmarRecusa, setConfirmarRecusa] = useState(false);
  const empresas = useRecurso(() => (revisao ? Promise.resolve(null) : listarEmpresasAtivas()), [revisao]);
  const cursos = useRecurso(listarCursos, []);
  const existente = useRecurso<VagaGestor | SolicitacaoVaga | null>(
    () => (solicitacaoId ? buscarSolicitacao(solicitacaoId) : id ? buscarVagaGestor(id) : Promise.resolve(null)),
    [id, solicitacaoId],
  );
  const solicitacao = revisao ? (existente.dados as SolicitacaoVaga | null) : null;

  useLayoutEffect(() => {
    navigation.setOptions({ title: revisao ? "Revisar vaga recebida" : id ? "Editar vaga" : "Nova vaga" });
  }, [navigation, id, revisao]);

  // Já revisada por outra pessoa (ou em outra aba): não edita de novo.
  useEffect(() => {
    if (!solicitacao || solicitacao.status === "pendente") return;
    if (solicitacao.status === "publicada" && solicitacao.vaga) {
      avisar("Esta vaga já foi publicada");
      navigation.replace("VagaGestor", { id: solicitacao.vaga });
    } else {
      avisar("Este envio já foi recusado", "erro");
      navigation.goBack();
    }
  }, [solicitacao, navigation, avisar]);

  useEffect(() => {
    const v = existente.dados;
    if (!v) return;
    setForm({
      titulo: v.titulo,
      empresa: v.empresa,
      tipo: v.tipo,
      modalidade: v.modalidade,
      prazo: v.prazo ? formatarData(v.prazo) : "",
      descricao: v.descricao,
      cursos: v.cursos,
      periodo_minimo: v.periodo_minimo ? String(v.periodo_minimo) : "",
      disponibilidade_horario: v.disponibilidade_horario,
      competencias: v.requisitos_competencia.map(({ competencia, competencia_nome, obrigatorio }) => ({ competencia, competencia_nome, obrigatorio })),
      idiomas: v.requisitos_idioma.map(({ idioma, nivel_minimo, obrigatorio }) => ({ idioma, nivel_minimo, obrigatorio })),
      status: "candidaturas" in v ? v.status : "rascunho",
    });
  }, [existente.dados]);

  if (!form) return <Carregando erro={existente.erro} onTentarDeNovo={existente.recarregar} />;

  const muda = <K extends keyof Form>(campo: K, valor: Form[K]) => setForm((f) => (f ? { ...f, [campo]: valor } : f));
  const totalReq = form.competencias.length + form.idiomas.length;

  // Empresa da vaga pode ter sido desativada depois; mantém na lista para não sumir do campo.
  const opcoesEmpresa = (empresas.dados?.results ?? []).map((e: Empresa) => ({
    valor: e.id,
    rotulo: e.nome_fantasia || e.nome,
    detalhe: e.nome_fantasia ? e.nome : undefined,
  }));
  if (existente.dados && !opcoesEmpresa.some((o) => o.valor === existente.dados!.empresa)) {
    opcoesEmpresa.unshift({ valor: existente.dados.empresa, rotulo: existente.dados.empresa_nome, detalhe: "Empresa inativa" });
  }

  async function salvar(status: StatusVaga) {
    const f = form!;
    const e: Erros = {};
    if (!f.titulo.trim()) e.titulo = "Informe o título da vaga.";
    if (!f.empresa && !revisao) e.empresa = "Escolha a empresa.";
    const prazo = dataParaIso(f.prazo);
    if (prazo === undefined) e.prazo = "Use o formato DD/MM/AAAA.";
    const periodo = f.periodo_minimo ? Number(f.periodo_minimo) : null;
    if (periodo !== null && (periodo < 1 || periodo > 20)) e.periodo_minimo = "Entre 1 e 20.";
    if (status === "aberta" && totalReq === 0) e.requisitos = "Para publicar, cadastre ao menos uma competência ou idioma.";
    setErros(e);
    if (Object.keys(e).length) {
      avisar("Revise os campos destacados", "erro");
      return;
    }

    const dados: DadosVaga = {
      titulo: f.titulo.trim(),
      empresa: f.empresa!,
      tipo: f.tipo,
      modalidade: f.modalidade,
      prazo: prazo ?? null,
      descricao: f.descricao.trim(),
      cursos: f.cursos,
      periodo_minimo: periodo,
      disponibilidade_horario: f.disponibilidade_horario.trim(),
      requisitos_competencia: f.competencias as never,
      requisitos_idioma: f.idiomas as never,
      status,
    };
    setSalvando(status);
    if (revisao) {
      await salvarRevisao(dados, status === "aberta");
      return;
    }
    try {
      const v = await salvarVaga(dados, id);
      const msg =
        status === f.status
          ? "Vaga salva"
          : status === "aberta"
            ? "Vaga publicada para os alunos"
            : status === "encerrada"
              ? "Vaga encerrada"
              : "Vaga salva como rascunho";
      avisar(msg);
      navigation.replace("VagaGestor", { id: v.id });
    } catch (err) {
      mostrarErros(err);
    } finally {
      setSalvando(null);
    }
  }

  function mostrarErros(err: unknown) {
    const doServidor = errosDaApi(err);
    if (doServidor.requisitos_competencia || doServidor.requisitos_idioma)
      doServidor.requisitos = doServidor.requisitos_competencia ?? doServidor.requisitos_idioma;
    setErros(doServidor);
    avisar(doServidor.geral ?? doServidor.status ?? doServidor.prazo ?? "Revise os campos destacados", "erro");
  }

  /** Salva os ajustes na solicitação; ao publicar, o servidor revalida e cria a vaga aberta. */
  async function salvarRevisao(dados: DadosVaga, publicar: boolean) {
    const { empresa: _e, status: _s, ...campos } = dados;
    try {
      await revisarSolicitacao(solicitacaoId!, {
        ...campos,
        requisitos_competencia: form!.competencias.map(({ competencia, obrigatorio }) => ({ competencia, obrigatorio })),
        requisitos_idioma: form!.idiomas,
      });
      if (!publicar) {
        avisar("Revisão salva. A vaga ainda não aparece para os alunos.");
        navigation.goBack();
        return;
      }
      const s = await publicarSolicitacao(solicitacaoId!);
      avisar("Vaga publicada para os alunos");
      navigation.replace("VagaGestor", { id: s.vaga! });
    } catch (err) {
      mostrarErros(err);
    } finally {
      setSalvando(null);
    }
  }

  async function recusar() {
    if (!confirmarRecusa) {
      setConfirmarRecusa(true);
      return;
    }
    setSalvando("recusar");
    try {
      await recusarSolicitacao(solicitacaoId!);
      avisar("Envio recusado. Ele não será publicado.");
      navigation.goBack();
    } catch (err) {
      mostrarErros(err);
    } finally {
      setSalvando(null);
    }
  }

  const publicada = form.status === "aberta";
  const rodape = revisao ? (
    <View style={styles.acoes}>
      <Botao titulo="Salvar revisão" variante="contorno" style={{ flex: 1 }} carregando={salvando === "rascunho"} desabilitado={!!salvando} onPress={() => salvar("rascunho")} />
      <Botao titulo="Publicar" icone="enviar" style={{ flex: 1 }} carregando={salvando === "aberta"} desabilitado={!!salvando} onPress={() => salvar("aberta")} />
    </View>
  ) :
    form.status === "encerrada" ? (
      <View style={styles.acoes}>
        <Botao titulo="Salvar" variante="contorno" style={{ flex: 1 }} carregando={salvando === "encerrada"} desabilitado={!!salvando} onPress={() => salvar("encerrada")} />
        <Botao titulo="Reabrir vaga" icone="atualizar" style={{ flex: 1.4 }} carregando={salvando === "aberta"} desabilitado={!!salvando} onPress={() => salvar("aberta")} />
      </View>
    ) : publicada ? (
      <Botao titulo="Salvar alterações" icone="check" carregando={salvando === "aberta"} desabilitado={!!salvando} onPress={() => salvar("aberta")} />
    ) : (
      <View style={styles.acoes}>
        <Botao titulo="Salvar rascunho" variante="contorno" style={{ flex: 1 }} carregando={salvando === "rascunho"} desabilitado={!!salvando} onPress={() => salvar("rascunho")} />
        <Botao titulo="Publicar" icone="enviar" style={{ flex: 1 }} carregando={salvando === "aberta"} desabilitado={!!salvando} onPress={() => salvar("aberta")} />
      </View>
    );

  return (
    <Tela rodape={rodape}>
      {revisao && solicitacao && (
        <View style={styles.avisoRevisao}>
          <Icone nome="empresa" tamanho={18} cor={colors.warningText} />
          <Text style={styles.avisoRevisaoTexto}>
            Enviada por {solicitacao.empresa_nome} {tempoRelativo(solicitacao.criada_em)}. Confira os dados: nada aparece
            para os alunos até você publicar.
          </Text>
        </View>
      )}

      {publicada && (
        <View style={styles.aviso}>
          <Icone nome="olho" tamanho={18} cor={colors.successText} />
          <Text style={styles.avisoTexto}>Vaga publicada: as alterações aparecem para os alunos assim que você salvar.</Text>
        </View>
      )}

      <Secao titulo="A vaga">
        <Campo rotulo="Título" value={form.titulo} onChangeText={(t) => muda("titulo", t)} erro={erros.titulo} placeholder="Ex.: Estágio em Desenvolvimento Web" />
        {revisao ? (
          <View style={{ gap: 2 }}>
            <Rotulo texto="Empresa" />
            <Text style={styles.empresaFixa}>{solicitacao?.empresa_nome}</Text>
            <Text style={styles.secaoTexto}>Definida pelo link enviado; não pode ser trocada.</Text>
          </View>
        ) : (
          <Seletor
            rotulo="Empresa"
            opcoes={opcoesEmpresa}
            valor={form.empresa}
            onAlterar={(v) => muda("empresa", v)}
            placeholder={empresas.carregando ? "Carregando empresas…" : "Escolher empresa"}
            erro={erros.empresa}
          />
        )}
        <Rotulo texto="Tipo" />
        <View style={styles.chips}>
          {(Object.keys(ROTULO_TIPO) as TipoVaga[]).map((t) => (
            <Chip key={t} texto={ROTULO_TIPO[t]} selecionado={form.tipo === t} onPress={() => muda("tipo", t)} />
          ))}
        </View>
        <Rotulo texto="Modalidade" />
        <Segmentado
          rotuloAcessivel="Modalidade"
          opcoes={(Object.keys(ROTULO_MODALIDADE) as Modalidade[]).map((m) => ({ valor: m, rotulo: ROTULO_MODALIDADE[m] }))}
          valor={form.modalidade}
          onAlterar={(v) => v && muda("modalidade", v)}
        />
        <Campo
          rotulo="Prazo para candidaturas"
          value={form.prazo}
          onChangeText={(t) => muda("prazo", mascararData(t))}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
          erro={erros.prazo}
          ajuda="Vazio = sem prazo. Depois do prazo a vaga some da lista dos alunos."
        />
        <Campo
          rotulo="Descrição"
          value={form.descricao}
          onChangeText={(t) => muda("descricao", t)}
          multiline
          style={styles.multilinha}
          placeholder="Atividades, benefícios, carga horária…"
        />
      </Secao>

      <Secao
        titulo="Requisitos"
        texto="É com eles que o app calcula a compatibilidade. Desejáveis contam igual, mas aparecem marcados para o aluno."
        erro={erros.requisitos}
      >
        <BuscaCompetencia
          jaTem={form.competencias.map((c) => c.competencia)}
          onEscolher={(c) => muda("competencias", [...form.competencias, { competencia: c.id, competencia_nome: c.nome, obrigatorio: true }])}
        />
        {form.competencias.map((c, i) => (
          <LinhaRequisitoEditavel
            key={c.competencia}
            titulo={c.competencia_nome}
            obrigatorio={c.obrigatorio}
            onAlternar={() => muda("competencias", form.competencias.map((x, j) => (j === i ? { ...x, obrigatorio: !x.obrigatorio } : x)))}
            onRemover={() => muda("competencias", form.competencias.filter((_, j) => j !== i))}
          />
        ))}

        <Rotulo texto="Idiomas" />
        {form.idiomas.map((r, i) => (
          <Cartao key={r.idioma} style={styles.idioma}>
            <LinhaRequisitoEditavel
              semBorda
              titulo={ROTULO_IDIOMA[r.idioma] ?? r.idioma}
              obrigatorio={r.obrigatorio}
              onAlternar={() => muda("idiomas", form.idiomas.map((x, j) => (j === i ? { ...x, obrigatorio: !x.obrigatorio } : x)))}
              onRemover={() => muda("idiomas", form.idiomas.filter((_, j) => j !== i))}
            />
            <Text style={styles.nivelRotulo}>Nível mínimo</Text>
            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={`Nível mínimo de ${ROTULO_IDIOMA[r.idioma] ?? r.idioma}`}>
              {Object.entries(ROTULO_NIVEL_IDIOMA).map(([v, rotulo]) => (
                <Chip
                  key={v}
                  texto={rotulo}
                  selecionado={r.nivel_minimo === Number(v)}
                  onPress={() => muda("idiomas", form.idiomas.map((x, j) => (j === i ? { ...x, nivel_minimo: Number(v) } : x)))}
                />
              ))}
            </View>
          </Cartao>
        ))}
        <View style={styles.chips}>
          {Object.entries(ROTULO_IDIOMA)
            .filter(([valor]) => !form.idiomas.some((x) => x.idioma === valor))
            .map(([valor, rotulo]) => (
              <Chip
                key={valor}
                texto={rotulo}
                icone="mais"
                onPress={() => muda("idiomas", [...form.idiomas, { idioma: valor, nivel_minimo: 2, obrigatorio: true }])}
              />
            ))}
        </View>
      </Secao>

      <Secao titulo="Para quem" texto="Curso e semestre também entram na compatibilidade quando definidos.">
        <Rotulo texto="Cursos" />
        <View style={styles.chips}>
          <Chip texto="Qualquer curso" selecionado={form.cursos.length === 0} onPress={() => muda("cursos", [])} />
          {(cursos.dados ?? []).map((c: Curso) => (
            <Chip
              key={c.id}
              texto={c.nome}
              selecionado={form.cursos.includes(c.id)}
              onPress={() =>
                muda("cursos", form.cursos.includes(c.id) ? form.cursos.filter((x) => x !== c.id) : [...form.cursos, c.id])
              }
            />
          ))}
        </View>
        <View style={styles.linha}>
          <View style={{ flex: 1 }}>
            <Campo
              rotulo="Semestre mínimo"
              value={form.periodo_minimo}
              onChangeText={(t) => muda("periodo_minimo", t.replace(/\D/g, "").slice(0, 2))}
              keyboardType="number-pad"
              placeholder="Qualquer"
              erro={erros.periodo_minimo}
            />
          </View>
          <View style={{ flex: 1.4 }}>
            <Campo
              rotulo="Horário"
              value={form.disponibilidade_horario}
              onChangeText={(t) => muda("disponibilidade_horario", t)}
              placeholder="Ex.: tarde, 20h/sem."
            />
          </View>
        </View>
      </Secao>

      {revisao && (
        <View style={{ gap: spacing.sm }}>
          {confirmarRecusa && (
            <Text style={styles.secaoTexto} accessibilityLiveRegion="assertive">
              O envio será recusado e não poderá ser publicado depois. Para outra tentativa, gere um novo link para a empresa.
            </Text>
          )}
          <Botao
            titulo={confirmarRecusa ? "Confirmar recusa" : "Recusar envio"}
            icone="bloquear"
            variante="perigo"
            compacto
            carregando={salvando === "recusar"}
            desabilitado={!!salvando}
            onPress={recusar}
          />
        </View>
      )}

      {publicada && (
        <Botao
          titulo="Encerrar vaga"
          icone="bloquear"
          variante="perigo"
          compacto
          carregando={salvando === "encerrada"}
          desabilitado={!!salvando}
          onPress={() => salvar("encerrada")}
          rotuloAcessivel="Encerrar vaga: ela sai da lista dos alunos"
        />
      )}
    </Tela>
  );
}

function Secao({ titulo, texto, erro, children }: { titulo: string; texto?: string; erro?: string; children: React.ReactNode }) {
  return (
    <View style={styles.secao}>
      <View style={{ gap: 2 }}>
        <Text style={styles.secaoTitulo} accessibilityRole="header">
          {titulo}
        </Text>
        {!!texto && <Text style={styles.secaoTexto}>{texto}</Text>}
      </View>
      {!!erro && (
        <View style={styles.erro}>
          <Icone nome="alerta" tamanho={16} cor={colors.danger} />
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

const Rotulo = ({ texto }: { texto: string }) => <Text style={styles.rotulo}>{texto}</Text>;

function LinhaRequisitoEditavel({ titulo, obrigatorio, onAlternar, onRemover, semBorda }: {
  titulo: string;
  obrigatorio: boolean;
  onAlternar: () => void;
  onRemover: () => void;
  semBorda?: boolean;
}) {
  return (
    <View style={[styles.req, !semBorda && styles.reqBorda]}>
      <Text style={styles.reqTitulo} numberOfLines={1}>
        {titulo}
      </Text>
      <Pressable
        onPress={onAlternar}
        accessibilityRole="switch"
        accessibilityState={{ checked: obrigatorio }}
        accessibilityLabel={`${titulo}: ${obrigatorio ? "obrigatório" : "desejável"}. Tocar para trocar`}
        style={({ pressed }) => [styles.tipoReq, obrigatorio ? styles.obrig : styles.desej, pressed && { opacity: 0.7 }]}
      >
        <Text style={[styles.tipoTexto, { color: obrigatorio ? colors.primaryText : colors.muted }]}>
          {obrigatorio ? "Obrigatório" : "Desejável"}
        </Text>
      </Pressable>
      <Pressable onPress={onRemover} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remover ${titulo}`} style={styles.remover}>
        <Icone nome="fechar" tamanho={18} cor={colors.muted} />
      </Pressable>
    </View>
  );
}

function BuscaCompetencia({ jaTem, onEscolher }: { jaTem: number[]; onEscolher: (c: Competencia) => void }) {
  const [busca, setBusca] = useState("");
  const [sugestoes, setSugestoes] = useState<Competencia[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const ja = useMemo(() => new Set(jaTem), [jaTem]);

  useEffect(() => {
    if (!busca.trim()) {
      setSugestoes(null);
      return;
    }
    let ativo = true;
    setBuscando(true);
    const t = setTimeout(() => {
      buscarCompetenciasVocabulario(busca.trim())
        .then((r) => ativo && setSugestoes(r.results))
        .catch(() => ativo && setSugestoes([]))
        .finally(() => ativo && setBuscando(false));
    }, 250);
    return () => {
      ativo = false;
      clearTimeout(t);
    };
  }, [busca]);

  const livres = (sugestoes ?? []).filter((c) => !ja.has(c.id));

  return (
    <View style={{ gap: spacing.sm }}>
      <Campo
        rotulo="Adicionar competência"
        value={busca}
        onChangeText={setBusca}
        placeholder="Ex.: React, SQL, Comunicação"
        autoCapitalize="none"
        autoCorrect={false}
        ajuda="Só entram competências do vocabulário: é assim que a análise as reconhece nos currículos."
      />
      {!!busca.trim() && (
        <View style={styles.chips}>
          {buscando && !sugestoes ? (
            <ActivityIndicator color={colors.primary} />
          ) : livres.length ? (
            livres.map((c) => (
              <Chip
                key={c.id}
                texto={c.nome}
                icone="mais"
                onPress={() => {
                  onEscolher(c);
                  setBusca("");
                }}
              />
            ))
          ) : (
            <Text style={styles.secaoTexto}>
              Nada no vocabulário com “{busca.trim()}”. Peça à administração para incluir.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  acoes: { flexDirection: "row", gap: spacing.smd },
  aviso: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: colors.successSoft, borderRadius: radius.md, padding: spacing.smd },
  avisoTexto: { flex: 1, ...font.small, color: colors.successText, fontWeight: "600" },
  avisoRevisao: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: spacing.smd },
  avisoRevisaoTexto: { flex: 1, ...font.small, color: colors.warningText, fontWeight: "600" },
  empresaFixa: { ...font.body, fontWeight: "700" },
  secao: { gap: spacing.smd, paddingTop: spacing.sm },
  secaoTitulo: { ...font.h2 },
  secaoTexto: { ...font.small },
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  multilinha: { minHeight: 110, paddingTop: spacing.smd, textAlignVertical: "top" },
  linha: { flexDirection: "row", gap: spacing.smd },
  erro: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: spacing.smd },
  erroTexto: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 20 },
  req: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48 },
  reqBorda: { backgroundColor: colors.surface, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.border, paddingLeft: spacing.md },
  reqTitulo: { flex: 1, ...font.body, fontWeight: "600" },
  tipoReq: { borderRadius: radius.pill, paddingHorizontal: 12, minHeight: 32, justifyContent: "center" },
  obrig: { backgroundColor: colors.text },
  desej: { backgroundColor: colors.neutralSoft },
  tipoTexto: { fontSize: 12, fontWeight: "800" },
  remover: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  idioma: { gap: spacing.sm, paddingVertical: spacing.sm },
  nivelRotulo: { ...font.label },
});
