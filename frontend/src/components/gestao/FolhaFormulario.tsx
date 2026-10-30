import { ReactNode, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../../constants/theme";
import { ApiError } from "../../lib/api";
import { Botao, Folha, Icone } from "../Ui";

export type Erros = Partial<Record<string, string>>;

/** Converte o erro da API ({campo: [msg]} ou detail) em mensagens por campo. */
export function errosDaApi(err: unknown, padrao = "Não foi possível salvar."): Erros {
  if (err instanceof ApiError && err.data && typeof err.data === "object") {
    const e: Erros = {};
    for (const [campo, msgs] of Object.entries(err.data as Record<string, unknown>)) {
      e[campo] = Array.isArray(msgs) ? String(msgs[0]) : String(msgs);
    }
    if (e.detail) e.geral = e.detail;
    if (e.non_field_errors) e.geral = e.non_field_errors;
    return e;
  }
  return { geral: err instanceof Error ? err.message : padrao };
}

type Props = {
  visivel: boolean;
  titulo: string;
  subtitulo?: string;
  onFechar: () => void;
  onSalvar: () => Promise<void> | void;
  rotuloSalvar?: string;
  /** Quando informado, mostra Excluir com confirmação em dois toques. */
  onExcluir?: () => Promise<void> | void;
  rotuloExcluir?: string;
  ocupado: boolean;
  erroGeral?: string;
  children: ReactNode;
};

/** Folha de cadastro/edição com erro geral, excluir (confirmado) e salvar. */
export function FolhaFormulario({
  visivel,
  titulo,
  subtitulo,
  onFechar,
  onSalvar,
  rotuloSalvar = "Salvar",
  onExcluir,
  rotuloExcluir = "Excluir",
  ocupado,
  erroGeral,
  children,
}: Props) {
  const [confirmando, setConfirmando] = useState(false);
  useEffect(() => {
    if (visivel) setConfirmando(false);
  }, [visivel]);

  return (
    <Folha
      visivel={visivel}
      onFechar={() => !ocupado && onFechar()}
      titulo={titulo}
      subtitulo={subtitulo}
      rodape={
        <>
          {!!erroGeral && (
            <View style={styles.erro} accessibilityLiveRegion="polite">
              <Icone nome="alerta" tamanho={16} cor={colors.danger} />
              <Text style={styles.erroTexto}>{erroGeral}</Text>
            </View>
          )}
          <View style={styles.acoes}>
            {onExcluir && (
              <Botao
                titulo={confirmando ? "Confirmar" : rotuloExcluir}
                icone="lixeira"
                variante="perigo"
                style={{ flex: 1 }}
                desabilitado={ocupado}
                rotuloAcessivel={confirmando ? `Confirmar: ${rotuloExcluir.toLowerCase()}` : rotuloExcluir}
                onPress={() => (confirmando ? onExcluir() : setConfirmando(true))}
              />
            )}
            <Botao titulo={rotuloSalvar} icone="check" style={{ flex: 1.6 }} carregando={ocupado} onPress={onSalvar} />
          </View>
        </>
      }
    >
      {children}
    </Folha>
  );
}

const styles = StyleSheet.create({
  acoes: { flexDirection: "row", gap: spacing.smd },
  erro: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: spacing.smd,
  },
  erroTexto: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 20 },
});
