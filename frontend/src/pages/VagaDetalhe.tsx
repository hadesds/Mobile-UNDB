import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { buscarVaga } from "../api/vagas";
import { Carregando } from "../components/Layout/Carregando";
import { Tela } from "../components/Layout/Tela";
import { animarLayout } from "../components/Movimento/Expansivel";
import { Surgir } from "../components/Movimento/Surgir";
import { Avatar, Botao, Cartao, Chip, Folha, Icone, NomeIcone } from "../components/Ui";
import { ListaRequisitos } from "../components/vagas/ListaRequisitos";
import { colors, font, spacing } from "../constants/theme";
import { useRecurso } from "../hooks/useRecurso";
import { useReduzirMovimento } from "../hooks/useReduzirMovimento";
import { useCandidaturas } from "../lib/candidaturas";
import type { AppStackParams } from "../lib/navigation";
import {
  ROTULO_IDIOMA,
  ROTULO_MODALIDADE,
  ROTULO_NIVEL_IDIOMA,
  ROTULO_TIPO,
  rotuloPrazo,
} from "../utils/formatos";

type Props = NativeStackScreenProps<AppStackParams, "VagaDetalhe">;

const LIMITE_DESCRICAO = 220;

function Fato({ icone, rotulo, valor, destaque }: { icone: NomeIcone; rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={styles.fato}>
      <Icone nome={icone} tamanho={18} cor={destaque ? colors.warning : colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.fatoRotulo}>{rotulo}</Text>
        <Text style={[styles.fatoValor, destaque && { color: colors.warningText }]}>{valor}</Text>
      </View>
    </View>
  );
}

