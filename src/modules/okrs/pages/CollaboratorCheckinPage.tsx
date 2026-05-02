/**
 * CollaboratorCheckinPage - Full-page wizard para check-in do colaborador
 * 
 * Admins podem selecionar outro usuário para visualizar/executar o check-in.
 * v2.2: Suporte a KPIs do colaborador (fail-safe)
 * v2.87: Migrado para useKpisForWizardV2 (inclui contribuidores de dados)
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { AdminContextSwitcher } from '@/modules/okrs/components/wizards/shared/AdminContextSwitcher';
import { 
  useGenericWizardDraft,
  useActiveCycle,
  useUserKrsForWizard,
  useLastCompletedSession,
} from '@/modules/okrs/hooks';
import { useKpisForWizardV2 } from '@/modules/kpis/hooks';
import { useCreateCheckin } from '@/modules/okrs/hooks/useCreateCheckin';
import { useUpdateMilestone } from '@/modules/projects/hooks/useMilestoneMutations';
import { useUpdateDecisionFollowUp, useDecisionThread } from '@/modules/okrs/hooks';
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
import { CollaboratorProjectsStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorProjectsStep';
import { CollaboratorInitiativesStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorInitiativesStep';
import { CollaboratorReflectionStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorReflectionStep';
import { CollaboratorSummary } from '@/modules/okrs/components/wizards/collaborator/CollaboratorSummary';
import { CollaboratorDecisionsStep } from '@/modules/okrs/components/wizards/collaborator/CollaboratorDecisionsStep';

import type {
  CollaboratorCheckinResult,
  CollaboratorReflection,
  KpiCheckinResult,
  PendingMilestoneStatusChange,
  PendingDecisionFollowUpUpdate,
  PendingDecisionThreadMessage,
} from '@/modules/okrs/types/wizard';
import type { KpiForWizardV2 } from '@/modules/kpis/types';
import {
  WIZARD_STEPS,
  STEP_ORDER,
  type WizardStep,
} from '@/modules/okrs/components/wizards/collaborator/wizardSteps';

// ============================================================
// TYPES
// ============================================================


interface CollaboratorDraftData {
  currentKrIndex: number;
  currentKpiIndex: number;
  results: CollaboratorCheckinResult[];
  kpiResults: KpiCheckinResult[];
  reflection: CollaboratorReflection;
  /** @deprecated Step de iniciativas migrou para `InitiativeCard`; lista permanece por retrocompat de snapshots, mas é sempre `[]`. */
  initiativesMarkedAtRisk: string[];
  /**
   * Mudanças bufferizadas de status de milestones (toggle inline no step de Projetos).
   * Persistidas em batch ao Concluir.
   */
  pendingMilestoneStatusChanges: PendingMilestoneStatusChange[];
  /**
   * Atualizações bufferizadas de follow-up de decisões (step de Pendências).
   */
  pendingFollowUpUpdates: PendingDecisionFollowUpUpdate[];
  /**
   * Mensagens bufferizadas de thread de decisões (step de Pendências).
   */
  pendingThreadMessages: PendingDecisionThreadMessage[];
}

// WIZARD_STEPS / STEP_ORDER vivem em ./components/wizards/collaborator/wizardSteps
// (SSOT compartilhado com o Step 1, que deriva snapshot e trilha dessa ordem).


