/**
 * useAnalysisReport — busca um relatório com polling enquanto gera
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { AnalysisReport } from "../types";

const REPORT_COLUMNS =
  "id, bu_id, created_by, title, premise, additional_context, mode, depth, modules, scope, period, status, result, sources, suggested_actions, template_id, error_message, generated_at, created_at, updated_at";

export function useAnalysisReport(reportId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  return useQuery<AnalysisReport | null>({
    queryKey: reportId ? analysisKeys.report(reportId) : ["analysis", "reports", "detail", "none"],
    enabled: Boolean(reportId && currentBuId),
    refetchInterval: (q) => {
      const data = q.state.data as AnalysisReport | null | undefined;
      if (!data) return 2500;
      return data.status === "generating" || data.status === "pending" ? 2500 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_reports")
        .select(REPORT_COLUMNS)
        .eq("id", reportId!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AnalysisReport) ?? null;
    },
  });
}
