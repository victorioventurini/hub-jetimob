/**
 * TeamKrCreationPage - Página do Wizard de Criação de KRs
 * 
 * Wizard full-page para criar Key Results para um objetivo existente
 * URL: /okrs/objectives/:objectiveId/krs/create
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { getBuScopedClientCurrentBuId } from '@/integrations/supabase/buScopedClient';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { FullPageWizardShell } from '../components/wizards/shared/FullPageWizardShell';
import { WIZARD_CONFIGS } from '../types/wizard';
import { useKrWizardDraft, useCreateTeamKrBundle, type KrWizardStep } from '@/modules/okrs/hooks';
import { useCanManageTeamOkr } from '@/modules/okrs/hooks/useCanManageTeamOkr';
import { useTeam } from '@/modules/teams/hooks';
import { Button } from '@/components/ui/button';
import { ResourceNotFoundState } from '@/components/ui/resource-not-found-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ShieldAlert } from 'lucide-react';

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
  const { client: supabase, isReady } = useOptionalBuClient();
  const { currentBuId } = useBu();
  
  const createKrBundle = useCreateTeamKrBundle();

  // ── Fetch objective data ──
  // BU incluído na key para evitar reuso de cache stale ao alternar de BU.
  const { data: objective, isLoading: objectiveLoading, isFetched: objectiveFetched } = useQuery({
    queryKey: queryKeys.okrs.teamObjectiveDetail(objectiveId || '', currentBuId),
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
          bu_id,
          teams:team_id (id, name),
          org_objective:org_objective_id (title),
          cycle:cycle_id (name, year)
        `)
        .eq('id', objectiveId)
        .is('cancelled_at', null)
        .maybeSingle();

      if (error) throw error;
      // Defensive BU isolation (RLS já filtra, mas garantimos no frontend
      // conforme DEVELOPMENT_STANDARDS §A.3 / TCR regra inquebrável #1).
      // Nunca remover este guard. Telemetria abaixo classifica falsos positivos.
      if (data && currentBuId && data.bu_id !== currentBuId) {
        console.warn('[TeamKrCreationPage] BU mismatch discard', {
          objectiveId,
          currentBuId,
          dataBuId: data.bu_id,
          headerBuId: getBuScopedClientCurrentBuId(),
        });
        return null;
      }
      return data;
    },
    // Inclui currentBuId para evitar disparar a query antes do BU estabilizar
    // (race onde header já está setado mas useBu() ainda retornou null).
    enabled: isReady && !!supabase && !!objectiveId && !!currentBuId,
  });

  // ── Diagnóstico secundário: classifica por que `objective` veio null ──
  // Roda APENAS quando a query principal terminou e retornou null. Usa o mesmo
  // cliente BU-scoped (não cross-BU), preservando §A.3.
  const { data: diagnostic } = useQuery({
    queryKey: [...queryKeys.okrs.teamObjectiveDetail(objectiveId || '', currentBuId), 'diagnostic'],
    queryFn: async () => {
      if (!supabase || !objectiveId) return null;
      const { data } = await supabase
        .from('okr_team_objectives')
        .select('id, bu_id, cancelled_at')
        .eq('id', objectiveId)
        .maybeSingle();
      return data;
    },
    enabled:
      isReady &&
      !!supabase &&
      !!objectiveId &&
      !!currentBuId &&
      objectiveFetched &&
      !objective,
    staleTime: 0,
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
    enabled: isReady && !!supabase && !!objectiveId && !!objective?.is_shared,
  });

  // ── Contributor mode (cross-team KR) ──
  const contributorTeamId = searchParams.get('contributor_team_id');
  const isContribution = !!contributorTeamId && !!objective && contributorTeamId !== objective.team_id;

  // Validate contributor authorization
  useEffect(() => {
    if (!isContribution || !objective || contributors === undefined) return;
    const isAuthorized = contributors.some((c: any) => c.team_id === contributorTeamId);
    if (!isAuthorized) {
      toast.error('Seu time não está autorizado a contribuir com este objetivo.');
      navigate(`/okrs?view=team&team_id=${contributorTeamId}`, { replace: true });
    }
  }, [isContribution, objective, contributors, contributorTeamId, navigate]);

  // ── Team data including members ──
  // effectiveTeamId = time DONO do KR (contribuidor em modo contribuição, owner do objetivo caso contrário)
  const ownerTeamId = objective?.team_id;
  const effectiveTeamId = isContribution ? contributorTeamId! : ownerTeamId;
  const { data: teamData } = useTeam(effectiveTeamId);
  const { data: ownerTeamData } = useTeam(isContribution ? ownerTeamId : undefined);

  // ── Permission gate (evita erro RLS no submit) ──
  const { canManage, isLoading: canManageLoading } = useCanManageTeamOkr(effectiveTeamId);

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
    teamId: effectiveTeamId || '',
    cycleId: objective?.cycle_id || null,
    enabled: !!objectiveId && !!effectiveTeamId,
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

  // ── Sync URL with step (preserva outros params como contributor_team_id) ──
  useEffect(() => {
    if (draft?.currentStep && draft.currentStep !== currentStepFromUrl) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('step', draft.currentStep);
        return next;
      }, { replace: true });
    }
  }, [draft?.currentStep, currentStepFromUrl, setSearchParams]);

  // ── Navigation handlers ──
  const goToStep = useCallback((step: KrWizardStep) => {
    setStep(step);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('step', step);
      return next;
    }, { replace: true });
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
    if (!draft || !objectiveId || !effectiveTeamId) return;

    try {
      await createKrBundle.mutateAsync({
        objectiveId,
        teamId: effectiveTeamId,
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
      navigate(isContribution ? `/okrs?view=team&team_id=${effectiveTeamId}` : '/okrs');
    } catch (error) {
      console.error('Failed to create KRs:', error);
    }
  }, [draft, objectiveId, effectiveTeamId, isContribution, createKrBundle, clearDraft, navigate]);

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
      isContribution,
      contributorTeamName: isContribution ? (teamData?.name || null) : null,
    };
  }, [objective, contributors, isContribution, teamData?.name]);

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
    const totalKrs = draft.krPlan.foundational + draft.krPlan.contribution + draft.krPlan.enabler;
    if (totalKrs > 0 && WIZARD_STEPS.indexOf(draft.currentStep) > 2) {
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
  // Esperamos o BU client estar pronto + a query terminar (loading e fetched)
  // E o gate de permissão resolver. Sem isso, qualquer "esperando dependência"
  // virava loading infinito.
  if (!isReady || !currentBuId || objectiveLoading || !objectiveFetched || canManageLoading) {
    return <LoadingState fullPage text="Carregando..." />;
  }

  // ── Resource not found (classificado pelo diagnóstico secundário) ──
  if (!objective) {
    // Classificação: o diagnóstico usa o MESMO cliente BU-scoped, sem cross-BU lookup.
    // - cancelled_at != null → objetivo foi cancelado.
    // - row encontrada e ativa → guard §A.3 descartou por race de hidratação.
    //   Mostramos estado "context_loading" e a query refaz quando currentBuId estabilizar.
    // - row null → realmente inexistente / sem permissão RLS.
    const isCancelled = !!diagnostic?.cancelled_at;
    const isContextRace = !!diagnostic && !diagnostic.cancelled_at;
    const variant = isCancelled
      ? 'cancelled'
      : isContextRace
        ? 'context_loading'
        : 'not_found';
    const customMessage = isCancelled
      ? 'Este objetivo foi cancelado e não pode mais receber novos Key Results.'
      : isContextRace
        ? 'Estamos finalizando o carregamento da sua Business Unit. Recarregue a página em alguns segundos.'
        : isContribution
          ? 'Não foi possível abrir o objetivo para criação de KR de contribuição. Ele pode ter sido removido ou seu time não está autorizado a contribuir.'
          : 'O objetivo que você tentou acessar foi removido ou você não tem permissão para visualizá-lo.';
    return (
      <ResourceNotFoundState
        resourceType="objetivo"
        resourceId={objectiveId}
        moduleRoot="/okrs"
        viewAllLabel="Ver OKRs"
        variant={variant}
        customMessage={customMessage}
        showResourceId
      />
    );
  }

  // ── Defensive: guarda do contexto do objetivo (caso derivação falhe) ──
  if (!objectiveContext) {
    return <LoadingState fullPage text="Carregando..." />;
  }

  // ── Permission gate ──
  if (!canManage) {
    return (
      <div className="h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <ShieldAlert className="w-12 h-12 mx-auto text-warning" />
          <h2 className="text-xl font-semibold">Sem permissão para criar KRs</h2>
          <p className="text-muted-foreground text-sm">
            {isContribution
              ? 'Você não pode criar KRs em nome deste time contribuidor. Apenas líderes do time (ou administradores) podem fazer isso.'
              : 'Você não tem permissão para criar KRs neste time.'}
          </p>
          <Button
            onClick={() => navigate(`/okrs?view=team&team_id=${effectiveTeamId}`)}
          >
            Voltar para OKRs do time
          </Button>
        </div>
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
            teamId={effectiveTeamId}
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
            teamId={effectiveTeamId}
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
