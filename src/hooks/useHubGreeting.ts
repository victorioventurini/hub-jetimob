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

export function useHubGreeting(context: GreetingContext): UseHubGreetingReturn {
  const [greeting, setGreeting] = useState<string>(FALLBACK_GREETING);
  const [subtext, setSubtext] = useState<string>(FALLBACK_SUBTEXT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

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

  const fetchGreeting = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const recentGreetings = getCache().greetings.map((g) => g.greeting).slice(0, 10);

        const { data, error: fnError } = await supabase.functions.invoke("hub-greeting", {
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

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        if (data?.greeting && data?.subtext) {
          setGreeting(data.greeting);
          setSubtext(data.subtext);
          saveToCache(data.greeting, data.subtext, data.generatedAt);
          return;
        }

        throw new Error("Empty response");
      } catch (err) {
        console.error("Failed to fetch hub greeting:", err);
        setError(err instanceof Error ? err.message : "Erro ao carregar saudação");

        // Fallback: use cached greeting or default
        const cached = getRandomCachedGreeting();
        if (cached) {
          setGreeting(cached.greeting);
          setSubtext(cached.subtext);
        } else {
          setGreeting(FALLBACK_GREETING);
          setSubtext(FALLBACK_SUBTEXT);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [context, getCache, saveToCache, getRandomCachedGreeting]
  );

  useEffect(() => {
    // Prevent double fetch in StrictMode
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // Prefer showing an existing cached greeting (instant, no cost)
    const cached = getRandomCachedGreeting();
    if (cached) {
      setGreeting(cached.greeting);
      setSubtext(cached.subtext);
      setIsLoading(false);

      // Refill pool only when it's getting small
      if (getCache().greetings.length < MIN_POOL_SIZE) {
        fetchGreeting({ silent: true });
      }
      return;
    }

    // First ever visit (no cache yet): generate one
    fetchGreeting();
  }, [fetchGreeting, getRandomCachedGreeting, getCache]);

  return { greeting, subtext, isLoading, error };
}
