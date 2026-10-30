import { DependencyList, useCallback, useEffect, useRef, useState } from "react";

/** Carrega um recurso da API com estados de carregamento, erro e recarga. */
export function useRecurso<T>(carregar: () => Promise<T>, deps: DependencyList) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  // Só a resposta da chamada mais recente vale (filtros trocados rápido).
  const ultima = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executar = useCallback(carregar, deps);

  const recarregar = useCallback(async () => {
    const minha = ++ultima.current;
    setCarregando(true);
    setErro(null);
    try {
      const novo = await executar();
      if (minha === ultima.current) setDados(novo);
    } catch (e) {
      if (minha === ultima.current) setErro(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      if (minha === ultima.current) setCarregando(false);
    }
  }, [executar]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, setDados, erro, carregando, recarregar };
}
