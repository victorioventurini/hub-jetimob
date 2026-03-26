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
import {
  useGenericWizardDraft,
  useActiveCycles,
} from '@/modules/okrs/hooks';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';
import { calculateProgress } from '@/modules/okrs/types';

import { QbrBalanceStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrBalanceStep';
import { QbrKpiAnalysisStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrKpiAnalysisStep';
import { QbrLearningsStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrLearningsStep';
import { QbrOkrProposalStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrOkrProposalStep';
import { QbrPreSummary } from '@/modules/okrs/components/wizards/qbr-pre/QbrPreSummary';

import {
  calculateKrState,
} from '@/modules/okrs/hooks/useKrStateInsights';

import type {
  QbrPreStep,
  QbrPreDraftData,
  MbrKpiSnapshot,
  TeamCheckinDecision,
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
  proposedOkrs: {
    impactReflection: '',
    acknowledgedPastLearnings: false,
    objective: { title: '', description: '', org_objective_id: null, cycle_id: null },
    sharing: { isShared: false, responsibilityModel: 'primary_led', ownerType: 'my_team', primaryTeamId: '', contributingTeamIds: [] },
    krPlan: { foundational: 0, contribution: 0, enabler: 0 },
    draftKrs: [],
    draftKrMetricLinks: [],
    dependencies: [],
    initiatives: [],
    generatedSummary: null,
    reflectionQuestions: [],
  },
  dependencies: [],
  decisions: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function QbrPrePage() {
  const navigate = useNavigate();
  const { currentBu, currentBuId } = useBu();
  const { profile } = useAuth();
  const buSupabase = useBuScopedSupabase();

  usePageTitle('Pré-QBR');

  // Get user's team from profile
  const userTeamId = (profile as any)?.team_id || null;

  // Cycle
  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(
    () => activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );

  // Validate qbr_status
  const { data: cycleData, isLoading: isLoadingCycleStatus } = useQuery({
    queryKey: ['qbr', 'cycle-status', quarterlyCycle?.id],
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
  } = useGenericWizardDraft<QbrPreStep, QbrPreDraftData>({
    wizardType: 'qbr-pre',
    teamId: userTeamId,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'balance',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle && qbrOpen,
  });

  // ── Load team KRs for balance step ──
  const { data: teamObjectives, isLoading: isLoadingKrs } = useQuery({
    queryKey: ['qbr-pre', 'team-krs', userTeamId, quarterlyCycle?.id],
    enabled: !!buSupabase && !!userTeamId && !!quarterlyCycle?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_team_objectives')
        .select(`
          id, title, status,
          key_results:okr_team_key_results(
            id, title, status, current_value, baseline, target, direction, unit,
            last_checkin_at
          )
        `)
        .eq('team_id', userTeamId!)
        .eq('cycle_id', quarterlyCycle!.id)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (error) throw error;
      return data || [];
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
          state,
          finalProgress: Math.round(progress),
          paceStatus: progress >= 70 ? 'No ritmo' : progress >= 40 ? 'Atenção' : 'Atrasado',
        });
      }
    }

    if (states.length > 0) {
      updateDraft({ krFinalStates: states, cycleId: quarterlyCycle?.id || '', teamId: userTeamId || '' });
    }
    seededKrsRef.current = true;
  }, [teamObjectives, draft.data.krFinalStates.length, updateDraft, quarterlyCycle, userTeamId]);

  // ── Load KPIs ──
  const { data: teamKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: ['qbr-pre', 'team-kpis', userTeamId, currentBuId],
    enabled: !!buSupabase && !!currentBuId && !!userTeamId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: kpis, error } = await buSupabase
        .from('kpi_metrics')
        .select('id, name, unit, target_value, direction, scope, area_id, team_id, lifecycle_status')
        .eq('lifecycle_status', 'active')
        .is('deleted_at', null)
        .neq('indicator_type', 'metric')
        .or(`team_id.eq.${userTeamId},scope.eq.org`);

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

  useEffect(() => {
    if (seededKpisRef.current) return;
    if (!teamKpis || teamKpis.length === 0) return;
    if (draft.data.kpiSnapshots.length > 0) {
      seededKpisRef.current = true;
      return;
    }
    updateDraft({ kpiSnapshots: teamKpis });
    seededKpisRef.current = true;
  }, [teamKpis, draft.data.kpiSnapshots.length, updateDraft]);

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
      await clearDraft();
      toast.success('Pré-QBR concluído!');
      navigate('/okrs');
    } catch (error) {
      handleError(error, { context: 'QBR Pre Complete' });
    }
  }, [clearDraft, navigate]);

  const handleClose = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  // Loading
  if (isLoadingCycles || isLoadingCycleStatus || isLoadingKrs || isLoadingKpis) {
    return <LoadingState text="Carregando dados do pré-QBR..." fullPage />;
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
            proposedOkrs={draft.data.proposedOkrs}
            teamId={userTeamId || ''}
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
      title="Pré-QBR do Time"
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
      backUrl="/okrs"
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
