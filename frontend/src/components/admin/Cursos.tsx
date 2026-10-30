import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { excluirCurso, listarCursosAdmin, salvarCurso } from "../../api/admin";
import { spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { CursoAdmin } from "../../types";
import { Alternar } from "../gestao/Alternar";
import { errosDaApi, Erros, FolhaFormulario } from "../gestao/FolhaFormulario";
import { Grupo, Linha } from "../gestao/Lista";
import { Botao, Campo, Chip, EsqueletoLista, useAviso, Vazio } from "../Ui";

type Edicao = { id?: number; nome: string; total_periodos: string; ativo: boolean };

/** Cursos da faculdade: aparecem no cadastro do aluno e como público-alvo das vagas. */
export function Cursos() {
  const avisar = useAviso();
  const { dados, carregando, erro, recarregar } = useRecurso(listarCursosAdmin, []);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erros, setErros] = useState<Erros>({});
  const [ocupado, setOcupado] = useState(false);

  const ativos = (dados ?? []).filter((c) => c.ativo);
  const inativos = (dados ?? []).filter((c) => !c.ativo);

  function abrir(c?: CursoAdmin) {
    setErros({});
    setEdicao(c ? { id: c.id, nome: c.nome, total_periodos: String(c.total_periodos), ativo: c.ativo } : { nome: "", total_periodos: "10", ativo: true });
  }

  async function salvar() {
    if (!edicao) return;
    const e: Erros = {};
    const periodos = Number(edicao.total_periodos);
    if (!edicao.nome.trim()) e.nome = "Informe o nome do curso.";
    if (!Number.isInteger(periodos) || periodos < 1 || periodos > 20) e.total_periodos = "Informe entre 1 e 20.";
    setErros(e);
    if (Object.keys(e).length) return;
    setOcupado(true);
    try {
      await salvarCurso({ nome: edicao.nome.trim(), total_periodos: periodos, ativo: edicao.ativo }, edicao.id);
      avisar(edicao.id ? "Curso atualizado" : "Curso cadastrado");
      setEdicao(null);
      recarregar();
    } catch (err) {
      setErros(errosDaApi(err));
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    if (!edicao?.id) return;
    setOcupado(true);
    try {
      await excluirCurso(edicao.id);
      avisar("Curso excluído");
      setEdicao(null);
      recarregar();
    } catch (err) {
      setErros(errosDaApi(err, "Não foi possível excluir."));
    } finally {
      setOcupado(false);
    }
  }

  const linhas = (lista: CursoAdmin[]) =>
    lista.map((c, i) => (
      <Linha
        key={c.id}
        primeira={i === 0}
        apagada={!c.ativo}
        titulo={c.nome}
        subtitulo={`${c.total_periodos} períodos · ${c.alunos} aluno${c.alunos === 1 ? "" : "s"}`}
        abaixo={!c.ativo ? <Chip texto="Inativo" /> : undefined}
        onPress={() => abrir(c)}
      />
    ));

  return (
    <View style={styles.raiz}>
      <Botao titulo="Novo curso" icone="mais" variante="contorno" compacto onPress={() => abrir()} />

      {carregando && !dados ? (
        <EsqueletoLista itens={4} />
      ) : erro && !dados ? (
        <Vazio icone="alerta" titulo="Não deu para carregar" texto={erro} acao={<Botao titulo="Tentar novamente" variante="contorno" onPress={recarregar} />} />
      ) : !dados?.length ? (
        <Vazio icone="formacao" titulo="Nenhum curso cadastrado" texto="Sem cursos ativos, os alunos não conseguem criar conta." />
      ) : (
        <>
          {ativos.length > 0 && <Grupo titulo={`Ativos · ${ativos.length}`}>{linhas(ativos)}</Grupo>}
          {inativos.length > 0 && <Grupo titulo={`Inativos · ${inativos.length}`}>{linhas(inativos)}</Grupo>}
        </>
      )}

      <FolhaFormulario
        visivel={!!edicao}
        titulo={edicao?.id ? "Editar curso" : "Novo curso"}
        onFechar={() => setEdicao(null)}
        onSalvar={salvar}
        onExcluir={edicao?.id ? excluir : undefined}
        ocupado={ocupado}
        erroGeral={erros.geral ?? erros.faculdade}
      >
        {edicao && (
          <>
            <Campo rotulo="Nome" value={edicao.nome} onChangeText={(t) => setEdicao({ ...edicao, nome: t })} erro={erros.nome} />
            <Campo
              rotulo="Total de períodos"
              value={edicao.total_periodos}
              onChangeText={(t) => setEdicao({ ...edicao, total_periodos: t.replace(/\D/g, "").slice(0, 2) })}
              keyboardType="number-pad"
              erro={erros.total_periodos}
              ajuda="Limita o semestre que o aluno informa no cadastro."
            />
            <Alternar
              rotulo="Ativo"
              ajuda="Cursos inativos não aparecem no cadastro de novos alunos."
              valor={edicao.ativo}
              onAlterar={(v) => setEdicao({ ...edicao, ativo: v })}
            />
          </>
        )}
      </FolhaFormulario>
    </View>
  );
}

const styles = StyleSheet.create({ raiz: { gap: spacing.md } });
