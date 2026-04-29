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
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';
import {
  useGenericWizardDraft,
  useActiveCycle,
} from '@/modules/okrs/hooks';
import { useRitualAvailability } from '@/modules/okrs/hooks';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { qbrKeys } from '@/lib/queryKeys/okrs';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';

// Step components
import {
  QbrCLevelSystemReadStep,
  QbrCLevelQuarterBalanceStep,
  QbrCLevelStrategicStep,
  QbrCLevelOkrValidationStep,
  QbrCLevelDirectivesStep,
} from '@/modules/okrs/components/wizards/qbr-pre-clevel';
import type { LeaderPreSubmission } from '@/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelSystemReadStep';
import type { TeamOkrProposal } from '@/modules/okrs/components/wizards/qbr-pre-clevel/QbrCLevelOkrValidationStep';

// MBR Closing reused for feedback step
import { MbrClosingStep } from '@/modules/okrs/components/wizards/mbr/MbrClosingStep';

import {
  normalizeProposedOkrs,
  type QbrPreCLevelStep,
  type QbrCLevelDraftData,
  type MbrKpiSnapshot,
  type TeamCheckinDecision,
  type RitualImprovementFeedback,
  type QbrPreSnapshot,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'system-read' as const, label: 'Dados dos Times', description: 'O que os times reportaram' },
  { id: 'quarter-balance' as const, label: 'Balanço do Quarter', description: 'Como foi na prática' },
  { id: 'strategic-analysis' as const, label: 'Sua Análise', description: 'O que só você vê' },
  { id: 'okr-validation' as const, label: 'Calibração', description: 'Flags nas propostas' },
  { id: 'directives' as const, label: 'Pauta da Reunião', description: 'O que a sala decide' },
  { id: 'feedback' as const, label: 'Avaliação do Rito', description: 'Feedback' },
];

const STEP_ORDER: QbrPreCLevelStep[] = ['system-read', 'quarter-balance', 'strategic-analysis', 'okr-validation', 'directives', 'feedback'];

const DEFAULT_DATA: QbrCLevelDraftData = {
  cycleId: '',
  systemPatterns: '',
  strategicAnalysis: {
    alignmentPastQuarter: '',
    alignmentNextQuarter: '',
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

  usePageTitle('Pré-QBR Executivo');

  // Cycle (status-based)
  const { activeQuarterlyCycle: quarterlyCycle, isLoading: isLoadingCycles } = useActiveCycle();
  const availability = useRitualAvailability('qbr-pre-clevel', quarterlyCycle);

  // Load qbr_status for informational display (no longer a hard gate)
  const { data: cycleData, isLoading: isLoadingStatus } = useQuery({
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

  // Load leader submissions
  const { data: leaderSessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: qbrKeys.leaderSessions(quarterlyCycle?.id),
    enabled: !!buSupabase && !!quarterlyCycle?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, team_id, reflection_data, completed_at, addendums')
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
    queryKey: qbrKeys.teams(currentBuId),
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('teams')
        .select('id, name')
        .eq('bu_id', currentBuId!)
        .is('deleted_at', null)
        .is('parent_team_id', null)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  // Load org KPIs
  const { data: orgKpis } = useQuery({
    queryKey: qbrKeys.orgKpis(currentBuId),
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

    // Deduplicate by team_id, keeping the most recent submission
    const filtered = leaderSessions.filter(s => s.team_id && s.reflection_data);
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
    );
    const latestByTeam = new Map<string, (typeof sorted)[number]>();
    for (const s of sorted) {
      if (!latestByTeam.has(s.team_id!)) {
        latestByTeam.set(s.team_id!, s);
      }
    }

    return Array.from(latestByTeam.values())
      .map(s => ({
        teamId: s.team_id!,
        teamName: teamMap.get(s.team_id!) || 'Time desconhecido',
        snapshot: (s.reflection_data as any)?.data as QbrPreSnapshot,
        addendums: Array.isArray(s.addendums) ? s.addendums as Array<{ text: string; created_at: string; created_by: string }> : [],
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
        proposedOkrs: normalizeProposedOkrs(sub?.snapshot?.proposedOkrs),
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
    enabled: !!quarterlyCycle,
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
      toast.success('Pré-QBR Executivo concluído!');
      navigate('/okrs');
    } catch (error) {
      handleError(error, { context: 'QBR Pre C-Level Complete' });
    }
  }, [clearDraft, navigate]);

  // handleClose is a no-op: FullPageWizardShell handles navigation.
  // Draft stays as in_progress for later resumption — only handleComplete marks as completed.
  const handleClose = useCallback(() => {}, []);

  // Loading
  if (isLoadingCycles || isLoadingStatus || isLoadingSessions) {
    return <LoadingState text="Carregando dados do pré-QBR C-Level..." fullPage />;
  }

  // Guard: only check ritual window availability
  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="qbr-pre-clevel" availability={availability} />;
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

      case 'quarter-balance':
        return (
          <QbrCLevelQuarterBalanceStep
            cycleId={quarterlyCycle!.id}
            cycleName={quarterlyCycle!.name}
            year={parseInt(quarterlyCycle!.start_date.substring(0, 4), 10)}
            onContinue={goNext}
            onBack={goBack}
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
              kpiGateClear: true,
              allTeamsReviewed: true,
              orgOkrsVerified: true,
              decisionsHaveOwner: true,
              qbrFollowUpAddressed: true,
              nextMbrScheduled: true,
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
      title="Pré-QBR Executivo"
      subtitle="Análise estratégica do quarter — sua visão antes da reunião. Registre sua análise agora. Na reunião, a sala decide com base no que você preparou aqui."
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
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
