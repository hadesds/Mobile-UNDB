import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { buscarResumo } from "../../api/admin";
import { Distribuicao } from "../../components/gestao/Distribuicao";
import { Grupo, Linha, Valor } from "../../components/gestao/Lista";
import { CabecalhoTela } from "../../components/Layout/CabecalhoTela";
import { Carregando } from "../../components/Layout/Carregando";
import { Surgir } from "../../components/Movimento/Surgir";
import { Cartao, Icone } from "../../components/Ui";
import { colors, font, radius, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { AdminTabsParams } from "../../lib/navigation";
import { ROTULO_STATUS_GESTOR } from "../../utils/compatibilidade";

type Props = BottomTabScreenProps<AdminTabsParams, "VisaoGeral">;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export default function VisaoGeral({ navigation }: Props) {
  const { dados: r, erro, carregando, recarregar } = useRecurso(buscarResumo, []);
  if (!r) return <Carregando erro={erro} onTentarDeNovo={recarregar} />;

  const pedido = Date.now();
  const irUsuarios = (filtro: "aluno" | "gestor" | "admin" | "inativos") =>
    navigation.navigate("Usuarios", { filtro, pedido });
  const irCadastros = (secao: "empresas" | "competencias" | "cursos", filtro?: "atencao") =>
    navigation.navigate("Cadastros", { secao, filtro, pedido });

  const convenios = r.empresas.convenio_vencido + r.empresas.convenio_a_vencer;
  const pendencias = [
    convenios > 0 && {
      chave: "conv",
      titulo: `${plural(convenios, "convênio precisa", "convênios precisam")} de atenção`,
      texto: [
        r.empresas.convenio_vencido && plural(r.empresas.convenio_vencido, "vencido", "vencidos"),
        r.empresas.convenio_a_vencer && plural(r.empresas.convenio_a_vencer, "a vencer", "a vencer"),
      ]
        .filter(Boolean)
        .join(" · "),
      onPress: () => irCadastros("empresas", "atencao"),
    },
    r.usuarios.inativos > 0 && {
      chave: "inat",
      titulo: `${plural(r.usuarios.inativos, "conta está", "contas estão")} sem acesso`,
      texto: "Revise se continuam desativadas de propósito.",
      onPress: () => irUsuarios("inativos"),
    },
  ].filter(Boolean) as { chave: string; titulo: string; texto: string; onPress: () => void }[];

  const totalCand = Object.values(r.candidaturas).reduce((a, b) => a + b, 0);
  const totalAlunos = r.lgpd.com_termo + r.lgpd.sem_termo;

  return (
    <ScrollView
      style={styles.raiz}
      contentContainerStyle={styles.conteudo}
      refreshControl={
        <RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <CabecalhoTela titulo="Visão geral" subtitulo="Como o Currículo Sob Medida está hoje." />

      <View style={styles.corpo}>
        {pendencias.length > 0 && (
          <Surgir style={{ gap: spacing.sm }}>
            {pendencias.map((p) => (
              <Cartao key={p.chave} onPress={p.onPress} rotuloAcessivel={`${p.titulo}. ${p.texto}. Abrir`} style={styles.pendencia}>
                <View style={styles.pendenciaIcone}>
                  <Icone nome="alerta" tamanho={18} cor={colors.warning} espessura={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendenciaTitulo}>{p.titulo}</Text>
                  <Text style={styles.pendenciaTexto}>{p.texto}</Text>
                </View>
                <Icone nome="direita" tamanho={18} cor={colors.warning} />
              </Cartao>
            ))}
          </Surgir>
        )}

        <Surgir indice={1}>
          <Grupo titulo="Pessoas">
            <Linha primeira titulo="Alunos" inicio={<Icone nome="formacao" cor={colors.muted} />} fim={<Valor n={r.usuarios.alunos} />} onPress={() => irUsuarios("aluno")} />
            <Linha titulo="Gestores do TEIA" inicio={<Icone nome="usuarios" cor={colors.muted} />} fim={<Valor n={r.usuarios.gestores} />} onPress={() => irUsuarios("gestor")} />
            <Linha titulo="Administradores" inicio={<Icone nome="escudo" cor={colors.muted} />} fim={<Valor n={r.usuarios.admins} />} onPress={() => irUsuarios("admin")} />
          </Grupo>
        </Surgir>

        <Surgir indice={2}>
          <Grupo titulo="Candidaturas">
            <View style={styles.bloco}>
              <Text style={styles.total}>
                {totalCand} <Text style={styles.totalRotulo}>no total</Text>
              </Text>
              <Distribuicao
                rotuloAcessivel="Candidaturas por etapa"
                fatias={[
                  { rotulo: ROTULO_STATUS_GESTOR.analisada, valor: r.candidaturas.analisada, cor: colors.borderStrong },
                  { rotulo: ROTULO_STATUS_GESTOR.encaminhada, valor: r.candidaturas.encaminhada, cor: colors.primary },
                  { rotulo: ROTULO_STATUS_GESTOR.em_processo, valor: r.candidaturas.em_processo, cor: colors.text },
                  { rotulo: ROTULO_STATUS_GESTOR.nao_selecionada, valor: r.candidaturas.nao_selecionada, cor: colors.subtle },
                ]}
              />
            </View>
          </Grupo>
        </Surgir>

        <Surgir indice={3}>
          <Grupo titulo="Consentimento LGPD dos alunos">
            <View style={styles.bloco}>
              <Distribuicao
                rotuloAcessivel="Consentimento LGPD"
                fatias={[
                  { rotulo: "Termo vigente aceito", valor: r.lgpd.com_termo, cor: colors.success },
                  { rotulo: "Pendente ou revogado", valor: r.lgpd.sem_termo, cor: colors.borderStrong },
                ]}
              />
              {totalAlunos > 0 && r.lgpd.sem_termo > 0 && (
                <Text style={styles.nota}>
                  Sem o termo, o currículo do aluno não é analisado nem mostrado aos gestores.
                </Text>
              )}
            </View>
          </Grupo>
        </Surgir>

        <Surgir indice={4}>
          <Grupo titulo="Vagas">
            <Linha primeira titulo="Abertas e no prazo" fim={<Valor n={r.vagas.abertas} tom={r.vagas.abertas ? "sucesso" : undefined} />} />
            <Linha titulo="Rascunhos" fim={<Valor n={r.vagas.rascunhos} />} />
            <Linha titulo="Encerradas" fim={<Valor n={r.vagas.encerradas} />} />
          </Grupo>
        </Surgir>

        <Surgir indice={5}>
          <Grupo titulo="Cadastros">
            <Linha primeira titulo="Empresas ativas" inicio={<Icone nome="empresa" cor={colors.muted} />} fim={<Valor n={r.empresas.ativas} />} onPress={() => irCadastros("empresas")} />
            <Linha titulo="Competências no vocabulário" inicio={<Icone nome="competencia" cor={colors.muted} />} fim={<Valor n={r.catalogo.competencias} />} onPress={() => irCadastros("competencias")} />
            <Linha titulo="Cursos ativos" inicio={<Icone nome="curso" cor={colors.muted} />} fim={<Valor n={r.catalogo.cursos} />} onPress={() => irCadastros("cursos")} />
          </Grupo>
        </Surgir>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  conteudo: { paddingBottom: spacing.xl },
  corpo: { paddingHorizontal: spacing.md, gap: spacing.lg, paddingTop: spacing.sm },
  pendencia: { flexDirection: "row", alignItems: "center", gap: spacing.smd, backgroundColor: colors.warningSoft, borderColor: colors.warningBorder },
  pendenciaIcone: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  pendenciaTitulo: { ...font.h3, fontSize: 15, color: colors.warningText },
  pendenciaTexto: { ...font.small, color: colors.warningText },
  bloco: { padding: spacing.md, gap: spacing.smd },
  total: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.6, fontVariant: ["tabular-nums"] },
  totalRotulo: { fontSize: 15, fontWeight: "600", color: colors.muted, letterSpacing: 0 },
  nota: { ...font.small, borderRadius: radius.sm },
});
