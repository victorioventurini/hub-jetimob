/**
 * useCollaboratorWeekActivity — SSOT do card "Sua semana até aqui" e da
 * trilha do Check-in Individual.
 *
 * Read-only. Calcula:
 *  - Seção 1 ("já feito"): KPIs atualizados, KRs com check-in, milestones
 *    concluídos, iniciativas atualizadas, bloqueios registrados — tudo na
 *    semana corrente (segunda 00:00 — agora, timezone local).
 *  - Seção 2 ("ainda falta"): pendentes derivados das mesmas fontes que a
 *    trilha (KPIs needs_update, projetos com milestone pendente, iniciativas
 *    em atenção, KRs sem check-in).
 *
 * Reaproveita `useCollaboratorOpeningSignals` e `useCollaboratorInitiativesSignal`
 * para os pendentes de projetos/iniciativas (sem duplicar queries pesadas).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { okrsKeys } from '@/lib/queryKeys/okrs';
import {
  useCollaboratorOpeningSignals,
  useCollaboratorInitiativesSignal,
} from '@/modules/okrs/hooks';
import type { WizardKr } from '@/modules/okrs/hooks';
import type { KpiForWizard } from '@/modules/kpis/hooks';
import type { KpiForWizardV2 } from '@/modules/kpis/types';

// ============================================================
// TYPES
// ============================================================

export type WeekActivityType =
  | 'kpis'
  | 'projects'
  | 'initiatives'
  | 'krs'
  | 'blockers_registered';

export type WeekPendingType = 'kpis' | 'projects' | 'initiatives' | 'krs';

export interface WeekActivityRow {
  type: WeekActivityType;
  count: number;
  itemNames: string[];
  remainingCount: number;
  extraInfo?: string;
}

export interface WeekPendingRow {
  type: WeekPendingType;
  count: number;
  label: string;
}

export interface CollaboratorWeekActivity {
  activities: WeekActivityRow[];
  pending: WeekPendingRow[];
  hasAnyActivity: boolean;
  isAllCaughtUp: boolean;
  isLoading: boolean;
  weekStartIso: string;
}

export interface UseCollaboratorWeekActivityArgs {
  effectiveUserId: string | null;
  cycleId: string | null;
  krs: WizardKr[];
  kpisToUpdate: (KpiForWizard | KpiForWizardV2)[];
}

// ============================================================
// HELPERS
// ============================================================

/** Início da semana corrente (segunda 00:00 — timezone local). */
export function getWeekStart(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0=dom, 1=seg, ..., 6=sáb. Queremos segunda como início.
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

/** Trunca lista a N nomes + remainingCount. */
export function pickTopNames(names: string[], max = 3): { itemNames: string[]; remainingCount: number } {
  const filtered = names.filter((n) => !!n && n.trim().length > 0);
  if (filtered.length <= max) return { itemNames: filtered, remainingCount: 0 };
  return { itemNames: filtered.slice(0, max), remainingCount: filtered.length - max };
}

/** Mapeia confiança (low/medium/high) → 1/2/3 → label. */
function avgConfidenceLabel(values: Array<string | null | undefined>): string | undefined {
  const map: Record<string, number> = { low: 1, medium: 2, high: 3 };
  const nums = values
    .map((v) => map[String(v ?? '').toLowerCase()])
    .filter((n): n is number => Number.isFinite(n));
  if (nums.length === 0) return undefined;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const label = avg < 1.5 ? 'Baixa' : avg < 2.5 ? 'Média' : 'Alta';
  return `Confiança média: ${label}`;
}

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

// ============================================================
// HOOK
// ============================================================

export function useCollaboratorWeekActivity({
  effectiveUserId,
  cycleId,
  krs,
  kpisToUpdate,
}: UseCollaboratorWeekActivityArgs): CollaboratorWeekActivity {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  const weekStart = useMemo(() => getWeekStart(), []);
  const weekStartIso = weekStart.toISOString();

  // ── Pendentes: reaproveita hooks existentes (não duplicar queries) ──
  const openingSignals = useCollaboratorOpeningSignals(effectiveUserId);
  const initiativesSignal = useCollaboratorInitiativesSignal(effectiveUserId, cycleId);

  // ── Seção 1: KPIs atualizados na semana ──
  const kpisActivityQuery = useQuery({
    queryKey: okrsKeys.weekActivityKpis(buId, effectiveUserId, weekStartIso),
    enabled: !!buId && !!effectiveUserId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_values')
        .select('id, kpi_id, kpis!inner(id, name)')
        .eq('created_by', effectiveUserId!)
        .gte('created_at', weekStartIso);
      if (error) throw error;
      return (data ?? []) as Array<{ kpi_id: string; kpis: { id: string; name: string } | null }>;
    },
  });

  // ── Seção 1: KRs com check-in na semana (+ confiança média) ──
  const checkinsActivityQuery = useQuery({
    queryKey: okrsKeys.weekActivityCheckins(buId, effectiveUserId, weekStartIso),
    enabled: !!buId && !!effectiveUserId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_checkins')
        .select('id, kr_id, confidence, blockers, okr_team_key_results!inner(id, title, deleted_at, cancelled_at)')
        .eq('user_id', effectiveUserId!)
        .gte('created_at', weekStartIso)
        .is('okr_team_key_results.deleted_at', null)
        .is('okr_team_key_results.cancelled_at', null);
      if (error) throw error;
      return (data ?? []) as Array<{
        kr_id: string;
        confidence: string | null;
        blockers: string | null;
        okr_team_key_results: { id: string; title: string } | null;
      }>;
    },
  });

  // ── Seção 1: Milestones concluídos esta semana (proxy: status=done + updated_at) ──
  const milestonesActivityQuery = useQuery({
    queryKey: okrsKeys.weekActivityMilestones(buId, effectiveUserId, weekStartIso),
    enabled: !!buId && !!effectiveUserId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('id, name, projects!inner(id, owner_id, deleted_at)')
        .eq('status', 'done')
        .eq('projects.owner_id', effectiveUserId!)
        .gte('updated_at', weekStartIso)
        .is('deleted_at', null)
        .is('projects.deleted_at', null);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  // ── Seção 1: Iniciativas atualizadas na semana (proxy: updated_at) ──
  const initiativesActivityQuery = useQuery({
    queryKey: okrsKeys.weekActivityInitiatives(buId, cycleId, effectiveUserId, weekStartIso),
    enabled: !!buId && !!effectiveUserId && !!cycleId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_initiatives')
        .select(
          'id, name, updated_at, owner_user_id, contributors, kr:okr_team_key_results!inner(id, deleted_at, cancelled_at, team_objective:okr_team_objectives!inner(id, cycle_id, deleted_at, cancelled_at))',
        )
        .or(`owner_user_id.eq.${effectiveUserId!},contributors.cs.{${effectiveUserId!}}`)
        .eq('kr.team_objective.cycle_id', cycleId!)
        .gte('updated_at', weekStartIso)
        .is('deleted_at', null)
        .is('kr.deleted_at', null)
        .is('kr.cancelled_at', null)
        .is('kr.team_objective.deleted_at', null)
        .is('kr.team_objective.cancelled_at', null);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });

  // ============================================================
  // DERIVE: Seção 1 (já feito)
  // ============================================================

  const activities = useMemo<WeekActivityRow[]>(() => {
    const rows: WeekActivityRow[] = [];

    // KPIs (deduplicar por kpi_id)
    const kpiRows = kpisActivityQuery.data ?? [];
    const uniqueKpis = new Map<string, string>();
    for (const r of kpiRows) {
      if (r.kpi_id && r.kpis?.name && !uniqueKpis.has(r.kpi_id)) {
        uniqueKpis.set(r.kpi_id, r.kpis.name);
      }
    }
    if (uniqueKpis.size > 0) {
      const { itemNames, remainingCount } = pickTopNames([...uniqueKpis.values()]);
      rows.push({ type: 'kpis', count: uniqueKpis.size, itemNames, remainingCount });
    }

    // Projetos (milestones concluídos)
    const ms = milestonesActivityQuery.data ?? [];
    if (ms.length > 0) {
      const { itemNames, remainingCount } = pickTopNames(ms.map((m) => m.name));
      rows.push({ type: 'projects', count: ms.length, itemNames, remainingCount });
    }

    // Iniciativas
    const inits = initiativesActivityQuery.data ?? [];
    if (inits.length > 0) {
      const { itemNames, remainingCount } = pickTopNames(inits.map((i) => i.name));
      rows.push({ type: 'initiatives', count: inits.length, itemNames, remainingCount });
    }

    // KRs (deduplicar por kr_id, calcular confiança média)
    const checkinRows = checkinsActivityQuery.data ?? [];
    const uniqueKrs = new Map<string, string>();
    for (const c of checkinRows) {
      if (c.kr_id && c.okr_team_key_results?.title && !uniqueKrs.has(c.kr_id)) {
        uniqueKrs.set(c.kr_id, c.okr_team_key_results.title);
      }
    }
    if (uniqueKrs.size > 0) {
      const { itemNames, remainingCount } = pickTopNames([...uniqueKrs.values()]);
      const extraInfo = avgConfidenceLabel(checkinRows.map((c) => c.confidence));
      rows.push({
        type: 'krs',
        count: uniqueKrs.size,
        itemNames,
        remainingCount,
        extraInfo,
      });
    }

    // Bloqueios registrados (check-ins desta semana com blockers preenchido)
    const blockerRows = checkinRows.filter((c) => (c.blockers ?? '').trim().length > 0);
    if (blockerRows.length > 0) {
      const titles = blockerRows
        .map((c) => c.okr_team_key_results?.title)
        .filter((t): t is string => !!t);
      const { itemNames, remainingCount } = pickTopNames(titles);
      rows.push({
        type: 'blockers_registered',
        count: blockerRows.length,
        itemNames,
        remainingCount,
      });
    }

    return rows;
  }, [
    kpisActivityQuery.data,
    milestonesActivityQuery.data,
    initiativesActivityQuery.data,
    checkinsActivityQuery.data,
  ]);

  // ============================================================
  // DERIVE: Seção 2 (ainda falta) — mesmas fontes da trilha
  // ============================================================

  const pending = useMemo<WeekPendingRow[]>(() => {
    const rows: WeekPendingRow[] = [];

    const kpisPending = kpisToUpdate.filter((k) => k.needs_update).length;
    if (kpisPending > 0) {
      rows.push({
        type: 'kpis',
        count: kpisPending,
        label: `${kpisPending} ${pluralize(kpisPending, 'indicador para atualizar', 'indicadores para atualizar')}`,
      });
    }

    const projectsPending = Math.max(
      0,
      openingSignals.projectsTotal - openingSignals.projectsHealthy,
    );
    if (projectsPending > 0) {
      rows.push({
        type: 'projects',
        count: projectsPending,
        label: `${projectsPending} ${pluralize(projectsPending, 'projeto com milestone pendente', 'projetos com milestone pendente')}`,
      });
    }

    const initiativesPending = Math.max(
      0,
      initiativesSignal.initiativesTotal - initiativesSignal.initiativesOnTrack,
    );
    if (initiativesPending > 0) {
      rows.push({
        type: 'initiatives',
        count: initiativesPending,
        label: `${initiativesPending} ${pluralize(initiativesPending, 'iniciativa sem atualização', 'iniciativas sem atualização')}`,
      });
    }

    const krsAttention = krs.filter(
      (kr) => kr.is_at_risk || kr.is_pending || kr.status === 'red' || kr.status === 'yellow',
    ).length;
    if (krsAttention > 0) {
      rows.push({
        type: 'krs',
        count: krsAttention,
        label: `${krsAttention} ${pluralize(krsAttention, 'KR sem check-in esta semana', 'KRs sem check-in esta semana')}`,
      });
    }

    return rows;
  }, [
    kpisToUpdate,
    openingSignals.projectsTotal,
    openingSignals.projectsHealthy,
    initiativesSignal.initiativesTotal,
    initiativesSignal.initiativesOnTrack,
    krs,
  ]);

  const isLoading =
    kpisActivityQuery.isLoading ||
    checkinsActivityQuery.isLoading ||
    milestonesActivityQuery.isLoading ||
    initiativesActivityQuery.isLoading ||
    openingSignals.isLoading ||
    initiativesSignal.isLoading;

  return {
    activities,
    pending,
    hasAnyActivity: activities.length > 0,
    isAllCaughtUp: pending.length === 0,
    isLoading,
    weekStartIso,
  };
}
