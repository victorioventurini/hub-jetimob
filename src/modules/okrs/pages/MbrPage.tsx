/**
 * MbrPage - Full-page wizard para Monthly Business Review
 * 
 * Rito decisório mensal — saúde estratégica do negócio.
 * Nível organizacional (sem seleção de time).
 */

import { useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import {
  useGenericWizardDraft,
  useActiveCycles,
  useLastCompletedSession,
} from '@/modules/okrs/hooks';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';

// Step components
import { MbrPanoramaStep } from '@/modules/okrs/components/wizards/mbr/MbrPanoramaStep';
import { MbrKpiGateStep } from '@/modules/okrs/components/wizards/mbr/MbrKpiGateStep';
import { MbrOrgOkrsStep } from '@/modules/okrs/components/wizards/mbr/MbrOrgOkrsStep';
import { MbrDecisionsStep } from '@/modules/okrs/components/wizards/mbr/MbrDecisionsStep';
import { MbrClosingStep } from '@/modules/okrs/components/wizards/mbr/MbrClosingStep';

import type {
  MbrStep,
  MbrDraftData,
  MbrGovernanceChecklist,
  TeamCheckinDecision,
  RitualImprovementFeedback,
  MbrKpiSnapshot,
  MbrOrgOkrSnapshot,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'panorama' as const, label: 'Panorama Executivo', description: 'Saúde do negócio' },
  { id: 'kpi-gate' as const, label: 'KPI Gate', description: 'KPIs críticos' },
  { id: 'org-okrs' as const, label: 'OKRs Org', description: 'Prioridades estratégicas' },
  { id: 'decisions' as const, label: 'Decisões', description: 'Consolidação' },
  { id: 'closing' as const, label: 'Encerramento', description: 'Governança' },
];

const STEP_ORDER: MbrStep[] = ['panorama', 'kpi-gate', 'org-okrs', 'decisions', 'closing'];

const DEFAULT_DATA: MbrDraftData = {
  referenceMonth: format(new Date(), 'yyyy-MM'),
  kpiSnapshots: [],
  orgOkrSnapshots: [],
  decisions: [],
  checklist: {
    strategicFocusClear: false,
    nextStepsHaveOwners: false,
    nonPrioritiesClear: false,
    communicateInAllHands: false,
  },
  ritualFeedback: [],
  previousMbrPendingItems: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function MbrPage() {
  const navigate = useNavigate();
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();

  usePageTitle('Monthly Business Review');

  // Cycle
  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(
    () => activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );

  // Last completed MBR (for pending items)
  const { lastCompletedAt } = useLastCompletedSession('mbr');

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
  } = useGenericWizardDraft<MbrStep, MbrDraftData>({
    wizardType: 'mbr',
    teamId: null,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'panorama',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle,
  });

  // Load previous MBR pending items on first load
  useEffect(() => {
    if (!currentBu?.id || draft.data.previousMbrPendingItems.length > 0) return;

    const loadPrevious = async () => {
      try {
        const { data } = await buSupabase
          .from('okr_wizard_sessions')
          .select('reflection_data')
          .eq('wizard_type', 'mbr')
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.reflection_data) {
          const prevData = (data.reflection_data as any)?.data as MbrDraftData | undefined;
          if (prevData?.decisions) {
            const pending = prevData.decisions.filter(
              d => d.category === 'next_step' || d.category === 'focus_adjustment'
            );
            if (pending.length > 0) {
              updateDraft({ previousMbrPendingItems: pending });
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load previous MBR items:', e);
      }
    };

    loadPrevious();
  }, [currentBu?.id]);

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
    setStep(stepId as MbrStep);
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
      handleError(error, { context: 'MBR Draft Save' });
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
    const completedSessionId = await clearDraft();
    toast.success('MBR concluído com sucesso!');
    navigate('/okrs/executive');

    // Trigger summary email (best-effort, non-blocking)
    if (completedSessionId && quarterlyCycle?.id && currentBu?.id) {
      try {
        await buSupabase.functions.invoke('mbr-summary', {
          body: {
            cycleId: quarterlyCycle.id,
            sessionId: completedSessionId,
            bu_id: currentBu.id,
          },
        });
      } catch (e) {
        console.warn('MBR summary email failed (non-blocking):', e);
      }
    }
  }, [clearDraft, navigate, buSupabase, quarterlyCycle, currentBu]);

  // Loading
  if (isLoadingCycles) {
    return <LoadingState text="Carregando..." fullPage />;
  }

  // Step render
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'panorama':
        return (
          <MbrPanoramaStep
            kpiSnapshots={draft.data.kpiSnapshots}
            onKpiSnapshotsChange={(kpiSnapshots: MbrKpiSnapshot[]) => updateDraft({ kpiSnapshots })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            lastCompletedAt={lastCompletedAt}
            onContinue={goNext}
          />
        );

      case 'kpi-gate':
        return (
          <MbrKpiGateStep
            kpiSnapshots={draft.data.kpiSnapshots}
            onKpiSnapshotsChange={(kpiSnapshots: MbrKpiSnapshot[]) => updateDraft({ kpiSnapshots })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'org-okrs':
        return (
          <MbrOrgOkrsStep
            orgOkrSnapshots={draft.data.orgOkrSnapshots}
            onOrgOkrSnapshotsChange={(orgOkrSnapshots: MbrOrgOkrSnapshot[]) => updateDraft({ orgOkrSnapshots })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'decisions':
        return (
          <MbrDecisionsStep
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            previousMbrPendingItems={draft.data.previousMbrPendingItems}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'closing':
        return (
          <MbrClosingStep
            decisions={draft.data.decisions}
            checklist={draft.data.checklist}
            onChecklistChange={(checklist: MbrGovernanceChecklist) => updateDraft({ checklist })}
            ritualFeedback={draft.data.ritualFeedback}
            onRitualFeedbackChange={(ritualFeedback: RitualImprovementFeedback[]) => updateDraft({ ritualFeedback })}
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
      title="Monthly Business Review"
      subtitle="Rito decisório mensal — saúde estratégica do negócio"
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
      backUrl="/okrs/executive"
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
