/**
 * useAnalysisTemplates — lista de templates (RLS já filtra is_admin_only)
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { AnalysisTemplate } from "../types";

const TEMPLATE_COLUMNS =
  "id, bu_id, name, category, premise, defaults, is_admin_only, scope, display_order";

export function useAnalysisTemplates() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  return useQuery<AnalysisTemplate[]>({
    queryKey: analysisKeys.templates(currentBuId),
    enabled: Boolean(currentBuId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_templates")
        .select(TEMPLATE_COLUMNS)
        .is("deleted_at", null)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as AnalysisTemplate[];
    },
  });
}
