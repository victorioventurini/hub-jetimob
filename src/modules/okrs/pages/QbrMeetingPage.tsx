/**
 * QbrMeetingPage - Full-page wizard para Reunião QBR (tela compartilhada)
 * 
 * Revisão e aprovação de OKRs, decisões estratégicas e compromissos cross-área.
 * Carrega dados do pré-QBR (líderes) e pré-QBR C-Level como input.
 * @see docs/HUB_TECHNICAL_DEEP_DIVE.md — QBR Ritual
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';
import {
  useGenericWizardDraft,
  useActiveCycle,
} from '@/modules/okrs/hooks';
import { useRitualAvailability } from '@/modules/okrs/hooks/useRitualAvailability';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';

// Step components
import {
  QbrMeetingOpeningStep,
  QbrMeetingOkrReviewStep,
  QbrMeetingDecisionsStep,
  QbrMeetingCommitmentsStep,
  QbrMeetingClosingStep,
} from '@/modules/okrs/components/wizards/qbr-meeting';
import type { TeamForReview } from '@/modules/okrs/components/wizards/qbr-meeting';

import type {
  QbrMeetingDraftData,
  QbrMeetingGovernanceChecklist,
  QbrMeetingSnapshot,
  TeamCheckinDecision,
  RitualImprovementFeedback,
  QbrCLevelSnapshot,
  MbrKpiSnapshot,
  ProposedObjectiveEntry,
} from '@/modules/okrs/types/wizard';
import { normalizeProposedOkrs } from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

type QbrMeetingStep = 'opening' | 'okr-review' | 'decisions' | 'commitments' | 'closing';

const WIZARD_STEPS = [
  { id: 'opening' as const, label: 'Abertura', description: 'Pauta e direcionamentos' },
  { id: 'okr-review' as const, label: 'Revisão OKRs', description: 'Aprovação por time' },
  { id: 'decisions' as const, label: 'Decisões', description: 'Decisões estratégicas' },
  { id: 'commitments' as const, label: 'Compromissos', description: 'Cross-área' },
  { id: 'closing' as const, label: 'Encerramento', description: 'Governança' },
];

const STEP_ORDER: QbrMeetingStep[] = ['opening', 'okr-review', 'decisions', 'commitments', 'closing'];

const DEFAULT_DATA: QbrMeetingDraftData = {
  cycleId: '',
  preQbrReportSessionId: null,
  approvals: [],
  currentTeamIndex: 0,
  decisions: [],
  crossCommitments: [],
  governanceChecklist: {
    allTeamsReviewed: false,
    decisionsHaveOwners: false,
    dependenciesFormalized: false,
    feedbackLinkSent: false,
  },
  ritualFeedback: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function QbrMeetingPage() {
  const navigate = useNavigate();
  const { currentBu, currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  usePageTitle('Reunião QBR');

  // Cycle (status-based)
  const { activeQuarterlyCycle: quarterlyCycle, isLoading: isLoadingCycles } = useActiveCycle();
  const availability = useRitualAvailability('qbr-meeting', quarterlyCycle);

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
  } = useGenericWizardDraft<QbrMeetingStep, QbrMeetingDraftData>({
    wizardType: 'qbr-meeting',
    teamId: null,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'opening',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle,
  });

  // ── Load C-Level pré-QBR session (directives, calibration flags) ──
  const { data: cLevelSession, isLoading: isLoadingCLevel } = useQuery({
    queryKey: ['qbr-meeting', 'clevel-session', currentBuId, quarterlyCycle?.id],
    enabled: !!buSupabase && !!currentBuId && !!quarterlyCycle?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, reflection_data')
        .eq('wizard_type', 'qbr-pre-clevel')
        .eq('cycle_id', quarterlyCycle!.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data?.reflection_data) return null;

      const snapshot = (data.reflection_data as any)?.data as QbrCLevelSnapshot | undefined;
      return snapshot ? { sessionId: data.id, snapshot } : null;
    },
  });

  // ── Load all completed qbr-pre sessions (per team) ──
  const { data: preQbrSessions, isLoading: isLoadingPreQbr } = useQuery({
    queryKey: ['qbr-meeting', 'pre-sessions', currentBuId, quarterlyCycle?.id],
    enabled: !!buSupabase && !!currentBuId && !!quarterlyCycle?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, team_id, reflection_data')
        .eq('wizard_type', 'qbr-pre')
        .eq('cycle_id', quarterlyCycle!.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // ── Load teams for commitments dropdown ──
  const { data: buTeams } = useQuery({
    queryKey: ['qbr-meeting', 'teams', currentBuId],
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('teams')
        .select('id, name')
        .eq('bu_id', currentBuId!)
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return (data || []).map(t => ({ id: t.id, name: t.name }));
    },
  });

  // ── Load addendums for qbr-pre sessions ──
  const preQbrSessionIds = useMemo(
    () => (preQbrSessions || []).map(s => s.id),
    [preQbrSessions],
  );

  const { data: addendumsBySession } = useQuery({
    queryKey: ['qbr-meeting', 'addendums', preQbrSessionIds],
    enabled: preQbrSessionIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_wizard_addendums')
        .select('session_id, text, created_at, created_by')
        .in('session_id', preQbrSessionIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // ── Build teamsForReview from pre-QBR sessions ──
  const teamsForReview: TeamForReview[] = useMemo(() => {
    if (!preQbrSessions) return [];

    // Deduplicate by team_id (latest session wins)
    const byTeam = new Map<string, typeof preQbrSessions[0]>();
    for (const session of preQbrSessions) {
      if (session.team_id && !byTeam.has(session.team_id)) {
        byTeam.set(session.team_id, session);
      }
    }

    const teams = buTeams || [];
    return Array.from(byTeam.entries()).map(([teamId, session]) => {
      const teamName = teams.find(t => t.id === teamId)?.name || 'Time';
      const snapshot = (session.reflection_data as any)?.data;
      const proposedOkrs: ProposedObjectiveEntry[] = normalizeProposedOkrs(snapshot?.proposedOkrs);

      return {
        teamId,
        teamName,
        sessionId: session.id,
        proposedOkrs,
        hasSubmission: true,
      };
    });
  }, [preQbrSessions, buTeams]);

  // ── Build addendums keyed by teamId ──
  const teamAddendums = useMemo(() => {
    if (!addendumsBySession || !preQbrSessions) return {};

    // Map session_id → team_id
    const sessionToTeam = new Map<string, string>();
    for (const s of preQbrSessions) {
      if (s.team_id) sessionToTeam.set(s.id, s.team_id);
    }

    const result: Record<string, Array<{ text: string; created_at: string; created_by: string }>> = {};
    for (const a of addendumsBySession) {
      const teamId = sessionToTeam.get(a.session_id);
      if (!teamId) continue;
      if (!result[teamId]) result[teamId] = [];
      result[teamId].push({ text: a.text, created_at: a.created_at, created_by: a.created_by });
    }
    return result;
  }, [addendumsBySession, preQbrSessions]);

  // ── Extract C-Level data ──
  const cLevelDirectives = cLevelSession?.snapshot?.directives || [];
  const cLevelStrategicAnalysis = cLevelSession?.snapshot?.strategicAnalysis;
  const calibrationFlags = cLevelSession?.snapshot?.okrCalibrationFlags || [];

  // ── Build org KPI snapshots from pre-QBR data ──
  const orgKpiSnapshots: MbrKpiSnapshot[] = useMemo(() => {
    if (!preQbrSessions) return [];
    const allKpis = new Map<string, MbrKpiSnapshot>();
    for (const session of preQbrSessions) {
      const snapshot = (session.reflection_data as any)?.data;
      const kpis: MbrKpiSnapshot[] = snapshot?.kpiSnapshots || snapshot?.kpiSnapshot || [];
      for (const kpi of kpis) {
        if (kpi.kpiId && !allKpis.has(kpi.kpiId)) {
          allKpis.set(kpi.kpiId, kpi);
        }
      }
    }
    return Array.from(allKpis.values());
  }, [preQbrSessions]);

  // Seed cycleId in draft
  const seededCycleRef = useRef(false);
  useEffect(() => {
    if (seededCycleRef.current || !quarterlyCycle?.id) return;
    if (!draft.data.cycleId) {
      updateDraft({ cycleId: quarterlyCycle.id });
    }
    seededCycleRef.current = true;
  }, [quarterlyCycle?.id, draft.data.cycleId, updateDraft]);

  // ── Navigation ──
  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    for (let i = 0; i < currentIdx; i++) {
      completed.push(STEP_ORDER[i]);
    }
    return completed;
  }, [draft.currentStep]);

  const goToStep = useCallback((stepId: string) => {
    setStep(stepId as QbrMeetingStep);
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

  // ── Handlers ──
  const handleClose = useCallback(() => {}, []);

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      handleError(error, { context: 'QBR Meeting Draft Save' });
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

  const isCompletingRef = useRef(false);

  const handleComplete = useCallback(async () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;

    try {
      const completedSessionId = await clearDraft();
      toast.success('Reunião QBR concluída com sucesso!');
      navigate('/okrs/executive');

      // Trigger summary email (best-effort, non-blocking)
      if (completedSessionId && quarterlyCycle?.id && currentBu?.id) {
        try {
          await buSupabase.functions.invoke('qbr-meeting-summary', {
            body: {
              cycleId: quarterlyCycle.id,
              sessionId: completedSessionId,
              bu_id: currentBu.id,
            },
          });
        } catch (e) {
          console.warn('QBR Meeting summary failed (non-blocking):', e);
        }
      }
    } finally {
      isCompletingRef.current = false;
    }
  }, [clearDraft, navigate, buSupabase, quarterlyCycle, currentBu]);

  // ── Loading ──
  if (isLoadingCycles || isLoadingCLevel || isLoadingPreQbr) {
    return <LoadingState text="Carregando dados da Reunião QBR..." fullPage />;
  }

  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="qbr-meeting" availability={availability} />;
  }

  // ── Step render ──
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'opening':
        return (
          <QbrMeetingOpeningStep
            cLevelDirectives={cLevelDirectives}
            cLevelStrategicAnalysis={cLevelStrategicAnalysis}
            leaderSummaryCount={teamsForReview.length}
            orgKpiSnapshots={orgKpiSnapshots}
            onContinue={goNext}
          />
        );

      case 'okr-review':
        return (
          <QbrMeetingOkrReviewStep
            teamsForReview={teamsForReview}
            approvals={draft.data.approvals}
            onApprovalsChange={(approvals) => updateDraft({ approvals })}
            calibrationFlags={calibrationFlags}
            teamAddendums={teamAddendums}
            currentTeamIndex={draft.data.currentTeamIndex}
            onCurrentTeamIndexChange={(currentTeamIndex) => updateDraft({ currentTeamIndex })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'decisions':
        return (
          <QbrMeetingDecisionsStep
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'commitments':
        return (
          <QbrMeetingCommitmentsStep
            commitments={draft.data.crossCommitments}
            onCommitmentsChange={(crossCommitments) => updateDraft({ crossCommitments })}
            teams={buTeams || []}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'closing':
        return (
          <QbrMeetingClosingStep
            checklist={draft.data.governanceChecklist}
            onChecklistChange={(governanceChecklist: QbrMeetingGovernanceChecklist) => updateDraft({ governanceChecklist })}
            ritualFeedback={draft.data.ritualFeedback}
            onRitualFeedbackChange={(ritualFeedback: RitualImprovementFeedback[]) => updateDraft({ ritualFeedback })}
            isCompleting={isCompletingRef.current}
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
      title="Reunião QBR"
      subtitle="Revisão e aprovação de OKRs — decisões estratégicas e compromissos cross-área"
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
