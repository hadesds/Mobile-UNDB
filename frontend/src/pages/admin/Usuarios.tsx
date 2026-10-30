import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { atualizarUsuario, criarGestor, listarNucleos, listarUsuarios } from "../../api/admin";
import { Alternar } from "../../components/gestao/Alternar";
import { Busca } from "../../components/gestao/Busca";
import { errosDaApi, Erros, FolhaFormulario } from "../../components/gestao/FolhaFormulario";
import { Grupo, Linha } from "../../components/gestao/Lista";
import { Seletor } from "../../components/gestao/Seletor";
import { CabecalhoTela } from "../../components/Layout/CabecalhoTela";
import { Avatar, Botao, Campo, Chip, EsqueletoLista, Icone, useAviso, Vazio } from "../../components/Ui";
import { colors, font, radius, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import { useAuth } from "../../lib/auth";
import type { AdminTabsParams } from "../../lib/navigation";
import type { Nucleo, UsuarioAdmin } from "../../types";
import { formatarDataHora, ROTULO_PERFIL, tempoRelativo } from "../../utils/formatos";

type Props = BottomTabScreenProps<AdminTabsParams, "Usuarios">;
export type FiltroUsuarios = "todos" | "aluno" | "gestor" | "admin" | "inativos";

const FILTROS: { valor: FiltroUsuarios; rotulo: string }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "aluno", rotulo: "Alunos" },
  { valor: "gestor", rotulo: "Gestores" },
  { valor: "admin", rotulo: "Admins" },
  { valor: "inativos", rotulo: "Sem acesso" },
];

function subtitulo(u: UsuarioAdmin) {
  const d = u.detalhe;
  if (d && "matricula" in d) return `${d.curso} · ${d.periodo}º sem. · ${d.matricula}`;
  if (d && "nucleo" in d) return [d.cargo || "Gestor(a)", d.nucleo].join(" · ");
  return u.email;
}

type NovoGestor = { nome: string; email: string; password: string; cargo: string; nucleo: number | null };

