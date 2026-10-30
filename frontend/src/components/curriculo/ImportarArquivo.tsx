import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { enviarArquivo } from "../../api/curriculo";
import { colors, font, radius, spacing } from "../../constants/theme";
import type { ArquivoCurriculo } from "../../types";
import { tempoRelativo } from "../../utils/formatos";
import { Botao, Cartao, Icone } from "../Ui";

const LIMITE_BYTES = 5 * 1024 * 1024;
const TIPOS = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

type Props = {
  arquivo: ArquivoCurriculo | null;
  /** Depois do envio (o arquivo já foi lido): abrir a revisão. */
  onEnviado: () => void;
  onRevisar: () => void;
};

export function descreverArquivo(a: ArquivoCurriculo): string {
  const paginas = a.paginas ? `${a.paginas} ${a.paginas === 1 ? "página" : "páginas"}` : null;
  return [a.tipo === "pdf" ? "PDF" : "Word", paginas, `enviado ${tempoRelativo(a.enviado_em)}`].filter(Boolean).join(" · ");
}

/** Envio do currículo pronto (PDF/DOCX) para sugerir o preenchimento. */
export function ImportarArquivo({ arquivo, onEnviado, onRevisar }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher() {
    setErro(null);
    const r = await DocumentPicker.getDocumentAsync({ type: TIPOS, copyToCacheDirectory: true, multiple: false });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    if (a.size && a.size > LIMITE_BYTES) {
      setErro("O arquivo passa de 5 MB. Envie uma versão menor.");
      return;
    }
    setEnviando(true);
    try {
      await enviarArquivo({ uri: a.uri, name: a.name, mimeType: a.mimeType, file: a.file });
      onEnviado();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  const erroView = !!erro && (
    <View style={styles.erro} accessibilityLiveRegion="polite">
      <Icone nome="alerta" tamanho={16} cor={colors.danger} />
      <Text style={styles.erroTexto}>{erro}</Text>
    </View>
  );

  if (arquivo) {
    return (
      <Cartao style={styles.cartao}>
        <View style={styles.topo}>
          <View style={styles.icone}>
            <Icone nome="curriculo" tamanho={20} cor={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo} numberOfLines={1}>
              {arquivo.nome_original}
            </Text>
            <Text style={styles.texto}>{descreverArquivo(arquivo)}</Text>
          </View>
        </View>
        {erroView}
        <View style={styles.acoes}>
          <Botao titulo="Revisar sugestões" variante="suave" compacto style={{ flex: 1.4 }} onPress={onRevisar} desabilitado={enviando} />
          <Botao
            titulo={enviando ? "Lendo…" : "Trocar"}
            icone="importar"
            variante="contorno"
            compacto
            style={{ flex: 1 }}
            onPress={escolher}
            carregando={enviando}
            rotuloAcessivel="Enviar outro arquivo"
          />
        </View>
      </Cartao>
    );
  }

  return (
    <Cartao style={styles.cartao}>
      <View style={styles.topo}>
        <View style={styles.icone}>
          <Icone nome="importar" tamanho={20} cor={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Já tem um currículo pronto?</Text>
          <Text style={styles.texto}>
            Envie em PDF ou Word. Lemos o arquivo e sugerimos o preenchimento; você confere antes de salvar.
          </Text>
        </View>
      </View>
      {erroView}
      <Botao
        titulo={enviando ? "Lendo o arquivo…" : "Importar PDF ou Word"}
        icone="importar"
        variante="suave"
        onPress={escolher}
        carregando={enviando}
      />
    </Cartao>
  );
}

const styles = StyleSheet.create({
  cartao: { gap: spacing.smd },
  topo: { flexDirection: "row", gap: spacing.smd, alignItems: "flex-start" },
  icone: {
    width: 40,
    height: 40,
    borderRadius: radius.sm + 2,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { ...font.h3 },
  texto: { ...font.small, marginTop: 2 },
  acoes: { flexDirection: "row", gap: spacing.sm },
  erro: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  erroTexto: { ...font.small, color: colors.danger, flex: 1 },
});
