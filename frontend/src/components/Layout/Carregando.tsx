import { StyleSheet, Text, View } from "react-native";

import { colors, font, spacing } from "../../constants/theme";
import { Bloco, Botao, Icone, Pulso } from "../Ui";

type Props = { erro?: string | null; onTentarDeNovo?: () => void; simples?: boolean };

/** Estado de carregamento/erro de tela inteira: esqueleto do conteúdo ou erro com saída. */
export function Carregando({ erro, onTentarDeNovo, simples }: Props) {
  if (erro) {
    return (
      <View style={[styles.box, styles.centro]}>
        <View style={styles.icone}>
          <Icone nome="alerta" tamanho={26} cor={colors.danger} />
        </View>
        <Text style={styles.titulo}>Não deu para carregar</Text>
        <Text style={styles.erro}>{erro}</Text>
        {onTentarDeNovo && (
          <Botao titulo="Tentar novamente" icone="atualizar" variante="contorno" onPress={onTentarDeNovo} style={{ alignSelf: "stretch" }} />
        )}
      </View>
    );
  }

  if (simples) {
    return (
      <View style={[styles.box, styles.centro]}>
        <Pulso>
          <View style={styles.marca}>
            <Text style={styles.marcaTexto}>TEIA</Text>
          </View>
        </Pulso>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Pulso>
        <View style={{ gap: spacing.md }}>
          <View style={styles.linha}>
            <Bloco largura={48} altura={48} raio={12} />
            <Bloco largura="40%" altura={14} />
          </View>
          <Bloco largura="85%" altura={26} />
          <Bloco largura="55%" altura={26} />
          <View style={[styles.linha, { marginTop: spacing.sm }]}>
            <Bloco largura="30%" altura={30} raio={15} />
            <Bloco largura="30%" altura={30} raio={15} />
          </View>
          <Bloco altura={120} raio={16} />
          <Bloco altura={80} raio={16} />
        </View>
      </Pulso>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: spacing.md, paddingTop: spacing.lg, backgroundColor: colors.background },
  centro: { alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.lg },
  linha: { flexDirection: "row", alignItems: "center", gap: spacing.smd },
  icone: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  titulo: { ...font.h2, textAlign: "center" },
  erro: { ...font.body, color: colors.muted, textAlign: "center", marginBottom: spacing.md },
  marca: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  marcaTexto: { color: colors.primaryText, fontWeight: "900", fontSize: 22, letterSpacing: 1 },
});
