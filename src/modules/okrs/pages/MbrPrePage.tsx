/**
 * MbrPrePage - Wizard pré-MBR dos líderes de time
 * 
 * Balanço do mês, análise de KPIs, destaques/riscos e próximos passos.
 * Segue padrão QbrPrePage: useGenericWizardDraft + FullPageWizardShell.
 * 
 * Diferenças do QbrPrePage:
 * - Sem gate de qbr_status (disponível sempre que houver ciclo ativo)
 * - Usa ciclo ativo prioritário (não apenas quarter)
 * - Steps 3 e 4 são específicos do Pré-MBR
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  FullPageWizardShell,
} from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { HierarchyContextSwitcher } from '@/modules/okrs/components/wizards/shared/HierarchyContextSwitcher';
import { CompletedRitualView } from '@/modules/okrs/components/wizards/shared/CompletedRitualView';
import {
  useGenericWizardDraft,
  useActiveCycle,
} from '@/modules/okrs/hooks';
import { useCompletedSessionForCycle } from '@/modules/okrs/hooks/useCompletedSessionForCycle';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { handleError } from '@/lib/errorMessages';
import { AlertCircle } from 'lucide-react';
import { calculateProgress } from '@/modules/okrs/types';

// Reuse QBR steps 1 & 2
import { QbrBalanceStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrBalanceStep';
import { QbrKpiAnalysisStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrKpiAnalysisStep';

// MBR-Pre specific steps
import { MbrPreHighlightsStep } from '@/modules/okrs/components/wizards/mbr-pre/MbrPreHighlightsStep';
import { MbrPreNextStepsStep } from '@/modules/okrs/components/wizards/mbr-pre/MbrPreNextStepsStep';
import { MbrPreSummary } from '@/modules/okrs/components/wizards/mbr-pre/MbrPreSummary';

import {
  calculateKrState,
} from '@/modules/okrs/hooks/useKrStateInsights';

import type {
  MbrPreStep,
  MbrPreDraftData,
  MbrKpiSnapshot,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'balance' as const, label: 'Balanço do Mês', description: 'KRs e resultados' },
  { id: 'kpi-analysis' as const, label: 'KPIs do Time', description: 'Indicadores e sinalizações' },
  { id: 'highlights' as const, label: 'Destaques e Riscos', description: 'O que acelerou e o que travou' },
  { id: 'next-steps' as const, label: 'Próximos Passos', description: 'Foco e prioridades' },
  { id: 'summary' as const, label: 'Resumo e Envio', description: 'Revisão final' },
];

const STEP_ORDER: MbrPreStep[] = ['balance', 'kpi-analysis', 'highlights', 'next-steps', 'summary'];

const DEFAULT_DATA: MbrPreDraftData = {
  cycleId: '',
  teamId: '',
  krFinalStates: [],
  kpiSnapshots: [],
  zombieCandidates: [],
  kpisToCreate: [],
  highlights: { accelerated: '', blocked: '', needsDecision: '' },
  nextSteps: { focus: '', prioritizedItems: [], crossDependencies: [] },
  decisions: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function MbrPrePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamIdParam = searchParams.get('team');
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  // Teams for admin context switching
  const { teams, isLoading: isLoadingTeams } = useHierarchicalTeamList();
  const selectedTeam = useMemo(() => {
    if (!teamIdParam || !teams) return null;
    return teams.find(t => t.id === teamIdParam) || null;
  }, [teamIdParam, teams]);

  usePageTitle(selectedTeam ? `Pré-MBR - ${selectedTeam.name}` : 'Pré-MBR');

  // Cycle (status-based) — any active cycle, not just quarter
  const { activeCycle, isLoading: isLoadingCycles } = useActiveCycle();

  // Detect already-completed session for this cycle+team
  const {
    sessionState,
    completedSession,
    isLoading: isLoadingCompletedCheck,
  } = useCompletedSessionForCycle('mbr-pre', teamIdParam, activeCycle?.id);

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
  } = useGenericWizardDraft<MbrPreStep, MbrPreDraftData>({
    wizardType: 'mbr-pre',
    teamId: teamIdParam,
    cycleId: activeCycle?.id || null,
    defaultStep: 'balance',
    defaultData: DEFAULT_DATA,
    enabled: !!activeCycle && sessionState !== 'completed',
  });

  // ── Load team KRs for balance step ──
  const { data: teamObjectives, isLoading: isLoadingKrs } = useQuery({
    queryKey: ['mbr-pre', 'team-krs', currentBuId, teamIdParam, activeCycle?.id],
    enabled: !!buSupabase && !!currentBuId && !!teamIdParam && !!activeCycle?.id,
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
        .eq('cycle_id', activeCycle!.id)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (error) {
        console.error('[MbrPre] Error fetching team objectives:', error);
        throw error;
      }

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

    const states: MbrPreDraftData['krFinalStates'] = [];
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
      updateDraft({ krFinalStates: states, cycleId: activeCycle?.id || '', teamId: teamIdParam || '' });
    }
    seededKrsRef.current = true;
  }, [teamObjectives, draft.data.krFinalStates.length, updateDraft, activeCycle, teamIdParam]);

  // ── Load KPIs ──
  const { data: teamKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ['mbr-pre', 'team-kpis', teamIdParam, currentBuId],
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

  // Seed KPI snapshots
  const seededKpisRef = useRef(false);
  const lastSeededTeamRef = useRef<string | null>(null);

  useEffect(() => {
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
    setStep(stepId as MbrPreStep);
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
      handleError(error, { context: 'MBR Pre Draft Save' });
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
      await clearDraft();
      toast.success('Pré-MBR concluído! O facilitador será notificado.');
      navigate('/rituals');
    } catch (error) {
      handleError(error, { context: 'MBR Pre Complete' });
    }
  }, [clearDraft, navigate]);

  const handleClose = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  const handleTeamChange = useCallback((newTeamId: string) => {
    discardDraft();
    setSearchParams({ team: newTeamId });
  }, [discardDraft, setSearchParams]);

  // Loading
  if (isLoadingTeams || isLoadingCycles || isLoadingKrs || isLoadingKpis) {
    return <LoadingState text="Carregando dados do pré-MBR..." fullPage />;
  }

  // Guard: No team selected
  if (!teamIdParam || !selectedTeam) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Time não selecionado"
        description="Selecione um time para iniciar o pré-MBR"
        actionLabel="Voltar"
        onAction={() => navigate('/rituals')}
      />
    );
  }

  // Guard: No active cycle
  if (!activeCycle) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Nenhum ciclo ativo</p>
          <p className="text-sm text-muted-foreground">
            É necessário ter um ciclo com status "ativo" para iniciar o pré-MBR.
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

      case 'highlights':
        return (
          <MbrPreHighlightsStep
            highlights={draft.data.highlights}
            onHighlightsChange={(highlights) => updateDraft({ highlights })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'next-steps':
        return (
          <MbrPreNextStepsStep
            nextSteps={draft.data.nextSteps}
            onNextStepsChange={(nextSteps) => updateDraft({ nextSteps })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'summary':
        return (
          <MbrPreSummary
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
      title="Pré-MBR do Time"
      subtitle="Preparação mensal — balanço, destaques e próximos passos"
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
