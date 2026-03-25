/**
 * QbrPostPage - Wizard pós-QBR
 * 
 * Promoção de OKRs aprovados, formalização de decisões e encerramento do ciclo.
 * @see docs/HUB_TECHNICAL_DEEP_DIVE.md — QBR Ritual
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { useGenericWizardDraft, useActiveCycles } from '@/modules/okrs/hooks';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';

import { QbrPostOkrPromotionStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostOkrPromotionStep';
import { QbrPostDecisionsStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostDecisionsStep';
import { QbrPostCommitmentsStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostCommitmentsStep';
import { QbrPostFollowUpStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostFollowUpStep';
import { QbrPostMinutesStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostMinutesStep';

import type { ApprovedTeamOkr } from '@/modules/okrs/components/wizards/qbr-post/QbrPostOkrPromotionStep';
import type {
  QbrPostStep, QbrPostDraftData, TeamCheckinDecision, QbrMeetingSnapshot,
} from '@/modules/okrs/types/wizard';

const WIZARD_STEPS = [
  { id: 'okr-promotion' as const, label: 'Promoção de OKRs', description: 'Criar OKRs aprovados' },
  { id: 'decisions' as const, label: 'Decisões', description: 'Complementar decisões' },
  { id: 'commitments' as const, label: 'Compromissos', description: 'Formalizar cross-área' },
  { id: 'follow-up' as const, label: 'Follow-up', description: 'Cadência e próximo MBR' },
  { id: 'minutes' as const, label: 'Ata Executiva', description: 'Encerramento' },
];

const STEP_ORDER: QbrPostStep[] = ['okr-promotion', 'decisions', 'commitments', 'follow-up', 'minutes'];

const DEFAULT_DATA: QbrPostDraftData = {
  cycleId: '',
  meetingSessionId: null,
  promotedOkrIds: [],
  decisions: [],
  crossCommitments: [],
  followUpCadence: {
    checkDecisionsEvery: 'biweekly',
    nextMbrDate: '',
    nextMbrTopics: [],
  },
  executiveMinutes: '',
  governanceChecklist: {
    strategicFocusClear: false,
    decisionsHaveOwners: false,
    nextStepsHaveOwners: false,
    communicateInAllHands: false,
  },
};

export default function QbrPostPage() {
  const navigate = useNavigate();
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();
  usePageTitle('Pós-QBR');

  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(() => activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null, [activeCycles]);

  // Check qbr_status = 'done' or 'ready' (post can happen after meeting)
  const { data: cycleData, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['qbr', 'cycle-status-post', quarterlyCycle?.id],
    enabled: !!buSupabase && !!quarterlyCycle?.id,
    queryFn: async () => {
      const { data, error } = await buSupabase.from('cycles').select('id, qbr_status').eq('id', quarterlyCycle!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const canAccessPost = cycleData?.qbr_status === 'ready' || cycleData?.qbr_status === 'done';

  // Load meeting session for approvals and decisions
  const { data: meetingSession } = useQuery({
    queryKey: ['qbr', 'meeting-session', quarterlyCycle?.id],
    enabled: !!buSupabase && !!quarterlyCycle?.id,
    queryFn: async () => {
      const { data, error } = await buSupabase.from('okr_wizard_sessions')
        .select('id, reflection_data')
        .eq('wizard_type', 'qbr-meeting')
        .eq('cycle_id', quarterlyCycle!.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Load leader sessions for OKR proposals
  const { data: leaderSessions } = useQuery({
    queryKey: ['qbr', 'leader-sessions-post', quarterlyCycle?.id],
    enabled: !!buSupabase && !!quarterlyCycle?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase.from('okr_wizard_sessions')
        .select('id, team_id, reflection_data')
        .eq('wizard_type', 'qbr-pre')
        .eq('cycle_id', quarterlyCycle!.id)
        .eq('status', 'completed');
      if (error) throw error;
      return data || [];
    },
  });

  // Load teams
  const { data: teams } = useQuery({
    queryKey: ['qbr', 'teams-post', currentBuId],
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase.from('teams').select('id, name').is('deleted_at', null).eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  // Derived: meeting data
  const meetingData = meetingSession?.reflection_data as any;
  const meetingApprovals: QbrMeetingSnapshot['approvals'] = meetingData?.data?.approvals || [];
  const meetingDecisions: TeamCheckinDecision[] = meetingData?.data?.decisions || [];
  const meetingCommitments = meetingData?.data?.crossCommitments || [];

  const teamMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of (teams || [])) m.set(t.id, t.name);
    return m;
  }, [teams]);

  const approvedOkrs: ApprovedTeamOkr[] = useMemo(() => {
    return meetingApprovals.map(approval => {
      const session = leaderSessions?.find(s => s.team_id === approval.teamId);
      const snapshot = session?.reflection_data as any;
      return {
        teamId: approval.teamId,
        teamName: teamMap.get(approval.teamId) || 'Time',
        sessionId: approval.sessionId,
        status: approval.status,
        proposedOkrs: snapshot?.data?.proposedOkrs || {},
      };
    });
  }, [meetingApprovals, leaderSessions, teamMap]);

  // Draft
  const { draft, updateDraft, setStep, clearDraft, discardDraft, saveDraft, isDirty, isSaving, isResumingDraft, lastSavedAt } =
    useGenericWizardDraft<QbrPostStep, QbrPostDraftData>({
      wizardType: 'qbr-post', teamId: null, cycleId: quarterlyCycle?.id || null,
      defaultStep: 'okr-promotion', defaultData: { ...DEFAULT_DATA, crossCommitments: meetingCommitments },
      enabled: !!quarterlyCycle && canAccessPost,
    });

  const completedSteps = useMemo(() => {
    const idx = STEP_ORDER.indexOf(draft.currentStep);
    return STEP_ORDER.slice(0, idx);
  }, [draft.currentStep]);

  const goToStep = useCallback((id: string) => setStep(id as QbrPostStep), [setStep]);
  const goNext = useCallback(() => { const i = STEP_ORDER.indexOf(draft.currentStep); if (i < STEP_ORDER.length - 1) setStep(STEP_ORDER[i + 1]); }, [draft.currentStep, setStep]);
  const goBack = useCallback(() => { const i = STEP_ORDER.indexOf(draft.currentStep); if (i > 0) setStep(STEP_ORDER[i - 1]); }, [draft.currentStep, setStep]);
  const handleSave = useCallback(async () => { try { await saveDraft(); toast.success('Rascunho salvo!'); } catch (e) { handleError(e, { context: 'QBR Post Save' }); } }, [saveDraft]);
  const handleDiscard = useCallback(async () => { try { await discardDraft(); toast.success('Descartado.'); } catch { toast.error('Erro'); } }, [discardDraft]);
  const handleComplete = useCallback(async () => {
    try {
      await clearDraft();
      toast.success('QBR concluído! Ciclo encerrado.');
      navigate('/okrs');
    } catch (e) { handleError(e, { context: 'QBR Post Complete' }); }
  }, [clearDraft, navigate]);
  const handleClose = useCallback(() => { clearDraft(); }, [clearDraft]);

  if (isLoadingCycles || isLoadingStatus) return <LoadingState text="Carregando pós-QBR..." fullPage />;

  if (!canAccessPost) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Pós-QBR não disponível</p>
          <p className="text-sm text-muted-foreground">A reunião QBR precisa ter sido concluída.</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (draft.currentStep) {
      case 'okr-promotion':
        return (
          <QbrPostOkrPromotionStep
            approvedOkrs={approvedOkrs}
            promotedSessionIds={draft.data.promotedOkrIds}
            onPromotedSessionIdsChange={(promotedOkrIds) => updateDraft({ promotedOkrIds })}
            onContinue={goNext}
          />
        );
      case 'decisions':
        return (
          <QbrPostDecisionsStep
            meetingDecisions={meetingDecisions}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
      case 'commitments':
        return (
          <QbrPostCommitmentsStep
            commitments={draft.data.crossCommitments}
            onCommitmentsChange={(crossCommitments) => updateDraft({ crossCommitments })}
            teams={teams || []}
            onContinue={goNext}
            onBack={goBack}
          />
        );
      case 'follow-up':
        return (
          <QbrPostFollowUpStep
            followUpCadence={draft.data.followUpCadence}
            onFollowUpCadenceChange={(followUpCadence) => updateDraft({ followUpCadence })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
      case 'minutes':
        return (
          <QbrPostMinutesStep
            executiveMinutes={draft.data.executiveMinutes}
            onExecutiveMinutesChange={(executiveMinutes) => updateDraft({ executiveMinutes })}
            checklist={draft.data.governanceChecklist}
            onChecklistChange={(governanceChecklist) => updateDraft({ governanceChecklist })}
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
      title="Pós-QBR"
      subtitle="Promoção de OKRs, decisões e encerramento do ciclo"
      steps={WIZARD_STEPS.map(s => ({ id: s.id, label: s.label, description: s.description }))}
      currentStepId={draft.currentStep}
      completedSteps={completedSteps}
      onStepChange={goToStep}
      isDirty={isDirty}
      isSavingDraft={isSaving}
      onSaveDraft={handleSave}
      lastSavedAt={lastSavedAt}
      isResumingDraft={isResumingDraft}
      onDiscardDraft={handleDiscard}
      onClose={handleClose}
      backUrl="/okrs"
    >
      {renderStep()}
    </FullPageWizardShell>
  );
}
