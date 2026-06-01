/**
 * useMbrPreValidationData — Pendências de KPI/KR para o gate de validação
 * de dados que abre o Pré-MBR (líder do time).
 *
 * Combina:
 *   - `useKpisForWizardV2` (já com Regra A overdue + Regra B consolidation
 *     pending v3.32.0) filtrado pelo time responsável.
 *   - Lista de KRs do time já carregada pela `MbrPrePage` (não refaz query):
 *     KR é "pendente" se nunca recebeu check-in OU se o último check-in
 *     ocorreu antes do início do `referenceMonth` (mês fechado analisado
 *     pelo Pré-MBR).
 *
 * Sem queries adicionais — toda a entrada vem por parâmetro / hook
 * existente, mantendo compatibilidade com o cache da página.
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKpisForWizardV2 } from '@/modules/kpis/hooks/useKpisForWizardV2';
import type { KpiForWizardV2 } from '@/modules/kpis/types';
import { monthBoundsDate } from '@/modules/okrs/utils/mbr/referenceMonth';
import { useMbrPreTeamKpisMonthly } from '@/modules/okrs/hooks/useMbrPreTeamKpisMonthly';

// ============================================================
// Types
// ============================================================

export type KpiPendingReason = 'overdue' | 'pending_consolidation' | 'both';
export type KrPendingReason = 'never' | 'before_ref_month';

export interface KpiPendingItem {
  kpi: KpiForWizardV2;
  reason: KpiPendingReason;
}

export interface KrItem {
  krId: string;
  title: string;
  baseline: number;
  current_value: number;
  target: number;
  direction: 'up' | 'down' | 'maintain';
  unit: string;
  status: 'green' | 'yellow' | 'red' | 'not_started';
  last_checkin_at: string | null;
  team_id: string;
  metric_id?: string | null;
  isContributed?: boolean;
  objectiveId: string;
  objectiveTitle: string;
}

export interface KrPendingItem {
  kr: KrItem;
  reason: KrPendingReason;
}

export interface UseMbrPreValidationDataOptions {
  teamId: string | null;
  referenceMonth: string; // YYYY-MM
  /**
   * Objetivos do time já carregados pela página — formato bruto do
   * Supabase (`okr_team_objectives` com `key_results` aninhados).
   */
  teamObjectives: Array<{
    id: string;
    title: string;
    key_results?: Array<{
      id: string;
      title: string;
      status: string;
      current_value: number | null;
      baseline: number | null;
      target: number | null;
      direction: 'up' | 'down' | 'maintain' | null;
      unit: string | null;
      last_checkin_at: string | null;
    }>;
    _isContributed?: boolean;
  }>;
}

export interface UseMbrPreValidationDataResult {
  kpisPending: KpiPendingItem[];
  kpisOk: KpiForWizardV2[];
  krsPending: KrPendingItem[];
  krsOk: KrItem[];
  totalPending: number;
  isLoading: boolean;
}

// ============================================================
// Hook
// ============================================================

export function useMbrPreValidationData({
  teamId,
  referenceMonth,
  teamObjectives,
}: UseMbrPreValidationDataOptions): UseMbrPreValidationDataResult {
  const { profile } = useAuth();

  const {
    kpisOwnedOrContributed,
    kpisTeamContext,
    isLoading: isLoadingKpis,
  } = useKpisForWizardV2({
    userId: profile?.id ?? '',
    teamId: teamId ?? undefined,
    scope: 'leader',
    responsibleTeamId: teamId ?? undefined,
    lifecycleStatuses: ['active', 'proposed'],
    includeGuardrailsAtRisk: false,
  });

  // Universo de KPIs para o gate: tudo sob responsabilidade do time
  // (owned/contributed) + KPIs operacionalmente do time (kpisTeamContext já
  // exclui os de toUpdate). Usamos union por id para evitar duplicatas.
  const allTeamKpis = useMemo<KpiForWizardV2[]>(() => {
    const byId = new Map<string, KpiForWizardV2>();
    for (const k of kpisOwnedOrContributed) byId.set(k.id, k);
    for (const k of kpisTeamContext) if (!byId.has(k.id)) byId.set(k.id, k);
    return Array.from(byId.values());
  }, [kpisOwnedOrContributed, kpisTeamContext]);

  const { kpisPending, kpisOk } = useMemo(() => {
    const pending: KpiPendingItem[] = [];
    const ok: KpiForWizardV2[] = [];
    for (const k of allTeamKpis) {
      if (k.update_overdue && k.consolidation_pending) {
        pending.push({ kpi: k, reason: 'both' });
      } else if (k.update_overdue) {
        pending.push({ kpi: k, reason: 'overdue' });
      } else if (k.consolidation_pending) {
        pending.push({ kpi: k, reason: 'pending_consolidation' });
      } else {
        ok.push(k);
      }
    }
    return { kpisPending: pending, kpisOk: ok };
  }, [allTeamKpis]);

  const { krsPending, krsOk } = useMemo(() => {
    const pending: KrPendingItem[] = [];
    const ok: KrItem[] = [];
    if (!teamObjectives || teamObjectives.length === 0) {
      return { krsPending: pending, krsOk: ok };
    }

    const refBounds = monthBoundsDate(referenceMonth);
    if (!refBounds) return { krsPending: pending, krsOk: ok };
    const refStartMs = new Date(`${refBounds.start}T00:00:00`).getTime();

    for (const obj of teamObjectives) {
      for (const kr of (obj.key_results ?? [])) {
        const baseline = Number(kr.baseline ?? 0);
        const target = Number(kr.target ?? baseline);
        const current = Number(kr.current_value ?? baseline);
        const item: KrItem = {
          krId: kr.id,
          title: kr.title,
          baseline,
          current_value: current,
          target,
          direction: (kr.direction ?? 'up') as 'up' | 'down' | 'maintain',
          unit: kr.unit ?? '',
          status: (kr.status as KrItem['status']) ?? 'not_started',
          last_checkin_at: kr.last_checkin_at ?? null,
          team_id: teamId ?? '',
          objectiveId: obj.id,
          objectiveTitle: obj.title,
          isContributed: !!obj._isContributed,
        };

        if (!kr.last_checkin_at) {
          pending.push({ kr: item, reason: 'never' });
          continue;
        }
        const lastMs = new Date(`${kr.last_checkin_at.slice(0, 10)}T00:00:00`).getTime();
        if (Number.isNaN(lastMs) || lastMs < refStartMs) {
          pending.push({ kr: item, reason: 'before_ref_month' });
        } else {
          ok.push(item);
        }
      }
    }
    return { krsPending: pending, krsOk: ok };
  }, [teamObjectives, referenceMonth, teamId]);

  return {
    kpisPending,
    kpisOk,
    krsPending,
    krsOk,
    totalPending: kpisPending.length + krsPending.length,
    isLoading: isLoadingKpis,
  };
}
