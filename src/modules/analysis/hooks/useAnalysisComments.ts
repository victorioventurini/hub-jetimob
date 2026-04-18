/**
 * useAnalysisComments — comentários do report (lista + add básico)
 *
 * Mutations avançadas (edit/delete/pin) ficam em useAnalysisCommentMutations.ts.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { toast } from "sonner";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { AnalysisComment } from "../types";

const COLUMNS = `
  id,
  report_id,
  bu_id,
  author_profile_id,
  body,
  body_richtext,
  reply_to_comment_id,
  is_pinned,
  pinned_at,
  pinned_by_user_id,
  edited_at,
  created_at,
  updated_at,
  author:profiles!analysis_comments_author_profile_id_fkey(id,display_name,avatar_url),
  reply_to:analysis_comments!reply_to_comment_id(
    id,
    body,
    body_richtext,
    author:profiles!analysis_comments_author_profile_id_fkey(id,display_name)
  )
`;

export function useAnalysisComments(reportId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const { profileId, realProfileId } = useIdentity();
  const writerProfileId = realProfileId ?? profileId;
  const buId = currentBu?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: analysisKeys.comments(reportId ?? ""),
    enabled: !!reportId && !!buId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<AnalysisComment[]> => {
      const { data, error } = await supabase
        .from("analysis_comments")
        .select(COLUMNS)
        .eq("report_id", reportId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AnalysisComment[];
    },
  });

  const add = useMutation({
    mutationFn: async (input: {
      body: string;
      replyToCommentId?: string | null;
    }) => {
      if (!reportId || !buId || !writerProfileId) throw new Error("contexto inválido");
      const { error } = await supabase.from("analysis_comments").insert({
        report_id: reportId,
        bu_id: buId,
        author_profile_id: writerProfileId,
        body: input.body,
        body_richtext: { type: "text", content: input.body } as never,
        reply_to_comment_id: input.replyToCommentId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (reportId) qc.invalidateQueries({ queryKey: analysisKeys.commentsPrefix(reportId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    add: add.mutate,
    addAsync: add.mutateAsync,
    isAdding: add.isPending,
  };
}
