/**
 * LeaderPrepPage - Full-page wizard para preparação do líder
 */

import { useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { useGenericWizardDraft } from '@/modules/okrs/hooks/useGenericWizardDraft';
import { useActiveCycles } from '@/modules/okrs/hooks/useCycleData';
import { useTeamOverviewMetrics } from '@/modules/okrs/hooks/useTeamOverviewMetrics';
import { useTeamPendingKrs } from '@/modules/okrs/hooks/useTeamPendingKrs';
import { useHierarchicalTeamList } from '@/modules/teams/hooks/useTeams';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCircle } from 'lucide-react';

// Step components
import { LeaderOverviewStep } from '@/modules/okrs/components/wizards/leader-prep/LeaderOverviewStep';
import { LeaderHighlightsStep } from '@/modules/okrs/components/wizards/leader-prep/LeaderHighlightsStep';
import { LeaderPrepStep } from '@/modules/okrs/components/wizards/leader-prep/LeaderPrepStep';
import { LeaderAlignmentStep, type ParentObjective } from '@/modules/okrs/components/wizards/leader-prep/LeaderAlignmentStep';

import type { KrAction, VicInsight } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type WizardStep = 'overview' | 'highlights' | 'prep' | 'alignment';

interface LeaderPrepDraftData {
  krActions: KrAction[];
  meetingNotes: string;
  dismissedInsights: string[];
}

const WIZARD_STEPS = [
  { id: 'overview' as const, label: 'Panorama', description: 'Visão geral do time' },
  { id: 'highlights' as const, label: 'Destaques', description: 'Insights automáticos' },
  { id: 'prep' as const, label: 'Preparação', description: 'Marcar para discussão' },
  { id: 'alignment' as const, label: 'Alinhamento', description: 'OKRs do nível superior' },
];

const STEP_ORDER: WizardStep[] = ['overview', 'highlights', 'prep', 'alignment'];

const DEFAULT_DATA: LeaderPrepDraftData = {
  krActions: [],
  meetingNotes: '',
  dismissedInsights: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function LeaderPrepPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamIdParam = searchParams.get('team');
  
  // Get teams
  const { teams, isLoading: isLoadingTeams } = useHierarchicalTeamList();
  const selectedTeam = useMemo(() => {
    if (!teamIdParam || !teams) return null;
    return teams.find(t => t.id === teamIdParam) || null;
  }, [teamIdParam, teams]);
  
  usePageTitle(selectedTeam ? `Preparação - ${selectedTeam.name}` : 'Preparação do Check-in');
  
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
  } = useGenericWizardDraft<WizardStep, LeaderPrepDraftData>({
    wizardType: 'leader-prep',
    teamId: teamIdParam,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'overview',
    defaultData: DEFAULT_DATA,
    enabled: !!teamIdParam && !!quarterlyCycle,
  });
  
  // Fetch team data
  const { data: metrics, isLoading: isLoadingMetrics } = useTeamOverviewMetrics(
    teamIdParam || '',
    quarterlyCycle?.id
  );
  const { data: pendingKrs, isLoading: isLoadingKrs } = useTeamPendingKrs(
    teamIdParam || '',
    quarterlyCycle?.id
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
      console.error('Failed to save draft:', error);
      toast.error('Erro ao salvar rascunho');
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
    await clearDraft();
    toast.success('Preparação concluída! Pronto para o check-in do time.');
    navigate(`/wizards?wizard=team-checkin`);
  }, [clearDraft, navigate]);
  
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
        description="Selecione um time para preparar o check-in"
        actionLabel="Voltar"
        onAction={() => navigate('/wizards')}
      />
    );
  }
  
  // Render step content
  const renderStepContent = () => {
    const krs = pendingKrs || [];
    
    switch (draft.currentStep) {
      case 'overview':
        return (
          <LeaderOverviewStep
            teamName={selectedTeam.name}
            cycleName={quarterlyCycle?.name || ''}
            metrics={metrics || null}
            isLoading={isLoadingMetrics}
            onContinue={goNext}
          />
        );
        
      case 'highlights':
        return (
          <LeaderHighlightsStep
            teamName={selectedTeam.name}
            krs={krs}
            dismissedInsights={new Set(draft.data.dismissedInsights)}
            onDismissInsight={(id) => {
              const updated = [...draft.data.dismissedInsights, id];
              updateDraft({ dismissedInsights: updated });
            }}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'prep':
        return (
          <LeaderPrepStep
            krs={krs}
            isLoading={isLoadingKrs}
            krActions={draft.data.krActions}
            onKrActionChange={(actions) => updateDraft({ krActions: actions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'alignment':
        return (
          <LeaderAlignmentStep
            teamName={selectedTeam.name}
            parentObjectives={[]} // TODO: fetch parent objectives
            meetingNotes={draft.data.meetingNotes}
            onNotesChange={(notes) => updateDraft({ meetingNotes: notes })}
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
      title="Preparação do Check-in"
      subtitle="Prepare-se para conduzir um bom check-in com seu time"
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
      contextLabel={selectedTeam.name}
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
