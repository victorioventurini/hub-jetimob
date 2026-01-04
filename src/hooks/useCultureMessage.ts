import { useState, useEffect, useCallback, useRef } from "react";
import { CULTURE_MESSAGES, getRandomCultureMessage } from "@/data/cultureMessages";

const CACHE_KEY = "culture_messages_used";
const MAX_RECENTLY_USED = 20;

interface UseCultureMessageReturn {
  message: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook que retorna mensagens de cultura pré-geradas (100+).
 * Não faz chamadas de IA - usa pool local para eliminar consumo.
 */
export function useCultureMessage(): UseCultureMessageReturn {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  const getRecentlyUsed = useCallback((): string[] => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return [];
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem(CACHE_KEY);
      return [];
    }
  }, []);

  const markAsUsed = useCallback((msg: string) => {
    const recent = getRecentlyUsed();
    // Adiciona no início, evita duplicatas
    const updated = [msg, ...recent.filter((m) => m !== msg)].slice(0, MAX_RECENTLY_USED);
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  }, [getRecentlyUsed]);

  const pickMessage = useCallback(() => {
    const recent = getRecentlyUsed();
    const selected = getRandomCultureMessage(recent, 15);
    markAsUsed(selected);
    return selected;
  }, [getRecentlyUsed, markAsUsed]);

  const refresh = useCallback(async () => {
    const newMsg = pickMessage();
    setMessage(newMsg);
  }, [pickMessage]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Seleciona uma mensagem do pool de 100+
    const selected = pickMessage();
    setMessage(selected);
    setIsLoading(false);
  }, [pickMessage]);

  return { 
    message, 
    isLoading, 
    error: null, // Sem erros possíveis - tudo local
    refresh 
  };
}
