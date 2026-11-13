import { Pressable, StyleSheet, Text, View } from "react-native";

import { listarCertificados } from "../../api/certificados";
import { colors, font, radius, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { Certificado } from "../../types";
import { formatarData } from "../../utils/formatos";
import { Botao, Chip, EsqueletoLista, Icone, Vazio } from "../Ui";

type Props = {
  /** IDs marcados. Quem usa o componente guarda o estado e o envia em `candidatar(..., certificados)`. */
  selecionados: number[];
  onChange: (ids: number[]) => void;
};

/** "Alura · 20 h · 10/08/2026" */
function detalhes(c: Certificado) {
  return [c.instituicao, c.carga_horaria ? `${c.carga_horaria} h` : "", c.data ? formatarData(c.data) : ""]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Lista os certificados do aluno com uma caixa de seleção em cada um.
 * Componente independente: a tela de candidatura só o encaixa e lê `selecionados`.
 */
export function ListaCertificados({ selecionados, onChange }: Props) {
  const { dados, erro, carregando, recarregar } = useRecurso(listarCertificados, []);

  if (carregando && !dados) return <EsqueletoLista itens={2} />;
  if (erro && !dados) {
    return (
      <View style={styles.erro}>
        <Text style={styles.erroTexto}>{erro}</Text>
        <Botao titulo="Tentar de novo" variante="suave" compacto onPress={() => void recarregar()} />
      </View>
    );
  }
  if (!dados?.length) {
    return (
      <Vazio
        icone="check"
        titulo="Nenhum certificado ainda"
        texto="Envie um certificado para usá-lo como comprovação nas suas candidaturas."
      />
    );
  }

  const alternar = (id: number) =>
    onChange(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id]);

  return (
    <View style={{ gap: spacing.sm }} accessibilityRole="list">
      {dados.map((c) => {
        const marcado = selecionados.includes(c.id);
        return (
          <Pressable
            key={c.id}
            onPress={() => alternar(c.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: marcado }}
            accessibilityLabel={`${c.titulo}. ${detalhes(c)}`}
            style={[styles.linha, marcado && styles.linhaMarcada]}
          >
            <View style={[styles.caixa, marcado && styles.caixaMarcada]}>
              {marcado && <Icone nome="check" tamanho={16} cor={colors.primaryText} espessura={3} />}
            </View>
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <Text style={styles.titulo} numberOfLines={2}>
                {c.titulo}
              </Text>
              {detalhes(c) !== "" && <Text style={styles.meta}>{detalhes(c)}</Text>}
            </View>
            {c.origem === "undb" && <Chip texto="UNDB" tom="marca" />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    minHeight: 56, // alvo de toque confortável
    padding: spacing.smd,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  linhaMarcada: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  caixaMarcada: { backgroundColor: colors.primary, borderColor: colors.primary },
  titulo: { ...font.h3 },
  meta: { ...font.small },
  erro: { gap: spacing.sm, alignItems: "flex-start" },
  erroTexto: { ...font.body, color: colors.danger },
});
