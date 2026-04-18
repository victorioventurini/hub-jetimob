/**
 * useAnalysisFeedback — submit + read média
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import { toast } from "sonner";

export interface AnalysisFeedbackSummary {
  count: number;
  average: number;
  myRating: number | null;
}

export function useAnalysisFeedback(reportId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { user } = useAuth();
  const { currentBuId } = useBu();
  const qc = useQueryClient();

  const userId = user?.id ?? null;

  const query = useQuery<AnalysisFeedbackSummary>({
    queryKey: reportId ? analysisKeys.feedback(reportId) : ["analysis", "feedback", "none"],
    enabled: Boolean(reportId && currentBuId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_feedback")
        .select("rating, user_id")
        .eq("report_id", reportId!);
      if (error) throw error;
      const list = data || [];
      const count = list.length;
      const avg = count ? list.reduce((s, r: any) => s + Number(r.rating), 0) / count : 0;
      const my = userId
        ? (list.find((r: any) => r.user_id === userId)?.rating ?? null)
        : null;
      return { count, average: avg, myRating: my };
    },
  });

  const mutate = useMutation({
    mutationFn: async ({ rating, text }: { rating: number; text?: string }) => {
      if (!reportId || !currentBuId || !userId) throw new Error("Sem contexto");
      const { error } = await supabase
        .from("analysis_feedback")
        .upsert(
          {
            report_id: reportId,
            bu_id: currentBuId,
            user_id: userId,
            rating,
            text: text ?? null,
          },
          { onConflict: "report_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obrigado pelo feedback!");
      if (reportId) qc.invalidateQueries({ queryKey: analysisKeys.feedback(reportId) });
    },
    onError: (e: any) => toast.error(e.message || "Falha ao enviar feedback"),
  });

  return { ...query, submit: mutate.mutate, isSubmitting: mutate.isPending };
}
