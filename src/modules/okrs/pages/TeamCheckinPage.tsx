/**
 * TeamCheckinPage - Full-page wizard para check-in do time
 */

import { useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { HierarchyContextSwitcher } from '@/modules/okrs/components/wizards/shared/HierarchyContextSwitcher';
import { 
  useGenericWizardDraft,
  useActiveCycles,
  useTeamPendingKrs,
  useLastCompletedSession,
} from '@/modules/okrs/hooks';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';

import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCircle } from 'lucide-react';
import { handleError } from '@/lib/errorMessages';

// Step components
import { TeamOpeningStep } from '@/modules/okrs/components/wizards/team-checkin/TeamOpeningStep';
import { TeamKrReviewStep } from '@/modules/okrs/components/wizards/team-checkin/TeamKrReviewStep';
import { TeamInitiativesStep } from '@/modules/okrs/components/wizards/team-checkin/TeamInitiativesStep';
import { TeamDecisionsStep } from '@/modules/okrs/components/wizards/team-checkin/TeamDecisionsStep';

import type { TeamCheckinDecision, TeamCheckinChecklist } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type WizardStep = 'opening' | 'kr-review' | 'initiatives' | 'decisions';

interface TeamCheckinDraftData {
  reviewedKrs: string[];
  decisions: TeamCheckinDecision[];
  checklist: TeamCheckinChecklist;
}

const WIZARD_STEPS = [
  { id: 'opening' as const, label: 'Abertura', description: 'Visão geral' },
  { id: 'kr-review' as const, label: 'Revisão KRs', description: 'KRs marcados' },
  { id: 'initiatives' as const, label: 'Iniciativas', description: 'Atividades relevantes' },
  { id: 'decisions' as const, label: 'Decisões', description: 'Próximos passos' },
];

const STEP_ORDER: WizardStep[] = ['opening', 'kr-review', 'initiatives', 'decisions'];

const DEFAULT_DATA: TeamCheckinDraftData = {
  reviewedKrs: [],
  decisions: [],
  checklist: {
    knowWhatToFocus: false,
    knowWhatNotToDo: false,
    knowWhoIsResponsible: false,
  },
};

// ============================================================
// COMPONENT
// ============================================================

export default function TeamCheckinPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamIdParam = searchParams.get('team');
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  // Get teams
  const { teams, isLoading: isLoadingTeams } = useHierarchicalTeamList();
  const selectedTeam = useMemo(() => {
    if (!teamIdParam || !teams) return null;
    return teams.find(t => t.id === teamIdParam) || null;
  }, [teamIdParam, teams]);
  const lastCheckin = useLastCompletedSession('team-checkin', teamIdParam);
  
  usePageTitle(selectedTeam ? `Check-in - ${selectedTeam.name}` : 'Check-in do Time');
  
  // Get cycle
  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(() => 
    activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );
  
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
  } = useGenericWizardDraft<WizardStep, TeamCheckinDraftData>({
    wizardType: 'team-checkin',
    teamId: teamIdParam,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'opening',
    defaultData: DEFAULT_DATA,
    enabled: !!teamIdParam && !!quarterlyCycle,
  });
  
  // Fetch team KRs
  const { data: pendingKrs, isLoading: isLoadingKrs } = useTeamPendingKrs(
    quarterlyCycle?.id,
    teamIdParam ? [teamIdParam] : []
  );
  
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
    setStep(stepId as WizardStep);
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
  const handleClose = useCallback(() => {
    clearDraft();
  }, [clearDraft]);
  
  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      handleError(error, { context: 'OKR Draft Save' });
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
    // 1. Clear draft — creates completed session if none existed, returns sessionId
    const completedSessionId = await clearDraft();
    toast.success('Check-in do time concluído!');
    navigate('/okrs');

    // 2. Trigger summary email (best-effort, non-blocking)
    if (completedSessionId && teamIdParam && quarterlyCycle?.id && currentBu?.id) {
      try {
        await buSupabase.functions.invoke('team-checkin-summary', {
          body: {
            teamId: teamIdParam,
            cycleId: quarterlyCycle.id,
            sessionId: completedSessionId,
            bu_id: currentBu.id,
          }
        });
      } catch (e) {
        // Non-blocking: log warning but don't show error to user
        console.warn('Summary email failed (non-blocking):', e);
      }
    }
  }, [clearDraft, navigate, buSupabase, teamIdParam, quarterlyCycle, currentBu]);
  
  // Handle team change (admin only)
  const handleTeamChange = useCallback((newTeamId: string) => {
    // Reset to first step and clear draft for new team
    discardDraft();
    setSearchParams({ team: newTeamId });
  }, [discardDraft, setSearchParams]);
  
  
  // Loading
  if (isLoadingTeams || isLoadingCycles) {
    return <LoadingState text="Carregando..." fullPage />;
  }
  
  // No team
  if (!teamIdParam || !selectedTeam) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Time não selecionado"
        description="Selecione um time para o check-in"
        actionLabel="Voltar"
        onAction={() => navigate('/wizards')}
      />
    );
  }
  
  // Render step content
  const renderStepContent = () => {
    const krs = pendingKrs || [];
    
    switch (draft.currentStep) {
      case 'opening':
        return (
          <TeamOpeningStep
            teamName={selectedTeam.name}
            cycleName={quarterlyCycle?.name || ''}
            krs={krs}
            markedForDiscussion={draft.data.reviewedKrs}
            isLoading={isLoadingKrs}
            lastCompletedAt={lastCheckin.lastCompletedAt}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions) => updateDraft({ decisions })}
            onContinue={goNext}
          />
        );
        
      case 'kr-review':
        return (
          <TeamKrReviewStep
            krs={krs}
            markedForDiscussion={[]}
            reviewedKrs={new Set(draft.data.reviewedKrs)}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions) => updateDraft({ decisions })}
            onMarkReviewed={(krId) => {
              const updated = [...draft.data.reviewedKrs, krId];
              updateDraft({ reviewedKrs: updated });
            }}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'initiatives':
        return (
          <TeamInitiativesStep
            initiatives={[]}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'decisions':
        return (
          <TeamDecisionsStep
            decisions={draft.data.decisions}
            checklist={draft.data.checklist}
            onDecisionsChange={(decisions) => updateDraft({ decisions })}
            onChecklistChange={(checklist) => updateDraft({ checklist })}
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
      title="Check-in do Time"
      subtitle="Conduza o check-in coletivo com seu time"
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
      backUrl="/wizards"
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
