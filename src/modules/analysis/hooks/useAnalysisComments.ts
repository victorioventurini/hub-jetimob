/**
 * useAnalysisComments — comentários do report
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { toast } from "sonner";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { AnalysisComment } from "../types";

const COLUMNS = `id,report_id,bu_id,author_profile_id,body,created_at,updated_at,
  author:profiles!analysis_comments_author_profile_id_fkey(id,display_name,avatar_url)`;

export function useAnalysisComments(reportId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const { profileId } = useIdentity();
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
    mutationFn: async (body: string) => {
      if (!reportId || !buId || !profileId) throw new Error("contexto inválido");
      const { error } = await supabase.from("analysis_comments").insert({
        report_id: reportId,
        bu_id: buId,
        author_profile_id: profileId,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (reportId) qc.invalidateQueries({ queryKey: analysisKeys.comments(reportId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    add: add.mutate,
    isAdding: add.isPending,
  };
}
