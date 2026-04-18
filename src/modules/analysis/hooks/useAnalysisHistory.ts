/**
 * useAnalysisHistory — lista os reports da BU corrente
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { AnalysisReport } from "../types";

const COLUMNS =
  "id,bu_id,created_by,created_at,status,mode,depth,modules,period,premise,title,template_id";

interface Filters {
  limit?: number;
  search?: string;
}

export function useAnalysisHistory(filters: Filters = {}) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const limit = filters.limit ?? 30;

  return useQuery({
    queryKey: analysisKeys.list(buId, filters),
    enabled: !!buId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Pick<AnalysisReport,
      "id" | "bu_id" | "created_by" | "created_at" | "status" | "mode" | "depth" |
      "modules" | "period" | "premise" | "title" | "template_id"
    >[]> => {
      let q = supabase
        .from("analysis_reports")
        .select(COLUMNS)
        .eq("bu_id", buId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filters.search?.trim()) {
        q = q.ilike("premise", `%${filters.search.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as never;
    },
  });
}
