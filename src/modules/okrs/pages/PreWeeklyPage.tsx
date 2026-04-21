/**
 * PreWeeklyPage — Pré-Weekly v2 (scaffolding)
 *
 * Wizard individual de destilação semanal. Sem novas tabelas e sem agente
 * curador (ambos virão na evolução de backend). Persistência via
 * `useGenericWizardDraft` na tabela existente `okr_wizard_sessions`.
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { startOfWeek, format } from 'date-fns';

import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import {
  PreWeeklySourcesStep,
  PreWeeklyPautaStep,
  PreWeeklyPessoasStep,
  PreWeeklySummary,
} from '@/modules/okrs/components/wizards/pre-weekly';
import { useGenericWizardDraft } from '@/modules/okrs/hooks';
import { usePageTitle } from '@/hooks/usePageTitle';
import { handleError } from '@/lib/errorMessages';

import type {
  PreWeeklyStep,
  PreWeeklyDraftData,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'sources' as const, label: 'Fontes', description: 'O que você registrou' },
  { id: 'pauta' as const, label: 'Pauta', description: 'Até 3 temas' },
  { id: 'pessoas' as const, label: 'Pessoas', description: 'Sinais estruturais' },
  { id: 'summary' as const, label: 'Resumo', description: 'Revisar e enviar' },
];

const STEP_ORDER: PreWeeklyStep[] = ['sources', 'pauta', 'pessoas', 'summary'];

function currentReferenceWeek(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

const DEFAULT_DATA: PreWeeklyDraftData = {
  referenceWeek: currentReferenceWeek(),
  sourcesReflection: '',
  topics: [],
  peopleSignals: [],
  decisions: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function PreWeeklyPage() {
  const navigate = useNavigate();
  usePageTitle('Pré-Weekly');

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
  } = useGenericWizardDraft<PreWeeklyStep, PreWeeklyDraftData>({
    wizardType: 'pre-weekly',
    teamId: null,
    cycleId: null,
    defaultStep: 'sources',
    defaultData: DEFAULT_DATA,
  });

  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    for (let i = 0; i < currentIdx; i++) completed.push(STEP_ORDER[i]);
    return completed;
  }, [draft.currentStep]);

  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(draft.currentStep);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }, [draft.currentStep, setStep]);

  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(draft.currentStep);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }, [draft.currentStep, setStep]);

  const goToStep = useCallback(
    (stepId: string) => setStep(stepId as PreWeeklyStep),
    [setStep],
  );

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      handleError(error, { context: 'Pre-Weekly Draft Save' });
    }
  }, [saveDraft]);

  const handleDiscardDraft = useCallback(async () => {
    try {
      await discardDraft();
      toast.success('Rascunho descartado.');
    } catch (error) {
      handleError(error, { context: 'Pre-Weekly Draft Discard' });
    }
  }, [discardDraft]);

  const handleComplete = useCallback(async () => {
    try {
      await clearDraft();
      toast.success('Pré-Weekly enviado! Sua destilação alimentará a Weekly.');
      navigate('/rituals');
    } catch (error) {
      handleError(error, { context: 'Pre-Weekly Complete' });
    }
  }, [clearDraft, navigate]);

  const handleClose = useCallback(() => {}, []);

  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'sources':
        return (
          <PreWeeklySourcesStep
            sourcesReflection={draft.data.sourcesReflection}
            onSourcesReflectionChange={(sourcesReflection) =>
              updateDraft({ sourcesReflection })
            }
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            referenceWeek={draft.data.referenceWeek}
            onContinue={goNext}
          />
        );
      case 'pauta':
        return (
          <PreWeeklyPautaStep
            topics={draft.data.topics}
            onTopicsChange={(topics) => updateDraft({ topics })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            onContinue={goNext}
            onBack={goBack}
          />
        );
      case 'pessoas':
        return (
          <PreWeeklyPessoasStep
            peopleSignals={draft.data.peopleSignals}
            onPeopleSignalsChange={(peopleSignals) =>
              updateDraft({ peopleSignals })
            }
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            onContinue={goNext}
            onBack={goBack}
          />
        );
      case 'summary':
        return (
          <PreWeeklySummary
            draftData={draft.data}
            decisions={draft.data.decisions}
            isCompleting={false}
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
      title="Pré-Weekly"
      subtitle="Destilação individual da semana"
      steps={WIZARD_STEPS}
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
      backUrl="/rituals"
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
