/**
 * Effects de seeding de snapshots no draft do MBR.
 * Encapsula a complexidade de migração/saneamento + first-load.
 */
import { useEffect, useRef } from 'react';
import { calculateProgress } from '@/modules/okrs/types';
import type {
  MbrDraftData,
  MbrKpiSnapshot,
  MbrOrgOkrSnapshot,
  MbrTeamOkrSnapshot,
} from '@/modules/okrs/types/wizard';
import { computeHealthScore, computeHealthStatus } from './constants';

interface KpiSourceRow {
  id: string;
  name: string;
  unit?: string | null;
  target_value: number | null;
  scope?: string | null;
  area_id?: string | null;
  team_id?: string | null;
  latest_value: number | null;
  latest_rag_status: string;
  latest_reference_date: string | null;
  areaName: string | null;
  areaColor: string | null;
  teamName: string | null;
}

export function useSeedKpiSnapshots(args: {
  isLoading: boolean;
  allBuKpis: KpiSourceRow[] | undefined;
  draftKpiSnapshots: MbrDraftData['kpiSnapshots'];
  updateDraft: (patch: Partial<MbrDraftData>) => void;
}) {
  const { isLoading, allBuKpis, draftKpiSnapshots, updateDraft } = args;
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    if (isLoading || !allBuKpis || allBuKpis.length === 0) return;

    // Saneamento: remove snapshots com escopo 'team' (regra v2: só org/area).
    if (draftKpiSnapshots.length > 0) {
      const cleaned = draftKpiSnapshots.filter(
        (s) => s.scope === 'org' || s.scope === 'area',
      );
      if (cleaned.length !== draftKpiSnapshots.length) {
        updateDraft({ kpiSnapshots: cleaned });
      }
      seeded.current = true;
      return;
    }

    const snapshots: MbrKpiSnapshot[] = allBuKpis.map((kpi) => ({
      kpiId: kpi.id,
      name: kpi.name,
      currentValue: kpi.latest_value,
      previousValue: null,
      target: kpi.target_value,
      ragStatus:
        kpi.latest_rag_status === 'on_track' ? 'green'
        : kpi.latest_rag_status === 'at_risk' ? 'yellow'
        : kpi.latest_rag_status === 'off_track' ? 'red'
        : 'no_data',
      requiresStrategicDecision: kpi.latest_rag_status === 'off_track',
      unit: kpi.unit ?? '%',
      lastValueAt: kpi.latest_reference_date ?? null,
      scope: (kpi.scope as 'org' | 'area' | 'team') ?? 'org',
      areaId: kpi.area_id ?? null,
      areaName: kpi.areaName,
      areaColor: kpi.areaColor,
      teamId: kpi.team_id ?? null,
      teamName: kpi.teamName,
    }));

    updateDraft({ kpiSnapshots: snapshots });
    seeded.current = true;
  }, [allBuKpis, isLoading, draftKpiSnapshots, updateDraft]);
}

const VALID_RAG = new Set(['green', 'yellow', 'red', 'not_started']);
const VALID_DIRECTIONS = new Set(['up', 'down', 'maintain']);

