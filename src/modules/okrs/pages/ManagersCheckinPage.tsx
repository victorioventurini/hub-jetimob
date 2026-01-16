/**
 * ManagersCheckinPage - Full-page wizard para check-in de gestores
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { useGenericWizardDraft } from '@/modules/okrs/hooks/useGenericWizardDraft';
import { usePageTitle } from '@/hooks/usePageTitle';
import { handleError } from '@/lib/errorMessages';
import { useActiveCycles, useManagersPanorama, useCrossDependencies } from '@/modules/okrs/hooks';

// Step components
import { ManagersPanoramaStep } from '@/modules/okrs/components/wizards/managers-checkin/ManagersPanoramaStep';
import { ManagersCrossIssuesStep } from '@/modules/okrs/components/wizards/managers-checkin/ManagersCrossIssuesStep';
import { ManagersAdjustmentsStep } from '@/modules/okrs/components/wizards/managers-checkin/ManagersAdjustmentsStep';

// ============================================================
// TYPES
// ============================================================

type WizardStep = 'panorama' | 'cross-issues' | 'adjustments';

interface ManagersDraftData {
  adjustments: string[];
  resolvedDependencies: string[];
}

const WIZARD_STEPS = [
  { id: 'panorama' as const, label: 'Panorama', description: 'Visão geral das áreas' },
  { id: 'cross-issues' as const, label: 'Dependências', description: 'Bloqueios cross-team' },
  { id: 'adjustments' as const, label: 'Ajustes', description: 'Decisões de foco' },
];

const STEP_ORDER: WizardStep[] = ['panorama', 'cross-issues', 'adjustments'];

const DEFAULT_DATA: ManagersDraftData = {
  adjustments: [],
  resolvedDependencies: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function ManagersCheckinPage() {
  const navigate = useNavigate();
  
  usePageTitle('Check-in de Gestores');
  
  // Get active quarterly cycle
  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(() => 
    activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );
  
  // Fetch real data
  const { data: panoramaData, isLoading: isLoadingPanorama } = useManagersPanorama(quarterlyCycle?.id);
  const { data: dependencies, isLoading: isLoadingDeps } = useCrossDependencies(quarterlyCycle?.id);
  
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
  } = useGenericWizardDraft<WizardStep, ManagersDraftData>({
    wizardType: 'managers-checkin',
    defaultStep: 'panorama',
    defaultData: DEFAULT_DATA,
  });
  
  // Calculated values
  const companyProgress = panoramaData?.companyProgress ?? 0;
  const areas = panoramaData?.areas ?? [];
  const crossDependencies = dependencies ?? [];
  
  const isLoading = isLoadingCycles || isLoadingPanorama || isLoadingDeps;
  
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
    await clearDraft();
    toast.success('Check-in de gestores concluído!');
    navigate('/okrs');
  }, [clearDraft, navigate]);
  
  // Render step content
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'panorama':
        return (
          <ManagersPanoramaStep
            areas={areas}
            companyProgress={companyProgress}
            isLoading={isLoading}
            onContinue={goNext}
          />
        );
        
      case 'cross-issues':
        return (
          <ManagersCrossIssuesStep
            dependencies={crossDependencies}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'adjustments':
        return (
          <ManagersAdjustmentsStep
            adjustments={draft.data.adjustments}
            onAdjustmentsChange={(adjustments) => updateDraft({ adjustments })}
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
      title="Check-in de Gestores"
      subtitle="Alinhamento entre áreas e resolução de dependências"
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
