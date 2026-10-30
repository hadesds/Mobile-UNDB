import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "../../constants/theme";
import { useReduzirMovimento } from "../../hooks/useReduzirMovimento";
import type { Candidato, RequisitoOrdem } from "../../types";
import { detalheParaGestor, ROTULO_STATUS_GESTOR, TOM_STATUS } from "../../utils/compatibilidade";
import { animarLayout } from "../Movimento/Expansivel";
import { Botao, Chip } from "../Ui";
import { FaixaEvidencia, resumoEvidencia } from "./FaixaEvidencia";

type Props = {
  c: Candidato;
  posicao: number;
  requisitos: RequisitoOrdem[];
  mostrarEtapa: boolean;
  onAbrir: () => void;
  onDecidir: () => void;
};

/** Uma linha do ranking. O toque expande no lugar e mostra o que falta e as ações. */
export function LinhaRanking({ c, posicao, requisitos, mostrarEtapa, onAbrir, onDecidir }: Props) {
  const reduzir = useReduzirMovimento();
  const [aberta, setAberta] = useState(false);
  const score = c.analise?.score;
  const pendentes = (c.analise?.itens ?? [])
    .filter((i) => i.status !== "encontrado")
    .sort((x, y) => Number(y.obrigatorio !== false) - Number(x.obrigatorio !== false));

  return (
    <View style={[styles.cartao, aberta && styles.aberta]}>
      <Pressable
        onPress={() => {
          animarLayout(reduzir);
          setAberta((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberta }}
        accessibilityLabel={`${posicao}º, ${c.aluno.nome}, ${score ?? "sem"}% de compatibilidade${mostrarEtapa ? `, ${ROTULO_STATUS_GESTOR[c.status]}` : ""}. ${resumoEvidencia(requisitos, c.analise?.itens)}`}
        accessibilityHint={aberta ? "Recolher" : "Mostrar o que falta e as ações"}
        style={({ pressed }) => [styles.toque, pressed && { opacity: 0.75 }]}
      >
        <View style={styles.topo}>
          <Text style={styles.posicao}>{posicao}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.nome} numberOfLines={1}>
              {c.aluno.nome}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {c.aluno.curso} · {c.aluno.periodo}º sem.
            </Text>
          </View>
          <Text style={[styles.score, score === undefined && { color: colors.subtle }]}>
            {score ?? "–"}
            <Text style={styles.sinal}>%</Text>
          </Text>
        </View>
        <View style={styles.recuo}>
          <FaixaEvidencia requisitos={requisitos} itens={c.analise?.itens} />
          {mostrarEtapa && c.status !== "analisada" && (
            <View style={{ marginTop: spacing.sm }}>
              <Chip texto={ROTULO_STATUS_GESTOR[c.status]} tom={TOM_STATUS[c.status]} />
            </View>
          )}
        </View>
      </Pressable>

      {aberta && (
        <View style={[styles.recuo, styles.detalhe]}>
          {pendentes.length ? (
            pendentes.map((i) => (
              <Text key={i.requisito} style={styles.pendente}>
                <Text style={styles.pendenteNome}>
                  {i.requisito}
                  {i.obrigatorio === false ? " (desejável)" : ""}:{" "}
                </Text>
                {detalheParaGestor(i.detalhe, i.status)}
              </Text>
            ))
          ) : (
            <Text style={styles.pendente}>Todos os requisitos com evidência no currículo.</Text>
          )}
          <View style={styles.acoes}>
            <Botao titulo="Ver candidato" variante="contorno" compacto style={{ flex: 1 }} onPress={onAbrir} />
            <Botao
              titulo={c.status === "analisada" ? "Encaminhar" : "Decidir"}
              icone={c.status === "analisada" ? "enviar" : undefined}
              compacto
              style={{ flex: 1 }}
              onPress={onDecidir}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  aberta: { borderColor: colors.primary },
  toque: { padding: spacing.md, paddingBottom: spacing.smd, gap: spacing.smd },
  topo: { flexDirection: "row", alignItems: "center", gap: spacing.smd },
  posicao: { width: 24, fontSize: 14, fontWeight: "800", color: colors.subtle, fontVariant: ["tabular-nums"] },
  nome: { ...font.h3 },
  meta: { ...font.small },
  score: { fontSize: 24, fontWeight: "800", letterSpacing: -0.6, color: colors.text, fontVariant: ["tabular-nums"] },
  sinal: { fontSize: 14, fontWeight: "700", color: colors.muted },
  recuo: { marginLeft: 24 + spacing.smd },
  detalhe: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginRight: spacing.md,
    paddingTop: spacing.smd,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  pendente: { ...font.small, color: colors.muted, lineHeight: 19 },
  pendenteNome: { fontWeight: "700", color: colors.text },
  acoes: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
