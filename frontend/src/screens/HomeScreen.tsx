import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Curso, listarCursos } from "../api/cursos";
import { API_URL } from "../config/env";
import { colors, radius, spacing } from "../theme";

/** Tela base: confirma que o app está falando com o backend (GET /cursos/). */
export default function HomeScreen() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setCursos(await listarCursos());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>TEIA</Text>
        <Text style={styles.subtitulo}>Currículo Sob Medida</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitulo}>Conexão com o servidor</Text>
        <Text style={styles.muted}>{API_URL}</Text>

        {carregando && <ActivityIndicator color={colors.primary} style={styles.gap} />}

        {erro && (
          <View style={styles.gap}>
            <Text style={styles.erro}>{erro}</Text>
            <Pressable style={styles.botao} onPress={carregar}>
              <Text style={styles.botaoTexto}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}

        {!carregando && !erro && (
          <Text style={[styles.ok, styles.gap]}>
            Conectado · {cursos.length} curso(s) disponível(is)
          </Text>
        )}
      </View>

      <FlatList
        data={cursos}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemNome}>{item.nome}</Text>
            <Text style={styles.muted}>{item.total_periodos} períodos</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.md },
  titulo: { fontSize: 32, fontWeight: "800", color: colors.primary },
  subtitulo: { fontSize: 16, color: colors.muted },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitulo: { fontSize: 16, fontWeight: "700", color: colors.text },
  muted: { color: colors.muted, fontSize: 13 },
  gap: { marginTop: spacing.sm },
  ok: { color: colors.success, fontWeight: "600" },
  erro: { color: colors.danger, marginBottom: spacing.sm },
  botao: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  botaoTexto: { color: colors.primaryText, fontWeight: "600" },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemNome: { fontSize: 15, fontWeight: "600", color: colors.text },
});