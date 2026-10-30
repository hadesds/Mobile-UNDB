import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { decidir } from "../../api/gestor";
import { colors, font, radius, spacing } from "../../constants/theme";
import type { CandidatoDetalhe, StatusCandidatura } from "../../types";
import { ROTULO_STATUS_GESTOR, SIGNIFICADO_DECISAO } from "../../utils/compatibilidade";
import { Campo, Icone, useAviso } from "../Ui";
import { errosDaApi, FolhaFormulario } from "./FolhaFormulario";

const ORDEM: StatusCandidatura[] = ["analisada", "encaminhada", "em_processo", "nao_selecionada"];

const AVISO: Record<StatusCandidatura, string> = {
  analisada: "Candidatura de volta à fila",
  encaminhada: "Candidatura encaminhada à empresa",
  em_processo: "Marcada como em processo",
  nao_selecionada: "Marcada como não selecionada",
};

type Props = {
  /** Candidatura em decisão; null fecha a folha. */
  alvo: { id: number; nome: string; status: StatusCandidatura; observacao?: string } | null;
  /** Etapa já escolhida ao abrir (ex.: tocar em "Encaminhar"). */
  sugestao?: StatusCandidatura;
  onFechar: () => void;
  onDecidido: (c: CandidatoDetalhe) => void;
};

/** Decisão humana sobre a candidatura: escolher a etapa, anotar e confirmar. */
export function FolhaDecisao({ alvo, sugestao, onFechar, onDecidido }: Props) {
  const avisar = useAviso();
  const [escolha, setEscolha] = useState<StatusCandidatura>("encaminhada");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string>();
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!alvo) return;
    setEscolha(sugestao ?? (alvo.status === "analisada" ? "encaminhada" : alvo.status));
    setObservacao(alvo.observacao ?? "");
    setErro(undefined);
  }, [alvo, sugestao]);

  async function confirmar() {
    if (!alvo) return;
    setOcupado(true);
    try {
      const c = await decidir(alvo.id, escolha, escolha === "analisada" ? undefined : observacao.trim());
      avisar(escolha === alvo.status ? "Anotação salva" : AVISO[escolha]);
      onDecidido(c);
    } catch (e) {
      setErro(errosDaApi(e).geral ?? "Não foi possível registrar a decisão.");
    } finally {
      setOcupado(false);
    }
  }

  const rotulo =
    !alvo || escolha === alvo.status ? "Salvar anotação" : escolha === "encaminhada" ? "Encaminhar" : "Confirmar";

  return (
    <FolhaFormulario
      visivel={!!alvo}
      titulo={alvo ? `Decisão sobre ${alvo.nome.split(" ")[0]}` : ""}
      subtitulo="A compatibilidade ordena a lista. Quem decide é você."
      onFechar={onFechar}
      onSalvar={confirmar}
      rotuloSalvar={rotulo}
      ocupado={ocupado}
      erroGeral={erro}
    >
      <View style={styles.opcoes} accessibilityRole="radiogroup" accessibilityLabel="Etapa da candidatura">
        {ORDEM.map((s) => {
          const ativo = escolha === s;
          const atual = alvo?.status === s;
          return (
            <Pressable
              key={s}
              onPress={() => setEscolha(s)}
              accessibilityRole="radio"
              accessibilityState={{ checked: ativo }}
              accessibilityLabel={`${ROTULO_STATUS_GESTOR[s]}${atual ? ", etapa atual" : ""}. ${SIGNIFICADO_DECISAO[s]}`}
              style={({ pressed }) => [styles.opcao, ativo && styles.ativa, pressed && !ativo && { opacity: 0.7 }]}
            >
              <View style={[styles.radio, ativo && styles.radioAtivo]}>
                {ativo && <Icone nome="check" tamanho={13} cor={colors.primaryText} espessura={3} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.titulo, ativo && { color: colors.primaryDark }]}>
                  {ROTULO_STATUS_GESTOR[s]}
                  {atual && <Text style={styles.atual}>  · atual</Text>}
                </Text>
                <Text style={styles.texto}>{SIGNIFICADO_DECISAO[s]}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {escolha !== "analisada" && (
        <Campo
          rotulo="Anotação interna (opcional)"
          value={observacao}
          onChangeText={setObservacao}
          multiline
          style={styles.multilinha}
          placeholder="Ex.: enviado ao RH por e-mail em 30/10"
          ajuda="Só gestores veem esta anotação."
        />
      )}
    </FolhaFormulario>
  );
}

const styles = StyleSheet.create({
  opcoes: { gap: spacing.sm },
  opcao: {
    flexDirection: "row",
    gap: spacing.smd,
    alignItems: "flex-start",
    padding: spacing.smd,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ativa: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  radioAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  titulo: { ...font.h3, fontSize: 15 },
  atual: { fontSize: 13, fontWeight: "600", color: colors.muted },
  texto: { ...font.small, marginTop: 2 },
  multilinha: { minHeight: 84, paddingTop: spacing.smd, textAlignVertical: "top" },
});
