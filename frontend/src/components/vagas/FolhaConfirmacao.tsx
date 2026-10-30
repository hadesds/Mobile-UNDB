import { StyleSheet, Text, View } from "react-native";

import { colors, font, spacing } from "../../constants/theme";
import { Botao, Folha, Icone, NomeIcone } from "../Ui";

type Props = {
  visivel: boolean;
  tituloVaga: string;
  enviando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

const PASSOS: { icone: NomeIcone; texto: string }[] = [
  { icone: "curriculo", texto: "Comparamos os requisitos da vaga com o que está no seu currículo." },
  { icone: "check", texto: "Você vê o resultado por requisito, com a evidência de cada um." },
  { icone: "enviar", texto: "Sua candidatura vai para a equipe do TEIA, que decide os encaminhamentos." },
];

/** Folha inferior que explica o que acontece antes de enviar a candidatura. */
export function FolhaConfirmacao({ visivel, tituloVaga, enviando, onConfirmar, onCancelar }: Props) {
  return (
    <Folha
      visivel={visivel}
      onFechar={onCancelar}
      titulo="Analisar e se candidatar"
      subtitulo={tituloVaga}
      rodape={
        <>
          <Botao titulo="Confirmar e analisar" icone="enviar" onPress={onConfirmar} carregando={enviando} />
          <Botao titulo="Agora não" variante="link" onPress={onCancelar} desabilitado={enviando} />
        </>
      }
    >
      <View style={{ gap: spacing.smd }}>
        {PASSOS.map((p) => (
          <View key={p.texto} style={styles.item}>
            <View style={styles.icone}>
              <Icone nome={p.icone} tamanho={17} cor={colors.primaryDark} espessura={2} />
            </View>
            <Text style={styles.texto}>{p.texto}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.aviso}>
        O resultado não é aprovação nem previsão de contratação. Você pode editar o currículo e
        atualizar a análise depois.
      </Text>
    </Folha>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: "row", gap: spacing.smd, alignItems: "flex-start" },
  icone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { ...font.body, flex: 1, paddingTop: 5 },
  aviso: { ...font.small, lineHeight: 19 },
});
