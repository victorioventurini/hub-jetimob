/**
 * useDeleteAnalysisReport — soft-delete de relatório de análise (BU-scoped).
 * RLS exige permission key `analysis.report.delete:bu`.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { toast } from "sonner";
import { analysisKeys } from "@/lib/queryKeys/analysis";

export function useDeleteAnalysisReport() {
  const supabase = useBuScopedSupabase();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("analysis_reports")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      toast.success("Análise excluída");
      qc.invalidateQueries({ queryKey: analysisKeys.listPrefix() });
      qc.invalidateQueries({ queryKey: analysisKeys.detailPrefix(id) });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao excluir análise"),
  });
}
