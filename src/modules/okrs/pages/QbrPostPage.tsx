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
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';
import { useGenericWizardDraft, useActiveCycle } from '@/modules/okrs/hooks';
import { useRitualAvailability } from '@/modules/okrs/hooks';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { qbrKeys } from '@/lib/queryKeys/okrs';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';
import { buildTeamScorecardFromOrgObjectives } from '@/modules/okrs/components/wizards/shared/TeamDeliveryScorecard';

import { QbrPostOkrPromotionStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostOkrPromotionStep';
import { QbrPostDecisionsStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostDecisionsStep';
import { QbrPostCommitmentsStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostCommitmentsStep';
import { QbrPostFollowUpStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostFollowUpStep';
import { QbrPostMinutesStep } from '@/modules/okrs/components/wizards/qbr-post/QbrPostMinutesStep';
import { RitualPreparationStatus } from '@/modules/okrs/components/wizards/shared';

import type { ApprovedTeamOkr, DestinationCycleOption } from '@/modules/okrs/components/wizards/qbr-post/QbrPostOkrPromotionStep';
import {
  normalizeProposedOkrs,
  type QbrPostStep, type QbrPostDraftData, type TeamCheckinDecision, type QbrMeetingSnapshot,
  type QbrCLevelSnapshot,
} from '@/modules/okrs/types/wizard';
import type { QbrPostMinutesSummaryData } from '@/modules/okrs/components/wizards/qbr-post/QbrPostMinutesStep';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries';

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
  followUpCadence: {},
  executiveMinutes: '',
  ceoContextMessage: '',
  governanceChecklist: {
    strategicFocusClear: false,
    decisionsHaveOwners: false,
    dependenciesFormalized: false,
    nextCycleOkrsActive: false,
  },
  adjustmentNotes: {},
  krAdjustments: {},
};

export default function QbrPostPage() {
  const navigate = useNavigate();
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();
  usePageTitle('Pós-QBR');

  const { activeQuarterlyCycle: quarterlyCycle, isLoading: isLoadingCycles } = useActiveCycle();
  const availability = useRitualAvailability('qbr-post', quarterlyCycle);

  // Check qbr_status = 'done' or 'ready' (post can happen after meeting)
  const { data: cycleData, isLoading: isLoadingStatus } = useQuery({
    queryKey: qbrKeys.cycleStatusPost(quarterlyCycle?.id),
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
    queryKey: qbrKeys.meetingSession(quarterlyCycle?.id),
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

  // Load C-Level session for calibration flags
  const { data: cLevelSession } = useQuery({
    queryKey: qbrKeys.cLevelSessionPost(quarterlyCycle?.id),
    enabled: !!buSupabase && !!quarterlyCycle?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase.from('okr_wizard_sessions')
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

  // Load leader sessions for OKR proposals
  const { data: leaderSessions } = useQuery({
    queryKey: qbrKeys.leaderSessionsPost(quarterlyCycle?.id),
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
    queryKey: qbrKeys.teamsPost(currentBuId),
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase.from('teams').select('id, name').eq('bu_id', currentBuId!).is('deleted_at', null).eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  // Load org objectives for TeamDeliveryScorecard
  const { data: orgObjectives } = useQuery({
    queryKey: qbrKeys.orgObjectivesPost(quarterlyCycle?.id),
    enabled: !!buSupabase && !!quarterlyCycle?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('okr_team_objectives')
        .select(`
          id, title, progress, status, team_id,
          okr_team_key_results (
            id, title, progress, status, baseline, current_value, target_value,
            direction, unit, owner_user_id, last_checkin_at,
            profiles:owner_user_id (display_name)
          )
        `)
        .eq('cycle_id', quarterlyCycle!.id)
        .is('deleted_at', null);
      if (error) throw error;
      return (data || []) as unknown as OrgObjectiveWithKrs[];
    },
  });

  // Load destination cycles (status = 'planning', type = 'quarter')
  const { data: planningCycles } = useQuery({
    queryKey: qbrKeys.planningCyclesPost(currentBuId),
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('cycles')
        .select('id, name, start_date, end_date')
        .eq('bu_id', currentBuId!)
        .eq('status', 'planning')
        .eq('type', 'quarter')
        .order('start_date', { ascending: true });
      if (error) throw error;
      return (data || []).map(c => ({
        id: c.id,
        name: c.name,
        startDate: c.start_date,
        endDate: c.end_date,
      })) as DestinationCycleOption[];
    },
  });

  // Derived: meeting data
  const meetingData = meetingSession?.reflection_data as any;
  const meetingApprovals: QbrMeetingSnapshot['approvals'] = meetingData?.data?.approvals || [];
  const meetingDecisions: TeamCheckinDecision[] = meetingData?.data?.decisions || [];
  const meetingCommitments = meetingData?.data?.crossCommitments || [];
  const meetingNextThirtyDays = meetingData?.data?.nextThirtyDays as { ceo?: string; coo?: string; cpto?: string } | undefined;

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
        proposedOkrs: normalizeProposedOkrs(snapshot?.data?.proposedOkrs),
      };
    });
  }, [meetingApprovals, leaderSessions, teamMap]);

  // Build team scorecards from org objectives
  const teamScorecards = useMemo(() => {
    if (!teams?.length || !orgObjectives?.length) return [];
    return teams.map(t => buildTeamScorecardFromOrgObjectives(t.id, t.name, orgObjectives));
  }, [teams, orgObjectives]);

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
  const handleClose = useCallback(() => {}, []);

  if (isLoadingCycles || isLoadingStatus) return <LoadingState text="Carregando pós-QBR..." fullPage />;

  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="qbr-post" availability={availability} />;
  }

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

  const hasPromotedOkrs = (draft.data.promotedOkrIds || []).length > 0;

  const renderStep = () => {
    switch (draft.currentStep) {
      case 'okr-promotion':
        return (
          <QbrPostOkrPromotionStep
            approvedOkrs={approvedOkrs}
            promotedSessionIds={draft.data.promotedOkrIds}
            onPromotedSessionIdsChange={(promotedOkrIds) => updateDraft({ promotedOkrIds })}
            calibrationFlags={cLevelSession?.snapshot?.okrCalibrationFlags}
            crossCommitments={meetingCommitments}
            adjustmentNotes={draft.data.adjustmentNotes || {}}
            onAdjustmentNotesChange={(adjustmentNotes) => updateDraft({ adjustmentNotes })}
            krAdjustments={draft.data.krAdjustments || {}}
            onKrAdjustmentsChange={(krAdjustments) => updateDraft({ krAdjustments })}
            teams={teams || []}
            teamScorecards={teamScorecards}
            destinationCycles={planningCycles || []}
            destinationCycleId={draft.data.destinationCycleId}
            onDestinationCycleIdChange={(destinationCycleId) => updateDraft({ destinationCycleId })}
            onContinue={goNext}
            topSlot={
              <RitualPreparationStatus
                ritualType="qbr-post"
                cycleId={quarterlyCycle?.id ?? null}
              />
            }
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
            approvedOkrs={approvedOkrs}
            promotedSessionIds={draft.data.promotedOkrIds}
            onContinue={goNext}
            onBack={goBack}
          />
        );
      case 'follow-up':
        return (
          <QbrPostFollowUpStep
            followUpCadence={draft.data.followUpCadence}
            onFollowUpCadenceChange={(followUpCadence) => updateDraft({ followUpCadence })}
            meetingNextThirtyDays={meetingNextThirtyDays}
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
            hasPromotedOkrs={hasPromotedOkrs}
            ceoContextMessage={draft.data.ceoContextMessage}
            onCeoContextMessageChange={(ceoContextMessage) => updateDraft({ ceoContextMessage })}
            summaryData={(() => {
              const promoted = approvedOkrs.filter(o => draft.data.promotedOkrIds.includes(o.sessionId));
              const promotedTeamIds = new Set(promoted.map(o => o.teamId));
              const allTeamIds = new Set(approvedOkrs.map(o => o.teamId));
              const teamsWithoutPromotion = Array.from(allTeamIds)
                .filter(id => !promotedTeamIds.has(id))
                .map(id => teamMap.get(id) || 'Time');

              return {
                promotedOkrs: promoted.flatMap(o => o.proposedOkrs.map(p => ({
                  teamName: o.teamName,
                  objectiveTitle: p.objective.title,
                  krCount: p.draftKrs.length,
                }))),
                decisions: [...meetingDecisions, ...draft.data.decisions].map(d => ({
                  text: d.text,
                  ownerName: d.owner?.name,
                  deadline: d.deadline || undefined,
                })),
                crossCommitments: (draft.data.crossCommitments || []).map(c => ({
                  fromTeamName: teamMap.get(c.fromTeamId) || 'Time',
                  toTeamName: teamMap.get(c.toTeamId) || 'Time',
                  description: c.description,
                  deadline: c.deadline,
                })),
                teamsWithoutPromotion,
              };
            })()}
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
      backUrl="/rituals"
    >
      {renderStep()}
    </FullPageWizardShell>
  );
}
