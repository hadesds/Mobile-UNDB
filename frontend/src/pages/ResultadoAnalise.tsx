import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { buscarVaga } from "../api/vagas";
import { Carregando } from "../components/Layout/Carregando";
import { Tela } from "../components/Layout/Tela";
import { Avatar, Botao, Cartao, Chip } from "../components/Ui";
import { IndicadorCompatibilidade } from "../components/vagas/IndicadorCompatibilidade";
import { LinhaRequisito } from "../components/vagas/LinhaRequisito";
import { colors, spacing } from "../constants/theme";
import { analiseSimulada } from "../data/analiseExemplo";
import { useRecurso } from "../hooks/useRecurso";
import type { VagasStackParams } from "../lib/navigation";
import type { StatusRequisito } from "../types";
import { calcular, ROTULO_FAIXA } from "../utils/compatibilidade";
import { formatarDataHora } from "../utils/formatos";

type Props = NativeStackScreenProps<VagasStackParams, "ResultadoAnalise">;

const GRUPOS: { status: StatusRequisito; titulo: string; ajuda: string }[] = [
  { status: "encontrado", titulo: "Encontramos no seu currículo", ajuda: "" },
  {
    status: "diferente",
    titulo: "Informado, mas diferente",
    ajuda: "Você informou, mas o valor não atinge o que a vaga pede (ex.: semestre ou nível de idioma).",
  },
  {
    status: "nao_identificado",
    titulo: "Não identificado",
    ajuda: "Indica ausência de registro no currículo, não ausência da competência.",
  },
];

export default function ResultadoAnalise({ route, navigation }: Props) {
  const { id } = route.params;
  const { dados: vaga, erro, recarregar } = useRecurso(() => buscarVaga(id), [id]);
  const [mostrarCalculo, setMostrarCalculo] = useState(false);

  // TODO: trocar pela análise real quando o endpoint de candidatura existir.
  const analise = useMemo(() => (vaga ? analiseSimulada(vaga) : null), [vaga]);

  if (!vaga || !analise) return <Carregando erro={erro} onTentarDeNovo={recarregar} />;

  const r = calcular(analise.itens);
  const tomFaixa = r.faixa === "alta" ? "sucesso" : r.faixa === "media" ? "alerta" : "neutro";

  return (
    <Tela
      rodape={
        <Botao
          titulo="Melhorar meu currículo"
          variante="contorno"
          onPress={() => navigation.getParent()?.navigate("Curriculo")}
        />
      }
    >
      <Pressable onPress={() => navigation.goBack()}>
        <Cartao style={styles.vaga}>
          <Avatar nome={vaga.empresa} />
          <View style={{ flex: 1 }}>
            <Text style={styles.vagaTitulo}>{vaga.titulo}</Text>
            <Text style={styles.meta}>
              {vaga.empresa} · analisado em {formatarDataHora(analise.criadaEm)}
            </Text>
          </View>
        </Cartao>
      </Pressable>

      <Cartao style={{ gap: spacing.md }}>
        <View style={styles.resumo}>
          <IndicadorCompatibilidade percentual={r.percentual} legenda={`${r.comEvidencia} de ${r.total}`} />
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Chip texto={ROTULO_FAIXA[r.faixa]} tom={tomFaixa} />
            <Text style={styles.resumoTexto}>
              {r.comEvidencia} de {r.total} requisitos com evidência no seu currículo
            </Text>
          </View>
        </View>
        <Text style={styles.explicacao}>
          Comparamos os requisitos cadastrados pela empresa com o que está registrado no seu
          currículo.{" "}
          <Text style={styles.negrito}>
            Este resultado não é aprovação nem previsão de contratação
          </Text>{" "}
          — quem avalia e decide os encaminhamentos é a equipe do TEIA.
        </Text>
        <Pressable onPress={() => setMostrarCalculo((v) => !v)} accessibilityRole="button">
          <Text style={styles.link}>Como calculamos {mostrarCalculo ? "▴" : "▾"}</Text>
        </Pressable>
        {mostrarCalculo && (
          <Text style={styles.explicacao}>
            Compatibilidade = requisitos com evidência ÷ requisitos cadastrados. Curso, semestre,
            cada competência, cada idioma e a disponibilidade valem o mesmo peso. Alta: 75% ou
            mais · Média: 50 a 74% · Baixa: abaixo de 50%. O resultado não bloqueia a candidatura.
          </Text>
        )}
      </Cartao>

      {GRUPOS.map((g) => {
        const itens = analise.itens.filter((i) => i.status === g.status);
        if (!itens.length) return null;
        return (
          <View key={g.status} style={{ gap: spacing.sm + 4 }}>
            <Text style={styles.grupo}>
              {g.titulo} ({itens.length})
            </Text>
            {!!g.ajuda && <Text style={styles.ajuda}>{g.ajuda}</Text>}
            {itens.map((item, i) => (
              <LinhaRequisito key={`${g.status}-${i}`} item={item} />
            ))}
          </View>
        );
      })}

      <Text style={styles.aviso}>
        Resultado simulado nesta versão do app: o cálculo real será feito pelo servidor.
      </Text>
    </Tela>
  );
}

const styles = StyleSheet.create({
  vaga: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 4 },
  vagaTitulo: { fontSize: 16, fontWeight: "700", color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 },
  resumo: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  resumoTexto: { fontSize: 17, fontWeight: "700", color: colors.text, lineHeight: 23 },
  explicacao: { fontSize: 14, lineHeight: 21, color: colors.muted },
  negrito: { fontWeight: "700", color: colors.text },
  link: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  grupo: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: spacing.sm },
  ajuda: { fontSize: 13, color: colors.muted, marginTop: -4 },
  aviso: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: spacing.sm },
});