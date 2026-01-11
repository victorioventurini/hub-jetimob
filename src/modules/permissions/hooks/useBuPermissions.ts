import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";
import type { BuUserPermissionOverride, EffectivePermission } from "../types";

export function useBuUserOverrides(userId: string | null) {
  const { client: supabase, buId, isReady } = useOptionalBuClient();
  const queryClient = useQueryClient();

  const queryKey = queryKeys.permissions.userOverrides(buId, userId);

  const { data: overrides = [], isLoading } = useQuery({
    queryKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!supabase || !buId || !userId) return [];

      const { data, error } = await supabase
        .from("bu_user_permission_overrides")
        .select("id, bu_id, user_id, permission_id, effect, created_at, permission_catalog(id, key, module, resource, action, scope, description)")
        .eq("bu_id", buId)
        .eq("user_id", userId);

      if (error) throw error;
      return data as BuUserPermissionOverride[];
    },
    enabled: isReady && !!buId && !!userId,
  });

  const addOverride = useMutation({
    mutationFn: async ({
      userId,
      permissionId,
      effect = "allow",
    }: {
      userId: string;
      permissionId: string;
      effect?: "allow" | "deny";
    }) => {
      if (!supabase || !buId) throw new Error("BU não selecionada");

      const { error } = await supabase
        .from("bu_user_permission_overrides")
        .insert({
          bu_id: buId,
          user_id: userId,
          permission_id: permissionId,
          effect,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Override adicionado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const removeOverride = useMutation({
    mutationFn: async (overrideId: string) => {
      if (!supabase) throw new Error("BU não selecionada");

      const { error } = await supabase
        .from("bu_user_permission_overrides")
        .delete()
        .eq("id", overrideId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Override removido");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return {
    overrides,
    isLoading,
    addOverride,
    removeOverride,
  };
}

export function useUserEffectivePermissions(userId: string | null) {
  const { client: supabase, buId, isReady } = useOptionalBuClient();

  const { data: effectivePermissions = [], isLoading } = useQuery({
    queryKey: queryKeys.permissions.userEffective(buId, userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!supabase || !buId || !userId) return [];

      // Use RPC to call get_effective_permissions_v2 function
      // Cast to any to bypass strict typing since the function may not be in generated types
      const { data, error } = await (supabase as unknown as { rpc: (fn: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }> })
        .rpc('get_effective_permissions_v2', {
          p_user_id: userId,
          p_bu_id: buId,
        });

      if (error) throw error;
      return (data || []) as EffectivePermission[];
    },
    enabled: isReady && !!buId && !!userId,
  });

  return {
    effectivePermissions,
    isLoading,
  };
}
