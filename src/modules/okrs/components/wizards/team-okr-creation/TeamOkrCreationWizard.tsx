/**
 * TeamOkrCreationWizard - Orquestrador do Wizard de Criação de OKRs de Time
 * 
 * Fluxo em 9 passos:
 * 0. Intro - Alinhamento inicial
 * 1. Context - Contexto organizacional
 * 2. Retrospective - Aprendendo com o passado
 * 3. Objective - Definindo o objetivo
 * 4. KR Type - Escolhendo tipos de KR
 * 5. KR Detail - Detalhando KRs
 * 6. Dependencies - Dependências e riscos
 * 7. Initiatives - Iniciativas
 * 8. Share - Compartilhar com o time
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { WizardShell } from '../shared/WizardShell';
import { TeamOkrIntroStep } from './TeamOkrIntroStep';
import { TeamOkrContextStep, type OrgObjectiveContext, type StrategicKpi } from './TeamOkrContextStep';
import { TeamOkrRetrospectiveStep } from './TeamOkrRetrospectiveStep';
import { TeamOkrObjectiveStep } from './TeamOkrObjectiveStep';
import { TeamOkrKrTypeStep, type KrPlan } from './TeamOkrKrTypeStep';
import { TeamOkrKrDetailStep, type TeamMember } from './TeamOkrKrDetailStep';
import { TeamOkrDependenciesStep } from './TeamOkrDependenciesStep';
import { TeamOkrInitiativesStep } from './TeamOkrInitiativesStep';
import { TeamOkrShareStep } from './TeamOkrShareStep';
import { TeamOkrSharingStep } from './TeamOkrSharingStep';
import { useTeamPreviousCycleAnalysis } from '@/modules/okrs/hooks/useTeamPreviousCycleAnalysis';
import { useOrgOkrsForContext } from '@/modules/okrs/hooks/useOrgOkrsForContext';
import { useActiveCycles } from '@/modules/okrs/hooks/useCycleData';
import { useWizardSession } from '@/modules/okrs/hooks/useWizardSession';
import { useCreateTeamOkrBundle } from '@/modules/okrs/hooks/useCreateTeamOkrBundle';
import { useAuth } from '@/hooks/useAuth';
import { useIdentity } from '@/hooks/useIdentity';
import { useHierarchicalTeamList } from '@/modules/teams/hooks/useTeams';
import {
  WIZARD_CONFIGS, 
  type DraftTeamKr, 
  type DraftTeamDependency, 
  type DraftTeamInitiative,
  type ResponsibilityModel,
  type OwnerType,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface TeamOkrCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  /** Callback when team changes via context selector */
  onTeamChange?: (teamId: string, teamName: string) => void;
}

