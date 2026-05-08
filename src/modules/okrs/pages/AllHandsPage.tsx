/**
 * AllHandsPage — Rito mensal de comunicação da BU.
 *
 * Reaproveita steps do MBR em modo READ-ONLY:
 *  - Step 1 (Sumário): novo, condensado.
 *  - Step 2 (KPI Gate): MbrKpiGateStep com handlers no-op.
 *  - Step 3 (OKRs Org): MbrOrgOkrsStep com handlers no-op.
 *  - Step 4 (Avaliação): EvaluationCollectionStep canônico (anônimo).
 *
 * Conteúdo dos steps 2 e 3 é hidratado a partir do último MBR
 * concluído (`status='completed'`) com mesmo `referenceMonth`.
 */

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import {
  RitualPreparationStatus,
  RitualAttendance,
  WizardStepFooter,
} from '@/modules/okrs/components/wizards/shared';
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';
import { EvaluationCollectionStep } from '@/modules/okrs/components/wizards/shared/framework/components/evaluation';

import { useGenericWizardDraft, useActiveCycle, useRitualAvailability } from '@/modules/okrs/hooks';
import { useBu } from '@/contexts/BuContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';

import { MbrKpiGateStep } from '@/modules/okrs/components/wizards/mbr/MbrKpiGateStep';
import { MbrOrgOkrsStep } from '@/modules/okrs/components/wizards/mbr/MbrOrgOkrsStep';
import { AllHandsSummaryStep } from '@/modules/okrs/components/wizards/all-hands/AllHandsSummaryStep';

import type { AllHandsStep, AllHandsDraftData } from '@/modules/okrs/types/wizard';
import { WIZARD_STEPS, STEP_ORDER, DEFAULT_DATA } from './all-hands/constants';
import { useLatestMbrForMonth } from './all-hands/useLatestMbrForMonth';

const noop = () => {};

export default function AllHandsPage() {
  const navigate = useNavigate();
  const { currentBu } = useBu();

  usePageTitle('All Hands');

  const { activeQuarterlyCycle: quarterlyCycle, isLoading: isLoadingCycles } = useActiveCycle();
  const availability = useRitualAvailability('all-hands', quarterlyCycle);

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
  } = useGenericWizardDraft<AllHandsStep, AllHandsDraftData>({
    wizardType: 'all-hands',
    teamId: null,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'summary',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle,
  });

  const { data: mbrSource, isLoading: isLoadingMbr } = useLatestMbrForMonth(draft.data.referenceMonth);

  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    for (let i = 0; i < currentIdx; i++) completed.push(STEP_ORDER[i]);
    return completed;
  }, [draft.currentStep]);

  const goToStep = useCallback((stepId: string) => setStep(stepId as AllHandsStep), [setStep]);
  const goNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(draft.currentStep);
    if (idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  }, [draft.currentStep, setStep]);
  const goBack = useCallback(() => {
    const idx = STEP_ORDER.indexOf(draft.currentStep);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  }, [draft.currentStep, setStep]);

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      handleError(error, { context: 'AllHands Draft Save' });
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
    try {
      await clearDraft();
      toast.success('All Hands concluído!');
      navigate('/rituals');
    } catch (error) {
      handleError(error, { context: 'AllHands Complete' });
    }
  }, [clearDraft, navigate]);

  if (isLoadingCycles) {
    return <LoadingState text="Carregando ciclo..." fullPage />;
  }

  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="all-hands" availability={availability} />;
  }

  const mbrPayload = mbrSource?.payload ?? null;

  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'summary':
        return (
          <AllHandsSummaryStep
            referenceMonth={draft.data.referenceMonth}
            onReferenceMonthChange={(referenceMonth) =>
              updateDraft({ referenceMonth, sourceMbrSessionId: null })
            }
            mbrPayload={mbrPayload}
            mbrCompletedAt={mbrSource?.completedAt ?? null}
            onContinue={goNext}
          />
        );

      case 'kpi-gate':
        if (isLoadingMbr || !mbrPayload) return <LoadingState text="Carregando MBR de referência..." />;
        return (
          <MbrKpiGateStep
            kpiSnapshots={mbrPayload.kpiSnapshots}
            onKpiSnapshotsChange={noop}
            decisions={mbrPayload.decisions ?? []}
            onDecisionsChange={noop}
            referenceMonth={mbrPayload.referenceMonth}
            showMonthlyOverview
            showInlineDecisionInput={false}
            showStrategicDecisionToggle={false}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'org-okrs':
        if (isLoadingMbr || !mbrPayload) return <LoadingState text="Carregando MBR de referência..." />;
        return (
          <MbrOrgOkrsStep
            orgOkrSnapshots={mbrPayload.orgOkrSnapshots ?? []}
            onOrgOkrSnapshotsChange={noop}
            decisions={mbrPayload.decisions ?? []}
            onDecisionsChange={noop}
            orgObjectives={[]}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'evaluation':
        return (
          <EvaluationCollectionStep
            sessionId={sessionId ?? null}
            persona="all-hands"
            ensureSession={saveDraft}
            footer={
              <WizardStepFooter
                onPrimary={handleComplete}
                onBack={goBack}
                primaryLabel="Encerrar All Hands"
                primaryVariant="success"
                primaryLoading={isSaving}
              />
            }
          />
        );

      default:
        return null;
    }
  };

  return (
    <FullPageWizardShell
      title="All Hands"
      subtitle="Comunicação mensal da BU — derivada do MBR fechado"
      steps={WIZARD_STEPS.map((s) => ({ id: s.id, label: s.label, description: s.description }))}
      currentStepId={draft.currentStep}
      completedSteps={completedSteps}
      onStepChange={goToStep}
      isDirty={isDirty}
      isSavingDraft={isSaving}
      onSaveDraft={handleSaveDraft}
      lastSavedAt={lastSavedAt}
      isResumingDraft={isResumingDraft}
      onDiscardDraft={handleDiscardDraft}
      onClose={() => {}}
      backUrl="/rituals"
      topSlot={
        <>
          <RitualPreparationStatus ritualType="all-hands" cycleId={quarterlyCycle?.id ?? null} />
          <RitualAttendance
            persona="all-hands"
            sessionId={sessionId}
            buId={currentBu?.id}
            cycleId={quarterlyCycle?.id ?? null}
          />
        </>
      }
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
