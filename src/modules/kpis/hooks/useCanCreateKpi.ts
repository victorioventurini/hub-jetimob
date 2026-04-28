import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProfileId } from "@/hooks/useIdentity";
import { usePermissions } from "@/hooks/usePermissions";
import { useHierarchicalLeadership } from "@/hooks/useHierarchicalLeadership";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { KpiScope } from "../types";

type KpiIndicatorType = "kpi" | "metric";

interface UseCanCreateKpiArgs {
  scope?: KpiScope | null;
  areaId?: string | null;
  teamId?: string | null;
  indicatorType?: KpiIndicatorType | null;
}

export interface CanCreateKpiResult {
  canCreate: boolean;
  blockedReason: string | null;
  isLoading: boolean;
}

/**
 * Mirror frontend da SQL helper `user_can_create_kpi`.
 *
 * Matriz (admins sempre podem; abaixo é a hierarquia além disso):
 * - Métrica → exige scope=team + team_id; aceita líderes hierárquicos OU membro do time.
 * - org    → apenas admins.
 * - area   → admin + líder/co-líder da área.
 * - team   → admin + líder direto + líder ancestral + líder da área do time.
 */
export function useCanCreateKpi({
  scope,
  areaId,
  teamId,
  indicatorType,
}: UseCanCreateKpiArgs): CanCreateKpiResult {
  const profileId = useProfileId();
  const { isWildcard, has: hasPermission, isLoading: permLoading } = usePermissions();
  const {
    canManageTeamHierarchical,
    canManageAreaScope,
    isLoading: leadershipLoading,
  } = useHierarchicalLeadership();
  const { client, buId, isReady } = useOptionalBuClient();

  const isMetric = indicatorType === "metric";

  // Para métricas: descobrir se o usuário é membro do time selecionado.
  const { data: isTeamMember = false, isLoading: membershipLoading } = useQuery({
    queryKey: ["kpi-can-create", "team-membership", buId, teamId, profileId],
    queryFn: async () => {
      if (!client || !teamId || !profileId) return false;
      const { data, error } = await client
        .from("user_team_memberships")
        .select("id")
        .eq("team_id", teamId)
        .eq("user_id", profileId)
        .limit(1);
      if (error) {
        console.error("[useCanCreateKpi] membership error:", error);
        return false;
      }
      return (data?.length ?? 0) > 0;
    },
    enabled: isReady && isMetric && !!teamId && !!profileId && !isWildcard,
    staleTime: 5 * 60 * 1000,
  });

  // Área do time (necessária para resolver "líder da área do time")
  const { data: teamAreaId, isLoading: teamAreaLoading } = useQuery({
    queryKey: ["kpi-can-create", "team-area", buId, teamId],
    queryFn: async () => {
      if (!client || !teamId) return null;
      const { data, error } = await client
        .from("teams")
        .select("area_id")
        .eq("id", teamId)
        .maybeSingle();
      if (error) {
        console.error("[useCanCreateKpi] team area error:", error);
        return null;
      }
      return (data?.area_id as string | null) ?? null;
    },
    enabled: isReady && !!teamId && scope === "team" && !isWildcard,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    !isReady ||
    permLoading ||
    leadershipLoading ||
    (isMetric && !!teamId && membershipLoading) ||
    (scope === "team" && !!teamId && teamAreaLoading);

  return useMemo<CanCreateKpiResult>(() => {
    if (!profileId || !scope) {
      return { canCreate: false, blockedReason: null, isLoading };
    }

    // Admin / wildcard
    if (isWildcard || hasPermission("kpis.settings.manage:bu")) {
      return { canCreate: true, blockedReason: null, isLoading };
    }

    // Métricas têm regras especiais
    if (isMetric) {
      if (scope !== "team") {
        return {
          canCreate: false,
          blockedReason: "Métricas só podem ter escopo de Time.",
          isLoading,
        };
      }
      if (!teamId) {
        return {
          canCreate: false,
          blockedReason: "Selecione um time para a métrica.",
          isLoading,
        };
      }
      if (isTeamMember) {
        return { canCreate: true, blockedReason: null, isLoading };
      }
      if (canManageTeamHierarchical(teamId, teamAreaId)) {
        return { canCreate: true, blockedReason: null, isLoading };
      }
      return {
        canCreate: false,
        blockedReason: "Você precisa ser membro ou líder do time para criar métricas.",
        isLoading,
      };
    }

    // KPIs por escopo
    if (scope === "org") {
      return {
        canCreate: false,
        blockedReason: "Apenas administradores criam KPIs Globais.",
        isLoading,
      };
    }

    if (scope === "area") {
      if (!areaId) {
        return { canCreate: false, blockedReason: "Selecione uma área.", isLoading };
      }
      if (canManageAreaScope(areaId)) {
        return { canCreate: true, blockedReason: null, isLoading };
      }
      return {
        canCreate: false,
        blockedReason: "Apenas líderes da área podem criar KPIs de Área.",
        isLoading,
      };
    }

    if (scope === "team") {
      if (!teamId) {
        return { canCreate: false, blockedReason: "Selecione um time.", isLoading };
      }
      if (canManageTeamHierarchical(teamId, teamAreaId)) {
        return { canCreate: true, blockedReason: null, isLoading };
      }
      return {
        canCreate: false,
        blockedReason: "Apenas líderes do time, do time pai ou da área podem criar KPIs deste time.",
        isLoading,
      };
    }

    return { canCreate: false, blockedReason: null, isLoading };
  }, [
    profileId,
    scope,
    areaId,
    teamId,
    isMetric,
    isTeamMember,
    teamAreaId,
    isWildcard,
    hasPermission,
    canManageAreaScope,
    canManageTeamHierarchical,
    isLoading,
  ]);
}
