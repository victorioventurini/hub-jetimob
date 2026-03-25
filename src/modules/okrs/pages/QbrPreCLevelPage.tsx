/**
 * QbrPreCLevelPage - Wizard pré-QBR do C-Level
 * 
 * Análise estratégica consolidada e direcionamentos para a reunião QBR.
 * Segue padrão MbrPage: useGenericWizardDraft + FullPageWizardShell + step components.
 * 
 * @see docs/HUB_TECHNICAL_DEEP_DIVE.md — QBR Ritual
 */

import { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';

// Step components
import {
  QbrCLevelSystemReadStep,
  QbrCLevelStrategicStep,
  QbrCLevelOkrValidationStep,
  QbrCLevelDirectivesStep,
} from '@/modules/okrs/components/wizards/qbr-pre-clevel';
import type { LeaderPreSubmission } from '@/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelSystemReadStep';
import type { TeamOkrProposal } from '@/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelOkrValidationStep';

// MBR Closing reused for feedback step
import { MbrClosingStep } from '@/modules/okrs/components/wizards/mbr/MbrClosingStep';

import type {
  QbrPreCLevelStep,
  QbrCLevelDraftData,
  MbrKpiSnapshot,
  TeamCheckinDecision,
  RitualImprovementFeedback,
  QbrPreSnapshot,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'system-read' as const, label: 'Leitura do Sistema', description: 'Consolidação dos pré-QBRs' },
  { id: 'strategic-analysis' as const, label: 'Análise Estratégica', description: 'Reflexão C-Level' },
  { id: 'okr-validation' as const, label: 'Validação de OKRs', description: 'Calibração das propostas' },
  { id: 'directives' as const, label: 'Direcionamentos', description: 'Pauta do QBR' },
  { id: 'feedback' as const, label: 'Avaliação do Rito', description: 'Feedback' },
];

const STEP_ORDER: QbrPreCLevelStep[] = ['system-read', 'strategic-analysis', 'okr-validation', 'directives', 'feedback'];

