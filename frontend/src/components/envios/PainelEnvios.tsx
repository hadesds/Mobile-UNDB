import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { buscarSolicitacao, FiltroLinks, listarLinks, listarSolicitacoes, revogarLink } from "../../api/envios";
import { colors, font, spacing } from "../../constants/theme";
import { useRecurso } from "../../hooks/useRecurso";
import type { LinkEmpresa, SituacaoLink, SolicitacaoVaga, StatusSolicitacao } from "../../types";
import {
  formatarData,
  formatarDataHora,
  ROTULO_IDIOMA,
  ROTULO_MODALIDADE,
  ROTULO_NIVEL_IDIOMA,
  ROTULO_SITUACAO_LINK,
  ROTULO_STATUS_SOLICITACAO,
  ROTULO_TIPO,
  rotuloValidade,
  tempoRelativo,
} from "../../utils/formatos";
import { Grupo, Linha } from "../gestao/Lista";
import { CabecalhoTela } from "../Layout/CabecalhoTela";
import { Avatar, Botao, Chip, EsqueletoLista, Folha, Icone, Segmentado, Tom, useAviso, Vazio } from "../Ui";
import { FolhaGerarLink } from "./FolhaGerarLink";

const TOM_SITUACAO: Record<SituacaoLink, Tom> = {
  ativo: "marca",
  utilizado: "sucesso",
  expirado: "neutro",
  revogado: "perigo",
  empresa_inativa: "alerta",
};
const TOM_STATUS: Record<StatusSolicitacao, Tom> = { pendente: "alerta", publicada: "sucesso", recusada: "neutro" };

type Aba = "links" | "recebidas";
type FiltroL = FiltroLinks | "todos";

const FILTROS_LINK: { valor: FiltroL; rotulo: string }[] = [
  { valor: "ativo", rotulo: "Aguardando envio" },
  { valor: "utilizado", rotulo: "Preenchidos" },
  { valor: "encerrado", rotulo: "Expirados ou revogados" },
  { valor: "todos", rotulo: "Todos" },
];
const FILTROS_RECEBIDAS: { valor: StatusSolicitacao; rotulo: string }[] = [
  { valor: "pendente", rotulo: "Aguardando revisão" },
  { valor: "publicada", rotulo: "Publicadas" },
  { valor: "recusada", rotulo: "Recusadas" },
];

type Props = {
  /** Gestor revisa e publica; a administração só consulta as vagas recebidas. */
  podeRevisar: boolean;
  /** Abre a revisão (gestor). Sem ela, a vaga recebida abre num resumo somente leitura. */
  onAbrirSolicitacao?: (s: { id: number; status: StatusSolicitacao; vaga: number | null }) => void;
};

