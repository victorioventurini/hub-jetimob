/**
 * QbrMeetingPage - Full-page wizard para Reunião QBR (tela compartilhada)
 * 
 * Revisão e aprovação de OKRs, decisões estratégicas e compromissos cross-área.
 * Carrega dados do pré-QBR (líderes) e pré-QBR C-Level como input.
 * @see docs/HUB_TECHNICAL_DEEP_DIVE.md — QBR Ritual
 */

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';
import { CompletedRitualView } from '@/modules/okrs/components/wizards/shared/CompletedRitualView';
import { RitualPreparationStatus } from '@/modules/okrs/components/wizards/shared';
import {
  useGenericWizardDraft,
  useActiveCycle,
  useAllOrgObjectivesView,
} from '@/modules/okrs/hooks';
import { useCompletedSessionForCycle } from '@/modules/okrs/hooks';
import { usePermissions } from '@/hooks/usePermissions';
import { calculateKrState } from '@/modules/okrs/hooks';
import { calculateProgress } from '@/modules/okrs/types';
import { useRitualAvailability } from '@/modules/okrs/hooks';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { qbrKeys } from '@/lib/queryKeys/okrs';
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
  { id: 'opening' as const, label: 'Contexto', description: 'Análise do C-Level' },
  { id: 'okr-review' as const, label: 'Aprovação OKRs', description: 'Time por time' },
  { id: 'decisions' as const, label: 'Decisões', description: 'Dono e prazo' },
  { id: 'commitments' as const, label: 'Compromissos', description: 'Entre times' },
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
    orgCoverageClear: false,
    decisionsHaveOwners: false,
    dependenciesFormalized: false,
    feedbackLinkSent: false,
  },
  ritualFeedback: [],
  intentionalGaps: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function QbrMeetingPage() {
  const navigate = useNavigate();
  const { currentBu, currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  usePageTitle('QBR');

  // Cycle: QBR reviews the closing/just-closed quarter, not the newly active one
  const { lastClosedQuarterlyCycle, activeQuarterlyCycle, isLoading: isLoadingCycles } = useActiveCycle();
  const quarterlyCycle = lastClosedQuarterlyCycle || activeQuarterlyCycle;
  const availability = useRitualAvailability('qbr-meeting', quarterlyCycle);

  // Permissions (for reopen)
  const { isWildcard } = usePermissions();

  // Detect completed session for this cycle
  const {
    sessionState,
    completedSession,
    isLoading: isLoadingCompletedSession,
  } = useCompletedSessionForCycle('qbr-meeting', null, quarterlyCycle?.id);

  // Draft persistence
  const {
    draft,
    updateDraft,
    setStep,
    clearDraft,
    discardDraft,
    saveDraft,
    reopenSession,
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

  // Track whether we're showing completed view or wizard
  const [showCompletedView, setShowCompletedView] = useState(false);

  // When completed session detected and draft is empty, show completed view
  useEffect(() => {
    if (sessionState === 'completed' && completedSession && !isResumingDraft) {
      // Check if localStorage has an existing draft (user was editing)
      const storageKey = `okr-draft.qbr-meeting`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (!saved) {
          setShowCompletedView(true);
        }
      } catch {
        setShowCompletedView(true);
      }
    }
  }, [sessionState, completedSession, isResumingDraft]);

  // Handle reopen
  const handleReopen = useCallback(async () => {
    if (!completedSession) return;
    const success = await reopenSession(completedSession.id);
    if (success) {
      setShowCompletedView(false);
      toast.success('Rito reaberto para edição.');
    } else {
      toast.error('Erro ao reabrir o rito. Tente novamente.');
    }
  }, [completedSession, reopenSession]);

  // ── Load C-Level pré-QBR session (directives, calibration flags) ──
  const { data: cLevelSession, isLoading: isLoadingCLevel } = useQuery({
    queryKey: qbrKeys.meetingCLevelSession(currentBuId, quarterlyCycle?.id),
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
    queryKey: qbrKeys.meetingPreSessions(currentBuId, quarterlyCycle?.id),
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
    queryKey: qbrKeys.meetingTeams(currentBuId),
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
    queryKey: qbrKeys.meetingAddendums(preQbrSessionIds),
    enabled: preQbrSessionIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (buSupabase as any)
        .from('okr_wizard_addendums')
        .select('session_id, text, created_at, created_by')
        .in('session_id', preQbrSessionIds)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as Array<{ session_id: string; text: string; created_at: string; created_by: string }>;
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

  // ── Load org objectives for coverage map ──
  const cycleYear = quarterlyCycle ? parseInt(quarterlyCycle.start_date.substring(0, 4), 10) : undefined;
  const { data: orgObjectives } = useAllOrgObjectivesView(cycleYear, quarterlyCycle?.id);

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

  // ── Compute real scorecard metrics from org objectives ──
  const scorecardMetrics = useMemo(() => {
    let healthy = 0;
    let atRisk = 0;
    let offTrack = 0;
    const noSubmission = (buTeams?.length || 0) - teamsForReview.length;

    if (orgObjectives) {
      for (const obj of orgObjectives) {
        for (const orgKr of obj.orgKrs) {
          const progress = calculateProgress(
            orgKr.baseline ?? 0, orgKr.current_value ?? 0, orgKr.target ?? 0, orgKr.direction as any
          );
          const state = calculateKrState({
            progress,
            status: (orgKr.status || 'not_started') as any,
            daysSinceCheckin: 999,
            cycleEnded: false,
          });
          if (state === 'healthy' || state === 'achieved' || state === 'exceeded') healthy++;
          else if (state === 'at_risk' || state === 'stagnant') atRisk++;
          else if (state === 'off_track' || state === 'not_achieved') offTrack++;
        }
      }
    }

    return { healthy, atRisk, offTrack, noSubmission };
  }, [orgObjectives, buTeams, teamsForReview]);

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
      toast.success('QBR concluído com sucesso!');
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
  if (isLoadingCycles || isLoadingCLevel || isLoadingPreQbr || isLoadingCompletedSession) {
    return <LoadingState text="Carregando dados do QBR..." fullPage />;
  }

  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="qbr-meeting" availability={availability} />;
  }

  // ── Show completed view if session was already submitted ──
  if (showCompletedView && completedSession) {
    return (
      <CompletedRitualView
        title="QBR"
        wizardType="qbr-meeting"
        session={completedSession}
        backUrl="/okrs/executive"
        canReopen={isWildcard}
        onReopen={handleReopen}
      />
    );
  }

  // ── Step render ──
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'opening':
        return (
          <QbrMeetingOpeningStep
            cLevelDirectives={cLevelDirectives}
            cLevelStrategicAnalysis={cLevelStrategicAnalysis}
            cLevelSessionExists={!!cLevelSession}
            leaderSummaryCount={teamsForReview.length}
            orgKpiSnapshots={orgKpiSnapshots}
            orgObjectives={orgObjectives || []}
            scorecardMetrics={scorecardMetrics}
            currentStepIndex={STEP_ORDER.indexOf(draft.currentStep)}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            topSlot={
              <RitualPreparationStatus
                ritualType="qbr-meeting"
                cycleId={quarterlyCycle?.id ?? null}
              />
            }
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
            orgObjectives={orgObjectives || []}
            currentTeamIndex={draft.data.currentTeamIndex}
            onCurrentTeamIndexChange={(currentTeamIndex) => updateDraft({ currentTeamIndex })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'decisions':
        return (
          <QbrMeetingDecisionsStep
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            cLevelDirectives={cLevelDirectives}
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
            approvals={draft.data.approvals}
            teamsForReview={teamsForReview}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
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
            approvals={draft.data.approvals}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            crossCommitments={draft.data.crossCommitments}
            totalTeamsForReview={teamsForReview.length}
            orgObjectives={orgObjectives || []}
            teamsForReview={teamsForReview}
            intentionalGaps={draft.data.intentionalGaps || []}
            onIntentionalGapsChange={(intentionalGaps) => updateDraft({ intentionalGaps })}
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
      title="QBR"
      subtitle="Decisões com base na análise do C-Level. A análise já foi feita. Agora a sala decide, aprova e compromete."
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