const DEFAULT_DATA: CollaboratorDraftData = {
  currentKrIndex: 0,
  currentKpiIndex: 0,
  results: [],
  kpiResults: [],
  reflection: {},
  initiativesMarkedAtRisk: [],
  pendingMilestoneStatusChanges: [],
  pendingFollowUpUpdates: [],
  pendingThreadMessages: [],
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
  
  usePageTitle(canSwitchUser && userIdParam ? `Check-in - ${effectiveUserName}` : 'Check-in Individual');
  
  // Get cycle (status-based) — optional for collaborator check-in
  const { activeQuarterlyCycle: quarterlyCycle, isLoading: isLoadingCycles } = useActiveCycle();
  
  // Draft persistence — always enabled, uses fallback key when no cycle
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
    cycleId: quarterlyCycle?.id || 'no-cycle',
    defaultStep: 'context',
    defaultData: DEFAULT_DATA,
    enabled: true,
  });
  
  // Fetch user KRs (for effective user)
  const { data: userKrs, isLoading: isLoadingKrs } = useUserKrsForWizard(
    quarterlyCycle?.id || null,
    'all',
    effectiveUserId
  );
  
  const hasKrStep = !!(userKrs && userKrs.length > 0);
  
  // Fetch user KPIs (fail-safe) - v2.87: usando V2 para incluir contribuidores
  const { 
    kpisToUpdate: userKpis, 
    isLoading: isLoadingKpis 
  } = useKpisForWizardV2({
    userId: effectiveUserId || undefined,
    scope: 'collaborator',
  });

  const hasKpiStep = !!(userKpis && userKpis.length > 0);

  // Dynamic steps: omit steps without data (KRs, KPIs).
  // Centralizar regra evita loops de back/forward causados por auto-skip
  // dentro dos componentes de step.
  const visibleSteps = useMemo(
    () =>
      WIZARD_STEPS.filter(s => {
        if (s.id === 'checkin' && !hasKrStep) return false;
        if (s.id === 'kpis' && !hasKpiStep) return false;
        return true;
      }),
    [hasKrStep, hasKpiStep],
  );

  const visibleStepOrder = useMemo(
    () =>
      STEP_ORDER.filter(s => {
        if (s === 'checkin' && !hasKrStep) return false;
        if (s === 'kpis' && !hasKpiStep) return false;
        return true;
      }),
    [hasKrStep, hasKpiStep],
  );
  
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
      // v3.0.0: input_type é obrigatório para o trigger DB derive_confidence
      // funcionar corretamente. Default `consolidated` para retrocompat.
      input_type?: 'consolidated' | 'partial';
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
          input_type: data.input_type ?? 'consolidated',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_result, variables) => {
      // Invalidate silently
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.forWizard({}), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.kpis.detailPrefixById(variables.kpi_id), refetchType: 'active' });
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
    const currentIdx = visibleStepOrder.indexOf(draft.currentStep);
    for (let i = 0; i < currentIdx; i++) {
      completed.push(visibleStepOrder[i]);
    }
    return completed;
  }, [draft.currentStep, visibleStepOrder]);
  
  const goToStep = useCallback((stepId: string) => {
    setStep(stepId as WizardStep);
  }, [setStep]);
  
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

  // Auto-correct: se o step atual saiu do visibleStepOrder (dados chegaram
  // depois e removeram 'kpis'/'checkin', ou URL ?step= aponta para step
  // indisponível), reposiciona via efeito — nunca durante render.
  useEffect(() => {
    if (visibleStepOrder.length === 0) return;
    if (!visibleStepOrder.includes(draft.currentStep)) {
      setStep(visibleStepOrder[0]);
    }
  }, [visibleStepOrder, draft.currentStep, setStep]);

  // Handlers
  // handleClose is a no-op: FullPageWizardShell handles navigation.
  // Draft stays as in_progress for later resumption — only handleComplete marks as completed.
  const handleClose = useCallback(() => {}, []);
  
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
  
  const [isCompleting, setIsCompleting] = useState(false);

  // Mutations centralizadas — invocadas APENAS no Concluir do Summary.
  // Steps individuais não persistem mais; apenas escrevem no draft.
  const createCheckin = useCreateCheckin({ skipToast: true });
  const updateMilestoneMutation = useUpdateMilestone();
  const { mutateAsync: updateFollowUpAsync } = useUpdateDecisionFollowUp();
  const { mutateAsync: addThreadMessageAsync } = useDecisionThread();

  /**
   * Persistência em batch — único ponto onde o Check-in Individual grava
   * dados. Política de erro:
   *   - Falhas em okr_checkins (críticas) impedem `clearDraft` para o
   *     usuário poder reabrir e tentar novamente.
   *   - Falhas em KPIs/milestones/decisões viram toast de aviso, mas não
   *     bloqueiam a conclusão (compatível com o fail-safe original do KPI).
   */
  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    try {
      const krResults = (draft.data.results ?? []).filter(Boolean);
      const kpiResultsList = (draft.data.kpiResults ?? []).filter(Boolean);
      const milestoneChanges = draft.data.pendingMilestoneStatusChanges ?? [];
      const followUpUpdates = draft.data.pendingFollowUpUpdates ?? [];
      const threadMessages = draft.data.pendingThreadMessages ?? [];

      // 1) okr_checkins — críticos. Sequencial p/ trigger DB respeitar ordem por KR.
      let krFailures = 0;
      for (const r of krResults) {
        if (r.skipped) continue;
        try {
          await createCheckin.mutateAsync({
            krId: r.krId,
            currentValue: r.newValue,
            previousValue: r.previousValue,
            confidence: r.confidence,
            comments: r.comment ?? '',
            teamId: null,
          });
        } catch (e) {
          krFailures += 1;
          console.error('[CollaboratorCheckin] KR check-in failed:', r.krId, e);
        }
      }

      // 2) kpi_values — fail-safe (warning toast, sem bloquear).
      const kpiSettled = await Promise.allSettled(
        kpiResultsList
          .filter((k) => !k.skipped)
          .map((k) =>
            addKpiValueSilent.mutateAsync({
              kpi_id: k.kpiId,
              value: k.newValue,
              reference_date: k.referenceDate,
              notes: k.notes,
              source: 'manual',
              created_by: profile?.id,
              input_type: k.inputType ?? 'consolidated',
            }),
          ),
      );
      const kpiFailures = kpiSettled.filter((s) => s.status === 'rejected').length;

      // 3) project_milestones — fail-safe.
      const msSettled = await Promise.allSettled(
        milestoneChanges.map((m) =>
          updateMilestoneMutation.mutateAsync({
            id: m.milestoneId,
            project_id: m.projectId,
            status: m.status,
          }),
        ),
      );
      const msFailures = msSettled.filter((s) => s.status === 'rejected').length;

      // 4) decision follow-ups + thread messages — fail-safe.
      const decSettled = await Promise.allSettled([
        ...followUpUpdates.map((u) =>
          updateFollowUpAsync({
            sessionId: u.sessionId,
            decisionId: u.decisionId,
            updates: u.updates,
          }),
        ),
        ...threadMessages.map((m) =>
          addThreadMessageAsync({
            sessionId: m.sessionId,
            decisionId: m.decisionId,
            content: m.content,
          }),
        ),
      ]);
      const decFailures = decSettled.filter((s) => s.status === 'rejected').length;

      const sideFailures = kpiFailures + msFailures + decFailures;

      if (krFailures > 0) {
        // Erros críticos — preserva draft.
        toast.error(
          `${krFailures} check-in(s) de KR não foram salvos. Seu rascunho foi preservado — tente concluir novamente.`,
        );
        return;
      }

      if (sideFailures > 0) {
        toast.warning(
          `Check-in registrado, mas ${sideFailures} item(ns) auxiliar(es) falhou(aram). Verifique nos respectivos módulos.`,
        );
      }

      const completedSessionId = await clearDraft();
      if (krFailures === 0 && sideFailures === 0) toast.success('Check-in concluído!');

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
    } finally {
      setIsCompleting(false);
    }
  }, [
    clearDraft,
    navigate,
    buSupabase,
    currentBu,
    draft.data.results,
    draft.data.kpiResults,
    draft.data.pendingMilestoneStatusChanges,
    draft.data.pendingFollowUpUpdates,
    draft.data.pendingThreadMessages,
    createCheckin,
    addKpiValueSilent,
    updateMilestoneMutation,
    updateFollowUpAsync,
    addThreadMessageAsync,
    profile?.id,
  ]);
  
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
            userName={effectiveUserName}
            effectiveUserId={effectiveUserId}
            cycleId={quarterlyCycle?.id ?? null}
            cycleName={quarterlyCycle?.name || 'Sem ciclo ativo'}
            lastCompletedAt={lastCheckin.lastCompletedAt}
            visibleStepOrder={visibleStepOrder}
            onContinue={goNext}
          />
        );
        
      case 'checkin': {
        // Normaliza índice: drafts antigos podem ter currentKrIndex fora do range
        // (ex.: lista de KRs encolheu desde a última sessão).
        const safeIndex = krs.length > 0
          ? Math.min(Math.max(0, draft.data.currentKrIndex || 0), krs.length - 1)
          : 0;
        const currentKr = krs[safeIndex];
        if (!currentKr) {
          // Sem KR: nada a renderizar. O auto-correct effect (visibleStepOrder)
          // moverá o usuário para um step válido quando hasKrStep=false.
          return null;
        }
        if (safeIndex !== draft.data.currentKrIndex) {
          // Reposiciona via efeito no próximo tick (fora do render).
          queueMicrotask(() => updateDraft({ currentKrIndex: safeIndex }));
        }
        return (
          <CollaboratorCheckinStep
            kr={currentKr}
            currentIndex={safeIndex}
            totalCount={krs.length}
            onComplete={(result) => {
              const newResults = [...draft.data.results];
              newResults[safeIndex] = result;
              const nextIndex = safeIndex + 1;
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
              const nextIndex = safeIndex + 1;
              if (nextIndex >= krs.length) {
                goNext();
              } else {
                updateDraft({ currentKrIndex: nextIndex });
              }
            }}
            onBack={() => {
              if (safeIndex > 0) {
                updateDraft({ currentKrIndex: safeIndex - 1 });
              } else {
                goBack();
              }
            }}
          />
        );
      }

      case 'kpis': {
        // v2.87: KPIs agora são do tipo KpiForWizardV2
        const currentKpi = kpis[draft.data.currentKpiIndex] as KpiForWizardV2 | undefined;
        if (!currentKpi || kpis.length === 0) {
          // Sem KPI: nada a renderizar. visibleStepOrder remove 'kpis'
          // quando vazio; o auto-correct effect reposiciona o usuário.
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
            onComplete={(result) => {
              // Bufferizar APENAS no draft. Persistência (`kpi_values.insert`)
              // acontece no Concluir do Summary (handleComplete em batch).
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
      }

      case 'projects': {
        const pendingMap: Record<string, import('@/modules/projects/types').MilestoneStatus> = {};
        for (const c of draft.data.pendingMilestoneStatusChanges ?? []) {
          pendingMap[c.milestoneId] = c.status;
        }
        return (
          <CollaboratorProjectsStep
            effectiveUserId={effectiveUserId}
            onContinue={goNext}
            onBack={goBack}
            onSkip={goNext}
            pendingMilestoneStatusChanges={pendingMap}
            onMilestoneStatusChange={(milestoneId, projectId, status) => {
              const list = (draft.data.pendingMilestoneStatusChanges ?? []).filter(
                (c) => c.milestoneId !== milestoneId,
              );
              list.push({ milestoneId, projectId, status });
              updateDraft({ pendingMilestoneStatusChanges: list });
            }}
          />
        );
      }

      case 'initiatives':
        return (
          <CollaboratorInitiativesStep
            krs={krs}
            effectiveUserId={effectiveUserId}
            cycleId={quarterlyCycle?.id ?? null}
            onContinue={(markedAtRisk) => {
              updateDraft({ initiativesMarkedAtRisk: markedAtRisk });
              goNext();
            }}
            onBack={goBack}
            onSkip={goNext}
          />
        );
        
      case 'decisions':
        return (
          <CollaboratorDecisionsStep
            effectiveUserId={effectiveUserId}
            onContinue={goNext}
            onBack={goBack}
            onSkip={goNext}
            pendingFollowUpUpdates={draft.data.pendingFollowUpUpdates ?? []}
            onPendingFollowUpUpdate={(update) => {
              const list = (draft.data.pendingFollowUpUpdates ?? []).filter(
                (u) => !(u.sessionId === update.sessionId && u.decisionId === update.decisionId),
              );
              list.push(update);
              updateDraft({ pendingFollowUpUpdates: list });
            }}
            pendingThreadMessages={draft.data.pendingThreadMessages ?? []}
            onPendingThreadMessage={(msg) => {
              updateDraft({
                pendingThreadMessages: [...(draft.data.pendingThreadMessages ?? []), msg],
              });
            }}
          />
        );

      case 'reflection':
        return (
          <CollaboratorReflectionStep
            results={(draft.data.results ?? []).filter(Boolean)}
            onComplete={(reflection) => {
              updateDraft({ reflection });
              goNext();
            }}
            onBack={goBack}
            onSkip={() => {
              updateDraft({ reflection: {} });
              goNext();
            }}
          />
        );
        
      case 'summary':
        // Compactar arrays: usuários podem pular KRs/KPIs sem preencher slots
        // intermediários, gerando entradas null/undefined no array esparso.
        return (
          <CollaboratorSummary
            results={(draft.data.results ?? []).filter(Boolean)}
            kpiResults={(draft.data.kpiResults ?? []).filter(Boolean)}
            reflection={draft.data.reflection}
            initiativesMarkedAtRisk={draft.data.initiativesMarkedAtRisk}
            onViewOkrs={() => navigate('/okrs')}
            onClose={handleComplete}
            onBack={goBack}
            isSubmitting={isCompleting}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <FullPageWizardShell
      title="Check-in Individual"
      subtitle={hasKrStep ? "Atualize seus KRs e reflita sobre o progresso" : "Atualize seus KPIs, projetos e reflexões"}
      steps={visibleSteps.map(s => ({ id: s.id, label: s.label, description: s.description }))}
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
