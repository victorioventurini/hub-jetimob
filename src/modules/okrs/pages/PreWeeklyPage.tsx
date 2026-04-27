/**
 * PreWeeklyPage — Pré-Weekly v2.1
 *
 * Wizard individual de destilação semanal com seleção de time no header
 * (HierarchyContextSwitcher canônico). O draft é segregado por time via
 * `useGenericWizardDraft({ teamId })` para que admins/líderes possam
 * trocar de contexto sem misturar conteúdos.
 *
 * Regras de visibilidade (delegadas ao componente):
 * - Admin: switcher sempre visível, precisa selecionar time.
 * - Líder de 2+ times: switcher visível, restrito à hierarquia.
 * - Líder de 1 time: auto-seleção via URL, switcher oculto.
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { startOfWeek, format } from 'date-fns';
import { AlertCircle } from 'lucide-react';

import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { HierarchyContextSwitcher } from '@/modules/okrs/components/wizards/shared/HierarchyContextSwitcher';
import {
  PreWeeklySourcesStep,
  PreWeeklyPautaStep,
  PreWeeklyPessoasStep,
  PreWeeklySummary,
} from '@/modules/okrs/components/wizards/pre-weekly';
import {
  useGenericWizardDraft,
  useManageableTeamsFlat,
} from '@/modules/okrs/hooks';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { usePermissions } from '@/hooks/usePermissions';
import { usePageTitle } from '@/hooks/usePageTitle';
import { handleError } from '@/lib/errorMessages';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const teamIdParam = searchParams.get('team');

  const { isWildcard } = usePermissions();
  const isAdminLevel = isWildcard;

  // Times (admin: todos; líder: gerenciáveis)
  const { teams: allTeams, isLoading: isLoadingAllTeams } = useHierarchicalTeamList();
  const { teams: manageableTeams, isLoading: isLoadingManageable } =
    useManageableTeamsFlat();

  const isLoadingTeams = isAdminLevel ? isLoadingAllTeams : isLoadingManageable;

  const selectedTeam = useMemo(() => {
    if (!teamIdParam) return null;
    return allTeams?.find((t) => t.id === teamIdParam) ?? null;
  }, [teamIdParam, allTeams]);

  // Auto-seleção: líder com exatamente 1 time → popula URL
  useEffect(() => {
    if (teamIdParam) return;
    if (isAdminLevel) return;
    if (isLoadingManageable) return;
    if (manageableTeams.length === 1) {
      setSearchParams({ team: manageableTeams[0].id }, { replace: true });
    }
  }, [
    teamIdParam,
    isAdminLevel,
    isLoadingManageable,
    manageableTeams,
    setSearchParams,
  ]);

  usePageTitle(
    selectedTeam ? `Pré-Weekly — ${selectedTeam.name}` : 'Pré-Weekly',
  );

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
    teamId: teamIdParam,
    cycleId: null,
    defaultStep: 'sources',
    defaultData: DEFAULT_DATA,
    enabled: !!teamIdParam,
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

  // Troca de time (descarta draft do time anterior)
  const handleTeamChange = useCallback(
    (newTeamId: string) => {
      if (newTeamId === teamIdParam) return;
      // Limpar rascunho do contexto atual antes de trocar
      if (teamIdParam) {
        void discardDraft();
      }
      setSearchParams({ team: newTeamId });
    },
    [teamIdParam, discardDraft, setSearchParams],
  );

  // Switcher reutilizável (sempre passado ao shell)
  const contextSwitcher = (
    <HierarchyContextSwitcher
      type="team"
      currentLabel={selectedTeam?.name || 'Selecionar time'}
      selectedId={teamIdParam}
      onSelect={handleTeamChange}
      isLoading={isLoadingTeams}
    />
  );

  // Loading enquanto resolve times
  if (isLoadingTeams && !teamIdParam) {
    return <LoadingState text="Carregando times..." fullPage />;
  }

  // Sem time selecionado → empty state com switcher no header
  if (!teamIdParam) {
    const isLeaderWithoutTeams =
      !isAdminLevel && !isLoadingManageable && manageableTeams.length === 0;

    return (
      <FullPageWizardShell
        title="Pré-Weekly"
        subtitle="Destilação individual da semana"
        steps={WIZARD_STEPS}
        currentStepId="sources"
        completedSteps={[]}
        onStepChange={() => {}}
        isDirty={false}
        isSavingDraft={false}
        onSaveDraft={async () => {}}
        lastSavedAt={null}
        isResumingDraft={false}
        onDiscardDraft={async () => {}}
        onClose={handleClose}
        backUrl="/rituals"
        adminContextSwitcher={contextSwitcher}
      >
        <EmptyState
          icon={AlertCircle}
          title={
            isLeaderWithoutTeams
              ? 'Você não lidera nenhum time'
              : 'Selecione um time para começar'
          }
          description={
            isLeaderWithoutTeams
              ? 'O Pré-Weekly é uma destilação semanal vinculada a um time. Fale com um administrador para ajustar sua hierarquia.'
              : 'Use o seletor de time no canto superior do wizard para escolher o contexto do Pré-Weekly.'
          }
        />
      </FullPageWizardShell>
    );
  }

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
            teamId={teamIdParam}
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
      subtitle={
        selectedTeam
          ? `Destilação individual da semana — ${selectedTeam.name}`
          : 'Destilação individual da semana'
      }
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
      adminContextSwitcher={contextSwitcher}
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
