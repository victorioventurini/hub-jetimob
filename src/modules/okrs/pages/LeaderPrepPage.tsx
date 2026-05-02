/**
 * LeaderPrepPage - Full-page wizard para preparação do líder
 *
 * v2.83.0: Added KPI alerts step for indicator attention section
 * v2.88.0: Always accessible — no cycle guard
 * v3.0.0: Migração full para framework genérico v2 — substitui
 *         LeaderHighlightsStep → LeaderInsightsStep (insights read-only +
 *         IA + descarte) e LeaderPrepStep → KrsStep mode='leader-actions'
 *         (botões discuss_group/followup_1on1 + notas pré-reunião).
 *         Steps específicos (overview, kpi-alerts, projects, alignment)
 *         permanecem como add-ons documentados — fora do escopo do framework
 *         por dependerem de hooks/UI próprios (HierarchyContextSwitcher,
 *         LeaderAlignmentStep com OKRs do nível superior, etc.).
 */

import { useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { HierarchyContextSwitcher } from '@/modules/okrs/components/wizards/shared/HierarchyContextSwitcher';
import { WizardStepFooter } from '@/modules/okrs/components/wizards/shared/WizardStepFooter';
import {
  useGenericWizardDraft,
  useActiveCycle,
  useTeamOverviewMetrics,
  useTeamPendingKrs,
  useLastCompletedSession,
  useTeamCollaboratorAgendaSuggestions,
} from '@/modules/okrs/hooks';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { useKpisForWizardV2 } from '@/modules/kpis/hooks/useKpisForWizardV2';
import { useAuth } from '@/hooks/useAuth';

import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCircle } from 'lucide-react';

// Step components — específicos do leader-prep (add-ons fora do framework)
import { LeaderOverviewStep } from '@/modules/okrs/components/wizards/leader-prep/LeaderOverviewStep';
import { LeaderKpiAlertStep } from '@/modules/okrs/components/wizards/leader-prep/LeaderKpiAlertStep';
import { LeaderProjectsStep } from '@/modules/okrs/components/wizards/leader-prep/LeaderProjectsStep';
import {
  LeaderAlignmentStep,
} from '@/modules/okrs/components/wizards/leader-prep/LeaderAlignmentStep';

// Framework genérico v2
import {
  LeaderInsightsStep,
  KrsStep,
  type LeaderInsightItem,
  type LeaderInsightsData,
  type KrsItem,
} from '@/modules/okrs/components/wizards/shared/framework';

