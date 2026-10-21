import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Botao, Campo } from "../components/Ui";
import { colors, radius, spacing } from "../constants/theme";
import { useAuth } from "../lib/auth";
import type { AuthStackParams } from "../lib/navigation";

type Props = NativeStackScreenProps<AuthStackParams, "Login">;

export default function Login({ navigation }: Props) {
  const { entrar } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onEntrar() {
    if (!email.trim() || !senha) {
      setErro("Informe e-mail e senha.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await entrar(email, senha);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.raiz}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <View style={[styles.circulo, styles.circulo1]} />
          <View style={[styles.circulo, styles.circulo2]} />
          <Text style={styles.nucleo}>Núcleo de Carreiras TEIA</Text>
          <Text style={styles.titulo}>TEIA — Currículo{"\n"}Sob Medida</Text>
          <Text style={styles.subtitulo}>
            Organize seu currículo, entenda o que cada vaga pede e acompanhe seus
            encaminhamentos.
          </Text>
        </View>

        <View style={styles.cartao}>
          <Text style={styles.cartaoTitulo}>Entrar</Text>
          <Campo
            rotulo="E-mail institucional"
            value={email}
            onChangeText={setEmail}
            placeholder="nome.sobrenome@aluno.undb.edu.br"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
          />
          <Campo
            rotulo="Senha"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            onSubmitEditing={onEntrar}
          />
          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          <Botao titulo="Entrar" onPress={onEntrar} carregando={enviando} />
          <View style={styles.divisor} />
          <Botao
            titulo="Primeiro acesso? Criar conta"
            variante="contorno"
            onPress={() => navigation.navigate("Cadastro")}
          />
        </View>

        <Text style={[styles.rodape, { paddingBottom: insets.bottom + spacing.lg }]}>
          Use o mesmo e-mail institucional dos sistemas acadêmicos da UNDB.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: 80,
    overflow: "hidden",
  },
  circulo: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
  },
  circulo1: { width: 320, height: 320, right: -140, top: -60 },
  circulo2: { width: 220, height: 220, right: -90, top: -10 },
  nucleo: { color: colors.primaryText, fontSize: 14, fontWeight: "700", opacity: 0.95 },
  titulo: {
    color: colors.primaryText,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    marginTop: spacing.sm,
  },
  subtitulo: {
    color: colors.primaryText,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.md,
    opacity: 0.95,
  },
  cartao: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: -56,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cartaoTitulo: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: spacing.md },
  erro: { color: colors.danger, marginBottom: spacing.md, fontSize: 14 },
  divisor: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  rodape: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
});