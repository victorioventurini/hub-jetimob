/**
 * useAnalysisReport — busca um report por id (com polling enquanto gerando)
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { AnalysisReport } from "../types";

const COLUMNS = [
  "id",
  "bu_id",
  "created_by",
  "created_at",
  "updated_at",
  "generated_at",
  "status",
  "mode",
  "depth",
  "modules",
  "period",
  "scope",
  "premise",
  "additional_context",
  "title",
  "template_id",
  "result",
  "sources",
  "suggested_actions",
  "error_message",
].join(",");

export function useAnalysisReport(reportId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useQuery({
    queryKey: analysisKeys.detail(reportId ?? ""),
    enabled: !!reportId && !!buId,
    refetchInterval: (q) => {
      const data = q.state.data as AnalysisReport | undefined;
      if (!data) return 2000;
      return data.status === "generating" || data.status === "pending" ? 2500 : false;
    },
    queryFn: async (): Promise<AnalysisReport | null> => {
      const { data, error } = await supabase
        .from("analysis_reports")
        .select(COLUMNS)
        .eq("id", reportId!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const report = data as unknown as AnalysisReport;

      // Resolve autor via v_profiles_directory (BU-scoped, sem PII sensível)
      if (report.created_by) {
        const { data: author } = await supabase
          .from("v_profiles_directory")
          .select("id, display_name, photo_url")
          .eq("id", report.created_by)
          .maybeSingle();
        report.author = author
          ? { id: author.id, display_name: author.display_name, photo_url: author.photo_url }
          : null;
      }

      return report;
    },
  });
}
