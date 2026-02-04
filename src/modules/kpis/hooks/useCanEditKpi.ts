import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfileId } from "@/hooks/useIdentity";
import { usePermissions } from "@/hooks/usePermissions";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Interface mínima de KPI necessária para verificação de permissão.
 * Permite reutilização com diferentes representações de KPI/Métrica.
 */
interface KpiForPermission {
  id: string;
  bu_id: string;
  owner_user_id?: string | null;
  team_id?: string | null;
  area_id?: string | null;
}

/**
 * Hook para verificar se o usuário atual pode editar um KPI/Métrica específico.
 * 
 * Regras de permissão (qualquer uma):
 * 1. É owner do KPI (owner_user_id)
 * 2. É contribuidor do KPI (kpi_data_contributors)
 * 3. Tem permissão kpis.settings.manage:bu (admin)
 * 4. Tem permissão kpis.metric.update:self_or_owner (com contexto de ownership)
 * 
 * @param kpi - O KPI a verificar (pode ser null/undefined durante loading)
 * @returns { canEdit, isLoading }
 * 
 * @example
 * ```tsx
 * function KpiActions({ kpi }) {
 *   const { canEdit, isLoading } = useCanEditKpi(kpi);
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (!canEdit) return null;
 *   
 *   return <Button onClick={handleEdit}>Editar</Button>;
 * }
 * ```
 */
export function useCanEditKpi(kpi: KpiForPermission | null | undefined) {
  const profileId = useProfileId();
  const { client, isReady, buId } = useOptionalBuClient();
  const { has: hasPermission, isWildcard, isLoading: permissionLoading } = usePermissions();

  // Buscar contribuidores deste KPI
  const { data: contributors = [], isLoading: contributorsLoading } = useQuery({
    queryKey: queryKeys.kpis.contributors(kpi?.id ?? null),
    queryFn: async () => {
      if (!client || !kpi?.id) return [];

      const { data, error } = await client
        .from("kpi_data_contributors")
        .select("contributor_user_id")
        .eq("kpi_id", kpi.id)
        .is("deleted_at", null);

      if (error) {
        console.error("[useCanEditKpi] Error fetching contributors:", error);
        return [];
      }

      return data?.map(c => c.contributor_user_id) ?? [];
    },
    enabled: isReady && !!kpi?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = !isReady || permissionLoading || contributorsLoading;

  const canEdit = useMemo(() => {
    if (!kpi || !profileId) return false;

    // Admin sempre pode editar
    if (isWildcard) return true;

    // Tem permissão de gerenciamento (admin)
    if (hasPermission("kpis.settings.manage:bu")) return true;

    // É owner do KPI
    if (kpi.owner_user_id === profileId) return true;

    // É contribuidor
    if (contributors.includes(profileId)) return true;

    // Tem permissão de editar próprios (e é owner)
    if (hasPermission("kpis.metric.update:self_or_owner") && kpi.owner_user_id === profileId) {
      return true;
    }

    return false;
  }, [kpi, profileId, isWildcard, hasPermission, contributors]);

  return { canEdit, isLoading };
}
