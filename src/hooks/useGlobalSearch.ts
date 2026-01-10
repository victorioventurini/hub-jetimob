import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { createBuScopedClient } from "@/integrations/supabase/useBuScopedSupabase";
import { queryKeys } from "@/lib/queryKeys";

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  meta: Record<string, unknown>;
  url: string;
  icon: string;
}

export interface SearchGroup {
  type: string;
  label: string;
  results: SearchResult[];
  hasMore: boolean;
}

export interface SearchResponse {
  query: string;
  groups: SearchGroup[];
}

/**
 * Global search hook.
 * Uses the global supabase client (which has the user session) to invoke edge functions.
 * The bu_id is passed in the request body, not via headers.
 */
export function useGlobalSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  const { currentBuId, isLoading: buLoading } = useBu();
  const { session, isLoading: authLoading } = useAuth();

  const buClient = useMemo(() => {
    if (!currentBuId) return null;
    return createBuScopedClient(currentBuId);
  }, [currentBuId]);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const isReady = !!session && !!currentBuId && !authLoading && !buLoading;

  const { data, isLoading, isFetching, error, refetch } = useQuery<SearchResponse>({
    queryKey: queryKeys.search.global(currentBuId ?? null, debouncedQuery),
    queryFn: async () => {
      if (!isReady || !buClient || debouncedQuery.length < 2) {
        return { query: debouncedQuery, groups: [] };
      }

      const correlationId =
        (globalThis.crypto?.randomUUID?.() as string | undefined) ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const { data, error } = await buClient.functions.invoke("global-search", {
        body: {
          bu_id: currentBuId,
          q: debouncedQuery,
          limit_per_type: 5,
        },
        headers: {
          "x-correlation-id": correlationId,
        },
      });

      if (error) {
        // Evita spam de erro quando o usuário está deslogado / sessão expirada
        const status = (error as any)?.status;
        if (status === 401) {
          console.warn("[useGlobalSearch] Unauthorized (401) - session missing/expired");
          return { query: debouncedQuery, groups: [] };
        }

        console.error("[useGlobalSearch] Error:", error);
        throw error;
      }

      // Handle edge function error response
      if ((data as any)?.error) {
        console.error("[useGlobalSearch] Function error:", (data as any).error);
        throw new Error((data as any).error);
      }

      return data as SearchResponse;
    },
    enabled: isReady && debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
    retry: 1,
  });

  const totalResults = useMemo(() => {
    if (!data?.groups) return 0;
    return data.groups.reduce((acc, group) => acc + group.results.length, 0);
  }, [data?.groups]);

  const isEmpty = useMemo(() => {
    if (!currentBuId) return false;
    return debouncedQuery.length >= 2 && !isLoading && totalResults === 0;
  }, [currentBuId, debouncedQuery, isLoading, totalResults]);

  const authRequired = !authLoading && !session;

  return {
    query,
    setQuery,
    debouncedQuery,
    results: data?.groups || [],
    totalResults,
    isLoading: (isLoading || isFetching) && debouncedQuery.length >= 2,
    isEmpty,
    error,
    refetch,
    disabled: !currentBuId || buLoading,
    authRequired,
  };
}
