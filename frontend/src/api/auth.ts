import { request } from "../lib/api";
import type { RespostaLogin, Usuario } from "../types";

export const login = (email: string, password: string) =>
  request<RespostaLogin>("/auth/login/", {
    method: "POST",
    body: { email, password },
    auth: false,
  });

export type DadosCadastro = {
  email: string;
  nome: string;
  password: string;
  matricula: string;
  curso: number;
  periodo: number;
  aceite_lgpd: boolean;
};

export const cadastrar = (dados: DadosCadastro) =>
  request<RespostaLogin>("/auth/register/", { method: "POST", body: dados, auth: false });

export const logout = (refresh: string) =>
  request<void>("/auth/logout/", { method: "POST", body: { refresh } });

export const buscarMe = () => request<Usuario>("/me/");