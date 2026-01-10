/**
 * CollaboratorCheckinPage - Full-page wizard para check-in do colaborador
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { useGenericWizardDraft } from '@/modules/okrs/hooks/useGenericWizardDraft';
import { useAuth } from '@/hooks/useAuth';
import { useActiveCycles } from '@/modules/okrs/hooks/useCycleData';
import { useUserKrsForWizard } from '@/modules/okrs/hooks/useUserKrsForWizard';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';

// Step components
import { CollaboratorContextStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorContextStep';
import { CollaboratorCheckinStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorCheckinStep';
import { CollaboratorInitiativesStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep';
import { CollaboratorReflectionStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorReflectionStep';
import { CollaboratorSummary } from '@/modules/okrs/components/wizards/collaborator/CollaboratorSummary';

import type { CollaboratorCheckinResult, CollaboratorReflection } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type WizardStep = 'context' | 'checkin' | 'initiatives' | 'reflection' | 'summary';

interface CollaboratorDraftData {
  currentKrIndex: number;
  results: CollaboratorCheckinResult[];
  reflection: CollaboratorReflection;
  initiativesMarkedAtRisk: string[];
}

const WIZARD_STEPS = [
  { id: 'context' as const, label: 'Contexto', description: 'Visão geral dos KRs' },
  { id: 'checkin' as const, label: 'Check-in', description: 'Atualização dos KRs' },
  { id: 'initiatives' as const, label: 'Iniciativas', description: 'Revisão de atividades' },
  { id: 'reflection' as const, label: 'Reflexão', description: 'Aprendizados' },
  { id: 'summary' as const, label: 'Resumo', description: 'Visão consolidada' },
];

const STEP_ORDER: WizardStep[] = ['context', 'checkin', 'initiatives', 'reflection', 'summary'];

const DEFAULT_DATA: CollaboratorDraftData = {
  currentKrIndex: 0,
  results: [],
  reflection: {},
  initiativesMarkedAtRisk: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function CollaboratorCheckinPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  usePageTitle('Check-in Semanal');
  
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
  } = useGenericWizardDraft<WizardStep, CollaboratorDraftData>({
    wizardType: 'collaborator',
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'context',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle,
  });
  
  // Fetch user KRs
  const { data: userKrs, isLoading: isLoadingKrs } = useUserKrsForWizard(
    quarterlyCycle?.id || null,
    profile?.id || null,
    'all'
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
      toast.success('Rascunho salvo! Você pode continuar depois.');
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
    toast.success('Check-in concluído!');
    navigate('/wizards');
  }, [clearDraft, navigate]);
  
  // Loading
  if (isLoadingCycles || isLoadingKrs) {
    return <LoadingState text="Carregando..." fullPage />;
  }
  
  // Render step content
  const renderStepContent = () => {
    const krs = userKrs || [];
    
    switch (draft.currentStep) {
      case 'context':
        return (
          <CollaboratorContextStep
            krs={krs}
            cycleName={quarterlyCycle?.name || 'Ciclo atual'}
            onContinue={goNext}
          />
        );
        
      case 'checkin':
        return (
          <CollaboratorCheckinStep
            krs={krs}
            currentKrIndex={draft.data.currentKrIndex}
            results={draft.data.results}
            onKrComplete={(result) => {
              const newResults = [...draft.data.results];
              newResults[draft.data.currentKrIndex] = result;
              updateDraft({ 
                results: newResults,
                currentKrIndex: draft.data.currentKrIndex + 1 
              });
            }}
            onBack={goBack}
            onComplete={goNext}
          />
        );
        
      case 'initiatives':
        return (
          <CollaboratorInitiativesStep
            krs={krs}
            markedAtRisk={draft.data.initiativesMarkedAtRisk}
            onMarkAtRisk={(ids) => updateDraft({ initiativesMarkedAtRisk: ids })}
            onContinue={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        );
        
      case 'reflection':
        return (
          <CollaboratorReflectionStep
            reflection={draft.data.reflection}
            onReflectionChange={(reflection) => updateDraft({ reflection })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'summary':
        return (
          <CollaboratorSummary
            krs={krs}
            results={draft.data.results}
            reflection={draft.data.reflection}
            initiativesAtRisk={draft.data.initiativesMarkedAtRisk}
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
      title="Check-in Semanal"
      subtitle="Atualize seus KRs e reflita sobre o progresso"
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
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
