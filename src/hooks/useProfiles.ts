import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";

/**
 * POST-BU hook: Only executes mutations when BU is selected.
 */
export function useDeleteProfile() {
  const queryClient = useQueryClient();
  const { client } = useOptionalBuClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      if (!client) {
        throw new Error("useDeleteProfile: No BU client available");
      }
      
      // Soft delete - set deleted_at
      const { error } = await client
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