/** Links de envio para empresas e as vagas que elas já enviaram. */
export function PainelEnvios({ podeRevisar, onAbrirSolicitacao }: Props) {
  const avisar = useAviso();
  const [aba, setAba] = useState<Aba>("links");
  const [filtroLink, setFiltroLink] = useState<FiltroL>("ativo");
  const [filtroRec, setFiltroRec] = useState<StatusSolicitacao>("pendente");
  const [gerando, setGerando] = useState(false);
  const [linkAberto, setLinkAberto] = useState<LinkEmpresa | null>(null);
  const [resumo, setResumo] = useState<SolicitacaoVaga | null>(null);
  const [confirmarRevogar, setConfirmarRevogar] = useState(false);
  const [revogando, setRevogando] = useState(false);

  const links = useRecurso(() => listarLinks(filtroLink === "todos" ? undefined : filtroLink), [filtroLink]);
  const recebidas = useRecurso(() => listarSolicitacoes(filtroRec), [filtroRec]);
  const pendentes = useRecurso(() => listarSolicitacoes("pendente"), []);

  const recarregarTudo = useCallback(() => {
    links.recarregar();
    recebidas.recarregar();
    pendentes.recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links.recarregar, recebidas.recarregar, pendentes.recarregar]);

  // Volta da revisão ou de outra aba: reflete publicações e novos envios.
  // A ref evita recarregar tudo quando só um filtro muda (o callback mudaria de identidade).
  const primeiroFoco = useRef(true);
  const recarregarRef = useRef(recarregarTudo);
  recarregarRef.current = recarregarTudo;
  useFocusEffect(
    useCallback(() => {
      if (primeiroFoco.current) primeiroFoco.current = false;
      else recarregarRef.current();
    }, []),
  );

  useEffect(() => setConfirmarRevogar(false), [linkAberto]);

  async function revogar() {
    if (!linkAberto) return;
    if (!confirmarRevogar) {
      setConfirmarRevogar(true);
      return;
    }
    setRevogando(true);
    try {
      await revogarLink(linkAberto.id);
      avisar("Link revogado: ele não aceita mais envios");
      setLinkAberto(null);
      links.recarregar();
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível revogar", "erro");
    } finally {
      setRevogando(false);
    }
  }

  function abrirSolicitacao(s: SolicitacaoVaga | NonNullable<LinkEmpresa["solicitacao"]>) {
    setLinkAberto(null);
    if (podeRevisar && onAbrirSolicitacao && s.status !== "recusada") {
      onAbrirSolicitacao(s);
      return;
    }
    if ("empresa_nome" in s) setResumo(s);
    else buscarSolicitacao(s.id).then(setResumo).catch(() => avisar("Não foi possível abrir a vaga recebida", "erro"));
  }

  const nPendentes = pendentes.dados?.count ?? 0;
  const atual = aba === "links" ? links : recebidas;

  return (
    <ScrollView
      style={styles.raiz}
      contentContainerStyle={styles.conteudo}
      refreshControl={
        <RefreshControl refreshing={atual.carregando && !!atual.dados} onRefresh={recarregarTudo} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <CabecalhoTela
        titulo="Envios de empresas"
        subtitulo="Gere um link para a empresa enviar a vaga. Tudo passa pela revisão do TEIA."
        acao={<Botao titulo="Gerar" icone="link" compacto onPress={() => setGerando(true)} rotuloAcessivel="Gerar link para empresa" />}
      >
        <Segmentado
          rotuloAcessivel="Seção"
          opcoes={[
            { valor: "links", rotulo: "Links" },
            { valor: "recebidas", rotulo: nPendentes ? `Recebidas (${nPendentes})` : "Recebidas" },
          ]}
          valor={aba}
          onAlterar={(v) => v && setAba(v)}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {aba === "links"
            ? FILTROS_LINK.map((f) => (
                <Chip key={f.valor} texto={f.rotulo} selecionado={filtroLink === f.valor} onPress={() => setFiltroLink(f.valor)} />
              ))
            : FILTROS_RECEBIDAS.map((f) => (
                <Chip key={f.valor} texto={f.rotulo} selecionado={filtroRec === f.valor} onPress={() => setFiltroRec(f.valor)} />
              ))}
        </ScrollView>
      </CabecalhoTela>

      <View style={styles.corpo}>
        {atual.carregando && !atual.dados ? (
          <EsqueletoLista itens={3} />
        ) : atual.erro && !atual.dados ? (
          <Vazio icone="alerta" titulo="Não deu para carregar" texto={atual.erro} acao={<Botao titulo="Tentar novamente" variante="contorno" onPress={atual.recarregar} />} />
        ) : aba === "links" ? (
          <ListaLinks links={links.dados?.results ?? []} filtro={filtroLink} onAbrir={setLinkAberto} onGerar={() => setGerando(true)} />
        ) : (
          <ListaRecebidas itens={recebidas.dados?.results ?? []} filtro={filtroRec} onAbrir={abrirSolicitacao} />
        )}
      </View>

      <FolhaGerarLink
        visivel={gerando}
        onFechar={() => setGerando(false)}
        onGerado={() => {
          setFiltroLink("ativo");
          setAba("links");
          links.recarregar();
        }}
      />

      <Folha
        visivel={!!linkAberto}
        onFechar={() => !revogando && setLinkAberto(null)}
        titulo={linkAberto?.empresa_nome}
        subtitulo={linkAberto ? ROTULO_SITUACAO_LINK[linkAberto.situacao] : undefined}
        rodape={
          linkAberto?.situacao === "ativo" ? (
            <>
              {confirmarRevogar && (
                <Text style={styles.aviso} accessibilityLiveRegion="assertive">
                  A empresa não poderá mais usar este link. Essa ação não pode ser desfeita.
                </Text>
              )}
              <Botao
                titulo={confirmarRevogar ? "Confirmar revogação" : "Revogar link"}
                icone="bloquear"
                variante="perigo"
                carregando={revogando}
                onPress={revogar}
              />
            </>
          ) : linkAberto?.solicitacao ? (
            <Botao
              titulo={podeRevisar && linkAberto.solicitacao.status === "pendente" ? "Revisar vaga recebida" : "Ver vaga recebida"}
              icone="direita"
              onPress={() => abrirSolicitacao(linkAberto.solicitacao!)}
            />
          ) : undefined
        }
      >
        {linkAberto && <DetalheLink link={linkAberto} />}
      </Folha>

      <Folha
        visivel={!!resumo}
        onFechar={() => setResumo(null)}
        titulo={resumo?.titulo}
        subtitulo={resumo ? `${resumo.empresa_nome} · ${ROTULO_STATUS_SOLICITACAO[resumo.status]}` : undefined}
      >
        {resumo && <ResumoSolicitacao s={resumo} />}
      </Folha>
    </ScrollView>
  );
}

function ListaLinks({ links, filtro, onAbrir, onGerar }: {
  links: LinkEmpresa[];
  filtro: FiltroL;
  onAbrir: (l: LinkEmpresa) => void;
  onGerar: () => void;
}) {
  if (!links.length) {
    return (
      <Vazio
        icone="link"
        titulo={filtro === "ativo" ? "Nenhum link aguardando envio" : filtro === "utilizado" ? "Nenhuma empresa preencheu ainda" : "Nada por aqui"}
        texto="Gere um link, envie ao contato da empresa e acompanhe aqui quando ela preencher."
        acao={filtro === "ativo" ? <Botao titulo="Gerar link" icone="link" onPress={onGerar} /> : undefined}
      />
    );
  }
  return (
    <Grupo titulo={`${links.length} link${links.length === 1 ? "" : "s"}`}>
      {links.map((l, i) => (
        <Linha
          key={l.id}
          primeira={i === 0}
          apagada={l.situacao === "expirado" || l.situacao === "revogado"}
          inicio={<Avatar nome={l.empresa_nome} tamanho={40} />}
          titulo={l.empresa_nome}
          subtitulo={subtituloLink(l)}
          abaixo={
            <>
              <Chip texto={ROTULO_SITUACAO_LINK[l.situacao]!} tom={TOM_SITUACAO[l.situacao]} />
              {l.solicitacao && (
                <Chip texto={ROTULO_STATUS_SOLICITACAO[l.solicitacao.status]!} tom={TOM_STATUS[l.solicitacao.status]} />
              )}
            </>
          }
          onPress={() => onAbrir(l)}
          rotuloAcessivel={`${l.empresa_nome}. ${ROTULO_SITUACAO_LINK[l.situacao]}. ${subtituloLink(l)}. Ver detalhes`}
        />
      ))}
    </Grupo>
  );
}

function subtituloLink(l: LinkEmpresa): string {
  if (l.solicitacao) return `“${l.solicitacao.titulo}” · enviada ${tempoRelativo(l.solicitacao.criada_em)}`;
  if (l.situacao === "revogado") return `Revogado${l.revogado_por_nome ? ` por ${l.revogado_por_nome}` : ""}`;
  return `${l.token_prefixo}… · ${rotuloValidade(l.expira_em)}`;
}

function ListaRecebidas({ itens, filtro, onAbrir }: {
  itens: SolicitacaoVaga[];
  filtro: StatusSolicitacao;
  onAbrir: (s: SolicitacaoVaga) => void;
}) {
  if (!itens.length) {
    return (
      <Vazio
        icone="vagas"
        titulo={filtro === "pendente" ? "Nenhuma vaga para revisar" : `Nenhuma vaga ${ROTULO_STATUS_SOLICITACAO[filtro]!.toLowerCase()}`}
        texto="Quando uma empresa preencher o formulário, a vaga aparece aqui para revisão antes de chegar aos alunos."
      />
    );
  }
  return (
    <Grupo titulo={`${itens.length} vaga${itens.length === 1 ? "" : "s"}`}>
      {itens.map((s, i) => (
        <Linha
          key={s.id}
          primeira={i === 0}
          inicio={<Avatar nome={s.empresa_nome} tamanho={40} />}
          titulo={s.titulo}
          subtitulo={`${s.empresa_nome} · enviada ${tempoRelativo(s.criada_em)}`}
          abaixo={
            <>
              <Chip texto={ROTULO_STATUS_SOLICITACAO[s.status]!} tom={TOM_STATUS[s.status]} />
              {!!s.revisado_por_nome && <Chip texto={`por ${s.revisado_por_nome}`} />}
            </>
          }
          onPress={() => onAbrir(s)}
          rotuloAcessivel={`${s.titulo}, ${s.empresa_nome}. ${ROTULO_STATUS_SOLICITACAO[s.status]}. Abrir`}
        />
      ))}
    </Grupo>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoRotulo}>{rotulo}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

function DetalheLink({ link }: { link: LinkEmpresa }) {
  return (
    <>
      <Info rotulo="Identificação" valor={`${link.token_prefixo}… (o endereço completo só aparece na criação)`} />
      <Info rotulo="Criado por" valor={`${link.criado_por_nome} · ${formatarDataHora(link.criado_em)}`} />
      <Info rotulo="Validade" valor={`${formatarDataHora(link.expira_em)} (${rotuloValidade(link.expira_em)})`} />
      {link.revogado_em && (
        <Info rotulo="Revogado" valor={`${formatarDataHora(link.revogado_em)}${link.revogado_por_nome ? ` por ${link.revogado_por_nome}` : ""}`} />
      )}
      {link.solicitacao && (
        <Info
          rotulo="Vaga recebida"
          valor={`“${link.solicitacao.titulo}” em ${formatarDataHora(link.solicitacao.criada_em)} · ${ROTULO_STATUS_SOLICITACAO[link.solicitacao.status]}`}
        />
      )}
      {link.situacao === "ativo" && (
        <View style={styles.dica}>
          <Icone nome="escudo" tamanho={16} cor={colors.muted} />
          <Text style={styles.dicaTexto}>
            Perdeu o link ou enviou para a pessoa errada? Revogue e gere outro: o TEIA não guarda o endereço completo.
          </Text>
        </View>
      )}
    </>
  );
}

/** Resumo somente leitura (administração ou vaga recusada). */
function ResumoSolicitacao({ s }: { s: SolicitacaoVaga }) {
  return (
    <>
      <Info rotulo="Tipo e modalidade" valor={`${ROTULO_TIPO[s.tipo]} · ${ROTULO_MODALIDADE[s.modalidade]}`} />
      <Info rotulo="Prazo" valor={formatarData(s.prazo)} />
      <Info rotulo="Enviada em" valor={formatarDataHora(s.criada_em)} />
      {!!s.revisado_por_nome && <Info rotulo="Revisada por" valor={s.revisado_por_nome} />}
      {!!s.descricao && <Info rotulo="Descrição" valor={s.descricao} />}
      <Info
        rotulo="Competências"
        valor={
          s.requisitos_competencia.map((c) => `${c.competencia_nome}${c.obrigatorio ? "" : " (desejável)"}`).join(", ") || "Nenhuma"
        }
      />
      <Info
        rotulo="Idiomas"
        valor={
          s.requisitos_idioma
            .map((i) => `${ROTULO_IDIOMA[i.idioma] ?? i.idioma} ${ROTULO_NIVEL_IDIOMA[i.nivel_minimo] ?? ""}`.trim())
            .join(", ") || "Nenhum"
        }
      />
      {!!s.periodo_minimo && <Info rotulo="Semestre mínimo" valor={`${s.periodo_minimo}º`} />}
      {!!s.disponibilidade_horario && <Info rotulo="Horário" valor={s.disponibilidade_horario} />}
    </>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  conteudo: { paddingBottom: spacing.xl },
  corpo: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.md },
  info: { gap: 2 },
  infoRotulo: { ...font.label },
  infoValor: { ...font.body },
  aviso: { ...font.small, color: colors.danger, textAlign: "center" },
  dica: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  dicaTexto: { flex: 1, ...font.small },
});