export function useSeedTeamOkrSnapshots(args: {
  cycleId: string | undefined | null;
  hasFetched: boolean;
  isLoading: boolean;
  allTeamObjectives: any[] | undefined;
  draftTeamOkrSnapshots: MbrTeamOkrSnapshot[];
  updateDraft: (patch: Partial<MbrDraftData>) => void;
  /**
   * Times que submeteram Pré-MBR para o mês de referência do MBR.
   * A pauta de times é a UNIÃO de (a) times com objetivos próprios no ciclo
   * e (b) estes times — assim um time sem OKR própria (que contribui via KRs
   * de outro time) não desaparece do MBR.
   */
  preSubmittedTeams?: Array<{ teamId: string; teamName: string }>;
}) {
  const {
    cycleId,
    hasFetched,
    isLoading,
    allTeamObjectives,
    draftTeamOkrSnapshots,
    updateDraft,
    preSubmittedTeams = [],
  } = args;
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    if (!cycleId) return;
    if (!hasFetched || isLoading) return;


    // Migration guard: drafts antigos precisam ser re-seeded.
    const hasValidKeyResults =
      draftTeamOkrSnapshots.length > 0 &&
      draftTeamOkrSnapshots.every((team) =>
        team.objectives.every(
          (objective) =>
            Array.isArray(objective.keyResults) &&
            objective.keyResults.every((kr) => {
              const hasNumericValues =
                Number.isFinite(kr.baseline) &&
                Number.isFinite(kr.current) &&
                Number.isFinite(kr.target);
              const hasValidStatus =
                typeof kr.status === 'string' && VALID_RAG.has(kr.status);
              const hasValidDirection =
                typeof kr.direction === 'string' && VALID_DIRECTIONS.has(kr.direction);
              const hasValidUnit =
                typeof kr.unit === 'string' && kr.unit.trim().length > 0;
              const hasValidLastCheckin =
                kr.lastCheckinAt === null ||
                kr.lastCheckinAt === undefined ||
                typeof kr.lastCheckinAt === 'string';
              return (
                typeof kr.title === 'string' &&
                hasNumericValues &&
                hasValidStatus &&
                hasValidDirection &&
                hasValidUnit &&
                hasValidLastCheckin
              );
            }),
        ),
      );

    if (hasValidKeyResults) {
      // Saneamento (drafts já em andamento): garante que times com Pré-MBR
      // submetido apareçam na pauta mesmo sem OKR própria no ciclo.
      const existing = new Set(draftTeamOkrSnapshots.map((t) => t.teamId));
      const missing = preSubmittedTeams.filter((t) => t.teamId && !existing.has(t.teamId));
      if (missing.length > 0) {
        updateDraft({
          teamOkrSnapshots: [
            ...draftTeamOkrSnapshots,
            ...missing.map((t) => buildEmptyTeamSnapshot(t.teamId, t.teamName)),
          ],
        });
      }
      seeded.current = true;
      return;
    }


    const objByTeam = new Map<string, { teamName: string; objectives: any[] }>();
    for (const obj of allTeamObjectives || []) {
      if (!obj.team_id) continue;
      const teamData = obj.team as { name?: string } | null;
      if (!objByTeam.has(obj.team_id)) {
        objByTeam.set(obj.team_id, {
          teamName: teamData?.name || 'Time sem nome',
          objectives: [],
        });
      }
      objByTeam.get(obj.team_id)!.objectives.push(obj);
    }

    const snapshots: MbrTeamOkrSnapshot[] = Array.from(objByTeam.entries()).map(
      ([teamId, { teamName, objectives: teamObjs }]) => {
        const objectives = teamObjs.map((obj: any) => {
          const krs = obj.key_results || [];
          const krCount = krs.length;
          const krsAtRisk = krs.filter(
            (kr: any) => kr.status === 'red' || kr.status === 'yellow',
          ).length;
          const krsStagnant = krs.filter(
            (kr: any) => kr.status === 'not_started',
          ).length;

          const avgProgress =
            krCount > 0
              ? krs.reduce((sum: number, kr: any) => {
                  const baseline = Number(kr.baseline ?? 0);
                  const current = Number(kr.current_value ?? baseline);
                  const target = Number(kr.target ?? baseline);
                  const direction = (kr.direction ?? 'up') as
                    | 'up'
                    | 'down'
                    | 'maintain';
                  return (
                    sum + calculateProgress(baseline, current, target, direction, { unit: kr.unit })
                  );
                }, 0) / krCount
              : 0;

          const trend: 'improving' | 'stable' | 'declining' =
            avgProgress >= 70
              ? 'improving'
              : avgProgress >= 40
                ? 'stable'
                : 'declining';

          return {
            objectiveId: obj.id,
            title: obj.title,
            progress: Math.round(avgProgress),
            status: obj.status,
            krCount,
            krsAtRisk,
            krsStagnant,
            trend,
            keyResults: krs.map((kr: any) => {
              const baseline = Number(kr.baseline ?? 0);
              const current = Number(kr.current_value ?? baseline);
              const target = Number(kr.target ?? baseline);
              const directionForProgress = (kr.direction ?? 'up') as
                | 'up'
                | 'down'
                | 'maintain';
              const direction = kr.direction === 'down' ? 'down' : 'up';
              const progress = Math.round(
                calculateProgress(baseline, current, target, directionForProgress, { unit: kr.unit }),
              );
              return {
                krId: kr.id,
                title: kr.title,
                progress,
                status: kr.status,
                ownerName: (kr.owner as any)?.display_name ?? null,
                baseline,
                current,
                target,
                direction,
                unit: kr.unit ?? '%',
                lastCheckinAt: kr.last_checkin_at ?? null,
              };
            }),
          };
        });

        const healthScore = computeHealthScore(objectives);
        return {
          teamId,
          teamName,
          objectives,
          healthScore,
          healthStatus: computeHealthStatus(healthScore),
          reviewed: false,
        };
      },
    );

    if (snapshots.length > 0) {
      updateDraft({ teamOkrSnapshots: snapshots, currentTeamIndex: 0 });
    }
    seeded.current = true;
  }, [
    allTeamObjectives,
    cycleId,
    hasFetched,
    isLoading,
    draftTeamOkrSnapshots.length,
    updateDraft,
  ]);
}

