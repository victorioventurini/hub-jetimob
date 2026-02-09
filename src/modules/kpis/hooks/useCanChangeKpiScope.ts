import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { KpiScope } from "../types";

/**
 * Interface mínima de KPI para verificação de permissão de alteração de escopo.
 */
interface KpiForScopeChange {
  id: string;
  scope?: KpiScope | string;
  team_id?: string | null;
}

export interface ScopeChangePermissions {
  /** Pode alterar o campo escopo */
  canChangeScope: boolean;
  /** Escopos para os quais pode alterar */
  allowedScopes: KpiScope[];
  /** IDs de times permitidos (vazio = todos) */
  allowedTeamIds: string[];
  isLoading: boolean;
}

/**
 * Hook para determinar se o usuário pode alterar o escopo de um KPI.
 *
 * v2.91.0: Alteração hierárquica de escopo
 *
 * Regras:
 * - Admin/Super Admin: pode alterar livremente (org ↔ area ↔ team)
 * - Líder de Time: pode mover KPI de time → outro time que lidera (não pode subir)
 * - Colaborador: não pode alterar escopo
 *
 * @example
 * ```tsx
 * const { canChangeScope, allowedScopes, allowedTeamIds } = useCanChangeKpiScope(kpi);
 * ```
 */
export function useCanChangeKpiScope(kpi: KpiForScopeChange | null | undefined): ScopeChangePermissions {
  const { isWildcard, has: hasPermission, isLoading: permLoading } = usePermissions();
  const { manageableTeamIds, canManageTeam, isLoading: teamLoading } = useTeamManagement();

  const isLoading = permLoading || teamLoading;

  const result = useMemo(() => {
    if (!kpi) {
      return { canChangeScope: false, allowedScopes: [] as KpiScope[], allowedTeamIds: [] as string[] };
    }

    // Admin/Super Admin: acesso total
    if (isWildcard || hasPermission("kpis.settings.manage:bu")) {
      return {
        canChangeScope: true,
        allowedScopes: ["org", "area", "team"] as KpiScope[],
        allowedTeamIds: [], // vazio = todos permitidos
      };
    }

    // Não-admin com KPI Global ou de Área: não pode alterar
    if (kpi.scope === "org" || kpi.scope === "area") {
      return { canChangeScope: false, allowedScopes: [] as KpiScope[], allowedTeamIds: [] as string[] };
    }

    // Líder verificando KPI de time: pode mover apenas para times que gerencia
    if (kpi.scope === "team" && kpi.team_id && canManageTeam(kpi.team_id)) {
      return {
        canChangeScope: true,
        allowedScopes: ["team"] as KpiScope[], // só pode manter escopo team
        allowedTeamIds: manageableTeamIds,
      };
    }

    return { canChangeScope: false, allowedScopes: [] as KpiScope[], allowedTeamIds: [] as string[] };
  }, [kpi, isWildcard, hasPermission, canManageTeam, manageableTeamIds]);

  return { ...result, isLoading };
}
