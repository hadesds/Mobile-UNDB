import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { buscarVaga } from "../api/vagas";
import { Carregando } from "../components/Layout/Carregando";
import { Tela } from "../components/Layout/Tela";
import { Avatar, Botao } from "../components/Ui";
import { FolhaConfirmacao } from "../components/vagas/FolhaConfirmacao";
import { InfoTile } from "../components/vagas/InfoTile";
import { ListaRequisitos } from "../components/vagas/ListaRequisitos";
import { colors, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import type { VagasStackParams } from "../lib/navigation";
import { formatarData, ROTULO_MODALIDADE, ROTULO_TIPO } from "../utils/formatos";

type Props = NativeStackScreenProps<VagasStackParams, "VagaDetalhe">;

export default function VagaDetalhe({ route, navigation }: Props) {
  const { id } = route.params;
  const { dados: vaga, erro, recarregar } = useRecurso(() => buscarVaga(id), [id]);
  const [confirmando, setConfirmando] = useState(false);

  if (!vaga) return <Carregando erro={erro} onTentarDeNovo={recarregar} />;

  return (
    <>
      <Tela
        rodape={
          <>
            <Botao
              titulo="Analisar compatibilidade e me candidatar"
              onPress={() => setConfirmando(true)}
            />
            <Text style={styles.nota}>Você confirma antes de enviar.</Text>
          </>
        }
      >
        <View style={styles.empresa}>
          <Avatar nome={vaga.empresa} />
          <Text style={styles.empresaNome}>{vaga.empresa}</Text>
        </View>
        <Text style={styles.titulo}>{vaga.titulo}</Text>

        <View style={styles.grade}>
          <InfoTile rotulo="Tipo" valor={ROTULO_TIPO[vaga.tipo]} />
          <InfoTile rotulo="Modalidade" valor={ROTULO_MODALIDADE[vaga.modalidade]} />
          <InfoTile rotulo="Inscrições até" valor={formatarData(vaga.prazo)} />
          <InfoTile
            rotulo="Semestre mínimo"
            valor={vaga.periodo_minimo ? `${vaga.periodo_minimo}º` : "Não exigido"}
          />
        </View>

        {!!vaga.descricao && (
          <View style={{ gap: spacing.sm }}>
            <Text style={styles.secao}>Sobre a oportunidade</Text>
            <Text style={styles.descricao}>{vaga.descricao}</Text>
          </View>
        )}

        <ListaRequisitos vaga={vaga} />
      </Tela>

      <FolhaConfirmacao
        visivel={confirmando}
        tituloVaga={`${vaga.titulo} · ${vaga.empresa}`}
        onCancelar={() => setConfirmando(false)}
        onConfirmar={() => {
          setConfirmando(false);
          navigation.navigate("ResultadoAnalise", { id: vaga.id });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  empresa: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 4 },
  empresaNome: { fontSize: 16, color: colors.muted },
  titulo: { fontSize: 26, lineHeight: 32, fontWeight: "800", color: colors.text },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2 },
  secao: { fontSize: 18, fontWeight: "700", color: colors.text },
  descricao: { fontSize: 15, lineHeight: 23, color: colors.text },
  nota: { textAlign: "center", fontSize: 13, color: colors.muted, marginTop: spacing.sm },
});