export function useSeedOrgOkrSnapshots(args: {
  isLoading: boolean;
  orgObjectives: any[] | undefined;
  draftOrgOkrSnapshots: MbrOrgOkrSnapshot[];
  updateDraft: (patch: Partial<MbrDraftData>) => void;
}) {
  const { isLoading, orgObjectives, draftOrgOkrSnapshots, updateDraft } = args;
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    if (isLoading || !orgObjectives || orgObjectives.length === 0) return;
    const snapshots: MbrOrgOkrSnapshot[] = orgObjectives.map((obj: any) => {
      const krs = obj.key_results || [];
      const avgProgress =
        krs.length > 0
            ? krs.reduce((sum: number, kr: any) => {
              const baseline = Number(kr.baseline ?? 0);
              const current = Number(kr.current_value ?? baseline);
              const target = Number(kr.target ?? baseline);
              const direction = (kr.direction || 'up') as 'up' | 'down' | 'maintain';
              return sum + calculateProgress(baseline, current, target, direction, { unit: kr.unit });
            }, 0) / krs.length
          : 0;

      const trend: 'improving' | 'stable' | 'declining' =
        obj.status === 'completed'
          ? 'improving'
          : avgProgress >= 70
            ? 'improving'
            : avgProgress >= 40
              ? 'stable'
              : 'declining';

      return {
        objectiveId: obj.id,
        title: obj.title,
        progress: Math.round(avgProgress),
        status: obj.status,
        trend,
        remainsStrategicPriority: true,
        keyResults: krs.map((kr: any) => {
          const krBaseline = Number(kr.baseline ?? 0);
          const krCurrent = Number(kr.current_value ?? krBaseline);
          const krTarget = Number(kr.target ?? krBaseline);
          const krDirection = (kr.direction || 'up') as 'up' | 'down';
          const krProgress = calculateProgress(krBaseline, krCurrent, krTarget, krDirection, { unit: kr.unit });
          return {
            krId: kr.id,
            title: kr.title,
            progress: Math.round(krProgress),
            status: kr.status || 'not_started',
            ownerName: kr.owner?.full_name ?? null,
            baseline: krBaseline,
            current: krCurrent,
            target: krTarget,
            direction: krDirection,
            unit: kr.unit || '%',
            lastCheckinAt: kr.last_checkin_at ?? null,
          };
        }),
      };
    });

    if (draftOrgOkrSnapshots.length > 0) {
      const recalculatedById = new Map(snapshots.map((snapshot) => [snapshot.objectiveId, snapshot]));
      const needsRecalculation = draftOrgOkrSnapshots.some((draftSnapshot) => {
        const recalculated = recalculatedById.get(draftSnapshot.objectiveId);
        if (!recalculated) return false;
        if (Math.abs((draftSnapshot.progress ?? 0) - recalculated.progress) >= 1) return true;
        return draftSnapshot.keyResults.some((draftKr) => {
          const recalculatedKr = recalculated.keyResults.find((kr) => kr.krId === draftKr.krId);
          return recalculatedKr ? Math.abs((draftKr.progress ?? 0) - recalculatedKr.progress) >= 1 : false;
        });
      });
      if (!needsRecalculation) {
        seeded.current = true;
        return;
      }
    }

    updateDraft({ orgOkrSnapshots: snapshots });
    seeded.current = true;
  }, [orgObjectives, isLoading, draftOrgOkrSnapshots.length, updateDraft]);
}
