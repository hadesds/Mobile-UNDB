import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { baixarCurriculoPDF } from "../../api/curriculo";
import { colors, font, spacing } from "../../constants/theme";
import type { SecaoCurriculo } from "../../types";
import { salvarPDF } from "../../utils/exportarCurriculo";
import { Botao, Cartao, Folha, Icone, useAviso } from "../Ui";

const SECOES: { chave: SecaoCurriculo; titulo: string }[] = [
  { chave: "formacoes", titulo: "Formação acadêmica" },
  { chave: "experiencias", titulo: "Experiências e projetos" },
  { chave: "competencias", titulo: "Competências" },
  { chave: "idiomas", titulo: "Idiomas" },
  { chave: "cursos", titulo: "Cursos complementares" },
];

export function ExportarCurriculo() {
  const [aberto, setAberto] = useState(false);
  const [secoes, setSecoes] = useState<SecaoCurriculo[]>(() => SECOES.map(s => s.chave));
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const avisar = useAviso();

  async function exportar() {
    if (gerando || !secoes.length) return;
    setGerando(true);
    setErro(null);
    try {
      await salvarPDF(await baixarCurriculoPDF(secoes));
      setAberto(false);
      if (Platform.OS === "web") avisar("Download do currículo iniciado");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível exportar. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  return <>
    <Cartao style={styles.cartao}>
      <Text style={styles.titulo}>Seu currículo pronto para enviar</Text>
      <Text style={styles.texto}>Baixe um PDF padronizado com as informações atuais do seu perfil.</Text>
      <Botao titulo="Exportar currículo" icone="curriculo" variante="contorno" onPress={() => { setErro(null); setAberto(true); }} />
    </Cartao>
    <Folha visivel={aberto} onFechar={() => { if (!gerando) setAberto(false); }} titulo="Exportar currículo" subtitulo="Escolha o que incluir no seu PDF."
      rodape={<View style={styles.cartao}>
        {erro ? <Text accessibilityRole="alert" style={styles.erro}>{erro}</Text> : null}
        {!secoes.length ? <Text style={styles.texto}>Selecione pelo menos uma seção.</Text> : null}
        <Botao titulo={Platform.OS === "web" ? "Baixar PDF" : "Salvar ou compartilhar PDF"} carregando={gerando} desabilitado={!secoes.length} onPress={exportar} />
      </View>}>
      <Text style={styles.texto}>Nome, e-mail e curso aparecem no cabeçalho. Seções vazias são omitidas.</Text>
      {SECOES.map(({ chave, titulo }) => <Pressable key={chave} accessibilityRole="checkbox" accessibilityLabel={titulo} aria-checked={secoes.includes(chave)} accessibilityState={{ checked: secoes.includes(chave), disabled: gerando }} disabled={gerando}
        onPress={() => setSecoes(atuais => atuais.includes(chave) ? atuais.filter(s => s !== chave) : [...atuais, chave])} style={styles.opcao}>
        <View style={[styles.check, secoes.includes(chave) && styles.marcado]}>{secoes.includes(chave) ? <Icone nome="check" tamanho={16} cor={colors.primaryText} /> : null}</View>
        <Text style={styles.rotulo}>{titulo}</Text>
      </Pressable>)}
      <Text style={styles.texto}>Cada exportação usa o perfil atualizado. Os arquivos enviados para importação não são anexados.</Text>
    </Folha>
  </>;
}

const styles = StyleSheet.create({
  cartao: { gap: spacing.smd }, titulo: { ...font.h3 }, texto: { ...font.small },
  opcao: { flexDirection: "row", alignItems: "center", gap: spacing.smd, minHeight: 52 },
  check: { width: 24, height: 24, borderWidth: 1.5, borderColor: colors.border, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  marcado: { backgroundColor: colors.primary, borderColor: colors.primary }, rotulo: { ...font.body, flex: 1 }, erro: { ...font.small, color: colors.danger },
});
