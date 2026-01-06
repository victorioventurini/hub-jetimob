import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook centralizado para verificação de permissões.
 * 
 * Retorna:
 * - permissions: array de permission keys do usuário na BU atual
 * - has(key): verifica se tem uma permissão específica
 * - hasAny(keys): verifica se tem pelo menos uma das permissões
 * - hasAll(keys): verifica se tem todas as permissões
 * - isWildcard: true se usuário tem acesso total (admin/super_admin)
 * - isLoading: estado de carregamento
 * 
 * Regras:
 * - super_admin: recebe ['*'] (wildcard global)
 * - admin da BU: recebe ['*'] (wildcard na BU)
 * - outros: recebem lista de permissões específicas
 */
export function usePermissions() {
  const { user } = useAuth();
  const { currentBuId, isLoading: isBuLoading } = useBu();

  const { data: permissions = [], isLoading: isQueryLoading } = useQuery({
    queryKey: ["permissions", currentBuId, user?.id],
    queryFn: async () => {
      if (!currentBuId) return [];

      const { data, error } = await supabase.rpc("get_my_permissions", {
        p_bu_id: currentBuId,
      });

      if (error) {
        console.error("Erro ao buscar permissões:", error);
        return [];
      }

      return (data as string[]) || [];
    },
    enabled: !!currentBuId && !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

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
    isLoading: isBuLoading || isQueryLoading,
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
