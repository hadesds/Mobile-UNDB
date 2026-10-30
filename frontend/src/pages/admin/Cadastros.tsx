import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { Competencias } from "../../components/admin/Competencias";
import { Cursos } from "../../components/admin/Cursos";
import { Empresas } from "../../components/admin/Empresas";
import { CabecalhoTela } from "../../components/Layout/CabecalhoTela";
import { Segmentado } from "../../components/Ui";
import { colors, spacing } from "../../constants/theme";
import type { AdminTabsParams } from "../../lib/navigation";

type Props = BottomTabScreenProps<AdminTabsParams, "Cadastros">;
type Secao = "empresas" | "competencias" | "cursos";

const SUBTITULOS: Record<Secao, string> = {
  empresas: "Parceiras que oferecem vagas pelo TEIA.",
  competencias: "O vocabulário que currículos e vagas compartilham.",
  cursos: "Cursos disponíveis no cadastro do aluno.",
};

export default function Cadastros({ route }: Props) {
  const [secao, setSecao] = useState<Secao>(route.params?.secao ?? "empresas");
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (route.params?.secao) setSecao(route.params.secao);
  }, [route.params?.secao, route.params?.pedido]);

  return (
    <ScrollView
      style={styles.raiz}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => setVersao((v) => v + 1)} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <CabecalhoTela titulo="Cadastros" subtitulo={SUBTITULOS[secao]}>
        <Segmentado
          rotuloAcessivel="Tipo de cadastro"
          opcoes={[
            { valor: "empresas", rotulo: "Empresas" },
            { valor: "competencias", rotulo: "Competências" },
            { valor: "cursos", rotulo: "Cursos" },
          ]}
          valor={secao}
          onAlterar={(v) => v && setSecao(v)}
        />
      </CabecalhoTela>
      <View style={styles.corpo} key={`${secao}-${versao}`}>
        {secao === "empresas" && (
          <Empresas filtroInicial={route.params?.secao === "empresas" ? route.params.filtro : undefined} />
        )}
        {secao === "competencias" && <Competencias />}
        {secao === "cursos" && <Cursos />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  conteudo: { paddingBottom: spacing.xl },
  corpo: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
});
