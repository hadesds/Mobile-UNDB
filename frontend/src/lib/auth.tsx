import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as authApi from "../api/auth";
import type { RespostaLogin, Usuario } from "../types";
import { aoSessaoExpirar, definirToken } from "./api";
import { storage } from "./storage";

const CHAVE = "teia.sessao";

type Sessao = RespostaLogin;

type AuthValor = {
  usuario: Usuario | null;
  carregando: boolean; // true enquanto restaura a sessão salva
  entrar: (email: string, senha: string) => Promise<void>;
  cadastrar: (dados: authApi.DadosCadastro) => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  const aplicar = useCallback(async (nova: Sessao | null) => {
    definirToken(nova?.access ?? null);
    setSessao(nova);
    if (nova) await storage.set(CHAVE, JSON.stringify(nova));
    else await storage.remove(CHAVE);
  }, []);

  // Restaura a sessão salva e confirma que o token ainda vale.
  useEffect(() => {
    (async () => {
      try {
        const salvo = await storage.get(CHAVE);
        if (salvo) {
          const s: Sessao = JSON.parse(salvo);
          definirToken(s.access);
          const usuario = await authApi.buscarMe();
          setSessao({ ...s, usuario });
        }
      } catch {
        await aplicar(null);
      } finally {
        setCarregando(false);
      }
    })();
  }, [aplicar]);

  // Qualquer 401 da API encerra a sessão local (refresh automático fica para depois).
  useEffect(() => {
    aoSessaoExpirar(() => {
      aplicar(null);
    });
    return () => aoSessaoExpirar(null);
  }, [aplicar]);

  const valor = useMemo<AuthValor>(
    () => ({
      usuario: sessao?.usuario ?? null,
      carregando,
      entrar: async (email, senha) => aplicar(await authApi.login(email.trim(), senha)),
      cadastrar: async (dados) => aplicar(await authApi.cadastrar(dados)),
      sair: async () => {
        if (sessao?.refresh) await authApi.logout(sessao.refresh).catch(() => {});
        await aplicar(null);
      },
    }),
    [sessao, carregando, aplicar],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}