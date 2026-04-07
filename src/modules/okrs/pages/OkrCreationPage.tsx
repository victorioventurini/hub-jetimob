/**
 * OkrCreationPage - Página de criação de OKRs de Time (Full-Page Wizard)
 * 
 * Substitui o TeamOkrCreationWizard baseado em Sheet para:
 * - Persistência robusta (URL + localStorage)
 * - Sem perda de dados ao trocar abas
 * - Melhor UX para fluxo longo (10 passos)
 * 
 * URL: /okrs/create?team={teamId}&step={stepId}
 */

import { useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { HierarchyContextSwitcher } from '@/modules/okrs/components/wizards/shared/HierarchyContextSwitcher';
import { 
  useWizardDraft, 
  useActiveCycle,
  useTeamPreviousCycleAnalysis,
  useOrgOkrsForContext,
  useCreateTeamOkrBundle,
  useWizardSession,
  useDraftObjectivesForCycle,
  type WizardStep,
} from '@/modules/okrs/hooks';
import { useUrlState } from '@/shared/url';
import { useAuth } from '@/hooks/useAuth';
import { useIdentity } from '@/hooks/useIdentity';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useBuUsersDirectory } from '@/hooks/useBuUsersDirectory';

// Step components
import { TeamOkrIntroStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrIntroStep';
import { TeamOkrContextStep, type OrgObjectiveContext, type StrategicKpi } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrContextStep';
import { TeamOkrRetrospectiveStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrRetrospectiveStep';
import { TeamOkrObjectiveStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrObjectiveStep';
import { TeamOkrSharingStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrSharingStep';
import { TeamOkrKrTypeStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrKrTypeStep';
import { TeamOkrKrDetailStep, type TeamMember } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrKrDetailStep';
import { TeamOkrKrMetricsStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrKrMetricsStep';
import { TeamOkrDependenciesStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrDependenciesStep';
import { TeamOkrInitiativesStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrInitiativesStep';
import { TeamOkrShareStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrShareStep';

// Typewriter queue for sequential AI text animations
import { VicTypewriterQueueProvider } from '@/modules/vic';

// Loading/Error states
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Target, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================
// STEP DEFINITIONS
// ============================================================

const WIZARD_STEPS: { id: WizardStep; label: string; description?: string }[] = [
  { id: 'intro', label: 'Introdução' },
  { id: 'context', label: 'Contexto', description: 'Prioridades estratégicas' },
  { id: 'retrospective', label: 'Retrospectiva', description: 'Ciclo anterior' },
  { id: 'objective', label: 'Objetivo', description: 'O que queremos alcançar' },
  { id: 'sharing', label: 'Compartilhamento', description: 'Objetivo compartilhado?' },
  { id: 'kr-detail', label: 'KRs', description: 'Detalhamento' },
  { id: 'kr-metrics', label: 'Indicadores', description: 'Vincular KPIs (opcional)' },
  { id: 'dependencies', label: 'Dependências', description: 'Riscos e bloqueios' },
  { id: 'initiatives', label: 'Iniciativas', description: 'Ações principais' },
  { id: 'review', label: 'Revisar', description: 'Confirmar e criar' },
];

const STEP_ORDER: WizardStep[] = WIZARD_STEPS.map(s => s.id);

// ============================================================
// COMPONENT
// ============================================================

export default function OkrCreationPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const { profileId } = useIdentity();
  
  // URL params
  const teamIdParam = searchParams.get('team');
  const stepState = useUrlState<string>({
    key: 'step',
    defaultValue: 'intro',
  }, { navigationMode: 'replace' });
  
  // Get teams
  const { teams, isLoading: isLoadingTeams } = useHierarchicalTeamList();
  
  // Find team
  const selectedTeam = useMemo(() => {
    if (!teamIdParam || !teams) return null;
    return teams.find(t => t.id === teamIdParam) || null;
  }, [teamIdParam, teams]);
  
  // Get cycles (status-based)
  const { activeQuarterlyCycle, activeCycle, planningCycles, isLoading: isLoadingCycles } = useActiveCycle();
  // Fallback: if no active quarter, use planning quarter (for QBR-pre draft hydration)
  const planningQuarterlyCycle = useMemo(() => {
    return planningCycles.find(c => c.type === 'quarter') ?? null;
  }, [planningCycles]);
  const quarterlyCycle = activeQuarterlyCycle || planningQuarterlyCycle || activeCycle;
  const isPlannningCycle = !activeQuarterlyCycle && !!planningQuarterlyCycle && quarterlyCycle === planningQuarterlyCycle;
  
  // Page title
  usePageTitle(selectedTeam ? `Criar OKRs - ${selectedTeam.name}` : 'Criar OKRs');
  
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
    hasSavedDraft,
    lastSavedAt,
  } = useWizardDraft({
    teamId: teamIdParam || '',
    cycleId: quarterlyCycle?.id || null,
    enabled: !!teamIdParam && !!quarterlyCycle,
  });
  
  // Handle team change (admin only)
  const handleTeamChange = useCallback((newTeamId: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('team', newTeamId);
    newParams.set('step', 'intro'); // Reset to first step
    setSearchParams(newParams, { replace: true });
    // Clear draft when changing team
    discardDraft();
  }, [searchParams, setSearchParams, discardDraft]);
  
  
  // Session tracking
  const { createSession, completeSession } = useWizardSession();
  
  // Data fetching
  const { data: previousCycleAnalysis, isLoading: isLoadingRetro } = useTeamPreviousCycleAnalysis(
    teamIdParam || '',
    quarterlyCycle?.id
  );
  const { data: orgOkrsContext, isLoading: isLoadingOrgOkrs } = useOrgOkrsForContext(quarterlyCycle?.id);
  
  // Fetch draft objectives from QBR-pre
  const { data: draftObjectives } = useDraftObjectivesForCycle(teamIdParam, quarterlyCycle?.id);
  
  // Hydrate wizard from QBR-pre drafts (once, when data arrives and draft is fresh)
  const hasHydratedFromDraftsRef = useRef(false);
  useEffect(() => {
    if (hasHydratedFromDraftsRef.current) return;
    if (!draftObjectives || draftObjectives.length === 0) return;
    
    // Only hydrate if draft is fresh (intro step, no title)
    if (draft.currentStep !== 'intro' || draft.objectiveTitle) return;
    
    // Don't hydrate if localStorage already has data (user was editing)
    try {
      const saved = localStorage.getItem('okr-draft.team-okr-creation');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.objectiveTitle) return;
      }
    } catch { /* ignore */ }
    
    hasHydratedFromDraftsRef.current = true;
    
    const firstDraft = draftObjectives[0];
    const mappedKrs = firstDraft.keyResults.map((kr, idx) => ({
      id: `draft-kr-${idx}`,
      type: (kr.type as any) || 'foundational',
      title: kr.title,
      baseline: kr.baseline,
      target: kr.target,
      unit: kr.unit,
      direction: (kr.direction as any) || 'increase',
      owner_user_id: kr.owner_user_id,
      linked_org_kr_id: kr.linked_org_kr_id,
    }));
    
    updateDraft({
      objectiveTitle: firstDraft.title,
      objectiveDescription: firstDraft.description || '',
      selectedOrgObjectiveId: firstDraft.org_objective_id,
      sourceDraftObjectiveId: firstDraft.id,
      draftKrs: mappedKrs,
      currentStep: 'objective',
    });
    
    // Also update URL step
    stepState.set('objective');
  }, [draftObjectives, draft.currentStep, draft.objectiveTitle, updateDraft, stepState]);
  
  // Count remaining drafts for banner
  const remainingDraftsCount = (draftObjectives?.length ?? 0) - (draft.sourceDraftObjectiveId ? 1 : 0);
  
  // Transform org OKRs
  const orgObjectivesForContext: OrgObjectiveContext[] = useMemo(() => {
    if (!orgOkrsContext?.objectives) return [];
    return orgOkrsContext.objectives.map(obj => ({
      id: obj.id,
      title: obj.title,
      progress: obj.progress ?? 0,
      status: (obj.status as 'green' | 'yellow' | 'red' | 'not_started') || 'not_started',
      keyResultsCount: obj.keyResults?.length || 0,
    }));
  }, [orgOkrsContext]);
  
  // Fetch all active team members (regardless of HUB login status)
  const { data: teamMembersData = [] } = useBuUsersDirectory({
    teamId: teamIdParam ?? undefined,
    enabled: !!teamIdParam,
  });
  
  const strategicKpis: StrategicKpi[] = useMemo(() => [], []);
  const teamMembers: TeamMember[] = useMemo(() => {
    return teamMembersData.map(member => ({
      id: member.id,
      fullName: member.display_name || [member.first_name, member.last_name].filter(Boolean).join(' ') || 'Usuário',
      avatarUrl: member.photo_url ?? undefined,
    }));
  }, [teamMembersData]);
  
  // Create bundle mutation
  const createBundle = useCreateTeamOkrBundle();
  
  // Sync URL step with draft
  useEffect(() => {
    if (stepState.value && draft.currentStep !== stepState.value && STEP_ORDER.includes(stepState.value as WizardStep)) {
      setStep(stepState.value as WizardStep);
    }
  }, [stepState.value, draft.currentStep, setStep]);
  
  // Calculate completed steps
  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    
    for (let i = 0; i < currentIdx; i++) {
      completed.push(STEP_ORDER[i]);
    }
    
    return completed;
  }, [draft.currentStep]);
  
  // Navigation helpers
  const goToStep = useCallback((stepId: string) => {
    const step = stepId as WizardStep;
    setStep(step);
    stepState.set(step);
  }, [setStep, stepState]);
  
  const goNext = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx < STEP_ORDER.length - 1) {
      goToStep(STEP_ORDER[currentIdx + 1]);
    }
  }, [draft.currentStep, goToStep]);
  
  const goBack = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx > 0) {
      goToStep(STEP_ORDER[currentIdx - 1]);
    }
  }, [draft.currentStep, goToStep]);
  
  // Handle close
  // handleClose is a no-op: FullPageWizardShell handles navigation.
  // Draft stays as in_progress for later resumption — only handleComplete marks as completed.
  const handleClose = useCallback(() => {}, []);
  
  // Handle save draft
  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo! Você pode continuar depois.');
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Erro ao salvar rascunho');
    }
  }, [saveDraft]);
  
  // Handle discard draft
  const handleDiscardDraft = useCallback(async () => {
    try {
      await discardDraft();
      toast.success('Rascunho descartado. Começando do zero.');
    } catch (error) {
      console.error('Failed to discard draft:', error);
      toast.error('Erro ao descartar rascunho');
    }
  }, [discardDraft]);
  
  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!quarterlyCycle || !draft.selectedOrgObjectiveId || !teamIdParam) {
      toast.error('Dados incompletos para criar OKRs');
      return;
    }
    
    // Determine status based on cycle: planning → draft, active → active
    const objectiveStatus = isPlannningCycle ? 'draft' : 'active';
    
    try {
      await createBundle.mutateAsync({
        existingObjectiveId: draft.sourceDraftObjectiveId || undefined,
        objective: {
          title: draft.objectiveTitle,
          description: draft.objectiveDescription || undefined,
          team_id: teamIdParam,
          org_objective_id: draft.selectedOrgObjectiveId,
          cycle_id: quarterlyCycle.id,
          status: objectiveStatus,
          is_shared: draft.isShared,
          responsibility_model: draft.isShared ? draft.responsibilityModel : null,
        },
        contributingTeamIds: draft.isShared ? draft.contributingTeamIds : [],
        keyResults: draft.draftKrs.map(kr => ({
          title: kr.title,
          type: kr.type,
          baseline: kr.baseline,
          target: kr.target,
          unit: kr.unit,
          direction: kr.direction,
          owner_user_id: kr.owner_user_id || profileId || '',
        })),
        initiatives: draft.initiatives.map(init => ({
          kr_index: init.krIndex,
          name: init.name,
          owner_user_id: init.owner_user_id || profileId || '',
          expected_end_date: init.expected_end_date,
        })),
        krMetricLinks: draft.draftKrMetricLinks.map(link => ({
          kr_index: link.krIndex,
          kpi_id: link.kpiId,
          role: link.role,
        })),
      });
      
      toast.success(draft.sourceDraftObjectiveId ? 'OKRs atualizados com sucesso!' : 'OKRs criados com sucesso!');
      clearDraft();
      
      setTimeout(() => {
        navigate(`/okrs?team=${teamIdParam}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to create OKRs:', error);
      toast.error('Erro ao criar OKRs. Tente novamente.');
    }
  }, [quarterlyCycle, draft, teamIdParam, profileId, createBundle, clearDraft, navigate, isPlannningCycle]);
  
  // Loading state
  if (isLoadingTeams || isLoadingCycles) {
    return <LoadingState text="Carregando..." fullPage />;
  }
  
  // No team selected - show team selector
  if (!teamIdParam || !selectedTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Target className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Criar Objetivo de Time</h1>
            <p className="text-muted-foreground text-sm">
              Selecione o time para o qual deseja criar um objetivo
            </p>
          </div>
          
          <div className="pt-2">
            <HierarchyContextSwitcher
              type="team"
              currentLabel="Selecionar time"
              selectedId={null}
              onSelect={(newTeamId) => {
                const newParams = new URLSearchParams(searchParams);
                newParams.set('team', newTeamId);
                setSearchParams(newParams, { replace: true });
              }}
              isLoading={isLoadingTeams}
            />
          </div>
          
          <div className="pt-4">
            <Link
              to="/okrs"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar para OKRs
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // No cycle available — check for planning cycles
  if (!quarterlyCycle) {
    const hasPlanningCycle = planningCycles.length > 0;
    return (
      <EmptyState
        icon={Target}
        title={hasPlanningCycle ? "Ciclo ainda não ativado" : "Nenhum ciclo disponível"}
        description={hasPlanningCycle
          ? `O ciclo "${planningCycles[0].name}" está em planejamento. Solicite ao admin que ative o ciclo nas configurações de OKRs para criar objetivos.`
          : "Não há ciclo de OKRs ativo ou em planejamento. Um admin precisa criar e ativar um ciclo nas configurações de OKRs."
        }
        actionLabel="Voltar para Rituais"
        onAction={() => navigate('/rituals')}
      />
    );
  }
  
  // Render step content
  const renderStepContent = () => {
    const userName = profile?.first_name || profile?.display_name?.split(' ')[0] || undefined;
    
    switch (draft.currentStep) {
      case 'intro':
        return (
          <TeamOkrIntroStep
            teamName={selectedTeam.name}
            userName={userName}
            onContinue={goNext}
          />
        );
        
      case 'context':
        return (
          <TeamOkrContextStep
            teamName={selectedTeam.name}
            orgObjectives={orgObjectivesForContext}
            strategicKpis={strategicKpis}
            isLoading={isLoadingOrgOkrs}
            impactReflection={draft.impactReflection}
            onImpactReflectionChange={(value) => updateDraft({ impactReflection: value })}
            aiInsight={draft.contextAiInsight}
            onAiInsightChange={(value) => updateDraft({ contextAiInsight: value })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'retrospective':
        return (
          <TeamOkrRetrospectiveStep
            teamName={selectedTeam.name}
            analysis={previousCycleAnalysis || null}
            isLoading={isLoadingRetro}
            aiInsight={draft.retrospectiveAiInsight}
            onAiInsightChange={(value) => updateDraft({ retrospectiveAiInsight: value })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'objective':
        return (
          <TeamOkrObjectiveStep
            teamName={selectedTeam.name}
            orgObjectives={orgObjectivesForContext}
            objectiveTitle={draft.objectiveTitle}
            objectiveDescription={draft.objectiveDescription}
            selectedOrgObjectiveId={draft.selectedOrgObjectiveId}
            objectiveValidationFeedback={draft.objectiveValidationFeedback}
            objectiveValidatedAt={draft.objectiveValidatedAt}
            onObjectiveTitleChange={(value) => updateDraft({ objectiveTitle: value })}
            onObjectiveDescriptionChange={(value) => updateDraft({ objectiveDescription: value })}
            onOrgObjectiveSelect={(value) => updateDraft({ selectedOrgObjectiveId: value })}
            onValidationFeedbackChange={(feedback, validatedAt) => updateDraft({ 
              objectiveValidationFeedback: feedback, 
              objectiveValidatedAt: validatedAt 
            })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'sharing':
        return (
          <TeamOkrSharingStep
            objectiveTitle={draft.objectiveTitle}
            teamId={teamIdParam}
            teamName={selectedTeam.name}
            isShared={draft.isShared}
            responsibilityModel={draft.responsibilityModel}
            ownerType={draft.ownerType}
            primaryTeamId={draft.primaryTeamId}
            contributingTeamIds={draft.contributingTeamIds}
            availableTeams={teams}
            isLoadingTeams={isLoadingTeams}
            onIsSharedChange={(value) => updateDraft({ isShared: value })}
            onResponsibilityModelChange={(value) => updateDraft({ responsibilityModel: value })}
            onOwnerTypeChange={(value) => updateDraft({ ownerType: value })}
            onPrimaryTeamChange={(value) => updateDraft({ primaryTeamId: value })}
            onContributingTeamsChange={(value) => updateDraft({ contributingTeamIds: value })}
            aiInsight={draft.sharingAiInsight}
            onAiInsightChange={(value) => updateDraft({ sharingAiInsight: value })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'kr-type':
        // Step oculto — pular para kr-detail
        goNext();
        return null;
        
      case 'kr-detail':
        return (
          <TeamOkrKrDetailStep
            objectiveTitle={draft.objectiveTitle}
            krPlan={draft.krPlan}
            draftKrs={draft.draftKrs}
            teamId={teamIdParam ?? undefined}
            onDraftKrsChange={(value) => updateDraft({ draftKrs: value })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'kr-metrics':
        return (
          <TeamOkrKrMetricsStep
            draftKrs={draft.draftKrs}
            draftKrMetricLinks={draft.draftKrMetricLinks}
            teamId={teamIdParam ?? undefined}
            onDraftKrMetricLinksChange={(value) => updateDraft({ draftKrMetricLinks: value })}
            onContinue={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        );
        
      case 'dependencies':
        return (
          <TeamOkrDependenciesStep
            draftKrs={draft.draftKrs}
            dependencies={draft.dependencies}
            detectedDependencies={draft.detectedDependencies}
            aiInsight={draft.dependenciesAiInsight}
            onDependenciesChange={(value) => updateDraft({ dependencies: value })}
            onDetectedDependenciesChange={(value) => updateDraft({ detectedDependencies: value })}
            onAiInsightChange={(value) => updateDraft({ dependenciesAiInsight: value })}
            onContinue={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        );
        
      case 'initiatives':
        return (
          <TeamOkrInitiativesStep
            draftKrs={draft.draftKrs}
            initiatives={draft.initiatives}
            teamId={teamIdParam ?? undefined}
            onInitiativesChange={(value) => updateDraft({ initiatives: value })}
            onContinue={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        );
        
      case 'review':
        return (
          <TeamOkrShareStep
            teamName={selectedTeam.name}
            objectiveTitle={draft.objectiveTitle}
            draftKrs={draft.draftKrs}
            initiatives={draft.initiatives}
            isSubmitting={createBundle.isPending}
            shareStepContent={draft.shareStepContent}
            onShareStepContentChange={(value) => updateDraft({ shareStepContent: value })}
            onSubmit={handleSubmit}
            onBack={goBack}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <VicTypewriterQueueProvider>
      <FullPageWizardShell
        title="Criar OKRs do Time"
        subtitle={`Criando para: ${quarterlyCycle.name} · ${format(parseISO(quarterlyCycle.start_date), "dd MMM", { locale: ptBR })} → ${format(parseISO(quarterlyCycle.end_date), "dd MMM", { locale: ptBR })}`}
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
        isLoading={createBundle.isPending}
        onClose={handleClose}
        backUrl="/rituals"
        adminContextSwitcher={
          <HierarchyContextSwitcher
            type="team"
            currentLabel={selectedTeam.name}
            selectedId={teamIdParam}
            onSelect={handleTeamChange}
            isLoading={isLoadingTeams}
          />
        }
      >
        {remainingDraftsCount > 0 && draft.sourceDraftObjectiveId && (
          <Alert className="mb-4 border-accent bg-accent/10">
            <Info className="h-4 w-4 text-accent-foreground" />
            <AlertDescription className="text-accent-foreground">
              Você tem {remainingDraftsCount} {remainingDraftsCount === 1 ? 'objetivo rascunho' : 'objetivos rascunho'} do QBR Pre aguardando validação. Após concluir este, volte para os demais.
            </AlertDescription>
          </Alert>
        )}
        {renderStepContent()}
      </FullPageWizardShell>
    </VicTypewriterQueueProvider>
  );
}