const DEFAULT_DATA: QbrCLevelDraftData = {
  cycleId: '',
  systemPatterns: '',
  strategicAnalysis: {
    alignmentAssessment: '',
    signalsTeamsMissed: '',
    whatNotToDo: '',
  },
  okrCalibrationFlags: [],
  directives: [],
  decisions: [],
  ritualFeedback: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function QbrPreCLevelPage() {
  const navigate = useNavigate();
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  usePageTitle('Pré-QBR C-Level');

  // Cycle
  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(
    () => activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );

  // Validate qbr_status = 'reviewing'
  const { data: cycleData, isLoading: isLoadingStatus } = useQuery({
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

  const qbrReviewing = cycleData?.qbr_status === 'reviewing';

  // Load leader submissions
  const { data: leaderSessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['qbr', 'leader-sessions', quarterlyCycle?.id],
    enabled: !!buSupabase && !!quarterlyCycle?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, team_id, reflection_data, completed_at')
        .eq('wizard_type', 'qbr-pre')
        .eq('cycle_id', quarterlyCycle!.id)
        .eq('status', 'completed')
        .not('completed_at', 'is', null);

      if (error) throw error;
      return data || [];
    },
  });

  // Load teams for names
  const { data: teams } = useQuery({
    queryKey: ['qbr', 'teams', currentBuId],
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('teams')
        .select('id, name')
        .is('deleted_at', null)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  // Load org KPIs
  const { data: orgKpis } = useQuery({
    queryKey: ['qbr', 'org-kpis', currentBuId],
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('kpi_metrics')
        .select('id, name, unit, target_value, direction, scope')
        .eq('scope', 'org')
        .eq('lifecycle_status', 'active')
        .is('deleted_at', null);
      if (error) throw error;

      if (!data || data.length === 0) return [];

      const kpiIds = data.map(k => k.id);
      const { data: latestValues } = await buSupabase
        .from('kpi_values')
        .select('kpi_id, value, rag_status, reference_date')
        .in('kpi_id', kpiIds)
        .order('reference_date', { ascending: false });

      const latestByKpi = new Map<string, { value: number; rag_status: string }>();
      for (const v of (latestValues || [])) {
        if (!latestByKpi.has(v.kpi_id)) latestByKpi.set(v.kpi_id, v);
      }

      return data.map(kpi => {
        const latest = latestByKpi.get(kpi.id);
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
          variationVsTarget: null,
          requiresStrategicDecision: latest?.rag_status === 'off_track',
          unit: kpi.unit ?? '%',
          lastValueAt: null,
          scope: 'org' as const,
        } as MbrKpiSnapshot;
      });
    },
  });

  // Derived data
  const teamMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of (teams || [])) m.set(t.id, t.name);
    return m;
  }, [teams]);

  const leaderSubmissions: LeaderPreSubmission[] = useMemo(() => {
    if (!leaderSessions) return [];
    return leaderSessions
      .filter(s => s.team_id && s.reflection_data)
      .map(s => ({
        teamId: s.team_id!,
        teamName: teamMap.get(s.team_id!) || 'Time desconhecido',
        snapshot: (s.reflection_data as any)?.data as QbrPreSnapshot,
      }))
      .filter(s => s.snapshot);
  }, [leaderSessions, teamMap]);

  const teamsWithoutSubmission = useMemo(() => {
    const submittedTeamIds = new Set(leaderSubmissions.map(s => s.teamId));
    return (teams || [])
      .filter(t => !submittedTeamIds.has(t.id))
      .map(t => ({ teamId: t.id, teamName: t.name }));
  }, [teams, leaderSubmissions]);

  const teamProposals: TeamOkrProposal[] = useMemo(() => {
    return (teams || []).map(t => {
      const sub = leaderSubmissions.find(s => s.teamId === t.id);
      return {
        teamId: t.id,
        teamName: t.name,
        proposedOkrs: sub?.snapshot?.proposedOkrs || {},
        hasSubmission: !!sub,
      };
    });
  }, [teams, leaderSubmissions]);

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
  } = useGenericWizardDraft<QbrPreCLevelStep, QbrCLevelDraftData>({
    wizardType: 'qbr-pre-clevel',
    teamId: null,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'system-read',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle && qbrReviewing,
  });

  // Navigation
  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    for (let i = 0; i < currentIdx; i++) completed.push(STEP_ORDER[i]);
    return completed;
  }, [draft.currentStep]);

  const goToStep = useCallback((stepId: string) => {
    setStep(stepId as QbrPreCLevelStep);
  }, [setStep]);

  const goNext = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx < STEP_ORDER.length - 1) setStep(STEP_ORDER[currentIdx + 1]);
  }, [draft.currentStep, setStep]);

  const goBack = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx > 0) setStep(STEP_ORDER[currentIdx - 1]);
  }, [draft.currentStep, setStep]);

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      handleError(error, { context: 'QBR Pre C-Level Draft Save' });
    }
  }, [saveDraft]);

  const handleDiscardDraft = useCallback(async () => {
    try {
      await discardDraft();
      toast.success('Rascunho descartado.');
    } catch (error) {
      toast.error('Erro ao descartar rascunho');
    }
  }, [discardDraft]);

  const handleComplete = useCallback(async () => {
    try {
      await clearDraft();
      toast.success('Pré-QBR C-Level concluído!');
      navigate('/okrs');
    } catch (error) {
      handleError(error, { context: 'QBR Pre C-Level Complete' });
    }
  }, [clearDraft, navigate]);

  const handleClose = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  // Loading
  if (isLoadingCycles || isLoadingStatus || isLoadingSessions) {
    return <LoadingState text="Carregando dados do pré-QBR C-Level..." fullPage />;
  }

  // Guard
  if (!qbrReviewing) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Pré-QBR C-Level não disponível</p>
          <p className="text-sm text-muted-foreground">
            O ciclo QBR precisa estar na fase de revisão (todos os líderes submeteram ou prazo expirou).
          </p>
        </div>
      </div>
    );
  }

  // Step render
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'system-read':
        return (
          <QbrCLevelSystemReadStep
            leaderSubmissions={leaderSubmissions}
            orgKpiSnapshots={orgKpis || []}
            teamsWithoutSubmission={teamsWithoutSubmission}
            onContinue={goNext}
          />
        );

      case 'strategic-analysis':
        return (
          <QbrCLevelStrategicStep
            strategicAnalysis={draft.data.strategicAnalysis}
            onStrategicAnalysisChange={(strategicAnalysis) => updateDraft({ strategicAnalysis })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'okr-validation':
        return (
          <QbrCLevelOkrValidationStep
            teamProposals={teamProposals}
            calibrationFlags={draft.data.okrCalibrationFlags}
            onCalibrationFlagsChange={(okrCalibrationFlags) => updateDraft({ okrCalibrationFlags })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'directives':
        return (
          <QbrCLevelDirectivesStep
            directives={draft.data.directives}
            onDirectivesChange={(directives) => updateDraft({ directives })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'feedback':
        return (
          <MbrClosingStep
            decisions={draft.data.decisions}
            checklist={{
              strategicFocusClear: true,
              nextStepsHaveOwners: true,
              nonPrioritiesClear: true,
              communicateInAllHands: true,
            }}
            onChecklistChange={() => {}}
            ritualFeedback={draft.data.ritualFeedback}
            onRitualFeedbackChange={(ritualFeedback: RitualImprovementFeedback[]) => updateDraft({ ritualFeedback })}
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
      title="Pré-QBR C-Level"
      subtitle="Análise estratégica consolidada e direcionamentos"
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
