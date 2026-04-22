/**
 * QbrPrePage - Wizard pré-QBR dos líderes de time
 * 
 * Balanço do ciclo, análise de KPIs, aprendizados e proposta de OKRs.
 * Segue padrão MbrPage: useGenericWizardDraft + FullPageWizardShell + step components.
 * 
 * @see docs/HUB_TECHNICAL_DEEP_DIVE.md — QBR Ritual
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  FullPageWizardShell,
} from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';
import { HierarchyContextSwitcher } from '@/modules/okrs/components/wizards/shared/HierarchyContextSwitcher';
import { CompletedRitualView } from '@/modules/okrs/components/wizards/shared/CompletedRitualView';
import { RitualPreparationStatus } from '@/modules/okrs/components/wizards/shared';
import {
  useGenericWizardDraft,
  useActiveCycle,
} from '@/modules/okrs/hooks';
import { useRitualAvailability } from '@/modules/okrs/hooks';
import { useCompletedSessionForCycle } from '@/modules/okrs/hooks';
import { useCarryOverDecisions } from '@/modules/okrs/hooks/useCarryOverDecisions';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { qbrKeys } from '@/lib/queryKeys/okrs';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { handleError } from '@/lib/errorMessages';
import { AlertCircle } from 'lucide-react';
import { calculateProgress } from '@/modules/okrs/types';
import { normalizeProposedOkrs } from '@/modules/okrs/types/wizard';

import { QbrBalanceStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrBalanceStep';
import { QbrKpiAnalysisStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrKpiAnalysisStep';
import { QbrLearningsStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrLearningsStep';
import { QbrOkrProposalStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrOkrProposalStep';
import { QbrPreSummary } from '@/modules/okrs/components/wizards/qbr-pre/QbrPreSummary';

import {
  calculateKrState,
} from '@/modules/okrs/hooks';

import type {
  QbrPreStep,
  QbrPreDraftData,
  MbrKpiSnapshot,
  TeamCheckinDecision,
  ProposedObjectiveEntry,
  DraftTeamKr,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'balance' as const, label: 'Balanço do Ciclo', description: 'KRs e resultados' },
  { id: 'kpi-analysis' as const, label: 'Análise de KPIs', description: 'Indicadores e sinalizações' },
  { id: 'learnings' as const, label: 'Aprendizados', description: 'O que levar e o que deixar' },
  { id: 'okr-proposal' as const, label: 'Proposta de OKRs', description: 'Próximo ciclo' },
  { id: 'summary' as const, label: 'Resumo e Envio', description: 'Revisão final' },
];

const STEP_ORDER: QbrPreStep[] = ['balance', 'kpi-analysis', 'learnings', 'okr-proposal', 'summary'];

const DEFAULT_DATA: QbrPreDraftData = {
  cycleId: '',
  teamId: '',
  krFinalStates: [],
  kpiSnapshots: [],
  zombieCandidates: [],
  kpisToCreate: [],
  learnings: { whatWorked: '', whatDidntWork: '', debts: '' },
  proposedOkrs: [],
  dependencies: [],
  decisions: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function QbrPrePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamIdParam = searchParams.get('team');
  const { currentBu, currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  // Teams for admin context switching
  const { teams, isLoading: isLoadingTeams } = useHierarchicalTeamList();
  const selectedTeam = useMemo(() => {
    if (!teamIdParam || !teams) return null;
    return teams.find(t => t.id === teamIdParam) || null;
  }, [teamIdParam, teams]);

  usePageTitle(selectedTeam ? `Pré-QBR - ${selectedTeam.name}` : 'Pré-QBR');

  // Cycle (status-based)
  const { activeQuarterlyCycle: quarterlyCycle, isLoading: isLoadingCycles } = useActiveCycle();
  const availability = useRitualAvailability('qbr-pre', quarterlyCycle);

  // Validate qbr_status
  const { data: cycleData, isLoading: isLoadingCycleStatus } = useQuery({
    queryKey: qbrKeys.cycleStatus(quarterlyCycle?.id),
    enabled: !!buSupabase && !!quarterlyCycle?.id,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('cycles')
        .select('id, qbr_status')
        .eq('id', quarterlyCycle!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const qbrOpen = cycleData?.qbr_status === 'open' || cycleData?.qbr_status === 'collecting';

  // Detect already-completed session for this cycle+team
  const {
    sessionState,
    completedSession,
    isLoading: isLoadingCompletedCheck,
  } = useCompletedSessionForCycle('qbr-pre', teamIdParam, quarterlyCycle?.id);

  // Carry-over: decisões pendentes do Pré-QBR anterior do mesmo time
  const { data: carryOverDecisions = [] } = useCarryOverDecisions({
    wizardType: 'qbr-pre',
    teamId: teamIdParam,
    enabled: !!teamIdParam,
  });

  // Draft persistence (only if not already completed)
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
  } = useGenericWizardDraft<QbrPreStep, QbrPreDraftData>({
    wizardType: 'qbr-pre',
    teamId: teamIdParam,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'balance',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle && qbrOpen && sessionState !== 'completed',
  });

  // ── Load team KRs for balance step ──
  const { data: teamObjectives, isLoading: isLoadingKrs } = useQuery({
    queryKey: qbrKeys.preTeamKrs(currentBuId, teamIdParam, quarterlyCycle?.id),
    enabled: !!buSupabase && !!currentBuId && !!teamIdParam && !!quarterlyCycle?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!currentBuId) return [];

      const { data, error } = await buSupabase
        .from('okr_team_objectives')
        .select(`
          id, title, status,
          key_results:okr_team_key_results!okr_team_key_results_team_objective_id_fkey(
            id, title, status, current_value, baseline, target, direction, unit,
            last_checkin_at, deleted_at, cancelled_at
          )
        `)
        .eq('bu_id', currentBuId)
        .eq('team_id', teamIdParam!)
        .eq('cycle_id', quarterlyCycle!.id)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (error) {
        console.error('[QbrPre] Error fetching team objectives:', error);
        throw error;
      }

      // Filter out deleted/cancelled KRs from nested results
      return (data || []).map(obj => ({
        ...obj,
        key_results: (obj.key_results || []).filter(
          (kr: any) => !kr.deleted_at && !kr.cancelled_at
        ),
      }));
    },
  });

  // Seed KR final states
  const seededKrsRef = useRef(false);

  useEffect(() => {
    if (seededKrsRef.current) return;
    if (!teamObjectives || teamObjectives.length === 0) return;
    if (draft.data.krFinalStates.length > 0) {
      seededKrsRef.current = true;
      return;
    }

    const states: QbrPreDraftData['krFinalStates'] = [];
    for (const obj of teamObjectives) {
      for (const kr of (obj.key_results || [])) {
        const baseline = Number(kr.baseline ?? 0);
        const current = Number(kr.current_value ?? baseline);
        const target = Number(kr.target ?? baseline);
        const direction = (kr.direction ?? 'up') as 'up' | 'down' | 'maintain';
        const progress = calculateProgress(baseline, current, target, direction);

        const daysSinceCheckin = kr.last_checkin_at
          ? Math.floor((Date.now() - new Date(kr.last_checkin_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const krStatus = kr.status as string;
        const ragStatus = krStatus === 'on_track' ? 'green'
          : krStatus === 'at_risk' ? 'yellow'
          : krStatus === 'off_track' ? 'red'
          : 'not_started';

        const state = calculateKrState({
          progress,
          status: ragStatus as any,
          daysSinceCheckin,
          cycleEnded: false,
        });

        states.push({
          krId: kr.id,
          krTitle: kr.title,
          objectiveId: obj.id,
          objectiveTitle: obj.title,
          state,
          finalProgress: Math.round(progress),
          paceStatus: progress >= 70 ? 'No ritmo' : progress >= 40 ? 'Atenção' : 'Atrasado',
        });
      }
    }

    if (states.length > 0) {
      updateDraft({ krFinalStates: states, cycleId: quarterlyCycle?.id || '', teamId: teamIdParam || '' });
    }
    seededKrsRef.current = true;
  }, [teamObjectives, draft.data.krFinalStates.length, updateDraft, quarterlyCycle, teamIdParam]);

  // ── Load KPIs ──
  const { data: teamKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: qbrKeys.preTeamKpis(teamIdParam, currentBuId),
    enabled: !!buSupabase && !!currentBuId && !!teamIdParam,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: kpis, error } = await buSupabase
        .from('kpi_metrics')
        .select('id, name, unit, target_value, direction, scope, area_id, team_id, lifecycle_status')
        .eq('lifecycle_status', 'active')
        .is('deleted_at', null)
        .or(`team_id.eq.${teamIdParam},scope.eq.org`);

      if (error) throw error;
      if (!kpis || kpis.length === 0) return [];

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
        const variation = kpi.target_value && latest?.value != null
          ? ((latest.value - kpi.target_value) / Math.abs(kpi.target_value)) * 100
          : null;
        return {
          kpiId: kpi.id,
          name: kpi.name,
          currentValue: latest?.value ?? null,
          previousValue: null,
          target: kpi.target_value,
          ragStatus: latest?.rag_status === 'on_track' ? 'green'
            : latest?.rag_status === 'at_risk' ? 'yellow'
            : latest?.rag_status === 'off_track' ? 'red'
            : 'no_data',
          variationVsLastMonth: null,
          variationVsTarget: variation,
          requiresStrategicDecision: latest?.rag_status === 'off_track',
          unit: kpi.unit ?? '%',
          lastValueAt: latest?.reference_date ?? null,
          scope: (kpi.scope as 'org' | 'area' | 'team') ?? 'team',
        } as MbrKpiSnapshot;
      });
    },
  });

  // Seed KPI snapshots — reset ref when team changes
  const seededKpisRef = useRef(false);
  const lastSeededTeamRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset seed flag when team changes
    if (teamIdParam !== lastSeededTeamRef.current) {
      seededKpisRef.current = false;
      lastSeededTeamRef.current = teamIdParam;
    }
    if (seededKpisRef.current) return;
    if (!teamKpis || teamKpis.length === 0) return;
    if (draft.data.kpiSnapshots.length > 0) {
      seededKpisRef.current = true;
      return;
    }
    updateDraft({ kpiSnapshots: teamKpis });
    seededKpisRef.current = true;
  }, [teamKpis, draft.data.kpiSnapshots.length, updateDraft, teamIdParam]);

  // ── Load draft OKRs from planning cycle (next quarter) ──
  const { planningCycles } = useActiveCycle();
  const planningQuarter = useMemo(() => {
    return planningCycles.find(c => c.type === 'quarter') ?? null;
  }, [planningCycles]);

  const { data: draftOkrsFromPlanning } = useQuery({
    queryKey: qbrKeys.preDraftOkrs(teamIdParam, planningQuarter?.id),
    enabled: !!buSupabase && !!teamIdParam && !!planningQuarter?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_team_objectives')
        .select(`
          id, title, description, status, org_objective_id,
          key_results:okr_team_key_results!okr_team_key_results_team_objective_id_fkey(
            id, title, baseline, target, unit, direction, owner_user_id,
            linked_org_kr_id, deleted_at, cancelled_at
          )
        `)
        .eq('team_id', teamIdParam!)
        .eq('cycle_id', planningQuarter!.id)
        .eq('status', 'draft')
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (error) throw error;

      return (data || []).map(obj => ({
        ...obj,
        key_results: (obj.key_results || []).filter(
          (kr: any) => !kr.deleted_at && !kr.cancelled_at
        ),
      }));
    },
  });

  // Seed proposedOkrs from planning cycle draft OKRs
  const seededProposedRef = useRef(false);

  useEffect(() => {
    if (seededProposedRef.current) return;
    if (!draftOkrsFromPlanning || draftOkrsFromPlanning.length === 0) return;
    if (normalizeProposedOkrs(draft.data.proposedOkrs).length > 0) {
      seededProposedRef.current = true;
      return;
    }

    const entries: ProposedObjectiveEntry[] = draftOkrsFromPlanning.map(obj => ({
      id: obj.id, // use real ID for tracking
      objective: {
        title: obj.title || '',
        description: obj.description || '',
        org_objective_id: obj.org_objective_id || null,
        cycle_id: planningQuarter?.id || null,
      },
      krPlan: { foundational: 1, contribution: 0, enabler: 0 },
      draftKrs: (obj.key_results || []).map((kr: any): DraftTeamKr => ({
        id: kr.id,
        type: 'foundational' as const,
        title: kr.title || '',
        baseline: Number(kr.baseline ?? 0),
        target: Number(kr.target ?? 0),
        unit: kr.unit || '%',
        direction: (kr.direction || 'up') as 'up' | 'down' | 'maintain',
        owner_user_id: kr.owner_user_id || null,
        linked_org_kr_id: kr.linked_org_kr_id || null,
      })),
    }));

    if (entries.length > 0) {
      updateDraft({ proposedOkrs: entries });
    }
    seededProposedRef.current = true;
  }, [draftOkrsFromPlanning, draft.data.proposedOkrs, updateDraft, planningQuarter]);

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
    setStep(stepId as QbrPreStep);
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

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      handleError(error, { context: 'QBR Pre Draft Save' });
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
    try {
      // Persist proposed OKRs as draft objectives for the planning quarter
      const proposedOkrs = normalizeProposedOkrs(draft.data.proposedOkrs);
      if (proposedOkrs.length > 0 && planningQuarter?.id && teamIdParam && buSupabase && currentBuId) {
        // Get existing draft objective IDs for this team+cycle to avoid duplicates
        const { data: existingDrafts } = await buSupabase
          .from('okr_team_objectives')
          .select('id')
          .eq('team_id', teamIdParam)
          .eq('cycle_id', planningQuarter.id)
          .eq('status', 'draft')
          .is('deleted_at', null);

        const existingIds = new Set((existingDrafts || []).map(d => d.id));

        for (const entry of proposedOkrs) {
          const objTitle = entry.objective?.title?.trim();
          if (!objTitle) continue;

          // If this entry was seeded from an existing draft (has real UUID), skip creation
          if (existingIds.has(entry.id)) continue;

          // Create draft objective
          const { data: newObj, error: objError } = await buSupabase
            .from('okr_team_objectives')
            .insert({
              bu_id: currentBuId,
              team_id: teamIdParam,
              title: objTitle,
              description: entry.objective.description || null,
              org_objective_id: entry.objective.org_objective_id || null,
              cycle_id: planningQuarter.id,
              year: new Date().getFullYear(),
              status: 'draft',
            })
            .select('id')
            .single();

          if (objError) {
            console.error('[QbrPre] Error creating draft objective:', objError);
            continue;
          }

          // Create draft KRs
          const validKrs = (entry.draftKrs || []).filter(kr => kr.title?.trim());
          for (const kr of validKrs) {
            const { error: krError } = await buSupabase
              .from('okr_team_key_results')
              .insert({
                bu_id: currentBuId,
                team_id: teamIdParam,
                team_objective_id: newObj.id,
                title: kr.title.trim(),
                baseline: kr.baseline ?? 0,
                current_value: kr.baseline ?? 0,
                target: kr.target ?? 0,
                unit: kr.unit || '%',
                direction: kr.direction || 'up',
                status: 'not_started',
                type: kr.type || 'foundational',
                owner_user_id: kr.owner_user_id || null,
                linked_org_kr_id: kr.linked_org_kr_id || null,
              });

            if (krError) {
              console.error('[QbrPre] Error creating draft KR:', krError);
            }
          }
        }
      }

      await clearDraft();
      toast.success('Pré-QBR concluído!');
      navigate('/okrs');
    } catch (error) {
      handleError(error, { context: 'QBR Pre Complete' });
    }
  }, [clearDraft, navigate, draft.data.proposedOkrs, planningQuarter, teamIdParam, buSupabase, currentBuId]);

  // handleClose is a no-op: FullPageWizardShell handles navigation.
  // Draft stays as in_progress for later resumption — only handleComplete marks as completed.
  const handleClose = useCallback(() => {}, []);

  // Handle team change (admin only)
  const handleTeamChange = useCallback((newTeamId: string) => {
    discardDraft();
    setSearchParams({ team: newTeamId });
  }, [discardDraft, setSearchParams]);

  // Loading
  if (isLoadingTeams || isLoadingCycles || isLoadingCycleStatus || isLoadingKrs || isLoadingKpis || isLoadingCompletedCheck) {
    return <LoadingState text="Carregando dados do pré-QBR..." fullPage />;
  }

  // Guard: No team selected
  if (!teamIdParam || !selectedTeam) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Time não selecionado"
        description="Selecione um time para iniciar o pré-QBR"
        actionLabel="Voltar"
        onAction={() => navigate('/wizards')}
      />
    );
  }

  // Guard: Ritual window
  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="qbr-pre" availability={availability} />;
  }

  // Guard: Already completed → show read-only view with addendum
  if (sessionState === 'completed' && completedSession) {
    return (
      <CompletedRitualView
        title="Pré-QBR"
        teamName={selectedTeam.name}
        wizardType="qbr-pre"
        session={completedSession}
        backUrl="/rituals"
      />
    );
  }

  // Guard: QBR not open
  if (!qbrOpen) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">QBR não está aberto</p>
          <p className="text-sm text-muted-foreground">
            O ciclo QBR precisa ser aberto por um administrador antes de iniciar o pré-QBR.
          </p>
        </div>
      </div>
    );
  }

  // Step render
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'balance':
        return (
          <QbrBalanceStep
            krFinalStates={draft.data.krFinalStates}
            onKrFinalStatesChange={(krFinalStates) => updateDraft({ krFinalStates })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            teamId={teamIdParam || undefined}
            carryOverDecisions={carryOverDecisions}
            topSlot={
              <RitualPreparationStatus
                ritualType="qbr-pre"
                teamId={teamIdParam}
                cycleId={quarterlyCycle?.id ?? null}
              />
            }
          />
        );

      case 'kpi-analysis':
        return (
          <QbrKpiAnalysisStep
            kpiSnapshots={draft.data.kpiSnapshots}
            zombieCandidates={draft.data.zombieCandidates}
            onZombieCandidatesChange={(zombieCandidates) => updateDraft({ zombieCandidates })}
            kpisToCreate={draft.data.kpisToCreate}
            onKpisToCreateChange={(kpisToCreate) => updateDraft({ kpisToCreate })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'learnings':
        return (
          <QbrLearningsStep
            learnings={draft.data.learnings}
            onLearningsChange={(learnings) => updateDraft({ learnings })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'okr-proposal':
        return (
          <QbrOkrProposalStep
            proposedOkrs={normalizeProposedOkrs(draft.data.proposedOkrs)}
            teamId={teamIdParam || ''}
            onProposedOkrsChange={(proposedOkrs) => updateDraft({ proposedOkrs })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'summary':
        return (
          <QbrPreSummary
            draftData={draft.data}
            decisions={draft.data.decisions}
            isCompleting={false}
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
      title="Pré-QBR"
      subtitle="Balanço, análise e proposta de OKRs para o próximo ciclo"
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
      backUrl="/rituals"
      adminContextSwitcher={
        <HierarchyContextSwitcher
          type="team"
          currentLabel={selectedTeam?.name || 'Selecionar time'}
          selectedId={teamIdParam}
          onSelect={handleTeamChange}
          isLoading={isLoadingTeams}
        />
      }
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
