import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as api from "../api/candidaturas";
import type { Candidatura, CandidaturaResumo } from "../types";
import { useAuth } from "./auth";

type Valor = {
  lista: CandidaturaResumo[] | null;
  erro: string | null;
  carregando: boolean;
  /** `silencioso` atualiza sem acionar o indicador de carregamento. */
  recarregar: (opcoes?: { silencioso?: boolean }) => Promise<void>;
  /** Candidatura da vaga, se o aluno já se candidatou. */
  daVaga: (vagaId: number) => CandidaturaResumo | undefined;
  candidatar: (vagaId: number) => Promise<Candidatura>;
  /** Atualiza o resumo na lista depois de ver/reanalisar o detalhe. */
  sincronizar: (c: Candidatura) => void;
};

const Ctx = createContext<Valor | null>(null);

function resumo(c: Candidatura): CandidaturaResumo {
  const { historico: _h, encaminhada_em: _e, analise, ...resto } = c;
  return {
    ...resto,
    analise: analise
      ? { id: analise.id, score: analise.score, faixa: analise.faixa, criada_em: analise.criada_em }
      : null,
  };
}

export function CandidaturasProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  const ehAluno = usuario?.perfil === "aluno";
  const [lista, setLista] = useState<CandidaturaResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async (opcoes?: { silencioso?: boolean }) => {
    if (!ehAluno) return;
    if (!opcoes?.silencioso) setCarregando(true);
    setErro(null);
    try {
      setLista(await api.listarCandidaturas());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setCarregando(false);
    }
  }, [ehAluno]);

  useEffect(() => {
    setLista(null);
    recarregar();
    // Recarrega também quando o consentimento LGPD muda na aba Conta.
  }, [recarregar, usuario?.id, usuario?.aluno?.consentimento_vigente]);

  const sincronizar = useCallback((c: Candidatura) => {
    setLista((atual) => {
      const novo = resumo(c);
      if (!atual) return [novo];
      const existe = atual.some((x) => x.id === c.id);
      return existe ? atual.map((x) => (x.id === c.id ? novo : x)) : [novo, ...atual];
    });
  }, []);

  const valor = useMemo<Valor>(
    () => ({
      lista,
      erro,
      carregando,
      recarregar,
      daVaga: (vagaId) => lista?.find((c) => c.vaga.id === vagaId),
      candidatar: async (vagaId) => {
        const c = await api.candidatar(vagaId);
        sincronizar(c);
        return c;
      },
      sincronizar,
    }),
    [lista, erro, carregando, recarregar, sincronizar],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useCandidaturas() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCandidaturas precisa estar dentro de <CandidaturasProvider>.");
  return ctx;
}
