import { useEffect, useState } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";

import { gerarLink } from "../../api/envios";
import { listarEmpresasAtivas } from "../../api/gestor";
import { colors, font, radius, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { LinkCriado } from "../../types";
import { formatarDataHora } from "../../utils/formatos";
import { errosDaApi, Erros } from "../gestao/FolhaFormulario";
import { Seletor } from "../gestao/Seletor";
import { Botao, Chip, Folha, Icone, useAviso } from "../Ui";

const VALIDADES = [1, 3, 7, 15, 30];

type Props = {
  visivel: boolean;
  onFechar: () => void;
  /** Chamado depois de gerar (para recarregar a lista). Recebe só o id: o token não sai daqui. */
  onGerado: (id: number) => void;
};

/**
 * Gera o link de envio de vaga para uma empresa.
 *
 * Segurança: o token só existe na resposta da criação. Ele fica apenas no estado
 * desta folha (nunca em armazenamento, navegação ou logs) e é descartado ao fechar.
 */
export function FolhaGerarLink({ visivel, onFechar, onGerado }: Props) {
  const avisar = useAviso();
  const empresas = useRecurso(() => (visivel ? listarEmpresasAtivas() : Promise.resolve(null)), [visivel]);
  const [empresa, setEmpresa] = useState<number | null>(null);
  const [dias, setDias] = useState(7);
  const [erros, setErros] = useState<Erros>({});
  const [gerando, setGerando] = useState(false);
  const [criado, setCriado] = useState<LinkCriado | null>(null);
  const [confirmarFechar, setConfirmarFechar] = useState(false);

  // Ao fechar, descarta o link criado e o formulário.
  useEffect(() => {
    if (!visivel) {
      setCriado(null);
      setEmpresa(null);
      setDias(7);
      setErros({});
      setConfirmarFechar(false);
    }
  }, [visivel]);

  const opcoes = (empresas.dados?.results ?? []).map((e) => ({
    valor: e.id,
    rotulo: e.nome_fantasia || e.nome,
    detalhe: e.contato_nome || e.contato_email ? `Contato: ${[e.contato_nome, e.contato_email].filter(Boolean).join(" · ")}` : undefined,
  }));

  async function gerar() {
    if (!empresa) {
      setErros({ empresa: "Escolha a empresa." });
      return;
    }
    setGerando(true);
    setErros({});
    try {
      const link = await gerarLink(empresa, new Date(Date.now() + dias * 86_400_000));
      setCriado(link);
      onGerado(link.id);
    } catch (e) {
      setErros(errosDaApi(e, "Não foi possível gerar o link."));
    } finally {
      setGerando(false);
    }
  }

  const mensagem = criado
    ? `Olá! Para enviar a vaga da ${criado.empresa_nome} ao TEIA (UNDB), preencha o formulário neste link ` +
      `até ${formatarDataHora(criado.expira_em)}. Ele aceita um único envio e é exclusivo da sua empresa:\n${criado.url}`
    : "";

  async function compartilhar() {
    try {
      await Share.share({ message: mensagem });
    } catch {
      avisar("Não foi possível abrir o compartilhamento", "erro");
    }
  }

  const podeCopiar = Platform.OS === "web" && typeof navigator !== "undefined" && !!navigator.clipboard;
  async function copiar() {
    try {
      await navigator.clipboard.writeText(criado!.url);
      avisar("Link copiado");
    } catch {
      avisar("Não foi possível copiar. Selecione o link e copie manualmente.", "erro");
    }
  }

  // Fechar com o link na tela pede confirmação: depois ele não pode ser exibido de novo.
  function fechar() {
    if (gerando) return;
    if (criado && !confirmarFechar) {
      setConfirmarFechar(true);
      return;
    }
    onFechar();
  }

  if (criado) {
    return (
      <Folha
        visivel={visivel}
        onFechar={fechar}
        titulo="Link gerado"
        subtitulo={`${criado.empresa_nome} · válido até ${formatarDataHora(criado.expira_em)}`}
        rodape={
          <>
            {confirmarFechar && (
              <View style={styles.alerta} accessibilityLiveRegion="assertive">
                <Icone nome="alerta" tamanho={16} cor={colors.warningText} />
                <Text style={styles.alertaTexto}>
                  Depois de fechar, o link não aparece mais. Já enviou para a empresa?
                </Text>
              </View>
            )}
            <View style={styles.acoes}>
              {podeCopiar && (
                <Botao titulo="Copiar" icone="copiar" variante="contorno" style={{ flex: 1 }} onPress={copiar} />
              )}
              <Botao titulo="Compartilhar" icone="enviar" style={{ flex: 1.4 }} onPress={compartilhar} />
            </View>
            <Botao
              titulo={confirmarFechar ? "Sim, fechar" : "Concluir"}
              variante={confirmarFechar ? "perigo" : "link"}
              onPress={fechar}
            />
          </>
        }
      >
        <View style={styles.caixaLink}>
          <Icone nome="link" tamanho={18} cor={colors.primaryDark} />
          <Text style={styles.url} selectable accessibilityLabel="Endereço do formulário para a empresa">
            {criado.url}
          </Text>
        </View>
        <View style={styles.seguranca}>
          <Icone nome="escudo" tamanho={18} cor={colors.warningText} />
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text style={styles.segurancaTitulo}>Este link aparece só agora</Text>
            <Text style={styles.segurancaTexto}>
              Ele funciona como uma senha: quem tiver o endereço pode enviar uma vaga em nome da empresa.
              Envie apenas ao contato da empresa. Se perder ou enviar para a pessoa errada, revogue e gere outro.
            </Text>
          </View>
        </View>
        <Text style={styles.dica}>
          O TEIA guarda só os primeiros caracteres ({criado.token_prefixo}…) para você identificar este link na lista.
        </Text>
      </Folha>
    );
  }

  return (
    <Folha
      visivel={visivel}
      onFechar={fechar}
      titulo="Gerar link para empresa"
      subtitulo="A empresa preenche a vaga sem criar conta. O envio volta para revisão antes de ir aos alunos."
      rodape={
        <>
          {!!erros.geral && (
            <View style={styles.erro} accessibilityLiveRegion="polite">
              <Icone nome="alerta" tamanho={16} cor={colors.danger} />
              <Text style={styles.erroTexto}>{erros.geral}</Text>
            </View>
          )}
          <Botao titulo="Gerar link" icone="link" carregando={gerando} onPress={gerar} />
        </>
      }
    >
      <Seletor
        rotulo="Empresa"
        opcoes={opcoes}
        valor={empresa}
        onAlterar={setEmpresa}
        placeholder={empresas.carregando ? "Carregando empresas…" : "Escolher empresa"}
        erro={erros.empresa}
      />
      {!empresas.carregando && opcoes.length === 0 && (
        <Text style={styles.dica}>Nenhuma empresa ativa. A administração cadastra as empresas em Cadastros.</Text>
      )}
      <View style={{ gap: spacing.sm }}>
        <Text style={styles.rotulo}>Validade</Text>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Validade do link">
          {VALIDADES.map((d) => (
            <Chip key={d} texto={d === 1 ? "1 dia" : `${d} dias`} selecionado={dias === d} onPress={() => setDias(d)} />
          ))}
        </View>
        <Text style={styles.dica}>
          {erros.expira_em ?? "Prefira prazos curtos. Cada link aceita um único envio e pode ser revogado a qualquer momento."}
        </Text>
      </View>
    </Folha>
  );
}

const styles = StyleSheet.create({
  rotulo: { fontSize: 14, fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dica: { ...font.small },
  acoes: { flexDirection: "row", gap: spacing.smd },
  caixaLink: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: spacing.smd,
  },
  url: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.primaryDark, fontWeight: "600" },
  seguranca: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.smd,
  },
  segurancaTitulo: { fontSize: 14, fontWeight: "700", color: colors.warningText },
  segurancaTexto: { fontSize: 13, lineHeight: 19, color: colors.warningText },
  alerta: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: colors.warningSoft, borderRadius: radius.sm, padding: spacing.smd },
  alertaTexto: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.warningText },
  erro: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: spacing.smd },
  erroTexto: { flex: 1, color: colors.danger, fontSize: 14, lineHeight: 20 },
});
