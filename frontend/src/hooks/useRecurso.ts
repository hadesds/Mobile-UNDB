import { DependencyList, useCallback, useEffect, useRef, useState } from "react";

/** Dados iniciais dispensam o primeiro GET; recarregar continua consultando a API. */
export function useRecurso<T>(carregar: () => Promise<T>, deps: DependencyList, inicial: T | null = null) {
  const [dados, setDados] = useState<T | null>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(inicial === null);
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
    if (inicial !== null) {
      ++ultima.current;
      setDados(inicial);
      setErro(null);
      setCarregando(false);
    } else {
      void recarregar();
    }
  }, [recarregar, inicial]);

  return { dados, setDados, erro, carregando, recarregar };
}
