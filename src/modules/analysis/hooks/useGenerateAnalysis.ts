/**
 * useGenerateAnalysis — invoca edge function analysis-generate
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import { toast } from "sonner";
import type { AnalysisComposerState } from "../types";

export function useGenerateAnalysis() {
  const { currentBuId } = useBu();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (state: AnalysisComposerState): Promise<{ report_id: string }> => {
      if (!currentBuId) throw new Error("BU não selecionada");

      const { data, error } = await supabase.functions.invoke("analysis-generate", {
        body: {
          bu_id: currentBuId,
          premise: state.premise,
          additional_context: state.additionalContext || null,
          mode: state.mode,
          modules: state.modules,
          scope: state.scope,
          period: state.period,
          depth: state.depth,
          template_id: state.templateId ?? null,
        },
      });

      if (error) {
        const status = (error as any).context?.status ?? 0;
        const errorBody = (error as any).context?.body;
        if (status === 429) {
          toast.error("Muitas requisições. Tente novamente em alguns segundos.");
        } else if (status === 402) {
          toast.error("Créditos de IA esgotados. Adicione créditos para continuar.");
        } else if (status === 403 && errorBody?.error === "IA_DISABLED") {
          toast.error("IA desativada para esta BU pelo administrador.");
        } else {
          toast.error(error.message || "Falha ao gerar análise");
        }
        throw error;
      }

      if (!data?.report_id) throw new Error("Resposta inválida do servidor");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: analysisKeys.reportsPrefix() });
    },
  });
}
