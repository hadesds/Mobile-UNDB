import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { listarVagas } from "../api/vagas";
import { Carregando } from "../components/Layout/Carregando";
import { Chip } from "../components/Ui";
import { CartaoVaga } from "../components/vagas/CartaoVaga";
import { colors, radius, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import { useAuth } from "../lib/auth";
import type { VagasStackParams } from "../lib/navigation";
import type { Modalidade, TipoVaga } from "../types";
import { ROTULO_MODALIDADE, ROTULO_TIPO } from "../utils/formatos";

type Props = NativeStackScreenProps<VagasStackParams, "VagasLista">;

export default function Vagas({ navigation }: Props) {
  const { usuario } = useAuth();
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<TipoVaga | undefined>();
  const [modalidade, setModalidade] = useState<Modalidade | undefined>();

  const { dados, erro, carregando, recarregar } = useRecurso(
    () => listarVagas({ q, tipo, modalidade }),
    [q, tipo, modalidade],
  );

  const primeiroNome = usuario?.nome.split(" ")[0];

  const cabecalho = (
    <View style={styles.cabecalho}>
      <Text style={styles.ola}>Olá, {primeiroNome}</Text>
      <Text style={styles.subtitulo}>Vagas abertas para você se candidatar.</Text>

      <TextInput
        style={styles.busca}
        placeholder="Buscar por cargo ou empresa"
        placeholderTextColor={colors.muted}
        value={busca}
        onChangeText={setBusca}
        onSubmitEditing={() => setQ(busca.trim())}
        returnKeyType="search"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        {(Object.keys(ROTULO_TIPO) as TipoVaga[]).map((t) => (
          <Chip
            key={t}
            texto={ROTULO_TIPO[t]}
            selecionado={tipo === t}
            onPress={() => setTipo(tipo === t ? undefined : t)}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
        {(Object.keys(ROTULO_MODALIDADE) as Modalidade[]).map((m) => (
          <Chip
            key={m}
            texto={ROTULO_MODALIDADE[m]}
            selecionado={modalidade === m}
            onPress={() => setModalidade(modalidade === m ? undefined : m)}
          />
        ))}
      </ScrollView>

      {!!dados && (
        <Text style={styles.contagem}>
          {dados.count} vaga{dados.count === 1 ? "" : "s"} encontrada{dados.count === 1 ? "" : "s"}
        </Text>
      )}
    </View>
  );

  if (erro && !dados) return <Carregando erro={erro} onTentarDeNovo={recarregar} />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.lista}
      data={dados?.results ?? []}
      keyExtractor={(v) => String(v.id)}
      ListHeaderComponent={cabecalho}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 4 }} />}
      renderItem={({ item }) => (
        <CartaoVaga vaga={item} onPress={() => navigation.navigate("VagaDetalhe", { id: item.id })} />
      )}
      ListEmptyComponent={
        carregando ? null : (
          <View style={styles.vazio}>
            <Text style={styles.vazioTitulo}>Nenhuma vaga por aqui</Text>
            <Text style={styles.vazioTexto}>
              {q || tipo || modalidade
                ? "Tente remover algum filtro ou mudar a busca."
                : "Ainda não há vagas abertas. Quando o TEIA publicar novas oportunidades, elas aparecem aqui."}
            </Text>
          </View>
        )
      }
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={recarregar} />}
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: spacing.md, paddingBottom: spacing.xl },
  cabecalho: { gap: spacing.sm + 4, marginBottom: spacing.md },
  ola: { fontSize: 24, fontWeight: "800", color: colors.text },
  subtitulo: { fontSize: 15, color: colors.muted, marginTop: -6 },
  busca: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  filtros: { gap: spacing.sm },
  contagem: { fontSize: 13, color: colors.muted },
  vazio: { alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  vazioTitulo: { fontSize: 17, fontWeight: "700", color: colors.text },
  vazioTexto: { fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
});