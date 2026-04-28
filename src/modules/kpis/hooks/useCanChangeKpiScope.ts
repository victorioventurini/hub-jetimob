import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useHierarchicalLeadership } from "@/hooks/useHierarchicalLeadership";
import { KpiScope } from "../types";

interface KpiForScopeChange {
  id: string;
  scope?: KpiScope | string;
  team_id?: string | null;
  area_id?: string | null;
  indicator_type?: "kpi" | "metric" | string | null;
}

export interface ScopeChangePermissions {
  canChangeScope: boolean;
  allowedScopes: KpiScope[];
  /** IDs de times permitidos (vazio = todos) */
  allowedTeamIds: string[];
  /** IDs de áreas permitidas (vazio = todas) */
  allowedAreaIds: string[];
  isLoading: boolean;
}

/**
 * Define se o usuário pode alterar o escopo do KPI/Métrica.
 *
 * Regras (alinhadas com a matriz de permissões e RLS v3):
 * - Métricas: nunca podem mudar de escopo (forçadas a `team`).
 * - Admin / settings.manage:bu: livre (org ↔ area ↔ team).
 * - Líder de área: pode mover entre area↔team dentro da sua área.
 * - Líder de time (direto/ancestral): pode manter `team` e mover entre seus times.
 * - Demais: não.
 */
export function useCanChangeKpiScope(
  kpi: KpiForScopeChange | null | undefined,
): ScopeChangePermissions {
  const { isWildcard, has: hasPermission, isLoading: permLoading } = usePermissions();
  const {
    ledAreaIds,
    manageableTeamIds,
    canManageTeamHierarchical,
    canManageAreaScope,
    isLoading: leadershipLoading,
  } = useHierarchicalLeadership();

  const isLoading = permLoading || leadershipLoading;

  return useMemo<ScopeChangePermissions>(() => {
    const empty: ScopeChangePermissions = {
      canChangeScope: false,
      allowedScopes: [],
      allowedTeamIds: [],
      allowedAreaIds: [],
      isLoading,
    };
    if (!kpi) return empty;

    // Métricas: escopo travado em "team"
    if (kpi.indicator_type === "metric") {
      return empty;
    }

    if (isWildcard || hasPermission("kpis.settings.manage:bu")) {
      return {
        canChangeScope: true,
        allowedScopes: ["org", "area", "team"],
        allowedTeamIds: [],
        allowedAreaIds: [],
        isLoading,
      };
    }

    // Líder da área do KPI atual
    if (kpi.scope === "area" && kpi.area_id && canManageAreaScope(kpi.area_id)) {
      return {
        canChangeScope: true,
        allowedScopes: ["area", "team"],
        allowedTeamIds: manageableTeamIds,
        allowedAreaIds: [kpi.area_id],
        isLoading,
      };
    }

    if (kpi.scope === "team" && kpi.team_id && canManageTeamHierarchical(kpi.team_id, null)) {
      // Líder de área (que cobre o time) pode subir para area
      const allowedScopes: KpiScope[] = ["team"];
      if (ledAreaIds.length > 0) allowedScopes.push("area");
      return {
        canChangeScope: true,
        allowedScopes,
        allowedTeamIds: manageableTeamIds,
        allowedAreaIds: ledAreaIds,
        isLoading,
      };
    }

    return empty;
  }, [
    kpi,
    isWildcard,
    hasPermission,
    canManageAreaScope,
    canManageTeamHierarchical,
    ledAreaIds,
    manageableTeamIds,
    isLoading,
  ]);
}
