import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInputInstance,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listarCursos } from "../api/cursos";
import { AceiteLgpd } from "../components/auth/AceiteLgpd";
import { Surgir } from "../components/Movimento/Surgir";
import { Botao, Campo, Chip, Icone, Pulso, Bloco } from "../components/Ui";
import { colors, font, radius, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { AuthStackParams } from "../lib/navigation";

type Props = NativeStackScreenProps<AuthStackParams, "Cadastro">;
type Erros = Partial<Record<string, string>>;

const ETAPAS = [
  { titulo: "Seus dados de acesso", texto: "Use o e-mail institucional. O resto do currículo você preenche depois, com calma." },
  { titulo: "Vínculo acadêmico", texto: "Usamos curso e semestre para mostrar as vagas que aceitam o seu perfil." },
  { titulo: "Consentimento", texto: "Último passo: precisamos da sua autorização para analisar o currículo." },
];

// Em que etapa cada campo vive (para levar o aluno ao erro vindo do servidor).
const ETAPA_DO_CAMPO: Record<string, number> = {
  nome: 0,
  email: 0,
  password: 0,
  matricula: 1,
  curso: 1,
  periodo: 1,
  aceite_lgpd: 2,
};

/** Cadastro em três etapas curtas (o protótipo prevê 7; as demais entram no fluxo do currículo). */
export default function Cadastro({ navigation }: Props) {
  const { cadastrar } = useAuth();
  const insets = useSafeAreaInsets();
  const cursos = useRecurso(listarCursos, []);
  const emailRef = useRef<TextInputInstance>(null);
  const senhaRef = useRef<TextInputInstance>(null);

  const [etapa, setEtapa] = useState(0);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [curso, setCurso] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState(1);
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cursoEscolhido = cursos.dados?.find((c) => c.id === curso);
  const maxPeriodo = cursoEscolhido?.total_periodos ?? 12;

  useEffect(() => {
    if (periodo > maxPeriodo) setPeriodo(maxPeriodo);
  }, [maxPeriodo, periodo]);

  // O "voltar" do sistema volta uma etapa antes de sair do cadastro.
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (e) => {
        if (etapa === 0 || enviando) return;
        e.preventDefault();
        setEtapa((x) => x - 1);
      }),
    [navigation, etapa, enviando],
  );

  function validar(n: number): Erros {
    const local: Erros = {};
    if (n === 0) {
      if (!nome.trim()) local.nome = "Informe seu nome.";
      if (!email.trim()) local.email = "Informe seu e-mail institucional.";
      else if (!/^\S+@\S+\.\S+$/.test(email.trim())) local.email = "Confira o e-mail: parece incompleto.";
      if (!senha) local.password = "Crie uma senha.";
      else if (senha.length < 8) local.password = "Use pelo menos 8 caracteres.";
    }
    if (n === 1) {
      if (!matricula.trim()) local.matricula = "Informe sua matrícula.";
      if (!curso) local.curso = "Escolha seu curso.";
    }
    if (n === 2 && !aceite) local.aceite_lgpd = "É necessário aceitar o termo para continuar.";
    return local;
  }

  function avancar() {
    const local = validar(etapa);
    setErros(local);
    if (Object.keys(local).length) return;
    if (etapa < 2) setEtapa(etapa + 1);
    else onCriar();
  }

  async function onCriar() {
    setErroGeral(null);
    setEnviando(true);
    try {
      await cadastrar({
        nome: nome.trim(),
        email: email.trim(),
        matricula: matricula.trim(),
        password: senha,
        curso: curso!,
        periodo,
        aceite_lgpd: aceite,
      });
    } catch (e) {
      // Erros de validação do DRF chegam como {campo: [mensagens]}.
      if (e instanceof ApiError && e.data && typeof e.data === "object") {
        const doServidor: Erros = {};
        for (const [campo, msgs] of Object.entries(e.data as Record<string, unknown>)) {
          doServidor[campo] = Array.isArray(msgs) ? String(msgs[0]) : String(msgs);
        }
        setErros(doServidor);
        const etapas = Object.keys(doServidor).map((c) => ETAPA_DO_CAMPO[c]).filter((x): x is number => x !== undefined);
        if (etapas.length) setEtapa(Math.min(...etapas));
        setErroGeral(doServidor.detail ?? doServidor.non_field_errors ?? null);
      } else {
        setErroGeral(e instanceof Error ? e.message : "Não foi possível criar a conta.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const info = ETAPAS[etapa]!;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View
          style={styles.progresso}
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={`Etapa ${etapa + 1} de ${ETAPAS.length}`}
        >
          {ETAPAS.map((_, i) => (
            <View key={i} style={[styles.segmento, i <= etapa && styles.segmentoAtivo]} />
          ))}
        </View>
        <Text style={styles.passo}>
          Etapa {etapa + 1} de {ETAPAS.length}
        </Text>

        <Surgir key={etapa} deslocamento={12} style={styles.etapa}>
          <View style={{ gap: spacing.xs }}>
            <Text style={styles.titulo} accessibilityRole="header">
              {info.titulo}
            </Text>
            <Text style={styles.intro}>{info.texto}</Text>
          </View>

          {etapa === 0 && (
            <>
              <Campo
                rotulo="Nome completo"
                value={nome}
                onChangeText={setNome}
                erro={erros.nome}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <Campo
                ref={emailRef}
                rotulo="E-mail institucional"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="nome.sobrenome@aluno.undb.edu.br"
                erro={erros.email}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => senhaRef.current?.focus()}
              />
              <Campo
                ref={senhaRef}
                rotulo="Senha"
                value={senha}
                onChangeText={setSenha}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                erro={erros.password}
                ajuda="Pelo menos 8 caracteres, misturando letras e números."
                returnKeyType="next"
                onSubmitEditing={avancar}
              />
            </>
          )}

          {etapa === 1 && (
            <>
              <Campo
                rotulo="Matrícula"
                value={matricula}
                onChangeText={setMatricula}
                autoCapitalize="characters"
                erro={erros.matricula}
              />

              <View style={{ gap: spacing.sm }}>
                <Text style={styles.rotulo}>Curso</Text>
                {cursos.erro ? (
                  <View style={styles.linhaErro}>
                    <Text style={styles.erro}>{cursos.erro}</Text>
                    <Pressable onPress={cursos.recarregar} accessibilityRole="button" hitSlop={8}>
                      <Text style={styles.link}>Tentar de novo</Text>
                    </Pressable>
                  </View>
                ) : cursos.carregando && !cursos.dados ? (
                  <Pulso>
                    <View style={styles.chips}>
                      {[120, 160, 100, 140].map((l, i) => (
                        <Bloco key={i} largura={l} altura={36} raio={18} />
                      ))}
                    </View>
                  </Pulso>
                ) : (
                  <View style={styles.chips}>
                    {(cursos.dados ?? []).map((c) => (
                      <Chip key={c.id} texto={c.nome} selecionado={curso === c.id} onPress={() => setCurso(c.id)} />
                    ))}
                    {!cursos.dados?.length && <Text style={styles.ajuda}>Nenhum curso cadastrado ainda.</Text>}
                  </View>
                )}
                {!!erros.curso && <Text style={styles.erro}>{erros.curso}</Text>}
              </View>

              <View style={{ gap: spacing.sm }}>
                <Text style={styles.rotulo}>Semestre atual</Text>
                <View style={styles.contador}>
                  <BotaoPasso icone="menos" rotulo="Diminuir semestre" desabilitado={periodo <= 1} onPress={() => setPeriodo((p) => p - 1)} />
                  <Text style={styles.contadorValor} accessibilityLiveRegion="polite">
                    {periodo}º
                  </Text>
                  <BotaoPasso icone="mais" rotulo="Aumentar semestre" desabilitado={periodo >= maxPeriodo} onPress={() => setPeriodo((p) => p + 1)} />
                </View>
                {!!erros.periodo && <Text style={styles.erro}>{erros.periodo}</Text>}
              </View>
            </>
          )}

          {etapa === 2 && (
            <>
              <View style={styles.resumo}>
                <Text style={styles.resumoNome}>{nome.trim()}</Text>
                <Text style={styles.resumoMeta}>{email.trim()}</Text>
                <Text style={styles.resumoMeta}>
                  {cursoEscolhido?.nome} · {periodo}º semestre · matrícula {matricula.trim()}
                </Text>
              </View>
              <AceiteLgpd aceito={aceite} onAlterar={setAceite} erro={erros.aceite_lgpd} />
            </>
          )}

          {!!erroGeral && (
            <View style={styles.linhaErro}>
              <Icone nome="alerta" tamanho={16} cor={colors.danger} />
              <Text style={[styles.erro, { flex: 1 }]}>{erroGeral}</Text>
            </View>
          )}
        </Surgir>
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {etapa > 0 && (
          <Botao titulo="Voltar" variante="contorno" style={{ flex: 1 }} onPress={() => setEtapa(etapa - 1)} desabilitado={enviando} />
        )}
        <Botao
          titulo={etapa < 2 ? "Continuar" : "Criar conta"}
          icone={etapa < 2 ? undefined : "check"}
          style={{ flex: 2 }}
          onPress={avancar}
          carregando={enviando}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function BotaoPasso({ icone, rotulo, desabilitado, onPress }: {
  icone: "menos" | "mais";
  rotulo: string;
  desabilitado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [styles.passoBotao, desabilitado && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}
    >
      <Icone nome={icone} tamanho={20} cor={colors.primaryDark} espessura={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  progresso: { flexDirection: "row", gap: 6 },
  segmento: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  segmentoAtivo: { backgroundColor: colors.primary },
  passo: { ...font.label, marginBottom: spacing.sm },
  etapa: { gap: spacing.md },
  titulo: { ...font.title },
  intro: { ...font.body, color: colors.muted },
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  ajuda: { color: colors.muted, fontSize: 14 },
  linhaErro: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  erro: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  link: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  contador: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  passoBotao: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  contadorValor: { minWidth: 56, textAlign: "center", ...font.h2, fontVariant: ["tabular-nums"] },
  resumo: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  resumoNome: { ...font.h3 },
  resumoMeta: { ...font.small, fontSize: 14 },
  rodape: {
    flexDirection: "row",
    gap: spacing.smd,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.smd,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