import type { KrAction, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { WizardKr } from '@/modules/okrs/hooks';

// ============================================================
// TYPES
// ============================================================

type WizardStep = 'overview' | 'kpi-alerts' | 'leader-insights' | 'projects' | 'prep' | 'alignment';

interface LeaderPrepDraftData {
  krActions: KrAction[];
  meetingNotes: string;
  dismissedInsights: string[];
  kpisForDiscussion: string[];
  kpisForFollowup: string[];
  /** Decisões inline registradas durante o rito */
  decisions: TeamCheckinDecision[];
  /**
   * IDs das sugestões de pauta (vindas dos check-ins individuais do time)
   * que o líder selecionou para levar ao Check-in do Time.
   */
  selectedTeamCheckinAgendaSuggestionIds: string[];
}

const WIZARD_STEPS = [
  { id: 'overview' as const, label: 'Panorama', description: 'Visão geral do time' },
  { id: 'kpi-alerts' as const, label: 'Indicadores', description: 'KPIs em atenção' },
  { id: 'leader-insights' as const, label: 'Insights', description: 'Sistema e IA' },
  { id: 'projects' as const, label: 'Projetos', description: 'Marcos e entregas do time' },
  { id: 'prep' as const, label: 'Preparação', description: 'Marcar para discussão' },
  { id: 'alignment' as const, label: 'Alinhamento', description: 'OKRs do nível superior' },
];

const STEP_ORDER: WizardStep[] = [
  'overview',
  'kpi-alerts',
  'leader-insights',
  'projects',
  'prep',
  'alignment',
];

const DEFAULT_DATA: LeaderPrepDraftData = {
  krActions: [],
  meetingNotes: '',
  dismissedInsights: [],
  kpisForDiscussion: [],
  kpisForFollowup: [],
  decisions: [],
  selectedTeamCheckinAgendaSuggestionIds: [],
};

// ============================================================
// ADAPTERS
// ============================================================

/**
 * Mapeia o status do `WizardKr` (vindo do hook de pendentes) para o
 * status canônico do `KrsItem` consumido pelo framework.
 */
function mapWizardKrStatus(status: WizardKr['status']): KrsItem['status'] {
  switch (status) {
    case 'red':
    case 'yellow':
      return 'at-risk';
    case 'green':
      return 'on-track';
    case 'not_started':
    default:
      return 'unknown';
  }
}

/**
 * Adapta `WizardKr[]` + `KrAction[]` para o formato `KrsItem[]` esperado
 * pelo `KrsStep` em mode='leader-actions'. Preserva ordenação por
 * prioridade (em risco/pendentes primeiro) — feita pelo próprio componente.
 */
function buildKrsItems(krs: WizardKr[], krActions: KrAction[]): KrsItem[] {
  const actionByKrId = new Map<string, KrAction['actionType']>();
  for (const a of krActions) {
    if (a.actionType === 'discuss_group' || a.actionType === 'followup_1on1') {
      actionByKrId.set(a.krId, a.actionType);
    }
  }
  return krs.map((kr) => {
    const action = actionByKrId.get(kr.id);
    return {
      id: kr.id,
      title: kr.title,
      objectiveTitle: kr.objective_title,
      status: mapWizardKrStatus(kr.status),
      progress: kr.progress,
      ownerName: kr.owner_name,
      isAtRisk: kr.is_at_risk,
      isPending: kr.is_pending,
      daysSinceCheckin: kr.days_since_checkin,
      leaderAction:
        action === 'discuss_group' || action === 'followup_1on1' ? action : null,
    };
  });
}

/**
 * Reconstrói a lista canônica de `KrAction[]` a partir do estado `KrsItem[]`
 * vindo do componente. Mantém apenas ações conhecidas pelo leader-prep
 * (discuss_group / followup_1on1).
 */
function extractKrActions(items: KrsItem[]): KrAction[] {
  return items
    .filter((i) => i.leaderAction === 'discuss_group' || i.leaderAction === 'followup_1on1')
    .map((i) => ({
      krId: i.id,
      actionType: i.leaderAction as 'discuss_group' | 'followup_1on1',
    }));
}

/**
 * Constrói o conjunto de insights do sistema a partir dos KRs pendentes
 * do time (regras: estagnado se 14d+ sem check-in; bloqueado se em risco).
 */
function buildSystemInsights(krs: WizardKr[]): LeaderInsightItem[] {
  return krs
    .filter((kr) => kr.days_since_checkin >= 14 || kr.is_at_risk)
    .map<LeaderInsightItem>((kr) => ({
      id: kr.id,
      type: kr.days_since_checkin >= 14 ? 'stagnant' : 'blocked',
      title: kr.title,
      description:
        kr.days_since_checkin >= 14
          ? `Sem atualização há ${kr.days_since_checkin} dias`
          : `Em risco — ${Math.round(kr.progress)}% de progresso`,
      priority: 'high',
      source: 'system',
      relatedKrId: kr.id,
    }));
}

// ============================================================
// COMPONENT
// ============================================================

export default function LeaderPrepPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamIdParam = searchParams.get('team');

  // Get teams
  const { teams, isLoading: isLoadingTeams } = useHierarchicalTeamList();
  const selectedTeam = useMemo(() => {
    if (!teamIdParam || !teams) return null;
    return teams.find((t) => t.id === teamIdParam) || null;
  }, [teamIdParam, teams]);
  const lastCheckin = useLastCompletedSession('leader-prep', teamIdParam);

  usePageTitle(
    selectedTeam ? `Preparação - ${selectedTeam.name}` : 'Preparação do Check-in',
  );

  // Get cycle (status-based) — optional
  const { activeQuarterlyCycle: quarterlyCycle, isLoading: isLoadingCycles } = useActiveCycle();

  // Draft persistence — always enabled
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
    cycleId: quarterlyCycle?.id || 'no-cycle',
    defaultStep: 'overview',
    defaultData: DEFAULT_DATA,
    enabled: !!teamIdParam,
  });

  // Fetch team data
  const { data: metrics, isLoading: isLoadingMetrics } = useTeamOverviewMetrics(
    quarterlyCycle?.id,
    teamIdParam || '',
  );
  const { data: pendingKrs, isLoading: isLoadingKrs } = useTeamPendingKrs(
    quarterlyCycle?.id,
    teamIdParam ? [teamIdParam] : [],
  );

  // v2.83.0: Fetch KPIs for leader view
  const { profile } = useAuth();
  const {
    kpisInAlert,
    guardrailsViolated,
    isLoading: isLoadingKpis,
  } = useKpisForWizardV2({
    userId: profile?.id ?? '',
    teamId: teamIdParam ?? undefined,
    scope: 'leader',
    includeGuardrailsAtRisk: true,
  });

  // KPI marking handlers
  const handleMarkForDiscussion = useCallback(
    (kpiId: string, marked: boolean) => {
      const current = draft.data.kpisForDiscussion || [];
      const updated = marked ? [...current, kpiId] : current.filter((id) => id !== kpiId);
      updateDraft({ kpisForDiscussion: updated });
    },
    [draft.data.kpisForDiscussion, updateDraft],
  );

  const handleMarkForFollowup = useCallback(
    (kpiId: string, marked: boolean) => {
      const current = draft.data.kpisForFollowup || [];
      const updated = marked ? [...current, kpiId] : current.filter((id) => id !== kpiId);
      updateDraft({ kpisForFollowup: updated });
    },
    [draft.data.kpisForFollowup, updateDraft],
  );

  // Dynamic steps: omit KR-dependent steps when no KRs
  const hasKrs = !!(pendingKrs && pendingKrs.length > 0);

  const visibleSteps = useMemo(() => {
    if (hasKrs) return WIZARD_STEPS;
    return WIZARD_STEPS.filter((s) => s.id !== 'leader-insights' && s.id !== 'prep');
  }, [hasKrs]);

  const visibleStepOrder = useMemo(() => {
    if (hasKrs) return STEP_ORDER;
    return STEP_ORDER.filter((s) => s !== 'leader-insights' && s !== 'prep');
  }, [hasKrs]);

  // Navigation
  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    const currentIdx = visibleStepOrder.indexOf(draft.currentStep);
    for (let i = 0; i < currentIdx; i++) {
      completed.push(visibleStepOrder[i]);
    }
    return completed;
  }, [draft.currentStep, visibleStepOrder]);

  const goToStep = useCallback(
    (stepId: string) => {
      setStep(stepId as WizardStep);
    },
    [setStep],
  );

  const goNext = useCallback(() => {
    const currentIdx = visibleStepOrder.indexOf(draft.currentStep);
    if (currentIdx < visibleStepOrder.length - 1) {
      setStep(visibleStepOrder[currentIdx + 1]);
    }
  }, [draft.currentStep, setStep, visibleStepOrder]);

  const goBack = useCallback(() => {
    const currentIdx = visibleStepOrder.indexOf(draft.currentStep);
    if (currentIdx > 0) {
      setStep(visibleStepOrder[currentIdx - 1]);
    }
  }, [draft.currentStep, setStep, visibleStepOrder]);

  // Handlers
  const handleClose = useCallback(() => {}, []);

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

  // Handle team change (admin only)
  const handleTeamChange = useCallback(
    (newTeamId: string) => {
      discardDraft();
      setSearchParams({ team: newTeamId });
    },
    [discardDraft, setSearchParams],
  );

  // ----- Decisões inline (consolidadas no draft) -----
  const decisions = draft.data.decisions ?? [];
  const handleDecisionsChange = useCallback(
    (next: TeamCheckinDecision[]) => {
      updateDraft({ decisions: next });
    },
    [updateDraft],
  );

  // ----- Adapters memoizados para os steps do framework -----
  const krs = pendingKrs || [];

  const leaderInsightsData = useMemo<LeaderInsightsData>(
    () => ({
      insights: buildSystemInsights(krs),
      dismissedIds: draft.data.dismissedInsights ?? [],
    }),
    [krs, draft.data.dismissedInsights],
  );

  const handleLeaderInsightsChange = useCallback(
    (next: LeaderInsightsData) => {
      updateDraft({ dismissedInsights: next.dismissedIds });
    },
    [updateDraft],
  );

  const krsItems = useMemo<KrsItem[]>(
    () => buildKrsItems(krs, draft.data.krActions ?? []),
    [krs, draft.data.krActions],
  );

  const handleKrsItemsChange = useCallback(
    (next: KrsItem[]) => {
      updateDraft({ krActions: extractKrActions(next) });
    },
    [updateDraft],
  );

  const handleMeetingNotesChange = useCallback(
    (notes: string) => {
      updateDraft({ meetingNotes: notes });
    },
    [updateDraft],
  );

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
    switch (draft.currentStep) {
      case 'overview':
        return (
          <LeaderOverviewStep
            teamName={selectedTeam.name}
            cycleName={quarterlyCycle?.name || 'Sem ciclo ativo'}
            metrics={metrics?.metrics || null}
            isLoading={isLoadingMetrics}
            lastCompletedAt={lastCheckin.lastCompletedAt}
            onContinue={goNext}
          />
        );

      case 'kpi-alerts':
        return (
          <LeaderKpiAlertStep
            kpisInAlert={kpisInAlert}
            guardrailsViolated={guardrailsViolated}
            teamName={selectedTeam.name}
            isLoading={isLoadingKpis}
            markedForDiscussion={draft.data.kpisForDiscussion || []}
            markedForFollowup={draft.data.kpisForFollowup || []}
            onMarkForDiscussion={handleMarkForDiscussion}
            onMarkForFollowup={handleMarkForFollowup}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'projects':
        return (
          <LeaderProjectsStep teamId={teamIdParam} onContinue={goNext} onBack={goBack} />
        );

      case 'leader-insights':
        return (
          <LeaderInsightsStep
            persona="leader-prep"
            version="v2"
            stepId="leader-insights"
            config={{ showAiInsights: true, dismissable: true }}
            data={leaderInsightsData}
            onDataChange={handleLeaderInsightsChange}
            decisions={decisions}
            onDecisionsChange={handleDecisionsChange}
            footer={
              <WizardStepFooter
                onBack={goBack}
                onPrimary={goNext}
                primaryLabel="Preparar pauta"
              />
            }
          />
        );

      case 'prep':
        return (
          <KrsStep
            persona="leader-prep"
            version="v2"
            stepId="prep"
            config={{ mode: 'leader-actions', requireLeaderAction: false }}
            data={krsItems}
            onDataChange={handleKrsItemsChange}
            decisions={decisions}
            onDecisionsChange={handleDecisionsChange}
            meetingNotes={draft.data.meetingNotes}
            onMeetingNotesChange={handleMeetingNotesChange}
            footer={
              <WizardStepFooter
                onBack={goBack}
                onPrimary={goNext}
                primaryLabel="Continuar"
              />
            }
          />
        );

      case 'alignment':
        return (
          <LeaderAlignmentStep
            teamName={selectedTeam.name}
            teamKrs={krs}
            parentObjectives={[]}
            onStartCheckin={handleComplete}
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
      subtitle={
        hasKrs
          ? 'Prepare-se para conduzir um bom check-in com seu time'
          : 'Revise indicadores e projetos do time'
      }
      steps={visibleSteps.map((s) => ({
        id: s.id,
        label: s.label,
        description: s.description,
      }))}
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
      adminContextSwitcher={
        <HierarchyContextSwitcher
          type="team"
          currentLabel={selectedTeam?.name || 'Selecionar time'}
          selectedId={teamIdParam}
          onSelect={handleTeamChange}
          isLoading={isLoadingTeams}
        />
      }
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}

