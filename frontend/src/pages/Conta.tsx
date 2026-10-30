import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { alterarConsentimento } from "../api/auth";
import { CabecalhoTela } from "../components/Layout/CabecalhoTela";
import { Expansivel } from "../components/Movimento/Expansivel";
import { Surgir } from "../components/Movimento/Surgir";
import { Avatar, Botao, Cartao, Chip, Folha, Icone, NomeIcone, useAviso } from "../components/Ui";
import { colors, font, spacing } from "../constants/theme";
import { TERMO_LGPD } from "../constants/termos";
import { useAuth } from "../lib/auth";
import { formatarDataHora } from "../utils/formatos";

function Dado({ icone, rotulo, valor }: { icone: NomeIcone; rotulo: string; valor: string }) {
  return (
    <View style={styles.dado}>
      <Icone nome={icone} tamanho={18} cor={colors.muted} />
      <Text style={styles.dadoRotulo}>{rotulo}</Text>
      <Text style={styles.dadoValor}>{valor}</Text>
    </View>
  );
}

export default function Conta() {
  const { usuario, sair, atualizarUsuario } = useAuth();
  const avisar = useAviso();
  const [revogando, setRevogando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [saindo, setSaindo] = useState(false);
  if (!usuario) return null;

  const aluno = usuario.aluno;
  const vigente = !!aluno?.consentimento_vigente;

  async function mudarConsentimento(aceito: boolean) {
    setSalvando(true);
    try {
      await atualizarUsuario(await alterarConsentimento(aceito));
      setRevogando(false);
      avisar(aceito ? "Consentimento registrado" : "Consentimento revogado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Não foi possível atualizar.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.raiz}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <CabecalhoTela titulo="Conta" />

        <View style={styles.corpo}>
          <Surgir style={styles.perfil}>
            <Avatar nome={usuario.nome} tamanho={64} redondo />
            <View style={{ flex: 1 }}>
              <Text style={styles.nome}>{usuario.nome}</Text>
              <Text style={styles.meta}>{usuario.email}</Text>
              {aluno && (
                <Text style={styles.meta}>
                  {aluno.curso.nome} · {aluno.periodo}º semestre
                </Text>
              )}
              {usuario.gestor && (
                <Text style={styles.meta}>
                  {usuario.gestor.cargo || "Gestor(a)"} · {usuario.gestor.nucleo.nome}
                </Text>
              )}
            </View>
          </Surgir>

          {usuario.perfil !== "aluno" && (
            <Surgir indice={1}>
              <Cartao style={styles.aviso}>
                <Icone nome="ajuda" tamanho={20} cor={colors.muted} />
                <Text style={styles.avisoTexto}>
                  A área do gestor (vagas, triagem e encaminhamentos) ainda está em construção no app.
                  Por enquanto, use o painel administrativo do backend.
                </Text>
              </Cartao>
            </Surgir>
          )}

          {aluno && (
            <Surgir indice={1}>
              <Cartao style={styles.secao}>
                <Expansivel
                  rotuloAcessivel="Dados acadêmicos"
                  cabecalho={<Text style={styles.secaoTitulo}>Dados acadêmicos</Text>}
                  conteudoStyle={{ paddingBottom: spacing.xs }}
                >
                  <Dado icone="curriculo" rotulo="Matrícula" valor={aluno.matricula} />
                  <Dado icone="formacao" rotulo="Curso" valor={aluno.curso.nome} />
                  <Dado icone="calendario" rotulo="Semestre" valor={`${aluno.periodo}º`} />
                </Expansivel>
              </Cartao>
            </Surgir>
          )}

          {aluno && (
            <Surgir indice={2}>
              <Cartao style={styles.secao}>
                <Expansivel
                  rotuloAcessivel={`Privacidade. Termo LGPD ${vigente ? "aceito" : "pendente"}`}
                  inicialAberto={!vigente}
                  cabecalho={
                    <View style={styles.privTopo}>
                      <Text style={styles.secaoTitulo}>Privacidade</Text>
                      <Chip
                        texto={vigente ? "Termo aceito" : "Termo pendente"}
                        tom={vigente ? "sucesso" : "alerta"}
                        icone={vigente ? "escudo" : "alerta"}
                      />
                    </View>
                  }
                  conteudoStyle={{ gap: spacing.smd, paddingTop: spacing.sm, paddingBottom: spacing.sm }}
                >
                  <Text style={styles.termo}>“{TERMO_LGPD}”</Text>
                  {vigente && aluno.consentimento_lgpd_em && (
                    <Text style={styles.meta}>Aceito em {formatarDataHora(aluno.consentimento_lgpd_em)}.</Text>
                  )}
                  {vigente ? (
                    <Botao
                      titulo="Revogar consentimento"
                      variante="perigo"
                      compacto
                      onPress={() => setRevogando(true)}
                    />
                  ) : (
                    <>
                      <Text style={styles.meta}>
                        Sem o termo aceito, não analisamos seu currículo nem enviamos candidaturas.
                      </Text>
                      <Botao
                        titulo="Aceitar termo"
                        icone="escudo"
                        compacto
                        carregando={salvando}
                        onPress={() => mudarConsentimento(true)}
                      />
                    </>
                  )}
                </Expansivel>
              </Cartao>
            </Surgir>
          )}

          <Surgir indice={3}>
            <Botao
              titulo="Sair da conta"
              icone="sair"
              variante="contorno"
              carregando={saindo}
              onPress={async () => {
                setSaindo(true);
                await sair();
              }}
            />
          </Surgir>

          <Text style={styles.rodape}>TEIA · Currículo Sob Medida{"\n"}Núcleo de Carreiras · UNDB</Text>
        </View>
      </ScrollView>

      <Folha
        visivel={revogando}
        onFechar={() => !salvando && setRevogando(false)}
        titulo="Revogar consentimento?"
        rodape={
          <>
            <Botao titulo="Revogar" variante="perigo" carregando={salvando} onPress={() => mudarConsentimento(false)} />
            <Botao titulo="Manter consentimento" variante="link" onPress={() => setRevogando(false)} desabilitado={salvando} />
          </>
        }
      >
        <Text style={styles.folhaTexto}>
          Sem o consentimento, o TEIA deixa de analisar seu currículo: você não consegue editar o
          currículo nem enviar novas candidaturas pelo app. Você pode aceitar o termo de novo quando
          quiser.
        </Text>
      </Folha>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colors.background },
  conteudo: { paddingBottom: spacing.xl },
  corpo: { paddingHorizontal: spacing.md, gap: spacing.smd },
  perfil: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  nome: { ...font.h2, fontSize: 20, lineHeight: 26 },
  meta: { ...font.small, fontSize: 14, marginTop: 2 },
  aviso: { flexDirection: "row", gap: spacing.smd, alignItems: "flex-start" },
  avisoTexto: { flex: 1, ...font.small, fontSize: 14, lineHeight: 20 },
  secao: { paddingVertical: spacing.sm },
  secaoTitulo: { ...font.h3 },
  privTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  termo: { ...font.body, fontSize: 14, lineHeight: 21, color: colors.muted, fontStyle: "italic" },
  dado: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  dadoRotulo: { ...font.body, color: colors.muted, flex: 1 },
  dadoValor: { ...font.body, fontWeight: "600" },
  rodape: { ...font.tiny, textAlign: "center", marginTop: spacing.lg, lineHeight: 18 },
  folhaTexto: { ...font.body, color: colors.muted },
});
