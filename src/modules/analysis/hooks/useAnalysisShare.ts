/**
 * useAnalysisShare — invoca analysis-share edge function
 */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import { toast } from "sonner";

export function useAnalysisShare() {
  const { currentBuId } = useBu();

  return useMutation({
    mutationFn: async ({
      reportId,
      recipientProfileIds,
    }: {
      reportId: string;
      recipientProfileIds: string[];
    }) => {
      if (!currentBuId) throw new Error("BU não selecionada");
      if (recipientProfileIds.length === 0) throw new Error("Selecione ao menos 1 destinatário");

      const { data, error } = await supabase.functions.invoke("analysis-share", {
        body: {
          bu_id: currentBuId,
          report_id: reportId,
          recipient_profile_ids: recipientProfileIds,
        },
      });
      if (error) throw error;
      return data as { recipientCount: number };
    },
    onSuccess: (data) => {
      toast.success(`Análise compartilhada com ${data.recipientCount} pessoa(s)`);
    },
    onError: (e: any) => toast.error(e.message || "Falha ao compartilhar"),
  });
}
