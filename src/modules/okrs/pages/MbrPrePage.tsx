/**
 * MbrPrePage - Wizard pré-MBR dos líderes de time
 * 
 * Balanço do mês, análise de KPIs, destaques/riscos e próximos passos.
 * Segue padrão QbrPrePage: useGenericWizardDraft + FullPageWizardShell.
 * 
 * Diferenças do QbrPrePage:
 * - Sem gate de qbr_status (disponível sempre que houver ciclo ativo)
 * - Usa ciclo ativo prioritário (não apenas quarter)
 * - Steps 3 e 4 são específicos do Pré-MBR
 */

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import {
  FullPageWizardShell,
} from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import { RitualUnavailableScreen } from '@/modules/okrs/components/wizards/shared/RitualUnavailableScreen';
import { HierarchyContextSwitcher } from '@/modules/okrs/components/wizards/shared/HierarchyContextSwitcher';
import { CompletedRitualView } from '@/modules/okrs/components/wizards/shared/CompletedRitualView';

import {
  useGenericWizardDraft,
  useActiveCycle,
} from '@/modules/okrs/hooks';
import { useRitualAvailability } from '@/modules/okrs/hooks';
import { useCompletedSessionForCycle } from '@/modules/okrs/hooks';
import { useHierarchicalTeamList } from '@/modules/teams/hooks';
import { mbrKeys } from '@/lib/queryKeys/okrs';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { handleError } from '@/lib/errorMessages';
import { AlertCircle } from 'lucide-react';
import { calculateProgress } from '@/modules/okrs/types';
import {
  defaultReferenceMonth,
  monthBoundsDate,
} from '@/modules/okrs/utils/mbr/referenceMonth';

// Reuse QBR step 2 (com props opcionais para justificativas)
import { QbrKpiAnalysisStep } from '@/modules/okrs/components/wizards/qbr-pre/QbrKpiAnalysisStep';

// MBR-Pre specific steps
import { MbrPreOpeningStep } from '@/modules/okrs/components/wizards/mbr-pre/MbrPreOpeningStep';
import { MbrPreProjectsStep } from '@/modules/okrs/components/wizards/mbr-pre/MbrPreProjectsStep';
import { MbrPreHighlightsStep } from '@/modules/okrs/components/wizards/mbr-pre/MbrPreHighlightsStep';
import { MbrPreNextStepsStep } from '@/modules/okrs/components/wizards/mbr-pre/MbrPreNextStepsStep';
import { MbrPreSummary } from '@/modules/okrs/components/wizards/mbr-pre/MbrPreSummary';

import {
  calculateKrState,
} from '@/modules/okrs/hooks';

import type {
  MbrPreStep,
  MbrPreDraftData,
  MbrKpiSnapshot,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'opening' as const, label: 'Abertura', description: 'Resumo do mês do time' },
  { id: 'kpi-analysis' as const, label: 'Indicadores do Time', description: 'KPIs e justificativas' },
  { id: 'projects' as const, label: 'Projetos', description: 'Reflexão sobre atrasos' },
  { id: 'highlights' as const, label: 'Destaques e Riscos', description: 'O que acelerou e o que travou' },
  { id: 'next-steps' as const, label: 'Próximos Passos', description: 'Foco e prioridades' },
  { id: 'summary' as const, label: 'Resumo e Envio', description: 'Revisão final' },
];

const STEP_ORDER: MbrPreStep[] = ['opening', 'kpi-analysis', 'projects', 'highlights', 'next-steps', 'summary'];

const DEFAULT_DATA: MbrPreDraftData = {
  cycleId: '',
  teamId: '',
  // Mês alvo padrão = mês imediatamente anterior (mês fechado).
  // Pré-MBR é sempre executado no início do mês seguinte ao analisado.
  referenceMonth: defaultReferenceMonth(),
  krFinalStates: [],
  kpiSnapshots: [],
  kpisToCreate: [],
  highlights: { accelerated: '', blocked: '', needsDecision: '' },
  nextSteps: { focus: '', prioritizedItems: [], crossDependencies: [] },
  decisions: [],
  kpiJustifications: {},
  projectJustifications: { projects: {}, milestones: {} },
  agendaSuggestions: [],
};

