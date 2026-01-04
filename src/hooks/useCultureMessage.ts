import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "culture_messages_cache";
const MAX_CACHED_MESSAGES = 20;

interface CachedMessage {
  message: string;
  generatedAt: string;
}

interface CacheData {
  messages: CachedMessage[];
  lastUsedIndex: number;
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
  const hasFetchedRef = useRef(false);

  const getCache = useCallback((): CacheData => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return { messages: [], lastUsedIndex: -1 };
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem(CACHE_KEY);
      return { messages: [], lastUsedIndex: -1 };
    }
  }, []);

  const saveToCache = useCallback((newMessage: string, generatedAt: string) => {
    const cache = getCache();
    
    // Check if message already exists (avoid duplicates)
    const exists = cache.messages.some(m => m.message === newMessage);
    if (exists) return;
    
    // Add new message at the beginning
    cache.messages.unshift({ message: newMessage, generatedAt });
    
    // Keep only the last N messages
    if (cache.messages.length > MAX_CACHED_MESSAGES) {
      cache.messages = cache.messages.slice(0, MAX_CACHED_MESSAGES);
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  }, [getCache]);

  const getRandomCachedMessage = useCallback((): string | null => {
    const cache = getCache();
    if (cache.messages.length === 0) return null;
    
    // Get a random message different from the last used one
    let index: number;
    if (cache.messages.length === 1) {
      index = 0;
    } else {
      do {
        index = Math.floor(Math.random() * cache.messages.length);
      } while (index === cache.lastUsedIndex && cache.messages.length > 1);
    }
    
    // Update last used index
    cache.lastUsedIndex = index;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    
    return cache.messages[index].message;
  }, [getCache]);

  const fetchMessage = useCallback(async () => {
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
        saveToCache(data.message, data.generatedAt);
        return;
      }
      
      throw new Error("Empty response");
    } catch (err) {
      console.error("Failed to fetch culture message:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar mensagem");
      
      // Try to use a cached message as fallback
      const cached = getRandomCachedMessage();
      if (cached) {
        setMessage(cached);
      }
    } finally {
      setIsLoading(false);
    }
  }, [saveToCache, getRandomCachedMessage]);

  const refresh = useCallback(async () => {
    await fetchMessage();
  }, [fetchMessage]);

  useEffect(() => {
    // Prevent double fetch in StrictMode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchMessage();
  }, [fetchMessage]);

  return { message, isLoading, error, refresh };
}
