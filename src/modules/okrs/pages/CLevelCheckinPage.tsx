/**
 * CLevelCheckinPage - Full-page wizard para check-in estratégico C-Level
 * v2.83.0: Integração com KPIs estratégicos via useKpisForWizardV2
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { useGenericWizardDraft, useLastCompletedSession } from '@/modules/okrs/hooks';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCompanyOkrs } from '@/modules/okrs/hooks/useCompanyOkrs';
import { useKpisForWizardV2 } from '@/modules/kpis/hooks/useKpisForWizardV2';
import { useAuth } from '@/hooks/useAuth';

// Step components
import {
  CLevelCompanyOkrsStep,
  CLevelInsightsStep,
  CLevelDecisionsStep,
  CLevelDirectivesStep,
} from '@/modules/okrs/components/wizards/clevel-checkin';

// ============================================================
// TYPES
// ============================================================

type WizardStep = 'company-okrs' | 'insights' | 'decisions' | 'directives';

interface CLevelDraftData {
  strategicDecisions: string;
  directives: string;
  reviewedOkrs: string[];
}

const WIZARD_STEPS = [
  { id: 'company-okrs' as const, label: 'OKRs', description: 'Visão da empresa' },
  { id: 'insights' as const, label: 'Insights', description: 'Análise estratégica' },
  { id: 'decisions' as const, label: 'Decisões', description: 'Direcionamentos' },
  { id: 'directives' as const, label: 'Diretrizes', description: 'Comunicação' },
];

const STEP_ORDER: WizardStep[] = ['company-okrs', 'insights', 'decisions', 'directives'];

const DEFAULT_DATA: CLevelDraftData = {
  strategicDecisions: '',
  directives: '',
  reviewedOkrs: [],
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function CLevelCheckinPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const lastCheckin = useLastCompletedSession('clevel-checkin');
  
  usePageTitle('Check-in Estratégico');
  
  // Fetch real company OKRs data
  const { data: companyData, isLoading: isLoadingOkrs } = useCompanyOkrs();
  const okrs = companyData?.okrs ?? [];
  
  // v2.83.0: Fetch strategic KPIs for C-Level view
  const {
    kpisStrategic,
    isLoading: isLoadingKpis,
  } = useKpisForWizardV2({
    userId: profile?.id ?? '',
    scope: 'clevel',
  });
  
  // Calculate OKRs summary for insights step
  const okrsSummary = useMemo(() => {
    if (!okrs.length) return undefined;
    return {
      total: okrs.length,
      onTrack: okrs.filter(o => o.trend === 'improving').length,
      atRisk: okrs.filter(o => o.trend === 'stable').length,
      offTrack: okrs.filter(o => o.trend === 'declining').length,
    };
  }, [okrs]);
  
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
  } = useGenericWizardDraft<WizardStep, CLevelDraftData>({
    wizardType: 'clevel-checkin',
    defaultStep: 'company-okrs',
    defaultData: DEFAULT_DATA,
  });
  
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
    toast.success('Check-in estratégico concluído!');
    navigate('/okrs');
  }, [clearDraft, navigate]);
  
  // Render step content
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'company-okrs':
        return (
          <CLevelCompanyOkrsStep 
            okrs={okrs} 
            isLoading={isLoadingOkrs} 
            lastCompletedAt={lastCheckin.lastCompletedAt}
            onContinue={goNext} 
          />
        );
        
      case 'insights':
        return (
          <CLevelInsightsStep 
            kpisStrategic={kpisStrategic}
            okrsSummary={okrsSummary}
            isLoading={isLoadingKpis}
            onContinue={goNext} 
            onBack={goBack} 
          />
        );
        
      case 'decisions':
        return (
          <CLevelDecisionsStep
            value={draft.data.strategicDecisions}
            onChange={(v) => updateDraft({ strategicDecisions: v })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'directives':
        return (
          <CLevelDirectivesStep
            value={draft.data.directives}
            onChange={(v) => updateDraft({ directives: v })}
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
      title="Check-in Estratégico"
      subtitle="Visão estratégica e direcionamentos para a empresa"
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
