/**
 * CollaboratorCheckinPage - Full-page wizard para check-in do colaborador
 * 
 * Admins podem selecionar outro usuário para visualizar/executar o check-in.
 * v2.2: Suporte a KPIs do colaborador (fail-safe)
 * v2.87: Migrado para useKpisForWizardV2 (inclui contribuidores de dados)
 */

import { useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { AdminContextSwitcher } from '@/modules/okrs/components/wizards/shared/AdminContextSwitcher';
import { 
  useGenericWizardDraft,
  useActiveCycles,
  useUserKrsForWizard,
  useLastCompletedSession,
} from '@/modules/okrs/hooks';
import { useKpisForWizardV2 } from '@/modules/kpis/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useOptionalImpersonation } from '@/contexts/ImpersonationContext';
import { useBuUsersDirectory } from '@/hooks/useBuUsersDirectory';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';

// Step components
import { CollaboratorContextStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorContextStep';
import { CollaboratorCheckinStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorCheckinStep';
import { CollaboratorKpiStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorKpiStep';
import { CollaboratorInitiativesStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep';
import { CollaboratorReflectionStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorReflectionStep';
import { CollaboratorSummary } from '@/modules/okrs/components/wizards/collaborator/CollaboratorSummary';

import type { CollaboratorCheckinResult, CollaboratorReflection, KpiCheckinResult } from '@/modules/okrs/types/wizard';
import type { KpiForWizardV2 } from '@/modules/kpis/types';

// ============================================================
// TYPES
// ============================================================

type WizardStep = 'context' | 'checkin' | 'kpis' | 'initiatives' | 'reflection' | 'summary';

interface CollaboratorDraftData {
  currentKrIndex: number;
  currentKpiIndex: number;
  results: CollaboratorCheckinResult[];
  kpiResults: KpiCheckinResult[];
  reflection: CollaboratorReflection;
  initiativesMarkedAtRisk: string[];
}

const WIZARD_STEPS = [
  { id: 'context' as const, label: 'Contexto', description: 'Visão geral dos KRs e KPIs' },
  { id: 'checkin' as const, label: 'Check-in', description: 'Atualização dos KRs' },
  { id: 'kpis' as const, label: 'KPIs', description: 'Atualização dos indicadores' },
  { id: 'initiatives' as const, label: 'Iniciativas', description: 'Revisão de atividades' },
  { id: 'reflection' as const, label: 'Reflexão', description: 'Aprendizados' },
  { id: 'summary' as const, label: 'Resumo', description: 'Visão consolidada' },
];

const STEP_ORDER: WizardStep[] = ['context', 'checkin', 'kpis', 'initiatives', 'reflection', 'summary'];

const DEFAULT_DATA: CollaboratorDraftData = {
  currentKrIndex: 0,
  currentKpiIndex: 0,
  results: [],
  kpiResults: [],
  reflection: {},
  initiativesMarkedAtRisk: [],
};

// ============================================================
// COMPONENT
// ============================================================

export default function CollaboratorCheckinPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, isAdmin, isLoading: isAuthLoading } = useAuth();
  const { isImpersonating } = useOptionalImpersonation();
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();
  const lastCheckin = useLastCompletedSession('collaborator-checkin');
  
  // Check if user is admin - isAdmin already includes super_admin
  // During impersonation, disable user switch since it's redundant
  const canSwitchUser = !isImpersonating && isAdmin;
  
  // URL param for user impersonation (admin only)
  const userIdParam = searchParams.get('user');
  const effectiveUserId = userIdParam || profile?.id || null;
  
  // Find effective user name
  const { data: allUsers = [], isLoading: isLoadingUsers } = useBuUsersDirectory({ 
    pageSize: 200,
    enabled: canSwitchUser,
  });
  
  const effectiveUserName = useMemo(() => {
    if (!canSwitchUser || !userIdParam) {
      return profile?.display_name || profile?.first_name || 'Você';
    }
    const user = allUsers.find(u => u.id === userIdParam);
    return user?.display_name || 'Usuário';
  }, [canSwitchUser, userIdParam, allUsers, profile]);
  
  
  // Handle user change (admin only)
  const handleUserChange = useCallback((newUserId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (newUserId === profile?.id) {
      newParams.delete('user');
    } else {
      newParams.set('user', newUserId);
    }
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams, profile?.id]);
  
  usePageTitle(canSwitchUser && userIdParam ? `Check-in - ${effectiveUserName}` : 'Check-in Semanal');
  
  // Get cycle
  const { data: activeCycles, isLoading: isLoadingCycles } = useActiveCycles();
  const quarterlyCycle = useMemo(() => 
    activeCycles?.find(c => c.type === 'quarter') || activeCycles?.[0] || null,
    [activeCycles]
  );
  
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
  } = useGenericWizardDraft<WizardStep, CollaboratorDraftData>({
    wizardType: 'collaborator',
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'context',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle,
  });
  
  // Fetch user KRs (for effective user)
  const { data: userKrs, isLoading: isLoadingKrs } = useUserKrsForWizard(
    quarterlyCycle?.id || null,
    'all',
    effectiveUserId
  );
  
  // Fetch user KPIs (fail-safe) - v2.87: usando V2 para incluir contribuidores
  const { 
    kpisToUpdate: userKpis, 
    isLoading: isLoadingKpis 
  } = useKpisForWizardV2({
    userId: effectiveUserId || undefined,
    scope: 'collaborator',
  });
  
  // v2.87: Mutation silenciosa para KPI (fail-safe, sem toast de erro)
  const supabase = buSupabase;
  const queryClient = useQueryClient();
  
  const addKpiValueSilent = useMutation({
    mutationFn: async (data: {
      kpi_id: string;
      value: number;
      reference_date: string;
      source?: 'manual' | 'integration' | 'calculation';
      notes?: string;
      created_by?: string;
      confidence?: 'high' | 'medium' | 'low';
    }) => {
      const { data: result, error } = await supabase
        .from("kpi_values")
        .insert({
          kpi_id: data.kpi_id,
          value: data.value,
          reference_date: data.reference_date,
          source: data.source || "manual",
          notes: data.notes || null,
          created_by: data.created_by || null,
          confidence: data.confidence || 'medium',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_result, variables) => {
      // Invalidate silently
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.forWizard({}), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.detail(variables.kpi_id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      // Invalidar queries do módulo /kpis para refletir valores salvos
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.valuesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all(null), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.kpiWithHistory(variables.kpi_id), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.listPrefix(), refetchType: 'active' });
    },
    // NO onError toast - completely silent
  });
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
    setStep(stepId as WizardStep);
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
      toast.success('Rascunho salvo! Você pode continuar depois.');
    } catch (error) {
      handleError(error, { context: 'OKR Draft Save' });
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
    toast.success('Check-in concluído!');

    // Fire-and-forget summary email BEFORE navigating (avoids fetch cancellation)
    if (completedSessionId && currentBu?.id) {
      buSupabase.functions.invoke('collaborator-checkin-summary', {
        body: {
          sessionId: completedSessionId,
          bu_id: currentBu.id,
        },
      }).catch((e: unknown) => console.warn('Collaborator summary email failed (non-blocking):', e));
    }

    navigate('/wizards');
  }, [clearDraft, navigate, buSupabase, currentBu]);
  
  // Loading - include auth loading to ensure profile is available
  if (isAuthLoading || isLoadingCycles || isLoadingKrs || isLoadingKpis) {
    return <LoadingState text="Carregando..." fullPage />;
  }
  
  // Render step content
  const renderStepContent = () => {
    const krs = userKrs || [];
    const kpis = userKpis || [];
    
    switch (draft.currentStep) {
      case 'context':
        return (
          <CollaboratorContextStep
            krs={krs}
            kpisToUpdate={kpis}
            cycleName={quarterlyCycle?.name || 'Ciclo atual'}
            lastCompletedAt={lastCheckin.lastCompletedAt}
            onContinue={goNext}
          />
        );
        
      case 'checkin':
        const currentKr = krs[draft.data.currentKrIndex];
        if (!currentKr) {
          goNext();
          return null;
        }
        return (
          <CollaboratorCheckinStep
            kr={currentKr}
            currentIndex={draft.data.currentKrIndex}
            totalCount={krs.length}
            onComplete={(result) => {
              const newResults = [...draft.data.results];
              newResults[draft.data.currentKrIndex] = result;
              const nextIndex = draft.data.currentKrIndex + 1;
              if (nextIndex >= krs.length) {
                updateDraft({ results: newResults });
                goNext();
              } else {
                updateDraft({ 
                  results: newResults,
                  currentKrIndex: nextIndex 
                });
              }
            }}
            onSkip={() => {
              const nextIndex = draft.data.currentKrIndex + 1;
              if (nextIndex >= krs.length) {
                goNext();
              } else {
                updateDraft({ currentKrIndex: nextIndex });
              }
            }}
            onBack={() => {
              if (draft.data.currentKrIndex > 0) {
                updateDraft({ currentKrIndex: draft.data.currentKrIndex - 1 });
              } else {
                goBack();
              }
            }}
          />
        );
        
      case 'kpis':
        // v2.87: KPIs agora são do tipo KpiForWizardV2
        const currentKpi = kpis[draft.data.currentKpiIndex] as KpiForWizardV2 | undefined;
        if (!currentKpi || kpis.length === 0) {
          goNext();
          return null;
        }
        
        // Adapter para manter compatibilidade com CollaboratorKpiStep
        const kpiForStep = {
          ...currentKpi,
          // v2.87: Adiciona owner_name para mensagem de contribuidor
          owner_name: currentKpi.owner?.display_name || null,
        };
        
        return (
          <CollaboratorKpiStep
            kpi={kpiForStep}
            currentIndex={draft.data.currentKpiIndex}
            totalCount={kpis.length}
            onComplete={async (result) => {
              // FAIL-SAFE: Salvar KPI sem bloquear wizard
              // Erros são logados mas não impedem avanço
              try {
                await addKpiValueSilent.mutateAsync({
                  kpi_id: result.kpiId,
                  value: result.newValue,
                  reference_date: result.referenceDate,
                  confidence: result.confidence,
                  notes: result.notes,
                  source: 'manual',
                  created_by: profile?.id,
                });
              } catch (error) {
                // Erro logado, mas wizard continua (fail-safe)
                console.warn('[CollaboratorCheckin] KPI save failed (continuing):', error);
                toast.warning('Não foi possível salvar o valor do KPI. Tente novamente pelo módulo de KPIs.');
              }
              
              const newKpiResults = [...draft.data.kpiResults];
              newKpiResults[draft.data.currentKpiIndex] = result;
              const nextIndex = draft.data.currentKpiIndex + 1;
              if (nextIndex >= kpis.length) {
                updateDraft({ kpiResults: newKpiResults });
                goNext();
              } else {
                updateDraft({ 
                  kpiResults: newKpiResults,
                  currentKpiIndex: nextIndex 
                });
              }
            }}
            onSkip={() => {
              const nextIndex = draft.data.currentKpiIndex + 1;
              if (nextIndex >= kpis.length) {
                goNext();
              } else {
                updateDraft({ currentKpiIndex: nextIndex });
              }
            }}
            onBack={() => {
              if (draft.data.currentKpiIndex > 0) {
                updateDraft({ currentKpiIndex: draft.data.currentKpiIndex - 1 });
              } else {
                goBack();
              }
            }}
          />
        );
        
      case 'initiatives':
        return (
          <CollaboratorInitiativesStep
            krs={krs}
            onContinue={(markedAtRisk) => {
              updateDraft({ initiativesMarkedAtRisk: markedAtRisk });
              goNext();
            }}
            onBack={goBack}
            onSkip={goNext}
          />
        );
        
      case 'reflection':
        return (
          <CollaboratorReflectionStep
            results={draft.data.results}
            onComplete={(reflection) => {
              updateDraft({ reflection });
              goNext();
            }}
            onBack={goBack}
          />
        );
        
      case 'summary':
        return (
          <CollaboratorSummary
            results={draft.data.results}
            kpiResults={draft.data.kpiResults}
            reflection={draft.data.reflection}
            initiativesMarkedAtRisk={draft.data.initiativesMarkedAtRisk}
            onViewOkrs={() => navigate('/okrs')}
            onClose={handleComplete}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <FullPageWizardShell
      title="Check-in Semanal"
      subtitle="Atualize seus KRs e reflita sobre o progresso"
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
      backUrl="/wizards"
      adminContextSwitcher={
        canSwitchUser ? (
          <AdminContextSwitcher
            type="user"
            currentLabel={effectiveUserName}
            selectedId={effectiveUserId}
            onSelect={handleUserChange}
            isLoading={isLoadingUsers}
          />
        ) : undefined
      }
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
