/**
 * useAnalysisTemplates — lista templates disponíveis
 * RLS já filtra is_admin_only para não-admins
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { AnalysisTemplate } from "../types";

const COLUMNS =
  "id,bu_id,name,category,premise,scope,defaults,is_admin_only,display_order";

export function useAnalysisTemplates() {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  return useQuery({
    queryKey: analysisKeys.templates(buId),
    enabled: !!buId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AnalysisTemplate[]> => {
      const { data, error } = await supabase
        .from("analysis_templates")
        .select(COLUMNS)
        .is("deleted_at", null)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AnalysisTemplate[];
    },
  });
}
