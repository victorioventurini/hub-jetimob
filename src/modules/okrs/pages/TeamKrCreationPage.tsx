/**
 * TeamKrCreationPage - Página do Wizard de Criação de KRs
 * 
 * Wizard full-page para criar Key Results para um objetivo existente
 * URL: /okrs/objectives/:objectiveId/krs/create
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { FullPageWizardShell } from '../components/wizards/shared/FullPageWizardShell';
import { WIZARD_CONFIGS } from '../types/wizard';
import { useKrWizardDraft, useCreateTeamKrBundle, type KrWizardStep } from '@/modules/okrs/hooks';
import { useTeam } from '@/modules/teams/hooks';

// Steps
import {
  KrContextStep,
  KrAlignmentStep,
  KrTypeStep,
  KrSharedCheckStep,
  KrReviewStep,
  type ObjectiveContext,
  type KrPlan,
} from '../components/wizards/team-kr-creation';
import { TeamOkrKrDetailStep } from '../components/wizards/team-okr-creation/TeamOkrKrDetailStep';
import { TeamOkrDependenciesStep } from '../components/wizards/team-okr-creation/TeamOkrDependenciesStep';
import { TeamOkrInitiativesStep } from '../components/wizards/team-okr-creation/TeamOkrInitiativesStep';

// ============================================================
// TYPES
// ============================================================

const WIZARD_STEPS: KrWizardStep[] = [
  'kr-context',
  'kr-alignment',
  'kr-type',
  'kr-detail',
  'kr-shared-check',
  'kr-dependencies',
  'kr-initiatives',
  'kr-review',
];

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function TeamKrCreationPage() {
  usePageTitle('Criar Key Results');
  const navigate = useNavigate();
  const { objectiveId } = useParams<{ objectiveId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { client: supabase } = useOptionalBuClient();
  const { currentBuId } = useBu();
  
  const createKrBundle = useCreateTeamKrBundle();

  // ── Fetch objective data ──
  const { data: objective, isLoading: objectiveLoading } = useQuery({
    queryKey: queryKeys.okrs.teamObjectiveDetail(objectiveId || ''),
    queryFn: async () => {
      if (!supabase || !objectiveId) return null;
      
      const { data, error } = await supabase
        .from('okr_team_objectives')
        .select(`
          id,
          title,
          description,
          team_id,
          org_objective_id,
          cycle_id,
          is_shared,
          responsibility_model,
          teams:team_id (id, name),
          org_objective:org_objective_id (title),
          cycle:cycle_id (name, year)
        `)
        .eq('id', objectiveId)
        .is('cancelled_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!supabase && !!objectiveId,
  });

  // ── Fetch contributors if shared ──
  const { data: contributors } = useQuery({
    queryKey: queryKeys.okrs.objectiveContributors(objectiveId || null),
    queryFn: async () => {
      if (!supabase || !objectiveId) return [];
      
      const { data, error } = await supabase
        .from('okr_team_objective_contributors')
        .select(`
          team_id,
          teams:team_id (id, name)
        `)
        .eq('objective_id', objectiveId);

      if (error) {
        console.error('Error fetching contributors:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!supabase && !!objectiveId && !!objective?.is_shared,
  });

  // ── Team data including members ──
  const teamId = objective?.team_id;
  const { data: teamData } = useTeam(teamId);

  // ── Draft management ──
  const {
    draft,
    updateDraft,
    setStep,
    clearDraft,
    discardDraft,
    isDirty,
    hasSavedDraft,
    initializeDraft,
  } = useKrWizardDraft({
    objectiveId: objectiveId || '',
    teamId: teamId || '',
    cycleId: objective?.cycle_id || null,
    enabled: !!objectiveId && !!teamId,
  });

  // Initialize draft when objective loads
  useEffect(() => {
    if (objective && !draft) {
      initializeDraft();
    }
  }, [objective, draft, initializeDraft]);

  // ── Current step from URL or draft ──
  const currentStepFromUrl = searchParams.get('step') as KrWizardStep | null;
  const currentStep = currentStepFromUrl || draft?.currentStep || 'kr-context';
  const currentStepIndex = WIZARD_STEPS.indexOf(currentStep);

  // ── Sync URL with step ──
  useEffect(() => {
    if (draft?.currentStep && draft.currentStep !== currentStepFromUrl) {
      setSearchParams({ step: draft.currentStep }, { replace: true });
    }
  }, [draft?.currentStep, currentStepFromUrl, setSearchParams]);

  // ── Navigation handlers ──
  const goToStep = useCallback((step: KrWizardStep) => {
    setStep(step);
    setSearchParams({ step }, { replace: true });
  }, [setStep, setSearchParams]);

  const goNext = useCallback(() => {
    let nextIndex = currentStepIndex + 1;
    
    // Skip kr-shared-check if not shared
    if (WIZARD_STEPS[nextIndex] === 'kr-shared-check' && !objective?.is_shared) {
      nextIndex++;
    }
    
    if (nextIndex < WIZARD_STEPS.length) {
      goToStep(WIZARD_STEPS[nextIndex]);
    }
  }, [currentStepIndex, objective?.is_shared, goToStep]);

  const goBack = useCallback(() => {
    let prevIndex = currentStepIndex - 1;
    
    // Skip kr-shared-check if not shared
    if (WIZARD_STEPS[prevIndex] === 'kr-shared-check' && !objective?.is_shared) {
      prevIndex--;
    }
    
    if (prevIndex >= 0) {
      goToStep(WIZARD_STEPS[prevIndex]);
    }
  }, [currentStepIndex, objective?.is_shared, goToStep]);

  // ── Close handler ──
  const handleClose = useCallback(() => {
    navigate('/okrs');
  }, [navigate]);

  // ── Submit handler ──
  const handleSubmit = useCallback(async () => {
    if (!draft || !objectiveId || !teamId) return;

    try {
      await createKrBundle.mutateAsync({
        objectiveId,
        teamId,
        keyResults: draft.draftKrs.map(kr => ({
          title: kr.title,
          type: kr.type,
          baseline: kr.baseline,
          target: kr.target,
          unit: kr.unit,
          direction: kr.direction,
          owner_user_id: kr.owner_user_id,
          linked_org_kr_id: kr.linked_org_kr_id,
        })),
        initiatives: draft.initiatives.map(init => ({
          kr_index: init.krIndex,
          name: init.name,
          owner_user_id: init.owner_user_id,
          start_date: init.start_date,
          expected_end_date: init.expected_end_date,
        })),
      });

      clearDraft();
      navigate('/okrs');
    } catch (error) {
      console.error('Failed to create KRs:', error);
    }
  }, [draft, objectiveId, teamId, createKrBundle, clearDraft, navigate]);

  // ── Objective context for KrContextStep ──
  const objectiveContext: ObjectiveContext | null = useMemo(() => {
    if (!objective) return null;
    
    const team = objective.teams as any;
    const orgObj = objective.org_objective as any;
    const cycle = objective.cycle as any;
    
    return {
      id: objective.id,
      title: objective.title,
      description: objective.description,
      teamName: team?.name || 'Time',
      teamId: objective.team_id,
      orgObjectiveTitle: orgObj?.title || null,
      isShared: objective.is_shared || false,
      responsibilityModel: objective.responsibility_model as any,
      primaryTeamName: team?.name || null,
      contributingTeams: contributors?.map((c: any) => ({
        id: c.team_id,
        name: c.teams?.name || 'Time',
      })) || [],
      cycleName: cycle?.name || null,
      year: cycle?.year || undefined,
    };
  }, [objective, contributors]);

  // ── Completed steps ──
  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    if (!draft) return completed;

    // Mark steps as complete based on data
    if (draft.currentStep !== 'kr-context') {
      completed.push('kr-context');
    }
    if (draft.strategicReflection || WIZARD_STEPS.indexOf(draft.currentStep) > 1) {
      completed.push('kr-alignment');
    }
    if (draft.krPlan.foundational > 0 && WIZARD_STEPS.indexOf(draft.currentStep) > 2) {
      completed.push('kr-type');
    }
    if (draft.draftKrs.length > 0 && draft.draftKrs.every(kr => kr.title && kr.owner_user_id)) {
      completed.push('kr-detail');
    }
    if (!objective?.is_shared || WIZARD_STEPS.indexOf(draft.currentStep) > 4) {
      completed.push('kr-shared-check');
    }
    if (WIZARD_STEPS.indexOf(draft.currentStep) > 5) {
      completed.push('kr-dependencies');
    }
    if (WIZARD_STEPS.indexOf(draft.currentStep) > 6) {
      completed.push('kr-initiatives');
    }

    return completed;
  }, [draft, objective?.is_shared]);

  // ── Team members formatted ──
  const formattedTeamMembers = useMemo(() => {
    const members = teamData?.members || [];
    return members.map((m: any) => ({
      id: m.id,
      fullName: m.display_name || 'Membro',
      avatarUrl: m.photo_url,
    }));
  }, [teamData?.members]);

  // ── Loading state ──
  if (objectiveLoading || !objective || !objectiveContext) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // ── Wizard config ──
  const config = WIZARD_CONFIGS['team-kr-creation'];
  const filteredSteps = config.steps.filter(step => {
    // Hide kr-shared-check if not shared
    if (step.id === 'kr-shared-check' && !objective.is_shared) {
      return false;
    }
    return true;
  });

  // ── Render current step ──
  const renderStep = () => {
    if (!draft) return null;

    switch (currentStep) {
      case 'kr-context':
        return (
          <KrContextStep
            objective={objectiveContext}
            onContinue={goNext}
            onClose={handleClose}
          />
        );

      case 'kr-alignment':
        return (
          <KrAlignmentStep
            objectiveTitle={objective.title}
            strategicReflection={draft.strategicReflection}
            onReflectionChange={(value) => updateDraft({ strategicReflection: value })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'kr-type':
        return (
          <KrTypeStep
            objectiveTitle={objective.title}
            isSharedObjective={objective.is_shared || false}
            krPlan={draft.krPlan}
            onKrPlanChange={(plan) => updateDraft({ krPlan: plan })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'kr-detail':
        return (
          <TeamOkrKrDetailStep
            objectiveTitle={objective.title}
            krPlan={draft.krPlan}
            draftKrs={draft.draftKrs}
            teamMembers={formattedTeamMembers}
            onDraftKrsChange={(krs) => updateDraft({ draftKrs: krs })}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'kr-shared-check':
        return (
          <KrSharedCheckStep
            draftKrs={draft.draftKrs}
            primaryTeamName={objectiveContext.primaryTeamName || objectiveContext.teamName}
            contributingTeamNames={objectiveContext.contributingTeams?.map(t => t.name) || []}
            onAdjust={() => goToStep('kr-detail')}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'kr-dependencies':
        return (
          <TeamOkrDependenciesStep
            draftKrs={draft.draftKrs}
            dependencies={draft.dependencies}
            detectedDependencies={draft.detectedDependencies}
            aiInsight={draft.dependenciesAiInsight}
            onDependenciesChange={(deps) => updateDraft({ dependencies: deps })}
            onDetectedDependenciesChange={(value) => updateDraft({ detectedDependencies: value })}
            onAiInsightChange={(value) => updateDraft({ dependenciesAiInsight: value })}
            onContinue={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        );

      case 'kr-initiatives':
        return (
          <TeamOkrInitiativesStep
            draftKrs={draft.draftKrs}
            initiatives={draft.initiatives}
            teamMembers={formattedTeamMembers}
            onInitiativesChange={(inits) => updateDraft({ initiatives: inits })}
            onContinue={goNext}
            onBack={goBack}
            onSkip={goNext}
          />
        );

      case 'kr-review':
        return (
          <KrReviewStep
            objectiveTitle={objective.title}
            teamName={objectiveContext.teamName}
            draftKrs={draft.draftKrs}
            dependencies={draft.dependencies}
            initiatives={draft.initiatives}
            teamMembers={formattedTeamMembers}
            isSharedObjective={objective.is_shared || false}
            onConfirm={handleSubmit}
            onBack={goBack}
            isSubmitting={createKrBundle.isPending}
          />
        );

      default:
        return null;
    }
  };

  return (
    <FullPageWizardShell
      title={config.title}
      subtitle={`Para: ${objective.title}`}
      steps={filteredSteps}
      currentStepId={currentStep}
      completedSteps={completedSteps}
      onStepChange={(stepId) => goToStep(stepId as KrWizardStep)}
      onClose={handleClose}
      onDiscardDraft={async () => discardDraft()}
      isDirty={isDirty}
    >
      {renderStep()}
    </FullPageWizardShell>
  );
}
