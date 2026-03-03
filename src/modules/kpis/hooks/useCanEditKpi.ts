import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfileId } from "@/hooks/useIdentity";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";
import { areasKeys } from "@/lib/queryKeys/areas";
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
  responsible_team_id?: string | null;
  scope?: KpiScope | string;
}

/**
 * Hook para verificar se o usuário atual pode editar um KPI/Métrica específico.
 * 
 * v3.9.0: Hierarquia de atualização de valores (canUpdateValues)
 * 
 * Regras de permissão para EDITAR METADADOS (canEdit):
 * - scope=org / scope=area: Apenas Admin/Super Admin
 * - scope=team: Admin/Super Admin, Líder do time, Owner
 * 
 * Regras de permissão para ATUALIZAR VALORES (canUpdateValues):
 * - Admin BU: Qualquer KPI da BU (via isWildcard)
 * - Líder de Área: KPIs com area_id da área que lidera
 * - Líder de Time: KPIs com team_id OU responsible_team_id do time que lidera
 * - Owner do KPI
 * - Contribuidores (kpi_data_contributors)
 * 
 * @param kpi - O KPI a verificar (pode ser null/undefined durante loading)
 * @returns { canEdit, canUpdateValues, isLoading }
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

  // Buscar áreas onde o usuário é líder (para hierarquia de área)
  const { data: ledAreaIds = [], isLoading: areasLoading } = useQuery({
    queryKey: [...areasKeys.all(buId ?? null), "leader", profileId],
    queryFn: async () => {
      if (!client || !profileId || !buId) return [];

      const { data, error } = await client
        .from("areas")
        .select("id")
        .eq("bu_id", buId)
        .eq("leader_user_id", profileId)
        .is("deleted_at", null);

      if (error) {
        console.error("[useCanEditKpi] Error fetching led areas:", error);
        return [];
      }

      return data?.map(a => a.id) ?? [];
    },
    enabled: isReady && !!profileId && !!buId && !isWildcard,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = !isReady || permissionLoading || contributorsLoading || teamLoading || areasLoading;

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
   * Hierarquia completa:
   * 1. Admin BU (wildcard) — qualquer KPI
   * 2. Líder de Área — KPIs com area_id da área liderada
   * 3. Líder de Time — KPIs com team_id ou responsible_team_id do time liderado
   * 4. Owner do KPI
   * 5. Contribuidores (kpi_data_contributors)
   */
  const canUpdateValues = useMemo(() => {
    if (!kpi || !profileId) return false;

    // Quem pode editar, pode atualizar valores
    if (canEdit) return true;

    // É owner do KPI
    if (kpi.owner_user_id === profileId) return true;

    // Líder de Time: verifica team_id e responsible_team_id
    if (kpi.team_id && canManageTeam(kpi.team_id)) return true;
    if (kpi.responsible_team_id && canManageTeam(kpi.responsible_team_id)) return true;

    // Líder de Área: verifica area_id do KPI
    if (kpi.area_id && ledAreaIds.includes(kpi.area_id)) return true;

    // É contribuidor
    if (contributors.includes(profileId)) return true;

    return false;
  }, [kpi, profileId, canEdit, canManageTeam, ledAreaIds, contributors]);

  return { canEdit, canUpdateValues, isLoading };
}
