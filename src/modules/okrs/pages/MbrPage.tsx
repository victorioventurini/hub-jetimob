/**
 * MbrPage - Full-page wizard para Monthly Business Review
 *
 * Rito decisório mensal — saúde estratégica do negócio.
 * Nível organizacional (sem seleção de time).
 *
 * Estrutura modular (refatorado 2026-05-04):
 * - mbr/constants.ts ............... WIZARD_STEPS, STEP_ORDER, DEFAULT_DATA, helpers de saúde
 * - mbr/useMbrPreDerivations ....... derivações memoizadas das submissões Pré-MBR
 * - mbr/useMbrDataSources .......... queries de KPIs e Team OKRs
 * - mbr/useMbrSeedingEffects ....... effects de seeding/migration de snapshots
 * - mbr/useScorecardMetrics ........ métrica agregada de OKRs por estado
 */

import { useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import {
  RitualPreparationStatus,
  RitualAttendance,
  ReferenceMonthPicker,
} from '@/modules/okrs/components/wizards/shared';
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';
import {
  useGenericWizardDraft,
  useActiveCycle,
  useLastCompletedSession,
  useOrgObjectives,
  useAllOrgObjectivesView,
  useCarryOverDecisions,
  useMbrPreSubmissions,
  useMbrOpeningCuration,
} from '@/modules/okrs/hooks';
import { usePreviousMbrPendingItems } from '@/modules/okrs/hooks/usePreviousMbrPendingItems';
import { useRitualAvailability } from '@/modules/okrs/hooks';
import { useTeams } from '@/modules/teams/hooks/useTeams';


import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { handleError } from '@/lib/errorMessages';

// Step components
import { MbrPanoramaStep } from '@/modules/okrs/components/wizards/mbr/MbrPanoramaStep';
import { MbrKpiGateStep } from '@/modules/okrs/components/wizards/mbr/MbrKpiGateStep';
import { MbrKpiDeepDiveStep } from '@/modules/okrs/components/wizards/mbr/MbrKpiDeepDiveStep';
import { MbrTeamOkrsOverviewStep } from '@/modules/okrs/components/wizards/mbr/MbrTeamOkrsOverviewStep';
import { MbrTeamOkrsDetailStep } from '@/modules/okrs/components/wizards/mbr/MbrTeamOkrsDetailStep';
import { MbrOrgOkrsStep } from '@/modules/okrs/components/wizards/mbr/MbrOrgOkrsStep';
import { MbrDecisionsStep } from '@/modules/okrs/components/wizards/mbr/MbrDecisionsStep';
import { MbrClosingStep } from '@/modules/okrs/components/wizards/mbr/MbrClosingStep';

import { EvaluationCollectionStep } from '@/modules/okrs/components/wizards/shared/framework/components/evaluation';
import { WizardStepFooter, InlineDecisionInput } from '@/modules/okrs/components/wizards/shared';

import type {
  MbrStep,
  MbrDraftData,
  MbrGovernanceChecklist,
  TeamCheckinDecision,
  RitualImprovementFeedback,
  MbrKpiSnapshot,
  MbrOrgOkrSnapshot,
  MbrTeamOkrSnapshot,
  MbrPanoramaCuration,
  MbrPanoramaAgendaItem,
} from '@/modules/okrs/types/wizard';
import { EMPTY_MBR_PANORAMA_CURATION } from '@/modules/okrs/types/wizard';

import { WIZARD_STEPS, STEP_ORDER, DEFAULT_DATA } from './mbr/constants';
import { useMbrPreDerivations } from './mbr/useMbrPreDerivations';
import {
  useAllBuKpisForMbr,
  useAllTeamObjectivesForMbr,
} from './mbr/useMbrDataSources';
import {
  useSeedKpiSnapshots,
  useSeedTeamOkrSnapshots,
  useSeedOrgOkrSnapshots,
} from './mbr/useMbrSeedingEffects';
import { useScorecardMetrics } from './mbr/useScorecardMetrics';

export default function MbrPage() {
  const navigate = useNavigate();
  const { currentBu } = useBu();
  const buSupabase = useBuScopedSupabase();

  usePageTitle('MBR');

  // Cycle (status-based)
  const { activeQuarterlyCycle: quarterlyCycle, isLoading: isLoadingCycles } =
    useActiveCycle();
  const availability = useRitualAvailability('mbr', quarterlyCycle);

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
    sessionId,
  } = useGenericWizardDraft<MbrStep, MbrDraftData>({
    wizardType: 'mbr',
    teamId: null,
    cycleId: quarterlyCycle?.id || null,
    defaultStep: 'panorama',
    defaultData: DEFAULT_DATA,
    enabled: !!quarterlyCycle,
  });

  // ── Sub-step na URL (?substep=) para steps com cursor interno ──
  // - team-okrs-detail: substep = `team:<teamId>`
  // - kpi-deep-dive: gerenciado dentro do próprio step (kpiId direto)
  // Saindo do step, limpamos o param para evitar contexto stale.
  useEffect(() => {
    const url = new URL(window.location.href);
    const param = url.searchParams.get('substep');
    if (draft.currentStep === 'team-okrs-detail') {
      // Hidrata index a partir do substep, caso seja navegação por link.
      if (param?.startsWith('team:')) {
        const teamId = param.slice('team:'.length);
        const idx = draft.data.teamOkrSnapshots.findIndex((t) => t.teamId === teamId);
        if (idx >= 0 && idx !== draft.data.currentTeamIndex) {
          updateDraft({ currentTeamIndex: idx });
        }
      } else {
        // Sem param: escreve o atual.
        const teamId = draft.data.teamOkrSnapshots[draft.data.currentTeamIndex]?.teamId;
        if (teamId) {
          url.searchParams.set('substep', `team:${teamId}`);
          window.history.replaceState(window.history.state, '', url.toString());
        }
      }
    } else if (draft.currentStep !== 'kpi-deep-dive' && param) {
      url.searchParams.delete('substep');
      window.history.replaceState(window.history.state, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.currentStep, draft.data.teamOkrSnapshots.length]);

  // Carry-over: pendências do MBR anterior (fonte canônica)
  const { data: mbrCarryOver = [] } = useCarryOverDecisions({
    wizardType: 'mbr',
    teamId: null,
  });

  // ── MBR-PRE submissions (mês de referência do draft) ──
  const { data: mbrPre } = useMbrPreSubmissions({
    referenceMonth: draft.data.referenceMonth,
  });
  const mbrPreByTeam = mbrPre?.byTeam ?? {};
  const mbrPreAddendumsByTeam = mbrPre?.addendumsByTeam ?? {};
  const mbrPreSubmittedCount = mbrPre?.submittedCount ?? 0;

  // Derivações memoizadas das submissões Pré-MBR
  const {
    proposedKpis,
    mbrPreSurfacedItems,
    mbrPreAggregates,
    mbrPreAgendaSuggestions,
  } = useMbrPreDerivations(mbrPreByTeam);

  // ── Load ALL BU KPIs (excl. metrics) with area/team joins ──
  const { data: allBuKpis, isLoading: isLoadingKpis } = useAllBuKpisForMbr();

  useSeedKpiSnapshots({
    isLoading: isLoadingKpis,
    allBuKpis,
    draftKpiSnapshots: draft.data.kpiSnapshots,
    updateDraft,
  });

  // ── v1.2: Org objectives view + scorecard metrics ──
  const cycleYear = quarterlyCycle
    ? parseInt(quarterlyCycle.start_date.substring(0, 4), 10)
    : undefined;
  const { data: orgObjView } = useAllOrgObjectivesView(cycleYear, quarterlyCycle?.id);

  const scorecardMetrics = useScorecardMetrics(
    draft.data.teamOkrSnapshots,
    quarterlyCycle?.end_date,
  );

  // ── Load team OKRs and seed teamOkrSnapshots ──
  const {
    data: allTeamObjectives,
    isLoading: isLoadingTeamOkrs,
    isFetched: hasFetchedTeamOkrs,
  } = useAllTeamObjectivesForMbr(quarterlyCycle?.id);

  // Times da BU (para resolver nomes de times sem OKR própria).
  const { data: allTeams = [] } = useTeams(true);

  // Pauta de times = OKRs do ciclo ∪ times que submeteram Pré-MBR.
  const preSubmittedTeams = useMemo(
    () =>
      Object.keys(mbrPreByTeam).map((teamId) => ({
        teamId,
        teamName: allTeams.find((t) => t.id === teamId)?.name ?? 'Time sem nome',
      })),
    [mbrPreByTeam, allTeams],
  );

  useSeedTeamOkrSnapshots({
    cycleId: quarterlyCycle?.id,
    hasFetched: hasFetchedTeamOkrs,
    isLoading: isLoadingTeamOkrs,
    allTeamObjectives,
    draftTeamOkrSnapshots: draft.data.teamOkrSnapshots,
    updateDraft,
    preSubmittedTeams,
  });


  // ── Load org OKRs and seed orgOkrSnapshots when draft is empty ──
  const { data: orgObjectives, isLoading: isLoadingOkrs } = useOrgObjectives(
    currentBu?.id,
  );

  useSeedOrgOkrSnapshots({
    isLoading: isLoadingOkrs,
    orgObjectives,
    draftOrgOkrSnapshots: draft.data.orgOkrSnapshots,
    updateDraft,
  });

  // Carry-over de itens pendentes do MBR anterior — re-derivado via hook.
  const { data: previousMbrPendingItems = [] } = usePreviousMbrPendingItems(
    sessionId ?? null,
  );

  // Navigation
  const completedSteps = useMemo(() => {
    const completed: string[] = [];
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    for (let i = 0; i < currentIdx; i++) completed.push(STEP_ORDER[i]);
    return completed;
  }, [draft.currentStep]);

  const goToStep = useCallback(
    (stepId: string) => setStep(stepId as MbrStep),
    [setStep],
  );

  const goNext = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx < STEP_ORDER.length - 1) setStep(STEP_ORDER[currentIdx + 1]);
  }, [draft.currentStep, setStep]);

  const goBack = useCallback(() => {
    const currentIdx = STEP_ORDER.indexOf(draft.currentStep);
    if (currentIdx > 0) setStep(STEP_ORDER[currentIdx - 1]);
  }, [draft.currentStep, setStep]);

  // FullPageWizardShell handles navigation; draft persists for later resumption.
  const handleClose = useCallback(() => {}, []);

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
    let completedSessionId: string | null = null;
    try {
      completedSessionId = await clearDraft();
    } catch (error) {
      console.warn('[MBR] complete failed', { error });
      toast.error(
        'Não foi possível concluir o MBR. Seus dados estão preservados — tente novamente.',
      );
      return;
    }
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

  // ── Panorama Curation (Abertura Executiva curada por IA) ──
  const panoramaCuration =
    draft.data.panoramaCuration ?? EMPTY_MBR_PANORAMA_CURATION;

  const orgObjectivesForCurator = useMemo(() => {
    return (orgObjView ?? []).map((o) => ({
      objectiveId: o.id,
      title: o.title,
      progress: o.aggregatedProgress ?? 0,
      trend: undefined,
      status: o.aggregatedStatus,
    }));
  }, [orgObjView]);

  const curationCoverage = useMemo(() => {
    const totalTeams = draft.data.teamOkrSnapshots.length;
    return {
      totalTeams,
      submittedTeams: mbrPreSubmittedCount,
      pendingTeams: Math.max(0, totalTeams - mbrPreSubmittedCount),
    };
  }, [draft.data.teamOkrSnapshots.length, mbrPreSubmittedCount]);

  const curationAggregates = useMemo(
    () => ({
      needsDecisionCount: mbrPreSurfacedItems.filter((i) => i.kind === 'needs_decision').length,
      crossDepCount: mbrPreSurfacedItems.filter((i) => i.kind === 'cross_dependency').length,
      kpiJustifCount: mbrPreAggregates.kpiJustifCount,
      kpiUpdatedCount: mbrPreAggregates.kpiUpdatedCount,
      projectJustifCount: mbrPreAggregates.projectJustifCount,
      agendaSuggestionCount: mbrPreAggregates.agendaSuggestionCount,
    }),
    [mbrPreSurfacedItems, mbrPreAggregates],
  );

  const { isGenerating: isGeneratingCuration, generate: generateCuration } =
    useMbrOpeningCuration({
      referenceMonth: draft.data.referenceMonth,
      kpiSnapshots: draft.data.kpiSnapshots,
      orgObjectives: orgObjectivesForCurator,
      mbrPreAggregates: curationAggregates,
      coverage: curationCoverage,
    });

  const handleCurationChange = useCallback(
    (next: MbrPanoramaCuration) => updateDraft({ panoramaCuration: next }),
    [updateDraft],
  );

  const handleGenerateCurationDraft = useCallback(async () => {
    const result = await generateCuration(panoramaCuration);
    if (!result) return;
    if (result.reason) {
      toast.warning('Não foi possível gerar o rascunho com IA. Modo manual ativado.');
    } else {
      toast.success('Rascunho da Abertura Executiva gerado.');
    }
    updateDraft({ panoramaCuration: result.next });
  }, [generateCuration, panoramaCuration, updateDraft]);

  const handleAddSuggestedDecision = useCallback(
    (title: string, category?: string) => {
      const allowed = [
        'decision',
        'focus_adjustment',
        'next_step',
        'strategic_proposal',
      ] as const;
      const safeCategory = (allowed as readonly string[]).includes(category ?? '')
        ? (category as TeamCheckinDecision['category'])
        : 'decision';
      const newDecision: TeamCheckinDecision = {
        id: `mbr-curated-decision-${Date.now()}`,
        text: title,
        category: safeCategory,
        sourceStep: 'panorama',
      };
      const nextSuggested = panoramaCuration.suggestedDecisions.map((s) =>
        s.title === title ? { ...s, added: true } : s,
      );
      updateDraft({
        decisions: [...draft.data.decisions, newDecision],
        panoramaCuration: { ...panoramaCuration, suggestedDecisions: nextSuggested },
      });
      toast.success('Decisão adicionada à pauta.');
    },
    [draft.data.decisions, panoramaCuration, updateDraft],
  );

  // Hidratar pauta consolidada do MBR a partir dos Pré-MBR + curadoria IA.
  // Adiciona itens novos ao final preservando ordem definida pelo líder.
  const { data: allTeams = [] } = useTeams(true);
  const teamNamesByIdMemo = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of allTeams) map[t.id] = t.name;
    for (const t of draft.data.teamOkrSnapshots) {
      if (t.teamName) map[t.teamId] = t.teamName;
    }
    return map;
  }, [allTeams, draft.data.teamOkrSnapshots]);

  useEffect(() => {
    const current = panoramaCuration.agenda ?? [];
    const seen = new Set(current.map((i) => i.id));
    const additions: MbrPanoramaAgendaItem[] = [];

    for (const s of mbrPreAgendaSuggestions) {
      const id = `pre-mbr:${s.key}`;
      if (seen.has(id)) continue;
      additions.push({
        id,
        title: s.title,
        detail: s.detail || undefined,
        source: 'pre-mbr',
        teamId: s.teamId,
        included: true,
        order: current.length + additions.length,
      });
    }

    for (const d of panoramaCuration.suggestedDecisions) {
      const id = `ai:${d.id}`;
      if (seen.has(id)) continue;
      additions.push({
        id,
        title: d.title,
        source: 'ai',
        category: d.category,
        included: true,
        order: current.length + additions.length,
      });
    }

    if (additions.length === 0) return;
    handleCurationChange({ ...panoramaCuration, agenda: [...current, ...additions] });
  }, [mbrPreAgendaSuggestions, panoramaCuration, handleCurationChange]);

  // Loading
  if (isLoadingCycles || isLoadingKpis || isLoadingOkrs || isLoadingTeamOkrs) {
    return <LoadingState text="Carregando dados do MBR..." fullPage />;
  }

  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="mbr" availability={availability} />;
  }

  const teamNamesById = teamNamesByIdMemo;

  // Step render
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'panorama':
        return (
          <MbrPanoramaStep
            kpiSnapshots={draft.data.kpiSnapshots}
            onKpiSnapshotsChange={(kpiSnapshots: MbrKpiSnapshot[]) =>
              updateDraft({ kpiSnapshots })
            }
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            lastCompletedAt={lastCompletedAt}
            onContinue={goNext}
            buName={currentBu?.name}
            scorecardMetrics={scorecardMetrics}
            orgObjectives={orgObjView ?? []}
            currentStepIndex={0}
            mbrPreSubmittedCount={mbrPreSubmittedCount}
            mbrPreNeedsDecisionCount={
              mbrPreSurfacedItems.filter((i) => i.kind === 'needs_decision').length
            }
            mbrPreCrossDepCount={
              mbrPreSurfacedItems.filter((i) => i.kind === 'cross_dependency').length
            }
            mbrPreKpiJustifCount={mbrPreAggregates.kpiJustifCount}
            mbrPreKpiUpdatedCount={mbrPreAggregates.kpiUpdatedCount}
            mbrPreProjectJustifCount={mbrPreAggregates.projectJustifCount}
            mbrPreAgendaSuggestionCount={mbrPreAggregates.agendaSuggestionCount}
            curation={panoramaCuration}
            onCurationChange={handleCurationChange}
            onGenerateCurationDraft={handleGenerateCurationDraft}
            isGeneratingCuration={isGeneratingCuration}
            onAddSuggestedDecision={handleAddSuggestedDecision}
            teamNamesById={teamNamesByIdMemo}
            mbrPreSurfacedItems={mbrPreSurfacedItems}
            mbrPreSubmissionsByTeam={mbrPreByTeam}
            topSlot={
              <>
                <div className="flex items-center gap-3 flex-wrap rounded-lg border border-border/60 bg-card p-3">
                  <label className="text-sm font-medium text-foreground">
                    Analisando o mês de
                  </label>
                  <ReferenceMonthPicker
                    value={draft.data.referenceMonth}
                    onChange={(next) => {
                      // Trocar o mês alvo invalida snapshots derivados.
                      updateDraft({
                        referenceMonth: next,
                        kpiSnapshots: [],
                        teamOkrSnapshots: [],
                        orgOkrSnapshots: [],
                      });
                    }}
                    className="w-[220px]"
                  />
                  <span className="text-xs text-muted-foreground">
                    Default: mês fechado anterior. As submissões pré-MBR exibidas correspondem a este mês.
                  </span>
                </div>
                <RitualPreparationStatus
                  ritualType="mbr"
                  cycleId={quarterlyCycle?.id ?? null}
                />
                <RitualAttendance
                  persona="mbr"
                  sessionId={sessionId}
                  buId={currentBu?.id}
                  cycleId={quarterlyCycle?.id ?? null}
                />
              </>
            }
          />
        );

      case 'kpi-gate':
        return (
          <MbrKpiGateStep
            kpiSnapshots={draft.data.kpiSnapshots}
            onKpiSnapshotsChange={(kpiSnapshots: MbrKpiSnapshot[]) =>
              updateDraft({ kpiSnapshots })
            }
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            teamNamesById={teamNamesById}
            proposedKpis={proposedKpis}
            referenceMonth={draft.data.referenceMonth}
            showMonthlyOverview
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'kpi-deep-dive':
        return (
          <MbrKpiDeepDiveStep
            kpiSnapshots={draft.data.kpiSnapshots}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            referenceMonth={draft.data.referenceMonth}
            mbrPreByTeam={mbrPreByTeam}
            teamNamesById={teamNamesById}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'team-okrs-overview':
        return (
          <MbrTeamOkrsOverviewStep
            teamOkrSnapshots={draft.data.teamOkrSnapshots}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'team-okrs-detail':
        return (
          <MbrTeamOkrsDetailStep
            teamOkrSnapshots={draft.data.teamOkrSnapshots}
            onTeamOkrSnapshotsChange={(teamOkrSnapshots: MbrTeamOkrSnapshot[]) =>
              updateDraft({ teamOkrSnapshots })
            }
            currentTeamIndex={draft.data.currentTeamIndex}
            onCurrentTeamIndexChange={(currentTeamIndex: number) => {
              updateDraft({ currentTeamIndex });
              const teamId = draft.data.teamOkrSnapshots[currentTeamIndex]?.teamId;
              const url = new URL(window.location.href);
              if (teamId) url.searchParams.set('substep', `team:${teamId}`);
              else url.searchParams.delete('substep');
              window.history.replaceState(window.history.state, '', url.toString());
            }}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            teamAddendums={mbrPreAddendumsByTeam}
            mbrPreByTeam={mbrPreByTeam}
            referenceMonth={draft.data.referenceMonth}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'org-okrs':
        return (
          <MbrOrgOkrsStep
            orgOkrSnapshots={draft.data.orgOkrSnapshots}
            onOrgOkrSnapshotsChange={(orgOkrSnapshots: MbrOrgOkrSnapshot[]) =>
              updateDraft({ orgOkrSnapshots })
            }
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            orgObjectives={orgObjView ?? []}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'decisions':
        return (
          <MbrDecisionsStep
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            previousMbrPendingItems={
              previousMbrPendingItems.length > 0
                ? previousMbrPendingItems
                : mbrCarryOver
            }
            mbrPreSurfacedItems={mbrPreSurfacedItems}
            mbrPreAgendaSuggestions={mbrPreAgendaSuggestions}
            teamNamesById={teamNamesById}
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'evaluation':
        return (
          <EvaluationCollectionStep
            sessionId={sessionId ?? null}
            persona="mbr"
            ensureSession={saveDraft}
            footer={
              <>
                <div className="border-t bg-card/50 backdrop-blur-sm">
                  <InlineDecisionInput
                    decisions={draft.data.decisions}
                    onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
                      updateDraft({ decisions })
                    }
                    sourceStep="evaluation"
                  />
                </div>
                <WizardStepFooter
                  onPrimary={goNext}
                  onBack={goBack}
                  primaryLabel="Continuar para encerramento"
                />
              </>
            }
          />
        );

      case 'closing':
        return (
          <MbrClosingStep
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) =>
              updateDraft({ decisions })
            }
            checklist={draft.data.checklist}
            onChecklistChange={(checklist: MbrGovernanceChecklist) =>
              updateDraft({ checklist })
            }
            ritualFeedback={draft.data.ritualFeedback}
            onRitualFeedbackChange={(ritualFeedback: RitualImprovementFeedback[]) =>
              updateDraft({ ritualFeedback })
            }
            teamOkrSnapshots={draft.data.teamOkrSnapshots}
            orgOkrSnapshots={draft.data.orgOkrSnapshots}
            qbrFollowUpItems={draft.data.qbrFollowUpItems}
            onComplete={handleComplete}
            isCompleting={isSaving}
            onBack={goBack}
          />
        );

      default:
        return null;
    }
  };

  return (
    <FullPageWizardShell
      title="MBR"
      subtitle="Rito decisório mensal — saúde estratégica do negócio"
      steps={WIZARD_STEPS.map((s) => ({
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
      backUrl="/okrs/executive"
    >
      {renderStepContent()}
    </FullPageWizardShell>
  );
}
