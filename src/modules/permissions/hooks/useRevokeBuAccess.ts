import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

interface RevokeAccessParams {
  userId: string; // auth.users.id
  userName: string; // for toast message
}

/**
 * Hook to revoke a user's access to the current BU.
 * Deletes the bu_user_memberships record for the user + BU combination.
 */
export function useRevokeBuAccess() {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId }: RevokeAccessParams) => {
      if (!currentBuId) {
        throw new Error("BU não selecionada");
      }

      // First check if this is the user's only membership
      const { data: allMemberships, error: checkError } = await supabase
        .from("bu_user_memberships")
        .select("id, bu_id, is_default")
        .eq("user_id", userId);

      if (checkError) throw checkError;

      const currentMembership = allMemberships?.find(m => m.bu_id === currentBuId);
      
      if (!currentMembership) {
        throw new Error("Usuário não possui acesso a esta BU");
      }

      // Delete the membership
      const { error: deleteError } = await supabase
        .from("bu_user_memberships")
        .delete()
        .eq("user_id", userId)
        .eq("bu_id", currentBuId);

      if (deleteError) throw deleteError;

      // If deleted membership was is_default and user has other memberships, 
      // set another one as default
      if (currentMembership.is_default && allMemberships && allMemberships.length > 1) {
        const otherMembership = allMemberships.find(m => m.bu_id !== currentBuId);
        if (otherMembership) {
          await supabase
            .from("bu_user_memberships")
            .update({ is_default: true })
            .eq("id", otherMembership.id);
        }
      }

      return { 
        hadOtherMemberships: allMemberships && allMemberships.length > 1,
        wasDefault: currentMembership.is_default
      };
    },
    onSuccess: (result, { userName }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.buUsers(currentBuId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.buMemberCounts() });
      
      if (result.hadOtherMemberships) {
        toast.success(`Acesso de ${userName} a esta BU foi revogado`);
      } else {
        toast.success(`${userName} não tem mais acesso ao Hub`);
      }
    },
    onError: (error: Error, { userName }) => {
      console.error("Erro ao revogar acesso:", error);
      toast.error(`Erro ao revogar acesso de ${userName}: ${error.message}`);
    },
  });
}
