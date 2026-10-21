import { StyleSheet, Text, View } from "react-native";

import { Tela } from "../components/Layout/Tela";
import { Avatar, Botao, Cartao } from "../components/Ui";
import { colors, spacing } from "../constants/theme";
import { useAuth } from "../lib/auth";

export default function Conta() {
  const { usuario, sair } = useAuth();
  if (!usuario) return null;

  return (
    <Tela>
      <Cartao style={styles.perfil}>
        <Avatar nome={usuario.nome} tamanho={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.nome}>{usuario.nome}</Text>
          <Text style={styles.meta}>{usuario.email}</Text>
          {usuario.aluno && (
            <Text style={styles.meta}>
              {usuario.aluno.curso.nome} · {usuario.aluno.periodo}º semestre
            </Text>
          )}
        </View>
      </Cartao>

      {usuario.perfil !== "aluno" && (
        <Cartao>
          <Text style={styles.aviso}>
            A área do gestor (vagas, triagem e encaminhamentos) ainda está em construção no app.
            Por enquanto, use o painel administrativo do backend.
          </Text>
        </Cartao>
      )}

      {usuario.aluno && (
        <Cartao>
          <Text style={styles.secao}>Privacidade</Text>
          <Text style={styles.aviso}>
            Termo LGPD: {usuario.aluno.consentimento_vigente ? "aceito" : "pendente"}.
          </Text>
        </Cartao>
      )}

      <Botao titulo="Sair" variante="contorno" onPress={sair} />
    </Tela>
  );
}

const styles = StyleSheet.create({
  perfil: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  nome: { fontSize: 18, fontWeight: "800", color: colors.text },
  meta: { fontSize: 14, color: colors.muted, marginTop: 2 },
  secao: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
  aviso: { fontSize: 14, lineHeight: 20, color: colors.muted },
});