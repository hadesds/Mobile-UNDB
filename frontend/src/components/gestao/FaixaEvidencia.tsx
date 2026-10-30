import { StyleSheet, Text, View } from "react-native";

import { colors, font, spacing } from "../../constants/theme";
import type { ItemAnalise, RequisitoOrdem, StatusRequisito } from "../../types";

type Estado = StatusRequisito | "sem_analise";

const PONTO: Record<Estado, { fundo: string; borda: string; texto: string; rotulo: string }> = {
  encontrado: { fundo: colors.success, borda: colors.success, texto: "#FFFFFF", rotulo: "com evidência" },
  diferente: { fundo: colors.warningSoft, borda: colors.warning, texto: colors.warning, rotulo: "diferente do pedido" },
  nao_identificado: { fundo: colors.surface, borda: colors.borderStrong, texto: colors.subtle, rotulo: "não identificado" },
  sem_analise: { fundo: colors.neutralSoft, borda: colors.neutralSoft, texto: colors.subtle, rotulo: "fora da análise" },
};

/** Ponto numerado de um requisito; obrigatórios ganham um anel escuro. */
export function Ponto({ n, estado, obrigatorio, tamanho = 24 }: { n?: number; estado: Estado; obrigatorio: boolean; tamanho?: number }) {
  const p = PONTO[estado];
  return (
    <View style={[styles.anel, { width: tamanho + 6, height: tamanho + 6, borderRadius: (tamanho + 6) / 2 }, obrigatorio && styles.anelObrig]}>
      <View
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: p.fundo,
          borderWidth: 2,
          borderColor: p.borda,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {n !== undefined && <Text style={[styles.numero, { color: p.texto, fontSize: tamanho * 0.46 }]}>{n}</Text>}
      </View>
    </View>
  );
}

/** Estado de cada requisito da vaga para um candidato, na ordem da vaga. */
export function estados(requisitos: RequisitoOrdem[], itens: ItemAnalise[] | undefined): Estado[] {
  const porNome = new Map((itens ?? []).map((i) => [i.requisito, i.status]));
  return requisitos.map((r) => porNome.get(r.requisito) ?? "sem_analise");
}

/** Resumo em texto da faixa, para leitores de tela (a faixa em si é só visual). */
export function resumoEvidencia(requisitos: RequisitoOrdem[], itens: ItemAnalise[] | undefined): string {
  const e = estados(requisitos, itens);
  return requisitos
    .map((r, i) => `${r.requisito}${r.obrigatorio ? "" : " (desejável)"}: ${PONTO[e[i]!].rotulo}`)
    .join("; ");
}

/**
 * A faixa: um ponto por requisito, sempre na mesma ordem, para ler a vaga de cima a baixo.
 * Quem a contém anuncia o resumo (`resumoEvidencia`) no próprio rótulo acessível.
 * `compacta` tira os números para caber em listas (painel).
 */
export function FaixaEvidencia({
  requisitos,
  itens,
  compacta,
}: {
  requisitos: RequisitoOrdem[];
  itens: ItemAnalise[] | undefined;
  compacta?: boolean;
}) {
  const e = estados(requisitos, itens);
  return (
    <View style={styles.faixa} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {requisitos.map((r, i) => (
        <Ponto key={r.requisito} n={compacta ? undefined : i + 1} estado={e[i]!} obrigatorio={r.obrigatorio} tamanho={compacta ? 12 : 24} />
      ))}
    </View>
  );
}

/** Legenda dos estados (aparece uma vez, acima do ranking). */
export function LegendaEstados({ comForaDaAnalise }: { comForaDaAnalise?: boolean }) {
  const itens: [Estado, string][] = [
    ["encontrado", "Com evidência"],
    ["diferente", "Diferente"],
    ["nao_identificado", "Não identificado"],
    ...(comForaDaAnalise ? ([["sem_analise", "Fora da análise"]] as [Estado, string][]) : []),
  ];
  return (
    <View style={styles.legenda} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {itens.map(([estado, rotulo]) => (
        <View key={estado} style={styles.legendaItem}>
          <Ponto estado={estado} obrigatorio={false} tamanho={12} />
          <Text style={styles.legendaTexto}>{rotulo}</Text>
        </View>
      ))}
      <View style={styles.legendaItem}>
        <Ponto estado="nao_identificado" obrigatorio tamanho={12} />
        <Text style={styles.legendaTexto}>Anel = obrigatório</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  anel: { alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
  anelObrig: { borderColor: colors.text },
  numero: { fontWeight: "800", fontVariant: ["tabular-nums"] },
  legenda: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md, rowGap: spacing.xs },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendaTexto: { ...font.tiny },
});
