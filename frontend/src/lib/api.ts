import { API_BASE } from "./env";

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string,
  ) {
    super(message);
  }
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean; // envia o token (padrão: true)
};

// O token fica aqui em memória; o AuthProvider (lib/auth.tsx) o mantém atualizado.
let accessToken: string | null = null;
let aoExpirar: (() => void) | null = null;

export function definirToken(token: string | null) {
  accessToken = token;
}

export function aoSessaoExpirar(fn: (() => void) | null) {
  aoExpirar = fn;
}

/** Junta as mensagens de erro do DRF ({campo: [msg]}) num texto legível. */
function mensagemDeErro(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    const partes = Object.values(d)
      .flat()
      .filter((v): v is string => typeof v === "string");
    if (partes.length) return partes.join("\n");
  }
  return `Erro ${status}`;
}

export async function request<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, null, "Não foi possível conectar ao servidor.");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && opts.auth !== false) aoExpirar?.();
    throw new ApiError(res.status, data, mensagemDeErro(data, res.status));
  }
  return data as T;
}