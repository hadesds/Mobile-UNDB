import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { buscarFormulario } from "../api/vagas";
import { Carregando } from "../components/Layout/Carregando";
import { Tela } from "../components/Layout/Tela";
import { Botao, Campo, Cartao, Chip, Segmentado } from "../components/Ui";
import { FolhaConfirmacao } from "../components/vagas/FolhaConfirmacao";
import { colors, font, spacing } from "../constants/theme";
import { useAuth } from "../lib/auth";
import { FluxoCandidatura } from "../lib/fluxoCandidatura";
import { criarRascunhosCandidatura } from "../lib/rascunhoCandidatura";
import { storage } from "../lib/storage";
import { useCandidaturas } from "../lib/candidaturas";
import type { AppStackParams } from "../lib/navigation";

type Props = NativeStackScreenProps<AppStackParams, "FormularioCandidatura">;

const rascunhos = criarRascunhosCandidatura(storage);

export default function FormularioCandidatura({ route, navigation }: Props) {
  const { usuario } = useAuth();
  if (!usuario) return <Carregando />;
  return <Editor key={`${usuario.id}.${route.params.id}`} usuario={usuario.id} vaga={route.params.id} navigation={navigation} />;
}

function Editor({ usuario, vaga, navigation }: { usuario: number; vaga: number; navigation: Props["navigation"] }) {
  const { candidatar } = useCandidaturas();
  const ativo = useRef(true);
  const [fluxo] = useState(() => new FluxoCandidatura(usuario, vaga, {
    buscarFormulario,
    candidatar,
    rascunhos,
    abrirResultado: (destino) => {
      if (ativo.current) navigation.replace("Candidatura", destino);
    },
  }));
  const { formulario, respostas, erros, erro, aviso, carregando, enviando, confirmando } = useSyncExternalStore(fluxo.assinar, fluxo.snapshot, fluxo.snapshot);

  useEffect(() => {
    ativo.current = true;
    void fluxo.carregar();
    return () => { ativo.current = false; };
  }, [fluxo]);

  if (!formulario) return <Carregando erro={erro} onTentarDeNovo={() => void fluxo.carregar()} />;

  return (
    <KeyboardAvoidingView style={styles.raiz} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
      <Tela rodape={<Botao titulo="Revisar e enviar" icone="enviar" onPress={() => fluxo.revisar()} carregando={enviando || carregando} />}>
        <Text style={font.h2}>Seu currículo para esta vaga</Text>
        {!!formulario.instrucoes && <Text style={font.body}>{formulario.instrucoes}</Text>}
        <Text style={font.small}>Revise os dados do perfil e complete as perguntas da vaga. Estas edições valem apenas para esta candidatura. * Campo obrigatório.</Text>
        {!!aviso && <Text style={font.body} accessibilityLiveRegion="polite">{aviso}</Text>}
        <Botao titulo="Descartar rascunho" variante="link" onPress={() => void fluxo.descartar()} desabilitado={enviando} />
        {!!erro && <Text style={styles.erro} accessibilityRole="alert" accessibilityLiveRegion="polite">{erro}</Text>}
        {formulario.campos.map((campo) => {
          const rotulo = `${campo.rotulo}${campo.obrigatorio ? " *" : ""}`;
          return (
            <Cartao key={campo.chave} style={[styles.campo, campo.origem === "vaga" && styles.destaque]}>
              <Chip texto={campo.origem === "vaga" ? "Pergunta da vaga" : "Dados do perfil · editável"} tom={campo.origem === "vaga" ? "marca" : "neutro"} />
              {campo.formato === "sim_nao" ? (
                <View style={styles.campo} pointerEvents={enviando ? "none" : "auto"} accessibilityState={{ disabled: enviando }}>
                  <Text style={font.h3}>{rotulo}</Text>
                  <Segmentado
                    opcoes={[{ valor: "sim", rotulo: "Sim" }, { valor: "nao", rotulo: "Não" }]}
                    valor={respostas[campo.chave] || null}
                    onAlterar={(valor) => fluxo.alterar(campo.chave, valor ?? "")}
                    rotuloAcessivel={rotulo}
                    opcional={!campo.obrigatorio}
                  />
                  {!!campo.ajuda && <Text style={font.small}>{campo.ajuda}</Text>}
                  {!!erros[campo.chave] && <Text style={styles.erro} accessibilityLiveRegion="polite">{erros[campo.chave]}</Text>}
                </View>
              ) : (
                <Campo
                  rotulo={rotulo}
                  ajuda={campo.ajuda}
                  erro={erros[campo.chave]}
                  value={respostas[campo.chave]}
                  onChangeText={(valor) => fluxo.alterar(campo.chave, valor)}
                  editable={!enviando}
                  multiline={campo.formato === "texto_longo"}
                  style={campo.formato === "texto_longo" ? styles.longo : undefined}
                  keyboardType={campo.formato === "numero" ? "decimal-pad" : campo.formato === "url" ? "url" : "default"}
                  autoCapitalize={campo.formato === "url" ? "none" : "sentences"}
                  autoCorrect={campo.formato !== "url"}
                />
              )}
            </Cartao>
          );
        })}
      </Tela>
      <FolhaConfirmacao
        visivel={confirmando}
        tituloVaga="Confirme o envio das respostas revisadas"
        enviando={enviando}
        onCancelar={() => fluxo.cancelar()}
        onConfirmar={() => void fluxo.enviar()}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  campo: { gap: spacing.sm },
  destaque: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  erro: { ...font.small, color: colors.danger },
  longo: { minHeight: 120, textAlignVertical: "top" },
});
