/**
 * ManagersCheckinPage - Full-page wizard para check-in de gestores
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { useGenericWizardDraft } from '@/modules/okrs/hooks/useGenericWizardDraft';
import { usePageTitle } from '@/hooks/usePageTitle';

// Step components
import { ManagersPanoramaStep } from '@/modules/okrs/components/wizards/managers-checkin/ManagersPanoramaStep';
import { ManagersCrossIssuesStep } from '@/modules/okrs/components/wizards/managers-checkin/ManagersCrossIssuesStep';
import { ManagersAdjustmentsStep } from '@/modules/okrs/components/wizards/managers-checkin/ManagersAdjustmentsStep';

import type { AreaOkrSummary, CrossDependency } from '@/modules/okrs/types/wizard';

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

// Mock data (in real implementation, fetch from API)
const MOCK_AREAS: AreaOkrSummary[] = [
  { areaName: 'Produto', teamId: 'team-1', okrCount: 5, avgProgress: 72, trend: 'improving', atRiskCount: 1 },
  { areaName: 'Engenharia', teamId: 'team-2', okrCount: 8, avgProgress: 58, trend: 'stable', atRiskCount: 2 },
  { areaName: 'Comercial', teamId: 'team-3', okrCount: 4, avgProgress: 85, trend: 'improving', atRiskCount: 0 },
  { areaName: 'Marketing', teamId: 'team-4', okrCount: 3, avgProgress: 45, trend: 'declining', atRiskCount: 1 },
];

const MOCK_DEPENDENCIES: CrossDependency[] = [
  {
    id: 'dep-1',
    description: 'API de integração para campanha de marketing',
    fromTeam: { id: 'team-2', name: 'Engenharia' },
    toTeam: { id: 'team-4', name: 'Marketing' },
    status: 'at_risk',
  },
  {
    id: 'dep-2',
    description: 'Feature de checkout para meta comercial',
    fromTeam: { id: 'team-1', name: 'Produto' },
    toTeam: { id: 'team-3', name: 'Comercial' },
    status: 'healthy',
  },
];

// ============================================================
// COMPONENT
// ============================================================

export default function ManagersCheckinPage() {
  const navigate = useNavigate();
  
  usePageTitle('Check-in de Gestores');
  
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
  const companyProgress = useMemo(() => {
    return Math.round(MOCK_AREAS.reduce((sum, a) => sum + a.avgProgress, 0) / MOCK_AREAS.length);
  }, []);
  
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
    toast.success('Check-in de gestores concluído!');
    navigate('/okrs');
  }, [clearDraft, navigate]);
  
  // Render step content
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'panorama':
        return (
          <ManagersPanoramaStep
            areas={MOCK_AREAS}
            companyProgress={companyProgress}
            onContinue={goNext}
          />
        );
        
      case 'cross-issues':
        return (
          <ManagersCrossIssuesStep
            dependencies={MOCK_DEPENDENCIES}
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
