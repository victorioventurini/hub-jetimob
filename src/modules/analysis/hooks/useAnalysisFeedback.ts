/**
 * useAnalysisFeedback — busca e registra avaliação 1-5
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { analysisKeys } from "@/lib/queryKeys/analysis";

interface Submit {
  rating: number;
  text?: string;
}

export function useAnalysisFeedback(reportId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const { user } = useAuth();
  const buId = currentBu?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: analysisKeys.feedback(reportId ?? ""),
    enabled: !!reportId && !!buId && !!user?.id,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_feedback")
        .select("id,rating,text,created_at,user_id")
        .eq("report_id", reportId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const mutate = useMutation({
    mutationFn: async ({ rating, text }: Submit) => {
      if (!reportId || !buId || !user?.id) throw new Error("contexto inválido");
      const { error } = await supabase.from("analysis_feedback").upsert(
        {
          report_id: reportId,
          user_id: user.id,
          bu_id: buId,
          rating,
          text: text ?? null,
        },
        { onConflict: "report_id,user_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      if (reportId) qc.invalidateQueries({ queryKey: analysisKeys.feedback(reportId) });
      toast.success("Avaliação registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    feedback: query.data,
    isLoading: query.isLoading,
    submit: mutate.mutate,
    isSubmitting: mutate.isPending,
  };
}
