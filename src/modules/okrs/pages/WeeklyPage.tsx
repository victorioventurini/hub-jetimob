/**
 * WeeklyPage — Weekly v2 (Onda 4 · containers)
 *
 * Wizard executivo da BU. 4 steps canônicos (executive-opening, priorities,
 * people, closing). Persistência via `useGenericWizardDraft` em
 * `okr_wizard_sessions` (sem novas tabelas).
 *
 * Curadoria IA (`curador-orquestrador`): integração via edge function
 * `weekly-curate-opening` ficará disponível na próxima passada — o modo
 * manual cobre o fluxo end-to-end nesta entrega.
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { startOfWeek, format } from 'date-fns';

import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { RitualAttendance } from '@/modules/okrs/components/wizards/shared';
import {
  WeeklyExecutiveOpeningStep,
  WeeklyPrioritiesStep,
  WeeklyPeopleStep,
  WeeklyClosingStep,
} from '@/modules/okrs/components/wizards/weekly';
import { useGenericWizardDraft } from '@/modules/okrs/hooks';
import { useWeeklyPreWeeklyAggregation } from '@/modules/okrs/hooks';
import { useWeeklyOpeningCuration } from '@/modules/okrs/hooks';
import { useCarryOverDecisions } from '@/modules/okrs/hooks/useCarryOverDecisions';
import { useBu } from '@/contexts/BuContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { handleError } from '@/lib/errorMessages';

import type {
  WeeklyStep,
  WeeklyDraftData,
  WeeklyExecutiveOpening,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'executive-opening' as const, label: 'Abertura', description: 'Curadoria executiva' },
  { id: 'priorities' as const, label: 'Prioridades', description: 'Cross-times' },
  { id: 'people' as const, label: 'Pessoas', description: 'Sinais estruturais' },
  { id: 'closing' as const, label: 'Encerramento', description: 'Checklist + ata' },
];

const STEP_ORDER: WeeklyStep[] = [
  'executive-opening',
  'priorities',
  'people',
  'closing',
];

function currentReferenceWeek(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

const DEFAULT_OPENING: WeeklyExecutiveOpening = {
  state: 'draft',
  origin: 'manual',
  generatedAt: null,
  summary: '',
  themes: [],
  alertsByBlock: { performance: [], projetos: [], pessoas: [] },
  offAgenda: [],
  suggestedOrder: [],
  transitions: [],
};

const DEFAULT_DATA: WeeklyDraftData = {
  referenceWeek: currentReferenceWeek(),
  executiveOpening: DEFAULT_OPENING,
  prioritiesNotes: '',
  peopleNotes: '',
  closing: { checklist: {}, minutes: '' },
  decisions: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function WeeklyPage() {
  const navigate = useNavigate();
  usePageTitle('Weekly');
  const { currentBu } = useBu();

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
    sessionId,
  } = useGenericWizardDraft<WeeklyStep, WeeklyDraftData>({
    wizardType: 'weekly',
    teamId: null,
    cycleId: null,
    defaultStep: 'executive-opening',
    defaultData: DEFAULT_DATA,
  });

  // Carry-over: decisões pendentes da Weekly anterior (escopo BU, sem teamId)
  const { data: carryOverDecisions = [] } = useCarryOverDecisions({
    wizardType: 'weekly',
    teamId: null,
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
    (stepId: string) => setStep(stepId as WeeklyStep),
    [setStep],
  );

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      handleError(error, { context: 'Weekly Draft Save' });
    }
  }, [saveDraft]);

  const handleDiscardDraft = useCallback(async () => {
    try {
      await discardDraft();
      toast.success('Rascunho descartado.');
    } catch (error) {
      handleError(error, { context: 'Weekly Draft Discard' });
    }
  }, [discardDraft]);

  const handleComplete = useCallback(async () => {
    try {
      await clearDraft();
      toast.success('Weekly encerrada.');
      navigate('/rituals');
    } catch (error) {
      handleError(error, { context: 'Weekly Complete' });
    }
  }, [clearDraft, navigate]);

  const handleClose = useCallback(() => {}, []);

  // Agregação dos Pré-Weekly da semana → insumo para o curador IA
  const aggregation = useWeeklyPreWeeklyAggregation(draft.data.referenceWeek);

  // Memorizar coverage para evitar re-renders desnecessários do hook curador
  const coverage = useMemo(
    () => aggregation.coverage,
    [
      aggregation.coverage.totalLeaders,
      aggregation.coverage.submittedLeaders,
      aggregation.coverage.pendingLeaders,
    ],
  );

  const { isGenerating, generate } = useWeeklyOpeningCuration({
    referenceWeek: draft.data.referenceWeek,
    topics: aggregation.topics,
    peopleSignals: aggregation.peopleSignals,
    coverage,
  });

  const handleGenerateDraft = useCallback(async () => {
    // Guard: bloqueia invocação enquanto a agregação dos Pré-Weeklies ainda
    // não resolveu — evita enviar coverage {0,0,0} ao curador (LLM passaria
    // a relatar "0 líderes enviaram" mesmo havendo submissões).
    if (aggregation.isLoading) {
      toast.info('Aguarde — carregando Pré-Weeklies da semana…');
      return;
    }
    try {
      const result = await generate(draft.data.executiveOpening);
      if (!result) return;
      updateDraft({ executiveOpening: result.next });
      if (result.reason) {
        toast.info('Curador indisponível — abertura permanece em modo manual.');
      } else {
        toast.success('Rascunho da abertura gerado pelo curador.');
      }
    } catch (error) {
      handleError(error, { context: 'Weekly Curate Opening' });
    }
  }, [aggregation.isLoading, generate, draft.data.executiveOpening, updateDraft]);

  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'executive-opening':
        return (
          <WeeklyExecutiveOpeningStep
            opening={draft.data.executiveOpening}
            onOpeningChange={(executiveOpening) => updateDraft({ executiveOpening })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            onContinue={goNext}
            onGenerateDraft={handleGenerateDraft}
            isGenerating={isGenerating}
            disableGenerate={aggregation.isLoading}
            carryOverDecisions={carryOverDecisions}
            topSlot={
              <RitualAttendance
                persona="weekly"
                sessionId={sessionId}
                buId={currentBu?.id}
              />
            }
          />
        );
      case 'priorities':
        return (
          <WeeklyPrioritiesStep
            referenceWeek={draft.data.referenceWeek}
            notes={draft.data.prioritiesNotes}
            onNotesChange={(prioritiesNotes) => updateDraft({ prioritiesNotes })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            onContinue={goNext}
            onBack={goBack}
          />
        );
      case 'people':
        return (
          <WeeklyPeopleStep
            referenceWeek={draft.data.referenceWeek}
            notes={draft.data.peopleNotes}
            onNotesChange={(peopleNotes) => updateDraft({ peopleNotes })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            onContinue={goNext}
            onBack={goBack}
          />
        );
      case 'closing':
        return (
          <WeeklyClosingStep
            closing={draft.data.closing}
            onClosingChange={(closing) => updateDraft({ closing })}
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
      title="Weekly"
      subtitle="Rito executivo semanal da BU"
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
