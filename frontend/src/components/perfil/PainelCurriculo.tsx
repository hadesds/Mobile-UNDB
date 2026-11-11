import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import type { CompetenciaCatalogo, PerfilAluno } from "../../api/perfil";
import { colors, radius, spacing } from "../../constants/theme";
import { Botao, Chip } from "../Ui";

type Props = {
  perfil: PerfilAluno;
  catalogo: CompetenciaCatalogo[];
  onAdicionar: (termo: string) => Promise<void>;
};

/** Competências do aluno + campo para adicionar novas (por nome, sinônimo ou sugestão). */
export function PainelCurriculo({ perfil, catalogo, onAdicionar }: Props) {
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const jaTem = new Set(perfil.competencias.map((c) => c.competencia));
  const sugestoes = catalogo.filter((c) => !jaTem.has(c.id)).slice(0, 8);

  async function adicionar(termo: string) {
    const limpo = termo.trim();
    if (!limpo || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await onAdicionar(limpo);
      setTexto("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível adicionar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.painel}>
      <View style={styles.bloco}>
        <View style={styles.linha}>
          <Text style={styles.titulo}>Seu currículo</Text>
          <Text style={styles.percentual}>{perfil.completude}%</Text>
        </View>
        <View style={styles.trilho} accessibilityLabel={`Currículo ${perfil.completude}% completo`}>
          <View style={[styles.barra, { width: `${perfil.completude}%` }]} />
        </View>
        <Text style={styles.ajuda}>
          Quanto mais completo, mais requisitos das vagas o sistema consegue reconhecer.
        </Text>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.titulo}>Suas competências ({perfil.competencias.length})</Text>
        {perfil.competencias.length === 0 ? (
          <Text style={styles.ajuda}>Você ainda não adicionou nenhuma competência.</Text>
        ) : (
          <View style={styles.chips}>
            {perfil.competencias.map((c) => (
              <Chip key={c.id} texto={c.competencia_nome} tom="marca" />
            ))}
          </View>
        )}
      </View>

      <View style={styles.bloco}>
        <Text style={styles.titulo}>Adicionar competência</Text>
        <TextInput
          style={styles.campo}
          placeholder="Ex.: React, Excel, Atendimento ao público"
          placeholderTextColor={colors.muted}
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={() => adicionar(texto)}
          returnKeyType="done"
          autoCapitalize="none"
        />
        {erro && <Text style={styles.erro}>{erro}</Text>}
        <Botao
          titulo="Adicionar"
          onPress={() => adicionar(texto)}
          carregando={salvando}
          desabilitado={!texto.trim()}
        />

        {sugestoes.length > 0 && (
          <>
            <Text style={styles.ajuda}>Sugestões do vocabulário do TEIA:</Text>
            <View style={styles.chips}>
              {sugestoes.map((c) => (
                <Chip key={c.id} texto={`+ ${c.nome}`} onPress={() => adicionar(c.nome)} />
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  painel: { gap: spacing.md },
  bloco: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  linha: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  titulo: { fontSize: 16, fontWeight: "700", color: colors.text },
  percentual: { fontSize: 18, fontWeight: "800", color: colors.primary },
  trilho: { height: 8, borderRadius: radius.pill, backgroundColor: colors.neutralSoft, overflow: "hidden" },
  barra: { height: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  ajuda: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  campo: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  erro: { fontSize: 13, color: colors.danger },
});