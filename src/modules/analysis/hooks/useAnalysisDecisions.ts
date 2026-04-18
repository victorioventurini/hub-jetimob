/**
 * useAnalysisDecisions — decisões registradas a partir de um relatório de análise.
 *
 * Reaproveita o shape `TeamCheckinDecision[]` dos rituais (JSONB) para permitir
 * reutilizar `DecisionFollowUpRow` e o pipeline de follow-up/thread.
 *
 * Modelo: 1 linha por reportId (UNIQUE), com array `decisions` JSONB.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { useIdentity } from "@/hooks/useIdentity";
import { toast } from "sonner";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { TeamCheckinDecision, DecisionThreadMessage } from "@/modules/okrs/types/wizard";

interface AnalysisDecisionsRow {
  id: string;
  report_id: string;
  bu_id: string;
  decisions: TeamCheckinDecision[];
}

export function useAnalysisDecisions(reportId: string | undefined) {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const { profileId, realProfileId } = useIdentity();
  const writerProfileId = realProfileId ?? profileId;
  const buId = currentBu?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: analysisKeys.decisions(reportId ?? ""),
    enabled: !!reportId && !!buId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<{ rowId: string | null; decisions: TeamCheckinDecision[] }> => {
      const { data, error } = await supabase
        .from("analysis_decisions")
        .select("id, report_id, bu_id, decisions")
        .eq("report_id", reportId!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      const row = data as unknown as AnalysisDecisionsRow | null;
      return {
        rowId: row?.id ?? null,
        decisions: Array.isArray(row?.decisions) ? row!.decisions : [],
      };
    },
  });

  const upsertDecisions = async (next: TeamCheckinDecision[]) => {
    if (!reportId || !buId || !writerProfileId) throw new Error("contexto inválido");

    const existingRowId = query.data?.rowId ?? null;
    if (existingRowId) {
      const { error } = await supabase
        .from("analysis_decisions")
        .update({ decisions: next as never })
        .eq("id", existingRowId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("analysis_decisions").insert({
        report_id: reportId,
        bu_id: buId,
        created_by: writerProfileId,
        decisions: next as never,
      });
      if (error) throw error;
    }
  };

  const add = useMutation({
    mutationFn: async (decision: TeamCheckinDecision) => {
      const current = query.data?.decisions ?? [];
      await upsertDecisions([...current, decision]);
    },
    onSuccess: () => {
      if (reportId) qc.invalidateQueries({ queryKey: analysisKeys.decisionsPrefix(reportId) });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao registrar decisão"),
  });

  const updateDecision = useMutation({
    mutationFn: async ({
      decisionId,
      updates,
    }: {
      decisionId: string;
      updates: Partial<TeamCheckinDecision> & { followUpStatus?: "pending" | "done" };
    }) => {
      const current = query.data?.decisions ?? [];
      const next = current.map((d) => (d.id === decisionId ? { ...d, ...updates } : d));
      await upsertDecisions(next);
    },
    onSuccess: () => {
      if (reportId) qc.invalidateQueries({ queryKey: analysisKeys.decisionsPrefix(reportId) });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao atualizar decisão"),
  });

  const addThreadMessage = useMutation({
    mutationFn: async ({
      decisionId,
      content,
    }: {
      decisionId: string;
      content: string;
    }) => {
      if (!writerProfileId) throw new Error("Perfil não carregado");
      const current = query.data?.decisions ?? [];
      const newMessage: DecisionThreadMessage = {
        id: crypto.randomUUID(),
        content,
        authorId: writerProfileId,
        authorName: "Usuário",
        createdAt: new Date().toISOString(),
      };
      const next = current.map((d) =>
        d.id !== decisionId ? d : { ...d, thread: [...(d.thread ?? []), newMessage] },
      );
      await upsertDecisions(next);
    },
    onSuccess: () => {
      if (reportId) qc.invalidateQueries({ queryKey: analysisKeys.decisionsPrefix(reportId) });
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao adicionar mensagem"),
  });

  return {
    decisions: query.data?.decisions ?? [],
    rowId: query.data?.rowId ?? null,
    isLoading: query.isLoading,
    add: add.mutate,
    isAdding: add.isPending,
    updateDecision: updateDecision.mutate,
    isUpdating: updateDecision.isPending,
    addThreadMessage: addThreadMessage.mutate,
    isAddingMessage: addThreadMessage.isPending,
  };
}