type WizardStep = 
  | 'intro' 
  | 'context' 
  | 'retrospective' 
  | 'objective' 
  | 'sharing'
  | 'kr-type' 
  | 'kr-detail' 
  | 'dependencies' 
  | 'initiatives' 
  | 'share';

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrCreationWizard({ 
  open, 
  onOpenChange, 
  teamId,
  teamName,
  onTeamChange,
}: TeamOkrCreationWizardProps) {
  const navigate = useNavigate();
  const config = WIZARD_CONFIGS['team-okr-creation'];
  const { profile } = useAuth();
  const { profileId } = useIdentity();
  
  // Session persistence
  const { createSession, completeSession, isCreating } = useWizardSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Step state
  const [currentStep, setCurrentStep] = useState<WizardStep>('intro');
  
  // Step 1 - Context
  const [impactReflection, setImpactReflection] = useState('');
  
  // Step 3 - Objective
  const [objectiveTitle, setObjectiveTitle] = useState('');
  const [objectiveDescription, setObjectiveDescription] = useState('');
  const [selectedOrgObjectiveId, setSelectedOrgObjectiveId] = useState<string | null>(null);
  
  // Step 4/5 - KRs
  const [krPlan, setKrPlan] = useState<KrPlan>({ foundational: 1, contribution: 0, enabler: 0 });
  const [draftKrs, setDraftKrs] = useState<DraftTeamKr[]>([]);
  
  // Step 6 - Dependencies
  const [dependencies, setDependencies] = useState<DraftTeamDependency[]>([]);
  
  // Step 7 - Initiatives
  const [initiatives, setInitiatives] = useState<DraftTeamInitiative[]>([]);
  
  // Step 5 - Sharing (NEW)
  const [isShared, setIsShared] = useState(false);
  const [responsibilityModel, setResponsibilityModel] = useState<ResponsibilityModel>('primary_led');
  const [ownerType, setOwnerType] = useState<OwnerType>('my_team');
  const [primaryTeamId, setPrimaryTeamId] = useState(teamId);
  const [contributingTeamIds, setContributingTeamIds] = useState<string[]>([]);
  
  // Fetch teams for sharing step
  const { teams: availableTeams, isLoading: isLoadingTeams } = useHierarchicalTeamList();
  
  // Get active quarterly cycle
  const { data: activeCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(() => 
    activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );

  // Fetch data
  const { data: previousCycleAnalysis, isLoading: isLoadingRetro } = useTeamPreviousCycleAnalysis(teamId, quarterlyCycle?.id);
  const { data: orgOkrsContext, isLoading: isLoadingOrgOkrs } = useOrgOkrsForContext(quarterlyCycle?.id);
  
  // Create bundle mutation
  const createBundle = useCreateTeamOkrBundle();
  
  // Transform org OKRs for context step
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
  
  // Mock strategic KPIs (would come from a hook in real implementation)
  const strategicKpis: StrategicKpi[] = useMemo(() => [], []);
  
  // Mock team members (would come from a hook in real implementation)
  const teamMembers: TeamMember[] = useMemo(() => {
    if (!profileId || !profile) return [];
    const fullName = profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Eu';
    return [{ id: profileId, fullName }];
  }, [profileId, profile]);

  // Step index for progress
  const stepIndex = useMemo(() => {
    const steps: WizardStep[] = ['intro', 'context', 'retrospective', 'objective', 'sharing', 'kr-type', 'kr-detail', 'dependencies', 'initiatives', 'share'];
    return steps.indexOf(currentStep);
  }, [currentStep]);

  // Create session when wizard opens
  useEffect(() => {
    if (open && !sessionId && !isCreating) {
      createSession({
        wizardType: 'team-okr-creation',
        teamId,
        cycleId: quarterlyCycle?.id || null,
      }).then(session => {
        setSessionId(session.id);
      }).catch(err => {
        console.error('Failed to create wizard session:', err);
      });
    }
  }, [open, sessionId, isCreating, createSession, teamId, quarterlyCycle?.id]);

  // Reset state on close
  const handleClose = useCallback(() => {
    setCurrentStep('intro');
    setImpactReflection('');
    setObjectiveTitle('');
    setObjectiveDescription('');
    setSelectedOrgObjectiveId(null);
    setKrPlan({ foundational: 1, contribution: 0, enabler: 0 });
    setDraftKrs([]);
    setDependencies([]);
    setInitiatives([]);
    setIsShared(false);
    setResponsibilityModel('primary_led');
    setOwnerType('my_team');
    setPrimaryTeamId(teamId);
    setContributingTeamIds([]);
    setSessionId(null);
    onOpenChange(false);
  }, [onOpenChange, teamId]);

  // Final submission
  const handleSubmit = useCallback(async () => {
    if (!quarterlyCycle || !selectedOrgObjectiveId) {
      toast.error('Selecione um objetivo organizacional e ciclo');
      return;
    }

    try {
      await createBundle.mutateAsync({
        objective: {
          title: objectiveTitle,
          description: objectiveDescription || undefined,
          team_id: teamId,
          org_objective_id: selectedOrgObjectiveId,
          cycle_id: quarterlyCycle.id,
          status: 'active',
          is_shared: isShared,
          responsibility_model: isShared ? responsibilityModel : null,
        },
        contributingTeamIds: isShared ? contributingTeamIds : [],
        keyResults: draftKrs.map(kr => ({
          title: kr.title,
          type: kr.type,
          baseline: kr.baseline,
          target: kr.target,
          unit: kr.unit,
          direction: kr.direction,
          owner_user_id: kr.owner_user_id || profileId || '',
        })),
        initiatives: initiatives.map(init => ({
          kr_index: init.krIndex,
          name: init.name,
          owner_user_id: init.owner_user_id || profileId || '',
          expected_end_date: init.expected_end_date,
        })),
      });

      // Complete session
      if (sessionId) {
        await completeSession({
          sessionId,
          aiInsightsShown: [],
        }).catch(console.error);
      }

      toast.success('OKRs criados com sucesso!');
      
      setTimeout(() => {
        handleClose();
        navigate(`/okrs?team=${teamId}`);
      }, 1500);
    } catch (error) {
      console.error('Failed to create OKRs:', error);
      toast.error('Erro ao criar OKRs. Tente novamente.');
    }
  }, [
    quarterlyCycle, selectedOrgObjectiveId, objectiveTitle, objectiveDescription,
    teamId, draftKrs, initiatives, profileId, createBundle, sessionId, 
    completeSession, handleClose, navigate, isShared, responsibilityModel, contributingTeamIds
  ]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'intro':
        const userName = profile?.display_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined;
        return (
          <TeamOkrIntroStep
            teamName={teamName}
            userName={userName}
            onContinue={() => setCurrentStep('context')}
          />
        );

      case 'context':
        return (
          <TeamOkrContextStep
            teamName={teamName}
            orgObjectives={orgObjectivesForContext}
            strategicKpis={strategicKpis}
            isLoading={isLoadingOrgOkrs}
            impactReflection={impactReflection}
            onImpactReflectionChange={setImpactReflection}
            onContinue={() => setCurrentStep('retrospective')}
            onBack={() => setCurrentStep('intro')}
          />
        );

      case 'retrospective':
        return (
          <TeamOkrRetrospectiveStep
            teamName={teamName}
            analysis={previousCycleAnalysis || null}
            isLoading={isLoadingRetro}
            onContinue={() => setCurrentStep('objective')}
            onBack={() => setCurrentStep('context')}
          />
        );

      case 'objective':
        return (
          <TeamOkrObjectiveStep
            teamName={teamName}
            orgObjectives={orgObjectivesForContext}
            objectiveTitle={objectiveTitle}
            objectiveDescription={objectiveDescription}
            selectedOrgObjectiveId={selectedOrgObjectiveId}
            onObjectiveTitleChange={setObjectiveTitle}
            onObjectiveDescriptionChange={setObjectiveDescription}
            onOrgObjectiveSelect={setSelectedOrgObjectiveId}
            onContinue={() => setCurrentStep('sharing')}
            onBack={() => setCurrentStep('retrospective')}
          />
        );

      case 'sharing':
        return (
          <TeamOkrSharingStep
            objectiveTitle={objectiveTitle}
            teamId={teamId}
            teamName={teamName}
            isShared={isShared}
            responsibilityModel={responsibilityModel}
            ownerType={ownerType}
            primaryTeamId={primaryTeamId}
            contributingTeamIds={contributingTeamIds}
            availableTeams={availableTeams}
            isLoadingTeams={isLoadingTeams}
            onIsSharedChange={setIsShared}
            onResponsibilityModelChange={setResponsibilityModel}
            onOwnerTypeChange={setOwnerType}
            onPrimaryTeamChange={setPrimaryTeamId}
            onContributingTeamsChange={setContributingTeamIds}
            onContinue={() => setCurrentStep('kr-type')}
            onBack={() => setCurrentStep('objective')}
          />
        );

      case 'kr-type':
        return (
          <TeamOkrKrTypeStep
            objectiveTitle={objectiveTitle}
            krPlan={krPlan}
            onKrPlanChange={setKrPlan}
            onContinue={() => setCurrentStep('kr-detail')}
            onBack={() => setCurrentStep('sharing')}
          />
        );

      case 'kr-detail':
        return (
          <TeamOkrKrDetailStep
            objectiveTitle={objectiveTitle}
            krPlan={krPlan}
            draftKrs={draftKrs}
            teamMembers={teamMembers}
            onDraftKrsChange={setDraftKrs}
            onContinue={() => setCurrentStep('dependencies')}
            onBack={() => setCurrentStep('kr-type')}
          />
        );

      case 'dependencies':
        return (
          <TeamOkrDependenciesStep
            draftKrs={draftKrs}
            dependencies={dependencies}
            onDependenciesChange={setDependencies}
            onContinue={() => setCurrentStep('initiatives')}
            onBack={() => setCurrentStep('kr-detail')}
            onSkip={() => setCurrentStep('initiatives')}
          />
        );

      case 'initiatives':
        return (
          <TeamOkrInitiativesStep
            draftKrs={draftKrs}
            initiatives={initiatives}
            teamMembers={teamMembers}
            onInitiativesChange={setInitiatives}
            onContinue={() => setCurrentStep('share')}
            onBack={() => setCurrentStep('dependencies')}
            onSkip={() => setCurrentStep('share')}
          />
        );

      case 'share':
        return (
          <TeamOkrShareStep
            teamName={teamName}
            objectiveTitle={objectiveTitle}
            draftKrs={draftKrs}
            initiatives={initiatives}
            isSubmitting={createBundle.isPending}
            onSubmit={handleSubmit}
            onBack={() => setCurrentStep('initiatives')}
          />
        );

      default:
        return null;
    }
  };

  return (
    <WizardShell
      open={open}
      onOpenChange={onOpenChange}
      persona="team-okr-creation"
      title={config.title}
      subtitle={config.description}
      steps={config.steps}
      currentStepIndex={stepIndex}
      onClose={handleClose}
      context={{
        mode: 'team',
        teamId,
        teamName,
        onTeamChange,
      }}
    >
      {renderStepContent()}
    </WizardShell>
  );
}
