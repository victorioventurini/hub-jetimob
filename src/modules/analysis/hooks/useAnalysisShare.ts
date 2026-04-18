/**
 * useAnalysisShare — compartilha um report via edge function
 */
import { useMutation } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { toast } from "sonner";

interface ShareInput {
  report_id: string;
  recipient_profile_ids: string[];
  message?: string;
}

export function useAnalysisShare() {
  const supabase = useBuScopedSupabase();

  return useMutation({
    mutationFn: async (input: ShareInput) => {
      const { data, error } = await supabase.functions.invoke("analysis-share", {
        body: input,
      });
      if (error) throw new Error(error.message || "Falha ao compartilhar");
      return data;
    },
    onSuccess: () => toast.success("Análise compartilhada"),
    onError: (e: Error) => toast.error(e.message),
  });
}
