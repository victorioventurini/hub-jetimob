/**
 * MbrPage - Full-page wizard para Monthly Business Review
 * 
 * Rito decisório mensal — saúde estratégica do negócio.
 * Nível organizacional (sem seleção de time).
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { defaultReferenceMonth } from '@/modules/okrs/utils/mbr/referenceMonth';
import { useQuery } from '@tanstack/react-query';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { RitualPreparationStatus, RitualAttendance } from '@/modules/okrs/components/wizards/shared';
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';
import {
  useGenericWizardDraft,
  useActiveCycle,
  useLastCompletedSession,
  useOrgObjectives,
  useAllOrgObjectivesView,
  useCarryOverDecisions,
  useMbrPreSubmissions,
} from '@/modules/okrs/hooks';
import { usePreviousMbrPendingItems } from '@/modules/okrs/hooks/usePreviousMbrPendingItems';
import { useRitualAvailability } from '@/modules/okrs/hooks';
import { calculateKrState } from '@/modules/okrs/hooks';

import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { mbrKeys } from '@/lib/queryKeys/okrs';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';

// Step components
import { MbrPanoramaStep } from '@/modules/okrs/components/wizards/mbr/MbrPanoramaStep';
import { MbrKpiGateStep } from '@/modules/okrs/components/wizards/mbr/MbrKpiGateStep';
import { MbrTeamOkrsOverviewStep } from '@/modules/okrs/components/wizards/mbr/MbrTeamOkrsOverviewStep';
import { MbrTeamOkrsDetailStep } from '@/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep';
import { MbrOrgOkrsStep } from '@/modules/okrs/components/wizards/mbr/MbrOrgOkrsStep';
import { MbrDecisionsStep } from '@/modules/okrs/components/wizards/mbr/MbrDecisionsStep';
import { MbrClosingStep } from '@/modules/okrs/components/wizards/mbr/MbrClosingStep';
import { MbrQbrFollowUpStep } from '@/modules/okrs/components/wizards/mbr/MbrQbrFollowUpStep';

import { calculateProgress } from '@/modules/okrs/types';
import type {
  MbrStep,
  MbrDraftData,
  MbrGovernanceChecklist,
  TeamCheckinDecision,
  RitualImprovementFeedback,
  MbrKpiSnapshot,
  MbrOrgOkrSnapshot,
  MbrTeamOkrSnapshot,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'panorama' as const, label: 'Panorama Executivo', description: 'Saúde do negócio' },
  { id: 'kpi-gate' as const, label: 'KPI Gate', description: 'KPIs críticos' },
  { id: 'team-okrs-overview' as const, label: 'OKRs dos Times', description: 'Visão consolidada' },
  { id: 'team-okrs-detail' as const, label: 'Análise por Time', description: 'Drill-down' },
  { id: 'org-okrs' as const, label: 'OKRs Org', description: 'Prioridades estratégicas' },
  { id: 'decisions' as const, label: 'Decisões', description: 'Consolidação' },
  { id: 'qbr-followup' as const, label: 'Follow-up QBR', description: 'Decisões do QBR' },
  { id: 'closing' as const, label: 'Encerramento', description: 'Governança' },
];

const STEP_ORDER: MbrStep[] = ['panorama', 'kpi-gate', 'team-okrs-overview', 'team-okrs-detail', 'org-okrs', 'decisions', 'qbr-followup', 'closing'];

const DEFAULT_DATA: MbrDraftData = {
  // Mês alvo padrão = mês imediatamente anterior (mês fechado).
  // MBR é executado no início do mês seguinte ao analisado.
  referenceMonth: defaultReferenceMonth(),
  kpiSnapshots: [],
  teamOkrSnapshots: [],
  currentTeamIndex: 0,
  orgOkrSnapshots: [],
  decisions: [],
  checklist: {
    strategicFocusClear: false,
    nextStepsHaveOwners: false,
    nonPrioritiesClear: false,
    communicateInAllHands: false,
    kpiGateClear: false,
    allTeamsReviewed: false,
    orgOkrsVerified: false,
    decisionsHaveOwner: false,
    qbrFollowUpAddressed: false,
    nextMbrScheduled: false,
  },
  ritualFeedback: [],
  qbrFollowUpItems: [],
};

// ============================================================
// HELPERS
// ============================================================

function computeHealthScore(objectives: MbrTeamOkrSnapshot['objectives']): number {
  if (objectives.length === 0) return 100;
  const avgProgress = objectives.reduce((s, o) => s + o.progress, 0) / objectives.length;
  const atRiskRatio = objectives.reduce((s, o) => s + o.krsAtRisk, 0) / Math.max(1, objectives.reduce((s, o) => s + o.krCount, 0));
  return Math.round(Math.max(0, Math.min(100, avgProgress * (1 - atRiskRatio * 0.5))));
}

function computeHealthStatus(score: number): 'healthy' | 'attention' | 'risk' {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'attention';
  return 'risk';
}

// ============================================================
// COMPONENT
// ============================================================

export default function MbrPage() {
  const navigate = useNavigate();
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();

  usePageTitle('MBR');

  // Cycle (status-based)
  const { activeQuarterlyCycle: quarterlyCycle, isLoading: isLoadingCycles } = useActiveCycle();
  const availability = useRitualAvailability('mbr', quarterlyCycle);

  // Last completed MBR (for pending items)
  const { lastCompletedAt } = useLastCompletedSession('mbr');

  // Draft persistence
  const {
    draft,
    updateDraft,
    setStep,
    clearDraft,
    discardDraft,
    saveDraft,
    isDirty,
    isSaving,
    isResumingDraft,
    lastSavedAt,
    sessionId,
  } = useGenericWizardDraft<MbrStep, MbrDraftData>({
    wizardType: 'mbr',
    teamId: null,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'panorama',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle,
  });

  // Carry-over: pendências do MBR anterior na BU (fonte canônica)
  const { data: mbrCarryOver = [] } = useCarryOverDecisions({
    wizardType: 'mbr',
    teamId: null,
  });

  // ── MBR-PRE submissions (mês de referência do draft) ──
  const { data: mbrPre } = useMbrPreSubmissions({
    referenceMonth: draft.data.referenceMonth,
  });
  const mbrPreByTeam = mbrPre?.byTeam ?? {};
  const mbrPreAddendumsByTeam = mbrPre?.addendumsByTeam ?? {};
  const mbrPreSubmittedCount = mbrPre?.submittedCount ?? 0;



  // Sugestões de KPIs propostos pelos líderes (cross-team)
  const proposedKpis = useMemo(() => {
    return Object.values(mbrPreByTeam).flatMap(sub =>
      (sub.kpisToCreate ?? []).map(k => ({
        ...k,
        teamId: sub.teamId,
        submittedByName: sub.submittedByName,
      }))
    );
  }, [mbrPreByTeam]);

  // Itens trazidos pelos pré-MBR (needsDecision + crossDependencies)
  const mbrPreSurfacedItems = useMemo(() => {
    const items: Array<{
      key: string;
      teamId: string;
      kind: 'needs_decision' | 'cross_dependency';
      text: string;
    }> = [];
    for (const sub of Object.values(mbrPreByTeam)) {
      const nd = sub.highlights?.needsDecision?.trim();
      if (nd) {
        items.push({ key: `${sub.teamId}-nd`, teamId: sub.teamId, kind: 'needs_decision', text: nd });
      }
      for (const dep of sub.nextSteps?.crossDependencies ?? []) {
        if (dep?.trim()) {
          items.push({
            key: `${sub.teamId}-dep-${items.length}`,
            teamId: sub.teamId,
            kind: 'cross_dependency',
            text: dep.trim(),
          });
        }
      }
    }
    return items;
  }, [mbrPreByTeam]);


  // ── Load ALL BU KPIs (excl. metrics) with area/team joins ──
  const { currentBuId } = useBu();
  const { data: allBuKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: mbrKeys.buKpis(currentBuId),
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: kpis, error: kpiErr } = await buSupabase
        .from('kpi_metrics')
        .select(`
          id, name, unit, target_value, direction, frequency,
          lifecycle_status, scope, area_id, team_id,
          indicator_type,
          area:areas!kpi_metrics_area_id_fkey(id, name, color),
          team:teams!kpi_metrics_team_id_fkey(id, name)
        `)
        .eq('lifecycle_status', 'active')
        .is('deleted_at', null)
        .neq('indicator_type', 'metric');

      if (kpiErr || !kpis || kpis.length === 0) return [];

      // Fetch latest values
      const kpiIds = kpis.map(k => k.id);
      const { data: latestValues } = await buSupabase
        .from('kpi_values')
        .select('kpi_id, value, reference_date, rag_status')
        .in('kpi_id', kpiIds)
        .order('reference_date', { ascending: false });

      const latestByKpi = new Map<string, { value: number; rag_status: string; reference_date: string }>();
      for (const v of (latestValues || [])) {
        if (!latestByKpi.has(v.kpi_id)) {
          latestByKpi.set(v.kpi_id, { value: v.value, rag_status: v.rag_status, reference_date: v.reference_date });
        }
      }

      return kpis.map(kpi => {
        const latest = latestByKpi.get(kpi.id);
        const areaData = kpi.area as any;
        const teamData = kpi.team as any;
        return {
          ...kpi,
          latest_value: latest?.value ?? null,
          latest_rag_status: latest?.rag_status ?? 'no_data',
          latest_reference_date: latest?.reference_date ?? null,
          areaName: areaData?.name ?? null,
          areaColor: areaData?.color ?? null,
          teamName: teamData?.name ?? null,
        };
      });
    },
  });

  const seededKpisRef = useRef(false);

  useEffect(() => {
    if (seededKpisRef.current) return;
    if (isLoadingKpis || !allBuKpis || allBuKpis.length === 0) return;
    if (draft.data.kpiSnapshots.length > 0) {
      seededKpisRef.current = true;
      return;
    }

    const snapshots: MbrKpiSnapshot[] = allBuKpis.map(kpi => {
      return {
        kpiId: kpi.id,
        name: kpi.name,
        currentValue: kpi.latest_value,
        previousValue: null,
        target: kpi.target_value,
        ragStatus: kpi.latest_rag_status === 'on_track' ? 'green'
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
      };
    });

    updateDraft({ kpiSnapshots: snapshots });
    seededKpisRef.current = true;
  }, [allBuKpis, isLoadingKpis, draft.data.kpiSnapshots.length, updateDraft]);

  // ── v1.2: Org objectives view + scorecard metrics ──
  const cycleYear = quarterlyCycle ? parseInt(quarterlyCycle.start_date.substring(0, 4), 10) : undefined;
  const { data: orgObjView } = useAllOrgObjectivesView(cycleYear, quarterlyCycle?.id);

  const scorecardMetrics = useMemo(() => {
    const snapshots = draft.data.teamOkrSnapshots;
    let healthy = 0, atRisk = 0, offTrack = 0;
    for (const team of snapshots) {
      for (const obj of team.objectives) {
        for (const kr of obj.keyResults) {
          const s = String(kr.status);
          const progress = kr.progress ?? 0;
          const daysSince = kr.lastCheckinAt
            ? Math.floor((Date.now() - new Date(kr.lastCheckinAt).getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          const cycleEnded = quarterlyCycle?.end_date ? new Date(quarterlyCycle.end_date) < new Date() : false;
          const mappedStatus = s === 'on_track' || s === 'green' ? 'green' as const
            : s === 'at_risk' || s === 'yellow' ? 'yellow' as const
            : s === 'off_track' || s === 'red' ? 'red' as const
            : 'not_started' as const;
          const state = calculateKrState({ progress, status: mappedStatus, daysSinceCheckin: daysSince, cycleEnded });
          if (state === 'healthy' || state === 'achieved' || state === 'exceeded') healthy++;
          else if (state === 'at_risk' || state === 'stagnant') atRisk++;
          else if (state === 'off_track' || state === 'not_achieved') offTrack++;
        }
      }
    }
    const noSubmission = snapshots.filter(t => t.objectives.length === 0).length;
    return { healthy, atRisk, offTrack, noSubmission };
  }, [draft.data.teamOkrSnapshots, quarterlyCycle]);

  // ── Load team OKRs and seed teamOkrSnapshots ──

  const {
    data: allTeamObjectives,
    isLoading: isLoadingTeamOkrs,
    isFetched: hasFetchedTeamOkrs,
  } = useQuery({
    queryKey: mbrKeys.teamObjectives(currentBuId, quarterlyCycle?.id),
    enabled: !!buSupabase && !!currentBuId && !!quarterlyCycle?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_team_objectives')
        .select(`
          id, title, status, team_id,
          team:teams!okr_team_objectives_team_id_fkey(id, name),
          key_results:okr_team_key_results(
            id, title, status, current_value, baseline, target, direction, unit,
            owner_user_id, last_checkin_at,
            owner:profiles!okr_team_key_results_owner_profile_fkey(id, display_name)
          )
        `)
        .eq('bu_id', currentBuId!)
        .eq('cycle_id', quarterlyCycle!.id)
        .is('deleted_at', null)
        .is('cancelled_at', null)
        .not('status', 'in', '(cancelled,discarded)');

      if (error) throw error;

      return (data || []).map(obj => ({
        ...obj,
        key_results: (obj.key_results || []).filter(
          (kr: any) => !kr.deleted_at && !kr.cancelled_at
        ),
      }));
    },
  });

  const seededTeamOkrsRef = useRef(false);

  useEffect(() => {
    if (seededTeamOkrsRef.current) return;
    if (!quarterlyCycle?.id) return;
    if (!hasFetchedTeamOkrs || isLoadingTeamOkrs) return;

    // Check if existing snapshots have fully valid KR payload (migration guard)
    // Drafts salvos com shape antigo/legado devem ser re-seeded
    const validRagStatuses = new Set(['green', 'yellow', 'red', 'not_started']);
    const validDirections = new Set(['up', 'down', 'maintain']);

    const hasValidKeyResults = draft.data.teamOkrSnapshots.length > 0 &&
      draft.data.teamOkrSnapshots.every(team =>
        team.objectives.every(objective =>
          Array.isArray(objective.keyResults) &&
          objective.keyResults.every(kr => {
            const hasNumericValues =
              Number.isFinite(kr.baseline) &&
              Number.isFinite(kr.current) &&
              Number.isFinite(kr.target);

            const hasValidStatus = typeof kr.status === 'string' && validRagStatuses.has(kr.status);
            const hasValidDirection = typeof kr.direction === 'string' && validDirections.has(kr.direction);
            const hasValidUnit = typeof kr.unit === 'string' && kr.unit.trim().length > 0;
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
          })
        )
      );

    if (hasValidKeyResults) {
      seededTeamOkrsRef.current = true;
      return;
    }

    // Group objectives by team, using team info from the objective itself
    const objByTeam = new Map<string, { teamName: string; objectives: any[] }>();
    for (const obj of (allTeamObjectives || [])) {
      if (!obj.team_id) continue;
      const teamData = obj.team as any;
      if (!objByTeam.has(obj.team_id)) {
        objByTeam.set(obj.team_id, {
          teamName: teamData?.name || 'Time sem nome',
          objectives: [],
        });
      }
      objByTeam.get(obj.team_id)!.objectives.push(obj);
    }

    // Only create snapshots for teams that have OKRs
    const snapshots: MbrTeamOkrSnapshot[] = Array.from(objByTeam.entries()).map(([teamId, { teamName, objectives: teamObjs }]) => {
      const objectives = teamObjs.map(obj => {
        const krs = obj.key_results || [];
        const krCount = krs.length;
        const krsAtRisk = krs.filter((kr: any) => kr.status === 'red' || kr.status === 'yellow').length;
        const krsStagnant = krs.filter((kr: any) => kr.status === 'not_started').length;

        const avgProgress = krCount > 0
          ? krs.reduce((sum: number, kr: any) => {
              const baseline = Number(kr.baseline ?? 0);
              const current = Number(kr.current_value ?? baseline);
              const target = Number(kr.target ?? baseline);
              const direction = (kr.direction ?? 'up') as 'up' | 'down' | 'maintain';
              return sum + calculateProgress(baseline, current, target, direction);
            }, 0) / krCount
          : 0;

        const trend: 'improving' | 'stable' | 'declining' =
          avgProgress >= 70 ? 'improving'
          : avgProgress >= 40 ? 'stable'
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
            const directionForProgress = (kr.direction ?? 'up') as 'up' | 'down' | 'maintain';
            const direction = kr.direction === 'down' ? 'down' : 'up';
            const progress = Math.round(calculateProgress(baseline, current, target, directionForProgress));
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
    });

    if (snapshots.length > 0) {
      updateDraft({ teamOkrSnapshots: snapshots, currentTeamIndex: 0 });
    }
    seededTeamOkrsRef.current = true;
  }, [allTeamObjectives, quarterlyCycle?.id, hasFetchedTeamOkrs, isLoadingTeamOkrs, draft.data.teamOkrSnapshots.length, updateDraft]);

  // ── Load org OKRs and seed orgOkrSnapshots when draft is empty ──
  const { data: orgObjectives, isLoading: isLoadingOkrs } = useOrgObjectives(currentBu?.id);
  const seededOkrsRef = useRef(false);

  useEffect(() => {
    if (seededOkrsRef.current) return;
    if (isLoadingOkrs || !orgObjectives || orgObjectives.length === 0) return;
    if (draft.data.orgOkrSnapshots.length > 0) {
      seededOkrsRef.current = true;
      return;
    }

    const snapshots: MbrOrgOkrSnapshot[] = orgObjectives.map(obj => {
      const krs = obj.key_results || [];
      const avgProgress = krs.length > 0
        ? krs.reduce((sum: number, kr: any) => {
            const baseline = Number(kr.baseline ?? 0);
            const current = Number(kr.current_value ?? baseline);
            const target = Number(kr.target ?? baseline);
            const direction = kr.direction || 'up';
            if (direction === 'up') {
              if (target === baseline) return sum + (current >= target ? 100 : 0);
              return sum + Math.max(0, ((current - baseline) / (target - baseline)) * 100);
            } else {
              if (baseline === target) return sum + (current <= target ? 100 : 0);
              return sum + Math.max(0, ((baseline - current) / (baseline - target)) * 100);
            }
          }, 0) / krs.length
        : 0;

      // Determine trend from status
      const trend: 'improving' | 'stable' | 'declining' = 
        obj.status === 'completed' ? 'improving'
        : avgProgress >= 70 ? 'improving'
        : avgProgress >= 40 ? 'stable'
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
          const krProgress = (() => {
            if (krDirection === 'up') {
              if (krTarget === krBaseline) return krCurrent >= krTarget ? 100 : 0;
              return Math.max(0, ((krCurrent - krBaseline) / (krTarget - krBaseline)) * 100);
            }
            if (krBaseline === krTarget) return krCurrent <= krTarget ? 100 : 0;
            return Math.max(0, ((krBaseline - krCurrent) / (krBaseline - krTarget)) * 100);
          })();
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

    updateDraft({ orgOkrSnapshots: snapshots });
    seededOkrsRef.current = true;
  }, [orgObjectives, isLoadingOkrs, draft.data.orgOkrSnapshots.length, updateDraft]);

  // Load previous MBR pending items on first load
  // Carry-over de itens pendentes do MBR anterior — re-derivado via hook
  // (substituiu o campo previousMbrPendingItems no draft).
  const { data: previousMbrPendingItems = [] } = usePreviousMbrPendingItems(sessionId ?? null);

  // Navigation
  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    for (let i = 0; i < currentIdx; i++) {
      completed.push(STEP_ORDER[i]);
    }
    return completed;
  }, [draft.currentStep]);

  const goToStep = useCallback((stepId: string) => {
    setStep(stepId as MbrStep);
  }, [setStep]);

  const goNext = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIdx + 1]);
    }
  }, [draft.currentStep, setStep]);

  const goBack = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx > 0) {
      setStep(STEP_ORDER[currentIdx - 1]);
    }
  }, [draft.currentStep, setStep]);

  // Handlers
  // handleClose is a no-op: FullPageWizardShell handles navigation.
  // Draft stays as in_progress for later resumption — only handleComplete marks as completed.
  const handleClose = useCallback(() => {}, []);

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      handleError(error, { context: 'MBR Draft Save' });
    }
  }, [saveDraft]);

  const handleDiscardDraft = useCallback(async () => {
    try {
      await discardDraft();
      toast.success('Rascunho descartado.');
    } catch (error) {
      console.error('Failed to discard draft:', error);
      toast.error('Erro ao descartar rascunho');
    }
  }, [discardDraft]);

  const handleComplete = useCallback(async () => {
    const completedSessionId = await clearDraft();
    toast.success('MBR concluído com sucesso!');
    navigate('/okrs/executive');

    // Trigger summary email (best-effort, non-blocking)
    if (completedSessionId && quarterlyCycle?.id && currentBu?.id) {
      try {
        await buSupabase.functions.invoke('mbr-summary', {
          body: {
            cycleId: quarterlyCycle.id,
            sessionId: completedSessionId,
            bu_id: currentBu.id,
          },
        });
      } catch (e) {
        console.warn('MBR summary email failed (non-blocking):', e);
      }
    }
  }, [clearDraft, navigate, buSupabase, quarterlyCycle, currentBu]);

  // Loading
  if (isLoadingCycles || isLoadingKpis || isLoadingOkrs || isLoadingTeamOkrs) {
    return <LoadingState text="Carregando dados do MBR..." fullPage />;
  }

  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="mbr" availability={availability} />;
  }

  // Step render
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'panorama':
        return (
          <MbrPanoramaStep
            kpiSnapshots={draft.data.kpiSnapshots}
            onKpiSnapshotsChange={(kpiSnapshots: MbrKpiSnapshot[]) => updateDraft({ kpiSnapshots })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            lastCompletedAt={lastCompletedAt}
            onContinue={goNext}
            buName={currentBu?.name}
            scorecardMetrics={scorecardMetrics}
            orgObjectives={orgObjView ?? []}
            currentStepIndex={0}
            mbrPreSubmittedCount={mbrPreSubmittedCount}
            mbrPreNeedsDecisionCount={mbrPreSurfacedItems.filter(i => i.kind === 'needs_decision').length}
            mbrPreCrossDepCount={mbrPreSurfacedItems.filter(i => i.kind === 'cross_dependency').length}
            topSlot={
              <>
                <RitualPreparationStatus
                  ritualType="mbr"
                  cycleId={quarterlyCycle?.id ?? null}
                />
                <RitualAttendance
                  persona="mbr"
                  sessionId={sessionId}
                  buId={currentBu?.id}
                  cycleId={quarterlyCycle?.id ?? null}
                />
              </>
            }
          />
        );

      case 'kpi-gate':
        return (
          <MbrKpiGateStep
            kpiSnapshots={draft.data.kpiSnapshots}
            onKpiSnapshotsChange={(kpiSnapshots: MbrKpiSnapshot[]) => updateDraft({ kpiSnapshots })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            teamNamesById={Object.fromEntries(draft.data.teamOkrSnapshots.map(t => [t.teamId, t.teamName]))}
            proposedKpis={proposedKpis}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'team-okrs-overview':
        return (
          <MbrTeamOkrsOverviewStep
            teamOkrSnapshots={draft.data.teamOkrSnapshots}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'team-okrs-detail':
        return (
          <MbrTeamOkrsDetailStep
            teamOkrSnapshots={draft.data.teamOkrSnapshots}
            onTeamOkrSnapshotsChange={(teamOkrSnapshots: MbrTeamOkrSnapshot[]) => updateDraft({ teamOkrSnapshots })}
            currentTeamIndex={draft.data.currentTeamIndex}
            onCurrentTeamIndexChange={(currentTeamIndex: number) => updateDraft({ currentTeamIndex })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            teamAddendums={mbrPreAddendumsByTeam}
            mbrPreByTeam={mbrPreByTeam}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'org-okrs':
        return (
          <MbrOrgOkrsStep
            orgOkrSnapshots={draft.data.orgOkrSnapshots}
            onOrgOkrSnapshotsChange={(orgOkrSnapshots: MbrOrgOkrSnapshot[]) => updateDraft({ orgOkrSnapshots })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            orgObjectives={orgObjView ?? []}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'decisions':
        return (
          <MbrDecisionsStep
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            previousMbrPendingItems={
              previousMbrPendingItems.length > 0
                ? previousMbrPendingItems
                : mbrCarryOver
            }
            mbrPreSurfacedItems={mbrPreSurfacedItems}
            teamNamesById={Object.fromEntries(draft.data.teamOkrSnapshots.map(t => [t.teamId, t.teamName]))}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'qbr-followup':
        return (
          <MbrQbrFollowUpStep
            followUpItems={draft.data.qbrFollowUpItems}
            onFollowUpItemsChange={(qbrFollowUpItems) => updateDraft({ qbrFollowUpItems })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'closing':
        return (
          <MbrClosingStep
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            checklist={draft.data.checklist}
            onChecklistChange={(checklist: MbrGovernanceChecklist) => updateDraft({ checklist })}
            ritualFeedback={draft.data.ritualFeedback}
            onRitualFeedbackChange={(ritualFeedback: RitualImprovementFeedback[]) => updateDraft({ ritualFeedback })}
            teamOkrSnapshots={draft.data.teamOkrSnapshots}
            orgOkrSnapshots={draft.data.orgOkrSnapshots}
            qbrFollowUpItems={draft.data.qbrFollowUpItems}
            onComplete={handleComplete}
            onBack={goBack}
          />
        );

      default:
        return null;
    }
  };

  return (
    <FullPageWizardShell
      title="MBR"
      subtitle="Rito decisório mensal — saúde estratégica do negócio"
      steps={WIZARD_STEPS.map(s => ({ id: s.id, label: s.label, description: s.description }))}
      currentStepId={draft.currentStep}
      completedSteps={completedSteps}
      onStepChange={goToStep}
      isDirty={isDirty}
      isSavingDraft={isSaving}
      onSaveDraft={handleSaveDraft}
      lastSavedAt={lastSavedAt}
      isResumingDraft={isResumingDraft}
      onDiscardDraft={handleDiscardDraft}
      onClose={handleClose}
      backUrl="/okrs/executive"
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
