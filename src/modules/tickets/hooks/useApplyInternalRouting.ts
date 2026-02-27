// ============================================================
// HOOK: useApplyInternalRouting
// Matching de regras de roteamento interno para criação de tickets
// ============================================================

import { useMemo } from "react";
import { useInternalRoutingRules } from "./useInternalRoutingRules";
import type { TicketInternalRoutingRule } from "../types";

// ============================================================
// TIPOS
// ============================================================

export interface InternalRoutingMatch {
  ownerUserId: string;
  assigneeUserIds: string[];
  watcherUserIds: string[];
}

// ============================================================
// FUNÇÃO PURA DE MATCHING
// ============================================================

/**
 * Encontra a regra de roteamento interno mais específica.
 * 
 * Prioridade:
 * 1. Match exato por subcategory_id
 * 2. Match por category_id com subcategory_id IS NULL
 * 
 * Desempate: campo `priority` (ASC) — já vem ordenado do hook.
 */
export function matchInternalRoutingRule(
  rules: TicketInternalRoutingRule[],
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
): InternalRoutingMatch | null {
  if (!rules.length || !categoryId) return null;

  // Prioridade 1: match exato por subcategory_id
  if (subcategoryId) {
    const subcatMatch = rules.find(
      (r) => r.subcategory_id === subcategoryId,
    );
    if (subcatMatch && subcatMatch.assignee_user_ids.length > 0) {
      return {
        ownerUserId: subcatMatch.assignee_user_ids[0],
        assigneeUserIds: subcatMatch.assignee_user_ids,
        watcherUserIds: subcatMatch.watcher_user_ids,
      };
    }
  }

  // Prioridade 2: match por category_id (sem subcategory)
  const catMatch = rules.find(
    (r) => r.category_id === categoryId && !r.subcategory_id,
  );
  if (catMatch && catMatch.assignee_user_ids.length > 0) {
    return {
      ownerUserId: catMatch.assignee_user_ids[0],
      assigneeUserIds: catMatch.assignee_user_ids,
      watcherUserIds: catMatch.watcher_user_ids,
    };
  }

  return null;
}

// ============================================================
// HOOK REATIVO
// ============================================================

/**
 * Hook reativo que retorna o resultado de matching de roteamento interno
 * conforme categoria/subcategoria mudam.
 * 
 * Consome useInternalRoutingRules() (dados cacheados por 5min).
 */
export function useInternalRoutingMatch(
  categoryId: string | null | undefined,
  subcategoryId: string | null | undefined,
) {
  const { data: rules = [] } = useInternalRoutingRules();

  return useMemo(
    () => matchInternalRoutingRule(rules, categoryId, subcategoryId),
    [rules, categoryId, subcategoryId],
  );
}
