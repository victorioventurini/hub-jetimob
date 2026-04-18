/**
 * useAnalysisCommentMutations — edit / delete / pin
 *
 * Espelha useProjectCommentMutations. Usa realProfileId (mutation guard) e
 * invalida via analysisKeys.commentsPrefix(reportId).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { analysisKeys } from "@/lib/queryKeys/analysis";

export function useEditAnalysisComment() {
  const qc = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      id,
      reportId,
      body,
    }: {
      id: string;
      reportId: string;
      body: string;
    }) => {
      const { error } = await supabase
        .from("analysis_comments")
        .update({
          body,
          body_richtext: { type: "text", content: body } as never,
          edited_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      return { reportId };
    },
    onSuccess: ({ reportId }) =>
      qc.invalidateQueries({ queryKey: analysisKeys.commentsPrefix(reportId) }),
  });
}

export function useDeleteAnalysisComment() {
  const qc = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({ id, reportId }: { id: string; reportId: string }) => {
      const { error } = await supabase
        .from("analysis_comments")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return { reportId };
    },
    onSuccess: ({ reportId }) =>
      qc.invalidateQueries({ queryKey: analysisKeys.commentsPrefix(reportId) }),
  });
}

export function usePinAnalysisComment() {
  const qc = useQueryClient();
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async ({
      commentId,
      reportId,
      pin,
      profileId,
    }: {
      commentId: string;
      reportId: string;
      pin: boolean;
      profileId: string;
    }) => {
      const { error } = await supabase
        .from("analysis_comments")
        .update({
          is_pinned: pin,
          pinned_at: pin ? new Date().toISOString() : null,
          pinned_by_user_id: pin ? profileId : null,
        })
        .eq("id", commentId);
      if (error) throw error;
      return { reportId };
    },
    onSuccess: ({ reportId }) =>
      qc.invalidateQueries({ queryKey: analysisKeys.commentsPrefix(reportId) }),
  });
}
