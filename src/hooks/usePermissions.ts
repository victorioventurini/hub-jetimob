import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";

/**
 * Hook centralizado para verificação de permissões.
 * 
 * SAFE for pre-BU: Uses useOptionalBuClient() and only queries when BU is selected.
 * 
 * Suporta impersonação: quando super_admin está simulando outro usuário,
 * retorna as permissões do usuário impersonado.
 * 
 * Retorna:
 * - permissions: array de permission keys do usuário na BU atual
 * - has(key): verifica se tem uma permissão específica
 * - hasAny(keys): verifica se tem pelo menos uma das permissões
 * - hasAll(keys): verifica se tem todas as permissões
 * - isWildcard: true se usuário tem acesso total (admin/super_admin)
 * - isLoading: estado de carregamento
 * - isImpersonating: true se está visualizando como outro usuário
 * 
 * Regras:
 * - super_admin: recebe ['*'] (wildcard global)
 * - admin da BU: recebe ['*'] (wildcard na BU)
 * - outros: recebem lista de permissões específicas
 * - Durante impersonação: retorna permissões do usuário impersonado
 */
export function usePermissions() {
  const { user } = useAuth();
  const { client, isReady, buId } = useOptionalBuClient();
  const { isImpersonating, impersonatedUserId } = useOptionalImpersonation();

  const { data: permissions = [], isLoading: isQueryLoading } = useQuery({
    queryKey: isImpersonating && impersonatedUserId
      ? queryKeys.identity.impersonatedPermissions(buId ?? null, impersonatedUserId)
      : queryKeys.identity.permissions(buId ?? null, user?.id ?? null),
    queryFn: async () => {
      if (!client || !buId) {
        throw new Error("usePermissions: No BU client available");
      }

      // Se estiver impersonando, buscar permissões do usuário impersonado
      if (isImpersonating && impersonatedUserId) {
        const { data, error } = await client.rpc("get_user_permissions_for_impersonation", {
          p_target_profile_id: impersonatedUserId,
          p_bu_id: buId,
        });

        if (error) {
          console.error("Erro ao buscar permissões impersonadas:", error);
          return [];
        }

        return (data as string[]) || [];
      }

      // Fluxo normal
      const { data, error } = await client.rpc("get_my_permissions", {
        p_bu_id: buId,
      });

      if (error) {
        console.error("Erro ao buscar permissões:", error);
        return [];
      }

      return (data as string[]) || [];
    },
    enabled: isReady && !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
  // Durante impersonação, o isWildcard deve refletir as permissões DO USUÁRIO IMPERSONADO
  // Se o usuário impersonado é admin (tem '*'), ele deve ter acesso total
  // O que bloqueamos é herdar wildcard do caller (super_admin) - isso já é feito
  // buscando permissões via get_user_permissions_for_impersonation
  const isWildcard = permissions.includes("*");

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const has = (key: string): boolean => {
    if (isWildcard) return true;
    return permissions.includes(key);
  };

  /**
   * Verifica se o usuário tem pelo menos uma das permissões
   */
  const hasAny = (keys: string[]): boolean => {
    if (isWildcard) return true;
    return keys.some((key) => permissions.includes(key));
  };

  /**
   * Verifica se o usuário tem todas as permissões
   */
  const hasAll = (keys: string[]): boolean => {
    if (isWildcard) return true;
    return keys.every((key) => permissions.includes(key));
  };

  return {
    permissions,
    has,
    hasAny,
    hasAll,
    isWildcard,
    isLoading: !isReady || isQueryLoading,
    isImpersonating,
  };
}

/**
 * Hook simplificado para verificar uma única permissão
 */
export function useHasPermission(key: string): boolean {
  const { has, isLoading } = usePermissions();
  if (isLoading) return false;
  return has(key);
}
