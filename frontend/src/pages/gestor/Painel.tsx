import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { buscarPainel } from "../../api/gestor";
import { FaixaEvidencia, resumoEvidencia } from "../../components/gestao/FaixaEvidencia";
import { Grupo, Linha } from "../../components/gestao/Lista";
import { CabecalhoTela } from "../../components/Layout/CabecalhoTela";
import { Carregando } from "../../components/Layout/Carregando";
import { Surgir } from "../../components/Movimento/Surgir";
import { Avatar, Botao, Chip, Icone, Vazio } from "../../components/Ui";
import { colors, font, radius, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import { useAuth } from "../../lib/auth";
import type { GestorStackParams } from "../../lib/navigation";
import { ROTULO_STATUS_GESTOR, TOM_STATUS } from "../../utils/compatibilidade";
import { formatarDiaMes, rotuloPrazo, tempoRelativo } from "../../utils/formatos";

type Props = NativeStackScreenProps<GestorStackParams, "PainelInicio">;

export default function Painel({ navigation }: Props) {
  const { usuario } = useAuth();
  const { dados: p, erro, carregando, recarregar } = useRecurso(buscarPainel, []);
  useEffect(() => navigation.addListener("focus", recarregar), [navigation, recarregar]);

  if (!p) return <Carregando erro={erro} onTentarDeNovo={recarregar} />;

  const nome = usuario?.nome.split(" ")[0];
  const abrirVaga = (id: number) => navigation.navigate("VagaGestor", { id });
  const nVagasFila = p.fila.length;

  return (
    <ScrollView
      style={styles.raiz}
      contentContainerStyle={styles.conteudo}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <CabecalhoTela
        titulo={`Olá, ${nome}`}
        subtitulo={usuario?.gestor?.nucleo.nome ? `Núcleo ${usuario.gestor.nucleo.nome}` : undefined}
        acao={<Botao titulo="Vaga" icone="mais" compacto onPress={() => navigation.navigate("EditarVaga", {})} rotuloAcessivel="Nova vaga" />}
      />

      <View style={styles.corpo}>
        <Surgir style={styles.resumo}>
          {p.aguardando > 0 ? (
            <Text style={styles.resumoTexto} accessibilityRole="summary">
              <Text style={styles.resumoNumero}>{p.aguardando}</Text>{" "}
              {p.aguardando === 1 ? "candidatura espera" : "candidaturas esperam"} sua decisão em {nVagasFila}{" "}
              {nVagasFila === 1 ? "vaga" : "vagas"}.
              {p.aguardando_desde ? ` A mais antiga chegou ${tempoRelativo(p.aguardando_desde)}.` : ""}
            </Text>
          ) : (
            <Text style={styles.resumoTexto}>Nenhuma candidatura esperando decisão. Bom momento para revisar as vagas.</Text>
          )}
          <View style={styles.numeros}>
            <Numero n={p.vagas_abertas} rotulo={p.vagas_abertas === 1 ? "vaga aberta" : "vagas abertas"} />
            <Numero n={p.encaminhadas_30d} rotulo={`${p.encaminhadas_30d === 1 ? "encaminhada" : "encaminhadas"} em 30 dias`} />
            {p.rascunhos > 0 && (
              <Numero
                n={p.rascunhos}
                rotulo={p.rascunhos === 1 ? "rascunho" : "rascunhos"}
                onPress={() => navigation.navigate("VagasGestorLista", { status: "rascunho", pedido: Date.now() })}
              />
            )}
          </View>
        </Surgir>

        {p.vencendo.length > 0 && (
          <Surgir indice={1}>
            <Grupo titulo="Encerram em até 7 dias">
              {p.vencendo.map((v, i) => {
                const prazo = rotuloPrazo(v.prazo);
                return (
                  <Linha
                    key={v.id}
                    primeira={i === 0}
                    inicio={<Icone nome="calendario" cor={colors.warning} />}
                    titulo={v.titulo}
                    subtitulo={`${v.empresa} · ${prazo.texto}`}
                    abaixo={v.aguardando > 0 ? <Chip texto={`${v.aguardando} sem decisão`} tom="alerta" /> : undefined}
                    onPress={() => abrirVaga(v.id)}
                  />
                );
              })}
            </Grupo>
          </Surgir>
        )}

        <Surgir indice={2}>
          {p.fila.length > 0 ? (
            <Grupo titulo="Aguardando decisão, por vaga">
              {p.fila.map((v, i) => {
                const prazo = rotuloPrazo(v.prazo);
                return (
                  <Linha
                    key={v.id}
                    primeira={i === 0}
                    inicio={<Avatar nome={v.empresa} tamanho={40} />}
                    titulo={v.titulo}
                    subtitulo={`${v.empresa}${v.prazo && !prazo.urgente ? ` · até ${formatarDiaMes(v.prazo)}` : ""}`}
                    abaixo={prazo.urgente ? <Chip texto={prazo.texto} tom="alerta" /> : undefined}
                    fim={
                      <View style={styles.fila}>
                        <Text style={styles.filaNumero}>{v.aguardando}</Text>
                        <Text style={styles.filaRotulo}>aguardando{"\n"}de {v.total}</Text>
                      </View>
                    }
                    onPress={() => abrirVaga(v.id)}
                    rotuloAcessivel={`${v.titulo}, ${v.empresa}: ${v.aguardando} aguardando decisão de ${v.total}${prazo.urgente ? `. ${prazo.texto}` : ""}. Abrir ranking`}
                  />
                );
              })}
            </Grupo>
          ) : (
            p.vagas_abertas === 0 && (
              <Vazio
                icone="vagas"
                titulo="Nenhuma vaga aberta"
                texto="Publique uma vaga com requisitos: as candidaturas chegam aqui já ordenadas por compatibilidade."
                acao={<Botao titulo="Nova vaga" icone="mais" onPress={() => navigation.navigate("EditarVaga", {})} />}
              />
            )
          )}
        </Surgir>

        {p.recentes.length > 0 && (
          <Surgir indice={3}>
            <Grupo titulo="Candidaturas recentes">
              {p.recentes.map((c, i) => (
                <Linha
                  key={c.id}
                  primeira={i === 0}
                  inicio={<Avatar nome={c.aluno} tamanho={40} redondo />}
                  titulo={c.aluno}
                  subtitulo={`${c.vaga.titulo} · ${tempoRelativo(c.criada_em)}`}
                  abaixo={c.requisitos.length ? <FaixaEvidencia requisitos={c.requisitos} itens={c.itens} compacta /> : undefined}
                  fim={
                    c.status !== "analisada" ? (
                      <Chip texto={ROTULO_STATUS_GESTOR[c.status]} tom={TOM_STATUS[c.status]} />
                    ) : c.score !== null ? (
                      <Text style={styles.score}>
                        {c.score}
                        <Text style={styles.sinal}>%</Text>
                      </Text>
                    ) : undefined
                  }
                  onPress={() => navigation.navigate("Candidato", { id: c.id })}
                  rotuloAcessivel={`${c.aluno}, ${c.vaga.titulo}, ${c.status === "analisada" ? `${c.score ?? "sem"}% de compatibilidade` : ROTULO_STATUS_GESTOR[c.status]}. ${resumoEvidencia(c.requisitos, c.itens)}. Abrir candidato`}
                />
              ))}
            </Grupo>
          </Surgir>
        )}
      </View>
    </ScrollView>
  );
}

function Numero({ n, rotulo, onPress }: { n: number; rotulo: string; onPress?: () => void }) {
  return (
    <Text
      style={styles.numero}
      onPress={onPress}
      accessibilityRole={onPress ? "link" : "text"}
      suppressHighlighting
    >
      <Text style={styles.numeroValor}>{n}</Text> {rotulo}
      {onPress ? <Text style={styles.numeroLink}> ›</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  conteudo: { paddingBottom: spacing.xl },
  corpo: { paddingHorizontal: spacing.md, gap: spacing.lg, paddingTop: spacing.xs },
  resumo: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.smd,
  },
  resumoTexto: { ...font.body, fontSize: 17, lineHeight: 24, color: colors.text },
  resumoNumero: { fontSize: 22, fontWeight: "800", color: colors.primaryDark, fontVariant: ["tabular-nums"] },
  numeros: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md, rowGap: spacing.xs },
  numero: { ...font.small, color: colors.primaryDark, minHeight: 24 },
  numeroValor: { fontWeight: "800", fontVariant: ["tabular-nums"] },
  numeroLink: { fontWeight: "800" },
  fila: { alignItems: "flex-end" },
  filaNumero: { fontSize: 20, fontWeight: "800", color: colors.primaryDark, fontVariant: ["tabular-nums"] },
  filaRotulo: { ...font.tiny, textAlign: "right" },
  score: { fontSize: 18, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  sinal: { fontSize: 12, fontWeight: "700", color: colors.muted },
});