export default function VagaDetalhe({ route, navigation }: Props) {
  const { id } = route.params;
  const { dados: vaga, erro, recarregar } = useRecurso(() => buscarVaga(id), [id]);
  const candidaturas = useCandidaturas();
  const reduzir = useReduzirMovimento();
  const [requisitosAbertos, setRequisitosAbertos] = useState(false);
  const [descricaoAberta, setDescricaoAberta] = useState(false);

  if (!vaga) return <Carregando erro={erro} onTentarDeNovo={recarregar} />;

  const existente = candidaturas.daVaga(vaga.id);
  const prazo = rotuloPrazo(vaga.prazo);
  const longa = vaga.descricao.length > LIMITE_DESCRICAO;
  const competencias = [...vaga.requisitos_competencia].sort((a, b) => Number(b.obrigatorio) - Number(a.obrigatorio));

  return (
    <>
      <Tela
        rodape={
          existente ? (
            <Botao
              titulo="Ver minha candidatura"
              icone="candidaturas"
              onPress={() => navigation.navigate("Candidatura", { id: existente.id })}
            />
          ) : (
            <>
              <Botao
                titulo="Analisar e me candidatar"
                icone="enviar"
                onPress={() => navigation.navigate("FormularioCandidatura", { id: vaga.id })}
              />
              <Text style={styles.nota}>Você revisa o que acontece antes de enviar.</Text>
            </>
          )
        }
      >
        <Surgir style={styles.topo}>
          <View style={styles.empresa}>
            <Avatar nome={vaga.empresa} tamanho={52} />
            <Text style={styles.empresaNome}>{vaga.empresa}</Text>
          </View>
          <Text style={styles.titulo} accessibilityRole="header">
            {vaga.titulo}
          </Text>
          <View style={styles.chips}>
            {existente && <Chip texto="Candidatura enviada" tom="sucesso" icone="check" />}
            <Chip texto={ROTULO_TIPO[vaga.tipo]} tom="marca" />
            <Chip texto={ROTULO_MODALIDADE[vaga.modalidade]} icone="local" />
          </View>
        </Surgir>

        <Surgir indice={1}>
          <Cartao style={styles.fatos}>
            <Fato icone="calendario" rotulo="Inscrições" valor={prazo.texto} destaque={prazo.urgente} />
            <View style={styles.divisor} />
            <Fato
              icone="formacao"
              rotulo="Semestre mínimo"
              valor={vaga.periodo_minimo ? `${vaga.periodo_minimo}º semestre` : "Não exigido"}
            />
          </Cartao>
        </Surgir>

        {!!vaga.descricao && (
          <Surgir indice={2} style={styles.secao}>
            <Text style={styles.secaoTitulo}>Sobre a oportunidade</Text>
            <Text style={styles.descricao} numberOfLines={longa && !descricaoAberta ? 4 : undefined}>
              {vaga.descricao}
            </Text>
            {longa && (
              <Pressable
                onPress={() => {
                  animarLayout(reduzir);
                  setDescricaoAberta((v) => !v);
                }}
                accessibilityRole="button"
                accessibilityState={{ expanded: descricaoAberta }}
                style={styles.expandir}
                hitSlop={8}
              >
                <Text style={styles.link}>{descricaoAberta ? "Mostrar menos" : "Ler mais"}</Text>
              </Pressable>
            )}
          </Surgir>
        )}

        <Surgir indice={3}>
          <Cartao style={{ gap: spacing.smd }}>
            <Text style={styles.secaoTitulo}>O que a vaga pede</Text>
            {competencias.length > 0 && (
              <View style={styles.chips}>
                {competencias.map((r) => (
                  <Chip
                    key={r.id}
                    texto={r.competencia_nome}
                    tom={r.obrigatorio ? "marca" : "neutro"}
                  />
                ))}
              </View>
            )}
            {vaga.requisitos_idioma.length > 0 && (
              <Text style={styles.idiomas}>
                {vaga.requisitos_idioma
                  .map((r) => `${ROTULO_IDIOMA[r.idioma] ?? r.idioma} ${ROTULO_NIVEL_IDIOMA[r.nivel_minimo]?.toLowerCase()}`)
                  .join(" · ")}
              </Text>
            )}
            <View style={styles.legenda}>
              <View style={[styles.ponto, { backgroundColor: colors.primary }]} />
              <Text style={styles.legendaTexto}>Obrigatório</Text>
              <View style={[styles.ponto, { backgroundColor: colors.borderStrong }]} />
              <Text style={styles.legendaTexto}>Desejável</Text>
            </View>
            <Botao
              titulo="Ver todos os requisitos"
              variante="suave"
              compacto
              onPress={() => setRequisitosAbertos(true)}
            />
          </Cartao>
        </Surgir>
      </Tela>

      <Folha
        visivel={requisitosAbertos}
        onFechar={() => setRequisitosAbertos(false)}
        titulo="Requisitos da empresa"
        subtitulo={`${vaga.titulo} · ${vaga.empresa}`}
      >
        <ListaRequisitos vaga={vaga} />
      </Folha>
    </>
  );
}

const styles = StyleSheet.create({
  topo: { gap: spacing.smd, paddingTop: spacing.sm },
  empresa: { flexDirection: "row", alignItems: "center", gap: spacing.smd },
  empresaNome: { ...font.body, color: colors.muted, fontWeight: "600", flex: 1 },
  titulo: { ...font.title },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  fatos: { gap: spacing.smd },
  fato: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  fatoRotulo: { ...font.tiny },
  fatoValor: { ...font.h3, fontSize: 15 },
  divisor: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  secao: { gap: spacing.sm, marginTop: spacing.sm },
  secaoTitulo: { ...font.h2 },
  descricao: { ...font.body, lineHeight: 23 },
  link: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  expandir: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  idiomas: { ...font.body, color: colors.muted },
  legenda: { flexDirection: "row", alignItems: "center", gap: 6 },
  ponto: { width: 8, height: 8, borderRadius: 4 },
  legendaTexto: { ...font.tiny, marginRight: spacing.sm },
  nota: { textAlign: "center", ...font.small },
});