function dedupeKpiSnapshots(kpis: MbrKpiSnapshot[]): MbrKpiSnapshot[] {
  const seen = new Set<string>();
  const result: MbrKpiSnapshot[] = [];

  for (const kpi of kpis) {
    if (seen.has(kpi.kpiId)) continue;
    seen.add(kpi.kpiId);
    result.push(kpi);
  }

  return result;
}

// ============================================================
// COMPONENT
// ============================================================

export default function MbrPrePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamIdParam = searchParams.get('team');
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  // Teams for admin context switching
  const { teams, isLoading: isLoadingTeams } = useHierarchicalTeamList();
  const selectedTeam = useMemo(() => {
    if (!teamIdParam || !teams) return null;
    return teams.find(t => t.id === teamIdParam) || null;
  }, [teamIdParam, teams]);

  usePageTitle(selectedTeam ? `Pré-MBR - ${selectedTeam.name}` : 'Pré-MBR');

  // Cycle (status-based) — any active cycle, not just quarter
  const { activeCycle, isLoading: isLoadingCycles } = useActiveCycle();
  const availability = useRitualAvailability('mbr-pre', activeCycle);

  // Detect already-completed session for this cycle+team
  const {
    sessionState,
    completedSession,
    isLoading: isLoadingCompletedCheck,
  } = useCompletedSessionForCycle('mbr-pre', teamIdParam, activeCycle?.id);

  // Draft persistence (only if not already completed)
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
  } = useGenericWizardDraft<MbrPreStep, MbrPreDraftData>({
    wizardType: 'mbr-pre',
    teamId: teamIdParam,
    cycleId: activeCycle?.id || null,
    defaultStep: 'opening',
    defaultData: DEFAULT_DATA,
    enabled: !!activeCycle && sessionState !== 'completed',
  });

  // ── Mês de referência (mês fechado anterior por default) ──
  // Definido aqui porque é usado tanto pela query de KRs (cut-off de check-ins)
  // quanto pela query de KPIs adiante.
  const refMonth = draft.data.referenceMonth || defaultReferenceMonth();
  const refBounds = useMemo(() => monthBoundsDate(refMonth), [refMonth]);

  // ── Load team KRs for balance step ──
  // Snapshot ancorado no fim do mês de referência: o último check-in até
  // `refBounds.end` é a fonte da verdade para `current_value`/`last_checkin_at`,
  // não o estado atual da KR. Isso garante que um Pré-MBR de abril executado
  // em maio reflita o que aconteceu *até 30/04*, não o que mudou em maio.
  const { data: teamObjectives, isLoading: isLoadingKrs } = useQuery({
    queryKey: mbrKeys.preTeamKrs(currentBuId, teamIdParam, activeCycle?.id, refMonth),
    enabled: !!buSupabase && !!currentBuId && !!teamIdParam && !!activeCycle?.id && !!refBounds,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!currentBuId || !refBounds) return [];

      const { data, error } = await buSupabase
        .from('okr_team_objectives')
        .select(`
          id, title, status,
          key_results:okr_team_key_results!okr_team_key_results_team_objective_id_fkey(
            id, title, status, current_value, baseline, target, direction, unit,
            last_checkin_at, deleted_at, cancelled_at
          )
        `)
        .eq('bu_id', currentBuId)
        .eq('team_id', teamIdParam!)
        .eq('cycle_id', activeCycle!.id)
        .is('deleted_at', null)
        .is('cancelled_at', null);

      if (error) {
        console.error('[MbrPre] Error fetching team objectives:', error);
        throw error;
      }

      const rawObjs = (data || []).map(obj => ({
        ...obj,
        key_results: (obj.key_results || []).filter(
          (kr: any) => !kr.deleted_at && !kr.cancelled_at
        ),
      }));

      // Coleta todos os KR ids para um único fetch de check-ins até o cut-off.
      const krIds = rawObjs.flatMap((o) => (o.key_results || []).map((kr: any) => kr.id as string));
      if (krIds.length === 0) return rawObjs.map((o) => ({ ...o, _checkinByKr: new Map() }));

      const { data: checkins, error: ciErr } = await buSupabase
        .from('okr_checkins')
        .select('kr_id, date, current_value')
        .in('kr_id', krIds)
        .lte('date', refBounds.end)
        .order('date', { ascending: false });
      if (ciErr) throw ciErr;

      // Por KR: primeiro check-in encontrado já é o mais recente até o cut-off.
      const lastByKr = new Map<string, { value: number; date: string }>();
      for (const c of (checkins || [])) {
        if (!lastByKr.has(c.kr_id)) {
          lastByKr.set(c.kr_id, { value: Number(c.current_value), date: c.date });
        }
      }

      return rawObjs.map((o) => ({ ...o, _checkinByKr: lastByKr }));
    },
  });

  // Seed KR final states — re-seedar quando time OU referenceMonth mudam.
  const seededKrsRef = useRef(false);
  const lastKrSeedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const seedKey = `${teamIdParam ?? ''}::${refMonth}`;
    if (seedKey !== lastKrSeedKeyRef.current) {
      seededKrsRef.current = false;
      lastKrSeedKeyRef.current = seedKey;
    }
    if (seededKrsRef.current) return;
    if (!teamObjectives || teamObjectives.length === 0) return;
    if (!refBounds) return;

    // Cut-off em ms para `daysSinceCheckin` ancorado no fim do mês.
    const cutoffMs = new Date(`${refBounds.end}T23:59:59`).getTime();

    const states: MbrPreDraftData['krFinalStates'] = [];
    for (const obj of teamObjectives) {
      const lastByKr: Map<string, { value: number; date: string }> =
        (obj as any)._checkinByKr ?? new Map();

      for (const kr of (obj.key_results || [])) {
        const baseline = Number(kr.baseline ?? 0);
        const target = Number(kr.target ?? baseline);
        const direction = (kr.direction ?? 'up') as 'up' | 'down' | 'maintain';

        // Snapshot autoritativo: usa o último check-in até o fim do mês de
        // referência. Se não houver, considera baseline (KR sem movimento).
        const snapshot = lastByKr.get(kr.id);
        const currentAtCutoff = snapshot ? snapshot.value : baseline;
        const lastCheckinDateAtCutoff = snapshot?.date ?? null;

        const progress = calculateProgress(baseline, currentAtCutoff, target, direction);

        const daysSinceCheckin = lastCheckinDateAtCutoff
          ? Math.max(
              0,
              Math.floor(
                (cutoffMs - new Date(`${lastCheckinDateAtCutoff}T00:00:00`).getTime()) /
                  (1000 * 60 * 60 * 24),
              ),
            )
          : 999;

        // RAG é derivado do progresso no cut-off (okr_checkins não persiste RAG).
        // Heurística alinhada ao Progress Canon (mem://standards/interpretation/progress-canon):
        //   ≥ 70%  → green; ≥ 40% → yellow; demais → red; sem dado → not_started.
        const ragStatus =
          !snapshot ? 'not_started'
            : progress >= 70 ? 'green'
            : progress >= 40 ? 'yellow'
            : 'red';

        const state = calculateKrState({
          progress,
          status: ragStatus as any,
          daysSinceCheckin,
          cycleEnded: false,
        });

        states.push({
          krId: kr.id,
          // Onda 4 Fase 3: krTitle/objectiveTitle não são mais gravados — readers resolvem via lookup.
          objectiveId: obj.id,
          state,
          finalProgress: Math.round(progress),
          paceStatus: progress >= 70 ? 'No ritmo' : progress >= 40 ? 'Atenção' : 'Atrasado',
        });
      }
    }

    if (states.length > 0) {
      updateDraft({ krFinalStates: states, cycleId: activeCycle?.id || '', teamId: teamIdParam || '' });
    }
    seededKrsRef.current = true;
  }, [teamObjectives, refBounds, refMonth, teamIdParam, updateDraft, activeCycle]);

  // ── Load KPIs (ancorado no mês alvo) ──
  // currentValue = último valor com reference_date dentro do mês alvo.
  // previousValue = último valor com reference_date < início do mês alvo.
  // Se o mês alvo não tiver registro, currentValue = null (UI exibe "sem dado").


  const { data: teamKpis, isLoading: isLoadingKpis } = useQuery({
    queryKey: [...mbrKeys.preTeamKpis(teamIdParam, currentBuId), refMonth],
    enabled: !!buSupabase && !!currentBuId && !!teamIdParam && !!refBounds,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!refBounds) return [];
      // MBR-Pre lista APENAS KPIs sob responsabilidade do time:
      // owner_user_id é o líder do time OU um membro do time (independente do scope).
      // Métricas (indicator_type='metric') são intencionalmente excluídas.
      const { data: teamRow } = await buSupabase
        .from('teams')
        .select('leader_user_id')
        .eq('id', teamIdParam)
        .maybeSingle();
      const leaderId = teamRow?.leader_user_id ?? null;

      const { data: memberships } = await buSupabase
        .from('user_team_memberships')
        .select('user_id')
        .eq('team_id', teamIdParam);
      const memberIds = (memberships ?? []).map((m: any) => m.user_id as string);

      const ownerIds = Array.from(new Set([
        ...(leaderId ? [leaderId] : []),
        ...memberIds,
      ]));

      if (ownerIds.length === 0) return [];

      const { data: kpis, error } = await buSupabase
        .from('kpi_metrics')
        .select('id, name, unit, target_value, direction, scope, area_id, team_id, owner_user_id, lifecycle_status, indicator_type')
        .eq('lifecycle_status', 'active')
        .eq('indicator_type', 'kpi')
        .is('deleted_at', null)
        .in('owner_user_id', ownerIds);

      if (error) throw error;
      if (!kpis || kpis.length === 0) return [];

      const kpiIds = kpis.map(k => k.id);
      // Buscamos só até o fim do mês alvo (descarta valores futuros).
      const { data: valuesUpToTarget } = await buSupabase
        .from('kpi_values')
        .select('kpi_id, value, reference_date, rag_status')
        .in('kpi_id', kpiIds)
        .lte('reference_date', refBounds.end)
        .order('reference_date', { ascending: false });

      // Para cada KPI:
      //   currentByKpi  → primeiro registro com reference_date BETWEEN start..end
      //   previousByKpi → primeiro registro com reference_date < start (mês fechado anterior)
      const currentByKpi = new Map<string, { value: number; rag_status: string; reference_date: string }>();
      const previousByKpi = new Map<string, { value: number; reference_date: string }>();
      for (const v of (valuesUpToTarget || [])) {
        const inMonth = v.reference_date >= refBounds.start && v.reference_date <= refBounds.end;
        if (inMonth && !currentByKpi.has(v.kpi_id)) {
          currentByKpi.set(v.kpi_id, { value: v.value, rag_status: v.rag_status, reference_date: v.reference_date });
        } else if (!inMonth && v.reference_date < refBounds.start && !previousByKpi.has(v.kpi_id)) {
          previousByKpi.set(v.kpi_id, { value: v.value, reference_date: v.reference_date });
        }
      }

      return dedupeKpiSnapshots(kpis.map(kpi => {
        const current = currentByKpi.get(kpi.id);
        const previous = previousByKpi.get(kpi.id);
        return {
          kpiId: kpi.id,
          name: kpi.name,
          currentValue: current?.value ?? null,
          previousValue: previous?.value ?? null,
          target: kpi.target_value,
          ragStatus: current?.rag_status === 'on_track' ? 'green'
            : current?.rag_status === 'at_risk' ? 'yellow'
            : current?.rag_status === 'off_track' ? 'red'
            : 'no_data',
          requiresStrategicDecision: current?.rag_status === 'off_track',
          unit: kpi.unit ?? '%',
          lastValueAt: current?.reference_date ?? null,
          scope: (kpi.scope as 'org' | 'area' | 'team') ?? 'team',
        } as MbrKpiSnapshot;
      }));
    },
  });

  // Seed KPI snapshots — re-seed quando team OU referenceMonth mudam.
  const seededKpisRef = useRef(false);
  const lastSeedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const seedKey = `${teamIdParam ?? ''}::${refMonth}`;
    if (seedKey !== lastSeedKeyRef.current) {
      seededKpisRef.current = false;
      lastSeedKeyRef.current = seedKey;
    }
    if (seededKpisRef.current) return;
    if (!teamKpis) return; // aguarda query carregar (mesmo se vazia)

    const reconciled = dedupeKpiSnapshots(teamKpis);
    const rawExisting = draft.data.kpiSnapshots ?? [];

    // Snapshot autoritativo do mês alvo: sobrescreve currentValue/previousValue/RAG
    // sempre que mudar (mês, escopo de owners, etc.).
    // Justificativas vivem em `draft.data.kpiJustifications` (chaveado por kpiId)
    // e são preservadas independentemente.
    const changed =
      reconciled.length !== rawExisting.length ||
      reconciled.some((s, i) => {
        const prev = rawExisting[i];
        return (
          !prev ||
          prev.kpiId !== s.kpiId ||
          prev.currentValue !== s.currentValue ||
          prev.previousValue !== s.previousValue ||
          prev.ragStatus !== s.ragStatus
        );
      });

    if (changed) {
      updateDraft({ kpiSnapshots: reconciled });
    }
    seededKpisRef.current = true;
  }, [teamKpis, draft.data.kpiSnapshots, updateDraft, teamIdParam, refMonth]);

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
    setStep(stepId as MbrPreStep);
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

  const handleSaveDraft = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo!');
    } catch (error) {
      handleError(error, { context: 'MBR Pre Draft Save' });
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
  const handleComplete = useCallback(async () => {
    setIsCompleting(true);
    try {
      await clearDraft();
      toast.success('Pré-MBR concluído! O facilitador será notificado.');
      navigate('/rituals');
    } catch (error) {
      handleError(error, { context: 'MBR Pre Complete' });
    } finally {
      setIsCompleting(false);
    }
  }, [clearDraft, navigate]);

  // handleClose is a no-op: FullPageWizardShell handles navigation.
  // Draft stays as in_progress for later resumption — only handleComplete marks as completed.
  const handleClose = useCallback(() => {}, []);

  const handleTeamChange = useCallback((newTeamId: string) => {
    discardDraft();
    setSearchParams({ team: newTeamId });
  }, [discardDraft, setSearchParams]);

  // Loading
  if (isLoadingTeams || isLoadingCycles || isLoadingKrs || isLoadingKpis || isLoadingCompletedCheck) {
    return <LoadingState text="Carregando dados do pré-MBR..." fullPage />;
  }

  // Guard: No team selected
  if (!teamIdParam || !selectedTeam) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Time não selecionado"
        description="Selecione um time para iniciar o pré-MBR"
        actionLabel="Voltar"
        onAction={() => navigate('/rituals')}
      />
    );
  }

  // Guard: Ritual window
  if (!availability.isAvailable) {
    return <RitualUnavailableScreen wizardType="mbr-pre" availability={availability} />;
  }

  // Guard: Already completed → show read-only view with addendum
  if (sessionState === 'completed' && completedSession) {
    return (
      <CompletedRitualView
        title="Pré-MBR"
        teamName={selectedTeam.name}
        wizardType="mbr-pre"
        session={completedSession}
        backUrl="/rituals"
      />
    );
  }

  // Guard: No active cycle
  if (!activeCycle) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">Nenhum ciclo ativo</p>
          <p className="text-sm text-muted-foreground">
            É necessário ter um ciclo com status "ativo" para iniciar o pré-MBR.
          </p>
        </div>
      </div>
    );
  }

  // Step render
  const renderStepContent = () => {
    switch (draft.currentStep) {
      case 'opening':
      case 'balance': // legacy: drafts antigos abrem na nova abertura
        return (
          <MbrPreOpeningStep
            teamId={teamIdParam}
            teamName={selectedTeam?.name ?? null}
            cycleId={activeCycle?.id ?? null}
            isLoading={isLoadingKrs || isLoadingKpis}
            referenceMonth={refMonth}
            onReferenceMonthChange={(next) => {
              // Trocar o mês alvo invalida a análise IA cacheada (era de outro mês).
              updateDraft({ referenceMonth: next, monthAnalysis: null });
            }}
            krFinalStates={draft.data.krFinalStates}
            kpiSnapshots={draft.data.kpiSnapshots}
            monthAnalysis={draft.data.monthAnalysis ?? null}
            onMonthAnalysisChange={(monthAnalysis) => updateDraft({ monthAnalysis })}
            onContinue={() => setStep('kpi-analysis')}
          />
        );

      case 'kpi-analysis':
        return (
          <QbrKpiAnalysisStep
            kpiSnapshots={draft.data.kpiSnapshots}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
            agendaSuggestions={draft.data.agendaSuggestions ?? []}
            onAgendaSuggestionsChange={(next) => updateDraft({ agendaSuggestions: next })}
            agendaTriggerLabel="Registrar sugestão de pauta para o MBR"
            agendaCategoryless
            requireJustifications
            kpiJustifications={draft.data.kpiJustifications}
            onKpiJustificationChange={(kpiId, value) =>
              updateDraft({
                kpiJustifications: { ...draft.data.kpiJustifications, [kpiId]: value },
              })
            }
          />
        );

      case 'projects':
        return (
          <MbrPreProjectsStep
            teamId={teamIdParam}
            referenceMonth={refMonth}
            projectJustifications={draft.data.projectJustifications}
            onProjectJustificationChange={(projectId, value) =>
              updateDraft({
                projectJustifications: {
                  ...draft.data.projectJustifications,
                  projects: {
                    ...draft.data.projectJustifications.projects,
                    [projectId]: value,
                  },
                },
              })
            }
            onMilestoneJustificationChange={(milestoneId, value) =>
              updateDraft({
                projectJustifications: {
                  ...draft.data.projectJustifications,
                  milestones: {
                    ...draft.data.projectJustifications.milestones,
                    [milestoneId]: value,
                  },
                },
              })
            }
            onContinue={goNext}
            onBack={goBack}
          />
        );

      case 'highlights':
        return (
          <MbrPreHighlightsStep
            highlights={draft.data.highlights}
            onHighlightsChange={(highlights) => updateDraft({ highlights })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            onContinue={goNext}
            onBack={goBack}
            agendaSuggestions={draft.data.agendaSuggestions ?? []}
            onAgendaSuggestionsChange={(next) => updateDraft({ agendaSuggestions: next })}
            agendaTriggerLabel="Registrar sugestão de pauta para o MBR"
          />
        );

      case 'next-steps':
        return (
          <MbrPreNextStepsStep
            nextSteps={draft.data.nextSteps}
            onNextStepsChange={(nextSteps) => updateDraft({ nextSteps })}
            decisions={draft.data.decisions}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
            teamId={teamIdParam || undefined}
            onContinue={goNext}
            onBack={goBack}
            agendaSuggestions={draft.data.agendaSuggestions ?? []}
            onAgendaSuggestionsChange={(next) => updateDraft({ agendaSuggestions: next })}
            agendaTriggerLabel="Registrar sugestão de pauta para o MBR"
          />
        );

      case 'summary':
        return (
          <MbrPreSummary
            draftData={draft.data}
            decisions={draft.data.decisions}
            isCompleting={isCompleting}
            onComplete={handleComplete}
            onBack={goBack}
            teamId={teamIdParam}
            onAgendaSuggestionsChange={(next) => updateDraft({ agendaSuggestions: next })}
            onHighlightsChange={(highlights) => updateDraft({ highlights })}
            onNextStepsChange={(nextSteps) => updateDraft({ nextSteps })}
            onDecisionsChange={(decisions: TeamCheckinDecision[]) => updateDraft({ decisions })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <FullPageWizardShell
      title="Pré-MBR do Time"
      subtitle="Preparação mensal — balanço, destaques e próximos passos"
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