export default function Usuarios({ route }: Props) {
  const { usuario: eu } = useAuth();
  const avisar = useAviso();
  const [filtro, setFiltro] = useState<FiltroUsuarios>(route.params?.filtro ?? "todos");
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState<UsuarioAdmin | null>(null);
  const [cargo, setCargo] = useState("");
  const [novo, setNovo] = useState<NovoGestor | null>(null);
  const [nucleos, setNucleos] = useState<Nucleo[]>([]);
  const [erros, setErros] = useState<Erros>({});
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (route.params?.filtro) setFiltro(route.params.filtro);
  }, [route.params?.filtro, route.params?.pedido]);
  useEffect(() => {
    const t = setTimeout(() => setQ(busca.trim()), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const { dados, carregando, erro, recarregar } = useRecurso(
    () =>
      listarUsuarios({
        q,
        perfil: filtro === "todos" || filtro === "inativos" ? undefined : filtro,
        ativo: filtro === "inativos" ? "false" : undefined,
      }),
    [q, filtro],
  );
  const lista = dados?.results ?? [];

  function abrir(u: UsuarioAdmin) {
    setErros({});
    setCargo(u.detalhe && "cargo" in u.detalhe ? u.detalhe.cargo : "");
    setAberto(u);
  }

  async function abrirNovo() {
    setErros({});
    setNovo({ nome: "", email: "", password: "", cargo: "", nucleo: null });
    try {
      const n = await listarNucleos();
      setNucleos(n);
      if (n.length === 1) setNovo((x) => (x ? { ...x, nucleo: n[0]!.id } : x));
    } catch {
      setErros({ geral: "Não foi possível carregar os núcleos." });
    }
  }

  async function salvarConta(ativo?: boolean) {
    if (!aberto) return;
    setOcupado(true);
    try {
      const gestor = aberto.perfil === "gestor";
      const atualizado = await atualizarUsuario(aberto.id, {
        ...(ativo === undefined ? {} : { ativo }),
        ...(gestor ? { cargo } : {}),
      });
      avisar(ativo === undefined ? "Conta atualizada" : ativo ? "Acesso reativado" : "Acesso desativado");
      setAberto(ativo === undefined ? null : atualizado);
      recarregar();
    } catch (e) {
      setErros(errosDaApi(e));
    } finally {
      setOcupado(false);
    }
  }

  async function salvarNovo() {
    if (!novo) return;
    const e: Erros = {};
    if (!novo.nome.trim()) e.nome = "Informe o nome.";
    if (!/^\S+@\S+\.\S+$/.test(novo.email.trim())) e.email = "Informe um e-mail válido.";
    if (novo.password.length < 8) e.password = "Use ao menos 8 caracteres.";
    if (!novo.nucleo) e.nucleo = "Escolha o núcleo.";
    setErros(e);
    if (Object.keys(e).length) return;
    setOcupado(true);
    try {
      await criarGestor({ ...novo, nome: novo.nome.trim(), email: novo.email.trim(), nucleo: novo.nucleo! });
      avisar("Conta de gestor criada");
      setNovo(null);
      setFiltro("gestor");
      recarregar();
    } catch (err) {
      setErros(errosDaApi(err));
    } finally {
      setOcupado(false);
    }
  }

  const proprio = aberto?.id === eu?.id;
  const det = aberto?.detalhe;

  return (
    <View style={styles.raiz}>
      <ScrollView
        contentContainerStyle={styles.conteudo}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={carregando && !!dados} onRefresh={recarregar} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        <CabecalhoTela
          titulo="Usuários"
          subtitulo="Contas de alunos, gestores e administração."
          acao={<Botao titulo="Gestor" icone="mais" compacto onPress={abrirNovo} rotuloAcessivel="Criar conta de gestor" />}
        >
          <Busca valor={busca} onAlterar={setBusca} placeholder="Nome, e-mail ou matrícula" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTROS.map((f) => (
              <Chip key={f.valor} texto={f.rotulo} selecionado={filtro === f.valor} onPress={() => setFiltro(f.valor)} />
            ))}
          </ScrollView>
        </CabecalhoTela>

        <View style={styles.corpo}>
          {carregando && !dados ? (
            <EsqueletoLista />
          ) : erro && !dados ? (
            <Vazio icone="alerta" titulo="Não deu para carregar" texto={erro} acao={<Botao titulo="Tentar novamente" variante="contorno" onPress={recarregar} />} />
          ) : lista.length === 0 ? (
            <Vazio
              icone="usuarios"
              titulo="Ninguém por aqui"
              texto={q ? `Nenhuma conta com “${q}”.` : filtro === "inativos" ? "Todas as contas estão com acesso liberado." : "Nenhuma conta neste filtro."}
            />
          ) : (
            <Grupo titulo={`${dados?.count ?? lista.length} conta${(dados?.count ?? 0) === 1 ? "" : "s"}`}>
              {lista.map((u, i) => (
                <Linha
                  key={u.id}
                  primeira={i === 0}
                  apagada={!u.ativo}
                  inicio={<Avatar nome={u.nome} tamanho={40} redondo />}
                  titulo={u.nome}
                  subtitulo={subtitulo(u)}
                  abaixo={
                    !u.ativo ? (
                      <Chip texto="Sem acesso" tom="perigo" />
                    ) : u.perfil !== "aluno" ? (
                      <Chip texto={ROTULO_PERFIL[u.perfil]} tom={u.perfil === "admin" ? "neutro" : "marca"} />
                    ) : undefined
                  }
                  onPress={() => abrir(u)}
                  rotuloAcessivel={`${u.nome}, ${ROTULO_PERFIL[u.perfil]}${u.ativo ? "" : ", sem acesso"}. Abrir conta`}
                />
              ))}
            </Grupo>
          )}
        </View>
      </ScrollView>

      {/* Conta existente */}
      <FolhaFormulario
        visivel={!!aberto}
        titulo={aberto?.nome ?? ""}
        subtitulo={aberto ? `${ROTULO_PERFIL[aberto.perfil]} · ${aberto.email}` : undefined}
        onFechar={() => setAberto(null)}
        onSalvar={() => (aberto?.perfil === "gestor" ? salvarConta() : setAberto(null))}
        rotuloSalvar={aberto?.perfil === "gestor" ? "Salvar" : "Fechar"}
        ocupado={ocupado}
        erroGeral={erros.geral ?? erros.ativo}
      >
        {aberto && (
          <>
            <View style={styles.dados}>
              {det && "matricula" in det && (
                <>
                  <Dado rotulo="Matrícula" valor={det.matricula} />
                  <Dado rotulo="Curso" valor={`${det.curso} · ${det.periodo}º sem.`} />
                  <Dado rotulo="Termo LGPD" valor={det.consentimento_vigente ? "Aceito" : "Pendente ou revogado"} />
                </>
              )}
              {det && "nucleo" in det && <Dado rotulo="Núcleo" valor={det.nucleo} />}
              <Dado rotulo="Conta criada" valor={formatarDataHora(aberto.date_joined)} />
              <Dado rotulo="Último acesso" valor={aberto.last_login ? tempoRelativo(aberto.last_login) : "Nunca entrou"} />
            </View>

            {aberto.perfil === "gestor" && <Campo rotulo="Cargo" value={cargo} onChangeText={setCargo} erro={erros.cargo} />}

            <View style={[styles.acesso, !aberto.ativo && styles.acessoBloqueado]}>
              <Icone nome={aberto.ativo ? "escudo" : "bloquear"} tamanho={22} cor={aberto.ativo ? colors.successText : colors.danger} />
              <View style={{ flex: 1 }}>
                <Text style={styles.acessoTitulo}>{aberto.ativo ? "Acesso liberado" : "Acesso desativado"}</Text>
                <Text style={styles.acessoTexto}>
                  {proprio
                    ? "Esta é a sua conta: você não pode desativá-la."
                    : aberto.ativo
                      ? "Desativar impede o login. Os dados e o histórico continuam guardados."
                      : "A pessoa não consegue entrar até o acesso ser reativado."}
                </Text>
              </View>
            </View>
            {!proprio && (
              <Botao
                titulo={aberto.ativo ? "Desativar acesso" : "Reativar acesso"}
                icone={aberto.ativo ? "bloquear" : "check"}
                variante={aberto.ativo ? "perigo" : "suave"}
                compacto
                desabilitado={ocupado}
                onPress={() => salvarConta(!aberto.ativo)}
              />
            )}
          </>
        )}
      </FolhaFormulario>

      {/* Nova conta de gestor */}
      <FolhaFormulario
        visivel={!!novo}
        titulo="Nova conta de gestor"
        subtitulo="Gestores não se cadastram pelo app: a conta nasce aqui."
        onFechar={() => setNovo(null)}
        onSalvar={salvarNovo}
        rotuloSalvar="Criar conta"
        ocupado={ocupado}
        erroGeral={erros.geral}
      >
        {novo && (
          <>
            <Campo rotulo="Nome completo" value={novo.nome} onChangeText={(t) => setNovo({ ...novo, nome: t })} erro={erros.nome} autoCapitalize="words" />
            <Campo
              rotulo="E-mail institucional"
              value={novo.email}
              onChangeText={(t) => setNovo({ ...novo, email: t })}
              erro={erros.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Campo
              rotulo="Senha inicial"
              value={novo.password}
              onChangeText={(t) => setNovo({ ...novo, password: t })}
              erro={erros.password}
              secureTextEntry
              ajuda="Combine a senha com a pessoa e peça para trocá-la no primeiro acesso."
            />
            <Seletor
              rotulo="Núcleo"
              opcoes={nucleos.map((n) => ({ valor: n.id, rotulo: n.nome }))}
              valor={novo.nucleo}
              onAlterar={(id) => setNovo({ ...novo, nucleo: id })}
              erro={erros.nucleo}
            />
            <Campo rotulo="Cargo (opcional)" value={novo.cargo} onChangeText={(t) => setNovo({ ...novo, cargo: t })} />
          </>
        )}
      </FolhaFormulario>
    </View>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.dado}>
      <Text style={styles.dadoRotulo}>{rotulo}</Text>
      <Text style={styles.dadoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  conteudo: { paddingBottom: spacing.xl },
  chips: { gap: spacing.sm, paddingRight: spacing.md },
  corpo: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  dados: { borderRadius: radius.md, backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing.md },
  dado: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.smd,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dadoRotulo: { ...font.body, color: colors.muted },
  dadoValor: { ...font.body, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  acesso: { flexDirection: "row", gap: spacing.smd, alignItems: "flex-start", backgroundColor: colors.successSoft, borderRadius: radius.md, padding: spacing.md },
  acessoBloqueado: { backgroundColor: colors.dangerSoft },
  acessoTitulo: { ...font.h3 },
  acessoTexto: { ...font.small, color: colors.text, marginTop: 2 },
});
