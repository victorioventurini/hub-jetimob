/**
 * useGenerateAnalysis — invoca edge function analysis-generate
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";
import { analysisKeys } from "@/lib/queryKeys/analysis";
import type { GenerateAnalysisInput } from "../types";

interface GenerateResult {
  report_id: string;
}

export function useGenerateAnalysis() {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateAnalysisInput): Promise<GenerateResult> => {
      if (!buId) {
        throw new Error("BU_REQUIRED");
      }
      const { data, error } = await supabase.functions.invoke("analysis-generate", {
        body: { ...input, bu_id: buId },
      });
      if (error) {
        const msg = String(error.message || "");
        if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
          throw new Error("RATE_LIMIT");
        }
        if (msg.includes("402") || msg.toLowerCase().includes("credit")) {
          throw new Error("NO_CREDITS");
        }
        if (msg.toLowerCase().includes("ia_disabled")) {
          throw new Error("IA_DISABLED");
        }
        throw new Error(msg || "Falha ao gerar análise");
      }
      return data as GenerateResult;
    },
    onSuccess: () => {
      if (buId) qc.invalidateQueries({ queryKey: analysisKeys.list(buId) });
    },
    onError: (e: Error) => {
      const map: Record<string, string> = {
        BU_REQUIRED: "Selecione uma Business Unit antes de gerar a análise.",
        RATE_LIMIT: "Muitas requisições. Tente novamente em alguns segundos.",
        NO_CREDITS: "Créditos de IA esgotados. Adicione créditos no Next.",
        IA_DISABLED: "Geração por IA está desativada para esta BU.",
      };
      toast.error(map[e.message] || e.message);
    },
  });
}
