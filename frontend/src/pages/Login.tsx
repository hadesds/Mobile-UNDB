import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInputInstance,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Surgir } from "../components/Movimento/Surgir";
import { Botao, Campo, Icone } from "../components/Ui";
import { colors, elevation, radius, spacing } from "../constants/theme";
import { useAuth } from "../lib/auth";
import type { AuthStackParams } from "../lib/navigation";

type Props = NativeStackScreenProps<AuthStackParams, "Login">;

export default function Login({ navigation }: Props) {
  const { entrar } = useAuth();
  const insets = useSafeAreaInsets();
  const senhaRef = useRef<TextInputInstance>(null);
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
    <KeyboardAvoidingView style={styles.raiz} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <View style={[styles.circulo, styles.circulo1]} />
          <View style={[styles.circulo, styles.circulo2]} />
          <View style={[styles.circulo, styles.circulo3]} />
          <Surgir deslocamento={14}>
            <Text style={styles.titulo} accessibilityRole="header">
              TEIA — Currículo{"\n"}Sob Medida
            </Text>
            <Text style={styles.subtitulo}>
              Organize seu currículo, entenda o que cada vaga pede e acompanhe seus encaminhamentos.
            </Text>
            <Text style={styles.nucleo}>Núcleo de Carreiras TEIA · UNDB</Text>
          </Surgir>
        </View>

        <Surgir indice={2} deslocamento={24} style={styles.cartao}>
          <Text style={styles.cartaoTitulo}>Entrar</Text>
          <Campo
            rotulo="E-mail institucional"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (erro) setErro(null);
            }}
            placeholder="nome.sobrenome@aluno.undb.edu.br"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => senhaRef.current?.focus()}
          />
          <Campo
            ref={senhaRef}
            rotulo="Senha"
            value={senha}
            onChangeText={(t) => {
              setSenha(t);
              if (erro) setErro(null);
            }}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={onEntrar}
          />
          {!!erro && (
            <View style={styles.erro} accessibilityLiveRegion="polite">
              <Icone nome="alerta" tamanho={16} cor={colors.danger} />
              <Text style={styles.erroTexto}>{erro}</Text>
            </View>
          )}

          <Botao titulo="Entrar" onPress={onEntrar} carregando={enviando} style={{ marginTop: spacing.xs }} />
          <View style={styles.divisor}>
            <View style={styles.traco} />
            <Text style={styles.divisorTexto}>primeiro acesso?</Text>
            <View style={styles.traco} />
          </View>
          <Botao titulo="Criar minha conta" variante="contorno" onPress={() => navigation.navigate("Cadastro")} />
        </Surgir>

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
    paddingBottom: 88,
    overflow: "hidden",
  },
  circulo: { position: "absolute", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", borderRadius: 999 },
  circulo1: { width: 340, height: 340, right: -150, top: -70 },
  circulo2: { width: 230, height: 230, right: -95, top: -15 },
  circulo3: { width: 120, height: 120, right: -40, top: 40, borderColor: "rgba(255,255,255,0.12)" },
  nucleo: { color: colors.primaryText, fontSize: 13, fontWeight: "700", opacity: 0.85, marginTop: spacing.md },
  titulo: {
    color: colors.primaryText,
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitulo: { color: colors.primaryText, fontSize: 16, lineHeight: 23, marginTop: spacing.md, opacity: 0.94, maxWidth: 360 },
  cartao: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: -60,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...elevation.high,
  },
  cartaoTitulo: { fontSize: 22, fontWeight: "800", color: colors.text },
  erro: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  erroTexto: { color: colors.danger, fontSize: 14, flex: 1 },
  divisor: { flexDirection: "row", alignItems: "center", gap: spacing.smd },
  traco: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  divisorTexto: { fontSize: 13, color: colors.muted },
  rodape: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
});
