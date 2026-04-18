/**
 * useAnalysisComments — CRUD de comentários da análise
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import { toast } from "sonner";

export interface AnalysisCommentRow {
  id: string;
  report_id: string;
  bu_id: string;
  author_profile_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: { display_name: string | null; avatar_url: string | null };
}

export function useAnalysisComments(reportId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const { realProfileId } = useIdentity();
  const qc = useQueryClient();

  const list = useQuery<AnalysisCommentRow[]>({
    queryKey: reportId ? analysisKeys.comments(reportId) : ["analysis", "comments", "none"],
    enabled: Boolean(reportId && currentBuId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analysis_comments")
        .select(
          "id, report_id, bu_id, author_profile_id, body, created_at, updated_at, author:profiles!analysis_comments_author_profile_id_fkey(display_name, avatar_url)",
        )
        .eq("report_id", reportId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as AnalysisCommentRow[];
    },
  });

  const add = useMutation({
    mutationFn: async (body: string) => {
      if (!reportId || !currentBuId || !realProfileId) throw new Error("Sem contexto");
      const { error } = await supabase.from("analysis_comments").insert({
        report_id: reportId,
        bu_id: currentBuId,
        author_profile_id: realProfileId,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (reportId) qc.invalidateQueries({ queryKey: analysisKeys.comments(reportId) });
    },
    onError: (e: any) => toast.error(e.message || "Falha ao comentar"),
  });

  return { ...list, add: add.mutate, isAdding: add.isPending };
}
