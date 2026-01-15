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

import { useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { HierarchyContextSwitcher } from '@/modules/okrs/components/wizards/shared/HierarchyContextSwitcher';
import { useWizardDraft, type WizardStep } from '@/modules/okrs/hooks/useWizardDraft';
import { useUrlState } from '@/shared/url';
import { useAuth } from '@/hooks/useAuth';
import { useIdentity } from '@/hooks/useIdentity';
import { useActiveCycles } from '@/modules/okrs/hooks/useCycleData';
import { useTeamPreviousCycleAnalysis } from '@/modules/okrs/hooks/useTeamPreviousCycleAnalysis';
import { useOrgOkrsForContext } from '@/modules/okrs/hooks/useOrgOkrsForContext';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { useCreateTeamOkrBundle } from '@/modules/okrs/hooks/useCreateTeamOkrBundle';
import { useWizardSession } from '@/modules/okrs/hooks/useWizardSession';
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
import { TeamOkrDependenciesStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrDependenciesStep';
import { TeamOkrInitiativesStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrInitiativesStep';
import { TeamOkrShareStep } from '@/modules/okrs/components/wizards/team-okr-creation/TeamOkrShareStep';

// Typewriter queue for sequential AI text animations
import { VicTypewriterQueueProvider } from '@/modules/vic';

// Loading/Error states
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Target } from 'lucide-react';

// ============================================================
// STEP DEFINITIONS
// ============================================================

const WIZARD_STEPS: { id: WizardStep; label: string; description?: string }[] = [
  { id: 'intro', label: 'Introdução' },
  { id: 'context', label: 'Contexto', description: 'Prioridades estratégicas' },
  { id: 'retrospective', label: 'Retrospectiva', description: 'Ciclo anterior' },
  { id: 'objective', label: 'Objetivo', description: 'O que queremos alcançar' },
  { id: 'sharing', label: 'Compartilhamento', description: 'Objetivo compartilhado?' },
  { id: 'kr-type', label: 'Tipos de KR', description: 'Planejamento' },
  { id: 'kr-detail', label: 'KRs', description: 'Detalhamento' },
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
  
  // Get cycles
  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(() => 
    activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );
  
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
  const handleClose = useCallback(() => {
    clearDraft();
  }, [clearDraft]);
  
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
    
    try {
      await createBundle.mutateAsync({
        objective: {
          title: draft.objectiveTitle,
          description: draft.objectiveDescription || undefined,
          team_id: teamIdParam,
          org_objective_id: draft.selectedOrgObjectiveId,
          cycle_id: quarterlyCycle.id,
          status: 'active',
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
      });
      
      toast.success('OKRs criados com sucesso!');
      clearDraft();
      
      setTimeout(() => {
        navigate(`/okrs?team=${teamIdParam}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to create OKRs:', error);
      toast.error('Erro ao criar OKRs. Tente novamente.');
    }
  }, [quarterlyCycle, draft, teamIdParam, profileId, createBundle, clearDraft, navigate]);
  
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
            <button
              onClick={() => navigate('/okrs')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar para OKRs
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // No cycle available
  if (!quarterlyCycle) {
    return (
      <EmptyState
        icon={Target}
        title="Nenhum ciclo ativo"
        description="Não há ciclo de OKRs ativo para criar objetivos"
        actionLabel="Voltar para Wizards"
        onAction={() => navigate('/wizards')}
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
        return (
          <TeamOkrKrTypeStep
            objectiveTitle={draft.objectiveTitle}
            krPlan={draft.krPlan}
            onKrPlanChange={(value) => updateDraft({ krPlan: value })}
            onContinue={goNext}
            onBack={goBack}
          />
        );
        
      case 'kr-detail':
        return (
          <TeamOkrKrDetailStep
            objectiveTitle={draft.objectiveTitle}
            krPlan={draft.krPlan}
            draftKrs={draft.draftKrs}
            teamMembers={teamMembers}
            onDraftKrsChange={(value) => updateDraft({ draftKrs: value })}
            onContinue={goNext}
            onBack={goBack}
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
            teamMembers={teamMembers}
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
        subtitle="Defina objetivos e resultados-chave com alinhamento estratégico"
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
        backUrl="/wizards"
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
        {renderStepContent()}
      </FullPageWizardShell>
    </VicTypewriterQueueProvider>
  );
}
