import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";

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

export function useGlobalSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const { currentBu } = useBu();

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
    error,
    refetch,
  } = useQuery<SearchResponse>({
    queryKey: ["global-search", currentBu?.id, debouncedQuery],
    queryFn: async () => {
      if (!currentBu?.id || debouncedQuery.length < 2) {
        return { query: debouncedQuery, groups: [] };
      }

      const { data, error } = await supabase.functions.invoke("global-search", {
        body: {
          bu_id: currentBu.id,
          q: debouncedQuery,
          limit_per_type: 5,
        },
      });

      if (error) throw error;
      return data as SearchResponse;
    },
    enabled: !!currentBu?.id && debouncedQuery.length >= 2,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
  });

  const totalResults = useMemo(() => {
    if (!data?.groups) return 0;
    return data.groups.reduce((acc, group) => acc + group.results.length, 0);
  }, [data?.groups]);

  const isEmpty = useMemo(() => {
    return debouncedQuery.length >= 2 && !isLoading && totalResults === 0;
  }, [debouncedQuery, isLoading, totalResults]);

  return {
    query,
    setQuery,
    debouncedQuery,
    results: data?.groups || [],
    totalResults,
    isLoading: isLoading && debouncedQuery.length >= 2,
    isEmpty,
    error,
    refetch,
  };
}
