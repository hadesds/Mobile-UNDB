import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { excluirEmpresa, listarEmpresas, salvarEmpresa } from "../../api/admin";
import { colors, font, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { ConvenioStatus, Empresa } from "../../types";
import { ROTULO_CONVENIO } from "../../utils/formatos";
import { Alternar } from "../gestao/Alternar";
import { Busca } from "../gestao/Busca";
import { errosDaApi, Erros, FolhaFormulario } from "../gestao/FolhaFormulario";
import { Grupo, Linha } from "../gestao/Lista";
import { Avatar, Botao, Campo, Chip, EsqueletoLista, Tom, useAviso, Vazio } from "../Ui";

const TOM_CONVENIO: Record<ConvenioStatus, Tom> = {
  sem_convenio: "neutro",
  ativo: "sucesso",
  a_vencer: "alerta",
  vencido: "perigo",
};

type Filtro = "todas" | "atencao" | "inativas";

const vazia = (): Partial<Empresa> => ({
  nome: "",
  nome_fantasia: "",
  contato_nome: "",
  contato_email: "",
  contato_telefone: "",
  convenio_status: "sem_convenio",
  ativa: true,
});

/** Cadastro de empresas parceiras: busca, filtros, criar, editar, desativar e excluir. */
export function Empresas({ filtroInicial }: { filtroInicial?: Filtro }) {
  const avisar = useAviso();
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial ?? "todas");
  const [edicao, setEdicao] = useState<Partial<Empresa> | null>(null);
  const [erros, setErros] = useState<Erros>({});
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (filtroInicial) setFiltro(filtroInicial);
  }, [filtroInicial]);
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const { dados, carregando, erro, recarregar } = useRecurso(
    () => listarEmpresas({ q, ativa: filtro === "inativas" ? "false" : filtro === "atencao" ? "true" : undefined }),
    [q, filtro],
  );

  const lista = (dados?.results ?? []).filter(
    (e) => filtro !== "atencao" || e.convenio_status === "a_vencer" || e.convenio_status === "vencido",
  );

  const muda = (campo: keyof Empresa) => (v: string | boolean) => setEdicao((e) => (e ? { ...e, [campo]: v } : e));

  async function salvar() {
    if (!edicao) return;
    if (!edicao.nome?.trim()) {
      setErros({ nome: "Informe a razão social ou o nome." });
      return;
    }
    setOcupado(true);
    try {
      await salvarEmpresa({ ...edicao, nome: edicao.nome.trim() }, edicao.id);
      avisar(edicao.id ? "Empresa atualizada" : "Empresa cadastrada");
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
      await excluirEmpresa(edicao.id);
      avisar("Empresa excluída");
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
          <Busca valor={busca} onAlterar={setBusca} placeholder="Buscar empresa" />
        </View>
        <Botao
          titulo="Nova"
          icone="mais"
          compacto
          onPress={() => {
            setErros({});
            setEdicao(vazia());
          }}
          rotuloAcessivel="Cadastrar empresa"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        <Chip texto="Todas" selecionado={filtro === "todas"} onPress={() => setFiltro("todas")} />
        <Chip texto="Convênio a vencer ou vencido" selecionado={filtro === "atencao"} onPress={() => setFiltro("atencao")} />
        <Chip texto="Inativas" selecionado={filtro === "inativas"} onPress={() => setFiltro("inativas")} />
      </ScrollView>

      {carregando && !dados ? (
        <EsqueletoLista itens={3} />
      ) : erro && !dados ? (
        <Vazio icone="alerta" titulo="Não deu para carregar" texto={erro} acao={<Botao titulo="Tentar novamente" variante="contorno" onPress={recarregar} />} />
      ) : lista.length === 0 ? (
        <Vazio
          icone="empresa"
          titulo={q || filtro !== "todas" ? "Nenhuma empresa encontrada" : "Nenhuma empresa cadastrada"}
          texto={
            q || filtro !== "todas"
              ? "Tente outro nome ou troque o filtro."
              : "Cadastre as empresas parceiras para que os gestores possam publicar vagas delas."
          }
        />
      ) : (
        <Grupo titulo={`${lista.length} empresa${lista.length === 1 ? "" : "s"}`}>
          {lista.map((e, i) => (
            <Linha
              key={e.id}
              primeira={i === 0}
              apagada={!e.ativa}
              inicio={<Avatar nome={e.nome_fantasia || e.nome} tamanho={40} />}
              titulo={e.nome_fantasia || e.nome}
              subtitulo={[e.nome_fantasia ? e.nome : null, e.contato_nome || e.contato_email].filter(Boolean).join(" · ") || undefined}
              abaixo={
                !e.ativa ? (
                  <Chip texto="Inativa" />
                ) : e.convenio_status !== "ativo" ? (
                  <Chip texto={ROTULO_CONVENIO[e.convenio_status]} tom={TOM_CONVENIO[e.convenio_status]} />
                ) : undefined
              }
              onPress={() => {
                setErros({});
                setEdicao(e);
              }}
              rotuloAcessivel={`${e.nome_fantasia || e.nome}. ${ROTULO_CONVENIO[e.convenio_status]}${e.ativa ? "" : ". Inativa"}. Editar`}
            />
          ))}
        </Grupo>
      )}

      <FolhaFormulario
        visivel={!!edicao}
        titulo={edicao?.id ? "Editar empresa" : "Nova empresa"}
        subtitulo={edicao?.id ? undefined : "Empresas não têm login: o TEIA intermedeia o contato."}
        onFechar={() => setEdicao(null)}
        onSalvar={salvar}
        onExcluir={edicao?.id ? excluir : undefined}
        ocupado={ocupado}
        erroGeral={erros.geral}
      >
        {edicao && (
          <>
            <Campo rotulo="Razão social ou nome" value={edicao.nome} onChangeText={muda("nome")} erro={erros.nome} autoCapitalize="words" />
            <Campo
              rotulo="Nome fantasia"
              value={edicao.nome_fantasia}
              onChangeText={muda("nome_fantasia")}
              ajuda="É o nome que os alunos veem nas vagas."
              erro={erros.nome_fantasia}
            />
            <View style={{ gap: spacing.sm }}>
              <Text style={styles.rotulo}>Convênio</Text>
              <View style={styles.chips}>
                {(Object.keys(ROTULO_CONVENIO) as ConvenioStatus[]).map((c) => (
                  <Chip key={c} texto={ROTULO_CONVENIO[c]} selecionado={edicao.convenio_status === c} onPress={() => muda("convenio_status")(c)} />
                ))}
              </View>
            </View>
            <Text style={styles.secao}>Contato na empresa</Text>
            <Campo rotulo="Nome do contato" value={edicao.contato_nome} onChangeText={muda("contato_nome")} autoCapitalize="words" />
            <Campo
              rotulo="E-mail"
              value={edicao.contato_email}
              onChangeText={muda("contato_email")}
              keyboardType="email-address"
              autoCapitalize="none"
              erro={erros.contato_email}
            />
            <Campo rotulo="Telefone" value={edicao.contato_telefone} onChangeText={muda("contato_telefone")} keyboardType="phone-pad" />
            <Alternar
              rotulo="Empresa ativa"
              ajuda="Inativas não aparecem para novas vagas. Use em vez de excluir quando já houver vagas."
              valor={!!edicao.ativa}
              onAlterar={muda("ativa")}
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingRight: spacing.md },
  filtros: { gap: spacing.sm, paddingRight: spacing.md },
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text },
  secao: { ...font.h3, marginTop: spacing.sm },
});
