import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";

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
 * SAFE for pre-BU: Uses useOptionalBuClient() and disables search until BU is selected.
 */
export function useGlobalSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const { client, buId, isReady } = useOptionalBuClient();

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
    queryKey: ["global-search", buId, debouncedQuery],
    queryFn: async () => {
      if (!buId || !client || debouncedQuery.length < 2) {
        return { query: debouncedQuery, groups: [] };
      }

      console.log("[useGlobalSearch] Invoking global-search with:", {
        bu_id: buId,
        q: debouncedQuery,
      });

      const { data, error } = await client.functions.invoke("global-search", {
        body: {
          bu_id: buId,
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
    if (!isReady) return false;
    return debouncedQuery.length >= 2 && !isLoading && totalResults === 0;
  }, [isReady, debouncedQuery, isLoading, totalResults]);

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
    disabled: !isReady,
  };
}
