import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // Soft delete - set deleted_at
      const { error } = await supabase
        .from("profiles")
        .update({ 
          deleted_at: new Date().toISOString(),
          employment_status: "terminated" as const,
          updated_at: new Date().toISOString() 
        })
        .eq("id", profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      toast.success("Jetimober excluído com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir jetimober");
    },
  });
}
