import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfileId } from "@/hooks/useIdentity";
import { usePermissions } from "@/hooks/usePermissions";
import { useHierarchicalLeadership } from "@/hooks/useHierarchicalLeadership";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { queryKeys } from "@/lib/queryKeys";
import { KpiScope } from "../types";

interface KpiForPermission {
  id: string;
  bu_id: string;
  owner_user_id?: string | null;
  team_id?: string | null;
  area_id?: string | null;
  responsible_team_id?: string | null;
  scope?: KpiScope | string;
  indicator_type?: "kpi" | "metric" | string | null;
}

/**
 * Permissões row-aware para um KPI/Métrica.
 *
 * Espelha as funções SQL `user_can_manage_kpi` (gestão) + RLS `kpi_metrics_*_v3/v4`.
 *
 * Retorna:
 * - `canEdit`     → pode editar metadados (admins + líderes hierárquicos + responsável + atualizado-por)
 * - `canDelete`   → pode excluir (admins + líderes hierárquicos; para métricas, também responsável e atualizado-por)
 * - `canUpdateValues` → pode lançar valores (mesmo de canEdit + líderes do team_id/responsible_team_id + área)
 */
export function useCanEditKpi(kpi: KpiForPermission | null | undefined) {
  const profileId = useProfileId();
  const { client, isReady } = useOptionalBuClient();
  const { has: hasPermission, isWildcard, isLoading: permissionLoading } = usePermissions();
  const {
    canManageTeamHierarchical,
    canManageAreaScope,
    isLoading: leadershipLoading,
  } = useHierarchicalLeadership();

  // Contribuidores ("Atualizado por" = role data_entry; consideramos qualquer ativo conservadoramente)
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
        console.error("[useCanEditKpi] contributors error:", error);
        return [];
      }
      return data?.map((c) => c.contributor_user_id) ?? [];
    },
    enabled: isReady && !!kpi?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Área do time do KPI (necessário para resolver "líder da área do time")
  const { data: teamAreaId, isLoading: teamAreaLoading } = useQuery({
    queryKey: ["kpi-permission", "team-area", kpi?.team_id ?? null],
    queryFn: async () => {
      if (!client || !kpi?.team_id) return null;
      const { data, error } = await client
        .from("teams")
        .select("area_id")
        .eq("id", kpi.team_id)
        .maybeSingle();
      if (error) {
        console.error("[useCanEditKpi] team area error:", error);
        return null;
      }
      return (data?.area_id as string | null) ?? null;
    },
    enabled: isReady && !!kpi?.team_id && !isWildcard,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    !isReady || permissionLoading || leadershipLoading || contributorsLoading || teamAreaLoading;

  /** Líder hierárquico para o escopo deste KPI? (espelha user_can_manage_kpi) */
  const isHierarchicalManager = useMemo(() => {
    if (!kpi || !profileId) return false;
    if (isWildcard) return true;
    if (hasPermission("kpis.settings.manage:bu")) return true;

    const scope = (kpi.scope as KpiScope | undefined) ?? undefined;
    if (scope === "org") return false;
    if (scope === "area") return canManageAreaScope(kpi.area_id ?? null);
    if (scope === "team") return canManageTeamHierarchical(kpi.team_id ?? null, teamAreaId ?? null);
    return false;
  }, [kpi, profileId, isWildcard, hasPermission, canManageAreaScope, canManageTeamHierarchical, teamAreaId]);

  const isOwner = !!kpi && !!profileId && kpi.owner_user_id === profileId;
  const isContributor = !!profileId && Array.isArray(contributors) && contributors.includes(profileId);

  const canEdit = useMemo(() => {
    if (!kpi || !profileId) return false;
    return isHierarchicalManager || isOwner || isContributor;
  }, [kpi, profileId, isHierarchicalManager, isOwner, isContributor]);

  const canDelete = useMemo(() => {
    if (!kpi || !profileId) return false;
    if (isHierarchicalManager) return true;
    // Para Métricas, owner e contribuidor também podem excluir
    if (kpi.indicator_type === "metric" && (isOwner || isContributor)) return true;
    return false;
  }, [kpi, profileId, isHierarchicalManager, isOwner, isContributor]);

  const canUpdateValues = useMemo(() => {
    if (!kpi || !profileId) return false;
    if (canEdit) return true;
    if (isOwner) return true;
    if (kpi.team_id && canManageTeamHierarchical(kpi.team_id, teamAreaId ?? null)) return true;
    if (kpi.responsible_team_id && canManageTeamHierarchical(kpi.responsible_team_id, null)) return true;
    if (kpi.area_id && canManageAreaScope(kpi.area_id)) return true;
    if (isContributor) return true;
    return false;
  }, [kpi, profileId, canEdit, isOwner, isContributor, canManageTeamHierarchical, canManageAreaScope, teamAreaId]);

  return { canEdit, canDelete, canUpdateValues, isLoading };
}
