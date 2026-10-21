import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { listarCursos } from "../api/cursos";
import { AceiteLgpd } from "../components/auth/AceiteLgpd";
import { Botao, Campo, Chip } from "../components/Ui";
import { colors, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";

type Erros = Partial<Record<string, string>>;

/** Cadastro em uma etapa (o protótipo prevê 7; as demais entram no fluxo do currículo). */
export default function Cadastro() {
  const { cadastrar } = useAuth();
  const cursos = useRecurso(listarCursos, []);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [curso, setCurso] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onCriar() {
    const local: Erros = {};
    if (!nome.trim()) local.nome = "Informe seu nome.";
    if (!email.trim()) local.email = "Informe seu e-mail institucional.";
    if (!matricula.trim()) local.matricula = "Informe sua matrícula.";
    if (!senha) local.password = "Crie uma senha.";
    if (!curso) local.curso = "Escolha seu curso.";
    if (!Number(periodo)) local.periodo = "Informe o semestre atual.";
    if (!aceite) local.aceite_lgpd = "É necessário aceitar o termo para continuar.";
    setErros(local);
    setErroGeral(null);
    if (Object.keys(local).length) return;

    setEnviando(true);
    try {
      await cadastrar({
        nome: nome.trim(),
        email: email.trim(),
        matricula: matricula.trim(),
        password: senha,
        curso: curso!,
        periodo: Number(periodo),
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
        if (doServidor.detail || doServidor.non_field_errors) {
          setErroGeral(doServidor.detail ?? doServidor.non_field_errors ?? null);
        }
      } else {
        setErroGeral(e instanceof Error ? e.message : "Não foi possível criar a conta.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Crie sua conta com o e-mail institucional. O restante do currículo você preenche
          depois, com calma.
        </Text>

        <Campo rotulo="Nome completo" value={nome} onChangeText={setNome} erro={erros.nome} />
        <Campo
          rotulo="E-mail institucional"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          erro={erros.email}
        />
        <Campo
          rotulo="Matrícula"
          value={matricula}
          onChangeText={setMatricula}
          autoCapitalize="characters"
          erro={erros.matricula}
        />
        <Campo
          rotulo="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          erro={erros.password}
        />

        <Text style={styles.rotulo}>Curso</Text>
        {cursos.erro ? (
          <Text style={styles.erro}>{cursos.erro}</Text>
        ) : (
          <View style={styles.chips}>
            {(cursos.dados ?? []).map((c) => (
              <Chip
                key={c.id}
                texto={c.nome}
                selecionado={curso === c.id}
                onPress={() => setCurso(c.id)}
              />
            ))}
            {!cursos.carregando && !cursos.dados?.length && (
              <Text style={styles.ajuda}>Nenhum curso cadastrado ainda.</Text>
            )}
          </View>
        )}
        {!!erros.curso && <Text style={styles.erro}>{erros.curso}</Text>}

        <Campo
          rotulo="Semestre atual"
          value={periodo}
          onChangeText={(t) => setPeriodo(t.replace(/\D/g, ""))}
          keyboardType="number-pad"
          maxLength={2}
          erro={erros.periodo}
          style={{ width: 120 }}
        />

        <AceiteLgpd aceito={aceite} onAlterar={setAceite} erro={erros.aceite_lgpd} />
        {!!erroGeral && <Text style={styles.erro}>{erroGeral}</Text>}

        <Botao titulo="Criar conta" onPress={onCriar} carregando={enviando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  intro: { fontSize: 15, color: colors.muted, lineHeight: 22, marginBottom: spacing.lg },
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  ajuda: { color: colors.muted, fontSize: 14 },
  erro: { color: colors.danger, fontSize: 13, marginBottom: spacing.md },
});