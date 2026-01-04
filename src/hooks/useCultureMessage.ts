import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "culture_message_cache";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData {
  message: string;
  generatedAt: string;
  cachedAt: number;
}

interface UseCultureMessageReturn {
  message: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCultureMessage(): UseCultureMessageReturn {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCachedMessage = useCallback((): CacheData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const data: CacheData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is still valid (24h)
      if (now - data.cachedAt < CACHE_DURATION_MS) {
        return data;
      }
      
      // Cache expired
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  const setCachedMessage = useCallback((msg: string, generatedAt: string) => {
    const cacheData: CacheData = {
      message: msg,
      generatedAt,
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  }, []);

  const fetchMessage = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCachedMessage();
      if (cached) {
        setMessage(cached.message);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("culture-message");

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.message) {
        setMessage(data.message);
        setCachedMessage(data.message, data.generatedAt);
      }
    } catch (err) {
      console.error("Failed to fetch culture message:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar mensagem");
      
      // Try to use cached message as fallback
      const cached = getCachedMessage();
      if (cached) {
        setMessage(cached.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getCachedMessage, setCachedMessage]);

  const refresh = useCallback(async () => {
    localStorage.removeItem(CACHE_KEY);
    await fetchMessage(true);
  }, [fetchMessage]);

  useEffect(() => {
    fetchMessage();
  }, [fetchMessage]);

  return { message, isLoading, error, refresh };
}
