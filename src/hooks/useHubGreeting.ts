import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "hub_greetings_cache";
const MAX_CACHED_GREETINGS = 15;
const MIN_POOL_SIZE = 5;

interface CachedGreeting {
  greeting: string;
  subtext: string;
  generatedAt: string;
}

interface CacheData {
  greetings: CachedGreeting[];
  lastUsedIndex: number;
}

interface GreetingContext {
  userName?: string | null;
  userGender?: "male" | "female" | null;
  buName?: string | null;
  okrSummary?: string | null;
  kpiSummary?: string | null;
}

interface UseHubGreetingReturn {
  greeting: string;
  subtext: string;
  isLoading: boolean;
  error: string | null;
}

const FALLBACK_GREETING = "Buenas!";
const FALLBACK_SUBTEXT = "Menos ruído. Mais clareza.";

function getPeriodOfDay(): "morning" | "afternoon" | "night" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "night";
}

function getDayOfWeek(): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[new Date().getDay()];
}

function getInitialGreeting(): { greeting: string; subtext: string; hasCached: boolean } {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const cache: CacheData = JSON.parse(cached);

      // If the cache only contains the fallback, treat as empty (forces a real fetch)
      cache.greetings = cache.greetings.filter(
        (g) => !(g.greeting === FALLBACK_GREETING && g.subtext === FALLBACK_SUBTEXT)
      );
      if (cache.greetings.length === 0) {
        localStorage.removeItem(CACHE_KEY);
        return { greeting: FALLBACK_GREETING, subtext: FALLBACK_SUBTEXT, hasCached: false };
      }

      // Pick a random different index than last used
      let index: number;
      if (cache.greetings.length === 1) {
        index = 0;
      } else {
        do {
          index = Math.floor(Math.random() * cache.greetings.length);
        } while (index === cache.lastUsedIndex);
      }

      // Update last used index
      cache.lastUsedIndex = index;
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

      return {
        greeting: cache.greetings[index].greeting,
        subtext: cache.greetings[index].subtext,
        hasCached: true,
      };
    }
  } catch {}
  return { greeting: FALLBACK_GREETING, subtext: FALLBACK_SUBTEXT, hasCached: false };
}

export function useHubGreeting(context: GreetingContext): UseHubGreetingReturn {
  // Get initial greeting once at mount (with random selection from cache)
  const initialRef = useRef(getInitialGreeting());
  
  const [greeting, setGreeting] = useState<string>(initialRef.current.greeting);
  const [subtext, setSubtext] = useState<string>(initialRef.current.subtext);
  const [isLoading, setIsLoading] = useState(!initialRef.current.hasCached);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const authRetryRef = useRef(false);

  const getCache = useCallback((): CacheData => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return { greetings: [], lastUsedIndex: -1 };
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem(CACHE_KEY);
      return { greetings: [], lastUsedIndex: -1 };
    }
  }, []);

  const saveToCache = useCallback(
    (newGreeting: string, newSubtext: string, generatedAt: string) => {
      const cache = getCache();

      // Check if greeting already exists
      const exists = cache.greetings.some(
        (g) => g.greeting === newGreeting && g.subtext === newSubtext
      );
      if (exists) return;

      // Add new greeting at the beginning
      cache.greetings.unshift({ greeting: newGreeting, subtext: newSubtext, generatedAt });

      // Keep only the last N greetings
      if (cache.greetings.length > MAX_CACHED_GREETINGS) {
        cache.greetings = cache.greetings.slice(0, MAX_CACHED_GREETINGS);
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    },
    [getCache]
  );

  const getRandomCachedGreeting = useCallback((): CachedGreeting | null => {
    const cache = getCache();
    if (cache.greetings.length === 0) return null;

    let index: number;
    if (cache.greetings.length === 1) {
      index = 0;
    } else {
      do {
        index = Math.floor(Math.random() * cache.greetings.length);
      } while (index === cache.lastUsedIndex && cache.greetings.length > 1);
    }

    // Update last used index
    cache.lastUsedIndex = index;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

    return cache.greetings[index];
  }, [getCache]);

  useEffect(() => {
    // Importante: não travar no fallback.
    // O fetch pode acontecer antes do session estar 100% pronto; então permitimos re-tentativa leve.

    let cancelled = false;
    authRetryRef.current = false;

    const fetchGreeting = async (opts?: { silent?: boolean }) => {
      const isSilent = !!opts?.silent;
      if (!isSilent) setIsLoading(true);
      setError(null);

      let keepLoadingForRetry = false;

      try {
        // Garante que existe session antes de chamar a function (evita 401 logo após login)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session?.access_token) {
          throw new Error("Unauthorized: session not ready");
        }

        const recentGreetings = getCache().greetings.map((g) => g.greeting).slice(0, 10);

        const { data, error: fnError } = await supabase.functions.invoke("hub-greeting", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: {
            userName: context.userName,
            userGender: context.userGender,
            periodOfDay: getPeriodOfDay(),
            dayOfWeek: getDayOfWeek(),
            buName: context.buName,
            okrSummary: context.okrSummary,
            kpiSummary: context.kpiSummary,
            recentGreetings,
          },
        });

        if (fnError) throw new Error(fnError.message);
        if (data?.error) throw new Error(data.error);

        if (!data?.greeting || !data?.subtext) {
          throw new Error("Empty response");
        }

        if (cancelled) return;

        setGreeting(data.greeting);
        setSubtext(data.subtext);
        saveToCache(data.greeting, data.subtext, data.generatedAt);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar saudação";

        // Se o session ainda não estiver pronto, a function pode responder 401.
        // Fazemos UMA re-tentativa silenciosa curta (mantendo loading na 1ª tentativa).
        if (!authRetryRef.current && /unauthorized|jwt|permission/i.test(message)) {
          authRetryRef.current = true;
          keepLoadingForRetry = !isSilent;
          setTimeout(() => {
            if (!cancelled) void fetchGreeting({ silent: true });
          }, 800);
          return;
        }

        if (cancelled) return;

        console.error("[useHubGreeting] Failed to fetch hub greeting:", err);
        setError(message);

        const cached = getRandomCachedGreeting();
        if (cached) {
          setGreeting(cached.greeting);
          setSubtext(cached.subtext);
        } else {
          setGreeting(FALLBACK_GREETING);
          setSubtext(FALLBACK_SUBTEXT);
        }
      } finally {
        if (!cancelled && !keepLoadingForRetry) setIsLoading(false);
      }
    };

    if (initialRef.current.hasCached) {
      void fetchGreeting({ silent: true });
    } else {
      void fetchGreeting();
    }

    return () => {
      cancelled = true;
    };
  }, [
    context.userName,
    context.userGender,
    context.buName,
    context.okrSummary,
    context.kpiSummary,
    getCache,
    saveToCache,
    getRandomCachedGreeting,
  ]);

  return { greeting, subtext, isLoading, error };
}
