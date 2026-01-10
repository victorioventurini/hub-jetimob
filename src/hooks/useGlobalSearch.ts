import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBu } from "@/contexts/BuContext";
import { supabase } from "@/integrations/supabase/client";
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
  const { currentBuId } = useBu();

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<SearchResponse>({
    queryKey: queryKeys.search.global(currentBuId ?? null, debouncedQuery),
    queryFn: async () => {
      if (!currentBuId || debouncedQuery.length < 2) {
        return { query: debouncedQuery, groups: [] };
      }

      console.log("[useGlobalSearch] Invoking global-search with:", {
        bu_id: currentBuId,
        q: debouncedQuery,
      });

      // Use the global supabase client which has the auth session
      const { data, error } = await supabase.functions.invoke("global-search", {
        body: {
          bu_id: currentBuId,
          q: debouncedQuery,
          limit_per_type: 5,
        },
      });

      if (error) {
        console.error("[useGlobalSearch] Error:", error);
        throw error;
      }

      console.log("[useGlobalSearch] Response:", data);
      
      // Handle edge function error response
      if (data?.error) {
        console.error("[useGlobalSearch] Function error:", data.error);
        throw new Error(data.error);
      }

      return data as SearchResponse;
    },
    enabled: !!currentBuId && debouncedQuery.length >= 2,
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
    disabled: !currentBuId,
  };
}
