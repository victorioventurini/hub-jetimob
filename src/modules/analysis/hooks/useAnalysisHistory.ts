/**
 * useAnalysisHistory — lista de análises da BU
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { analysisKeys, type AnalysisHistoryFilters } from "@/lib/queryKeys/analysis";
import type { AnalysisReport } from "../types";

const HISTORY_COLUMNS =
  "id, bu_id, created_by, title, premise, mode, depth, modules, status, generated_at, created_at, updated_at";

export function useAnalysisHistory(filters?: AnalysisHistoryFilters) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  return useQuery<AnalysisReport[]>({
    queryKey: analysisKeys.history(currentBuId, filters),
    enabled: Boolean(currentBuId),
    queryFn: async () => {
      let q = supabase
        .from("analysis_reports")
        .select(HISTORY_COLUMNS)
        .eq("bu_id", currentBuId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (filters?.status && filters.status !== "all") {
        q = q.eq("status", filters.status as "pending" | "generating" | "complete" | "failed");
      }
      if (filters?.search) {
        q = q.or(`title.ilike.%${filters.search}%,premise.ilike.%${filters.search}%`);
      }
      if (filters?.authorId) {
        q = q.eq("created_by", filters.authorId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as AnalysisReport[];
    },
  });
}
