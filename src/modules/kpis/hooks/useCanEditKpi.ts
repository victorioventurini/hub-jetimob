import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfileId } from "@/hooks/useIdentity";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";
import { KpiScope } from "../types";

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
  scope?: KpiScope | string;
}

/**
 * Hook para verificar se o usuário atual pode editar um KPI/Métrica específico.
 * 
 * v2.90.0: Governança por Escopo + Responsabilidade Operacional
 * 
 * Regras de permissão:
 * 
 * **KPIs Globais (scope=org) e de Área (scope=area):**
 * - Apenas Admin/Super Admin podem criar/editar
 * 
 * **KPIs de Time (scope=team):**
 * - Admin/Super Admin
 * - Líder do time (canManageTeam)
 * - Owner do KPI
 * - Contribuidores (kpi_data_contributors)
 * 
 * @param kpi - O KPI a verificar (pode ser null/undefined durante loading)
 * @returns { canEdit, canUpdateValues, isLoading }
 * 
 * @example
 * ```tsx
 * function KpiActions({ kpi }) {
 *   const { canEdit, canUpdateValues, isLoading } = useCanEditKpi(kpi);
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (!canEdit && !canUpdateValues) return null;
 *   
 *   return (
 *     <>
 *       {canEdit && <Button onClick={handleEdit}>Editar</Button>}
 *       {canUpdateValues && <Button onClick={handleUpdate}>Atualizar Valor</Button>}
 *     </>
 *   );
 * }
 * ```
 */
export function useCanEditKpi(kpi: KpiForPermission | null | undefined) {
  const profileId = useProfileId();
  const { client, isReady, buId } = useOptionalBuClient();
  const { has: hasPermission, isWildcard, isLoading: permissionLoading } = usePermissions();
  const { canManageTeam, isLoading: teamLoading } = useTeamManagement();

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

  const isLoading = !isReady || permissionLoading || contributorsLoading || teamLoading;

  /**
   * canEdit: Pode editar METADADOS do KPI (nome, descrição, meta, escopo, etc)
   * 
   * Regras por escopo:
   * - scope=org: Apenas Admin/Super Admin
   * - scope=area: Apenas Admin/Super Admin
   * - scope=team: Admin/Super Admin, Líder do time, Owner
   */
  const canEdit = useMemo(() => {
    if (!kpi || !profileId) return false;

    // Admin sempre pode editar (wildcard)
    if (isWildcard) return true;

    // Tem permissão de gerenciamento (admin)
    if (hasPermission("kpis.settings.manage:bu")) return true;

    const scope = kpi.scope as KpiScope | undefined;

    // KPIs Globais e de Área: APENAS admins podem editar
    if (scope === 'org' || scope === 'area') {
      return false;
    }

    // KPIs de Time: verificar liderança
    if (scope === 'team' && kpi.team_id) {
      // Líder do time pode editar
      if (canManageTeam(kpi.team_id)) return true;
    }

    // É owner do KPI (para scope=team)
    if (kpi.owner_user_id === profileId) return true;

    return false;
  }, [kpi, profileId, isWildcard, hasPermission, canManageTeam]);

  /**
   * canUpdateValues: Pode ATUALIZAR VALORES do KPI (check-ins, entries)
   * 
   * Mais permissivo que canEdit:
   * - Todos os que podem editar
   * - Contribuidores (kpi_data_contributors)
   */
  const canUpdateValues = useMemo(() => {
    if (!kpi || !profileId) return false;

    // Quem pode editar, pode atualizar valores
    if (canEdit) return true;

    // É owner do KPI
    if (kpi.owner_user_id === profileId) return true;

    // É contribuidor
    if (contributors.includes(profileId)) return true;

    return false;
  }, [kpi, profileId, canEdit, contributors]);

  return { canEdit, canUpdateValues, isLoading };
}
