/**
 * MbrV2Page — Monthly Business Review v2 (paralelo ao v1)
 *
 * Rito mensal organizado por OBJETIVOS ORGANIZACIONAIS, com tempo
 * proporcional à severidade e KPI Gate de 4 caminhos canônicos.
 *
 * Convive com o MBR v1 (`/rituals/mbr`). Esta página persiste em
 * `okr_wizard_sessions` com `wizard_type='mbr-v2'`. v1 segue intacto.
 *
 * Steps: opening-executive → kpi-gate → objectives-overview →
 *        objective-detail → loose-items → carry-over → decisions →
 *        evaluation → closing
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { defaultReferenceMonth } from '@/modules/okrs/utils/mbr/referenceMonth';

import { FullPageWizardShell } from '@/modules/okrs/components/wizards/shared/FullPageWizardShell';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardFirstStepFooter,
  WizardLastStepFooter,
  ReferenceMonthPicker,
} from '@/modules/okrs/components/wizards/shared';
import { EvaluationCollectionStep } from '@/modules/okrs/components/wizards/shared/framework/components/evaluation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { LoadingState } from '@/components/ui/loading-state';
import { Clock, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

import { useBu } from '@/contexts/BuContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useGenericWizardDraft,
  useActiveCycle,
  useAllOrgObjectivesView,
  useCarryOverDecisions,
  useMbrPreSubmissions,
} from '@/modules/okrs/hooks';
import { useMbrV2ObjectiveAnalyses } from '@/modules/okrs/hooks/useMbrV2ObjectiveAnalyses';

import {
  type MbrV2Step,
  type MbrV2DraftData,
  type MbrV2KpiGateResolutionPath,
  type MbrV2CarryOverStatus,
  type MbrV2ObjectiveSeverity,
  MBR_V2_STEP_ORDER,
  MBR_V2_TIME_BUDGET_MIN,
} from '@/modules/okrs/types/wizard/mbr-v2';
import { EMPTY_MBR_PANORAMA_CURATION } from '@/modules/okrs/types/wizard';
import { getRitualFinalizationCopy } from '@/modules/okrs/constants/ritualLabels';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_STEPS = [
  { id: 'opening-executive', label: 'Abertura', description: 'Curadoria do mês' },
  { id: 'kpi-gate', label: 'KPI Gate', description: '4 caminhos canônicos' },
  { id: 'objectives-overview', label: 'Objetivos', description: 'Ordenados por severidade' },
  { id: 'objective-detail', label: 'Discussão', description: 'Por objetivo' },
  { id: 'loose-items', label: 'Avulsos', description: 'Pautas extras' },
  { id: 'carry-over', label: 'Carry-over', description: 'MBR anterior' },
  { id: 'decisions', label: 'Decisões', description: 'Output formal' },
  { id: 'evaluation', label: 'Avaliação', description: 'Coleta anônima' },
  { id: 'closing', label: 'Encerramento', description: 'Cobertura + ata' },
];

const DEFAULT_DATA: MbrV2DraftData = {
  referenceMonth: defaultReferenceMonth(),
  panoramaCuration: EMPTY_MBR_PANORAMA_CURATION,
  kpiGateResolutions: [],
  objectiveAnalyses: [],
  currentObjectiveIndex: 0,
  looseItems: [],
  carryOver: [],
  decisions: [],
  checklist: {
    decisionsHaveOwners: false,
    carryOverFullyStatused: false,
    evaluationCollected: false,
    nextMbrScheduled: false,
  },
  ritualFeedback: [],
};

const SEVERITY_LABEL: Record<MbrV2ObjectiveSeverity, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};
const SEVERITY_TONE: Record<MbrV2ObjectiveSeverity, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground border-border',
};

const PATH_LABEL: Record<MbrV2KpiGateResolutionPath, string> = {
  immediate_decision: 'Decidir agora',
  delegated_investigation: 'Delegar investigação',
  analyzed: 'Analisado (sem ação)',
  blocked: 'Bloqueio externo',
};

const CARRY_OVER_STATUS_LABEL: Record<MbrV2CarryOverStatus, string> = {
  concluded: 'Concluída',
  in_progress: 'Em andamento',
  replanned: 'Replanejada',
  cancelled: 'Cancelada',
};

// ============================================================
// COMPONENT
// ============================================================

export default function MbrV2Page() {
  const navigate = useNavigate();
  const { currentBu } = useBu();
  usePageTitle('MBR v2 (beta)');

  const { activeQuarterlyCycle: cycle, isLoading: isLoadingCycle } = useActiveCycle();

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
  } = useGenericWizardDraft<MbrV2Step, MbrV2DraftData>({
    wizardType: 'mbr-v2',
    teamId: null,
    cycleId: cycle?.id || null,
    defaultStep: 'opening-executive',
    defaultData: DEFAULT_DATA,
    enabled: !!cycle,
  });

  const cycleYear = cycle ? parseInt(cycle.start_date.substring(0, 4), 10) : undefined;
  const { data: orgObjectives = [] } = useAllOrgObjectivesView(cycleYear, cycle?.id);
  const { data: carryOverDecisions = [] } = useCarryOverDecisions({
    wizardType: 'mbr-v2',
    teamId: null,
  });
  const { data: mbrPre } = useMbrPreSubmissions({
    referenceMonth: draft.data.referenceMonth,
  });

  // Pré-MBR signals: needsDecision count by team — não está mapeado por
  // objectiveId no Pré-MBR v1, então usamos contagem global como heurística.
  const preSignalsByObjective = useMemo<Record<string, { needsDecisionCount: number }>>(() => {
    const map: Record<string, { needsDecisionCount: number }> = {};
    const subs = Object.values(mbrPre?.byTeam ?? {});
    const totalNeedsDecision = subs.filter(
      (s: any) => s?.highlights?.needsDecision?.trim(),
    ).length;
    if (totalNeedsDecision === 0) return map;
    // Distribuir como sinal "fraco" entre todos os objetivos — refinar
    // quando o Pré-MBR v2 incluir mapeamento explícito por objetivo.
    for (const obj of orgObjectives) {
      map[obj.id] = { needsDecisionCount: Math.min(1, totalNeedsDecision) };
    }
    return map;
  }, [mbrPre, orgObjectives]);

  const computedAnalyses = useMbrV2ObjectiveAnalyses({
    objectives: orgObjectives,
    preSignalsByObjective,
  });

  // Hidrata `objectiveAnalyses` no draft uma única vez (quando vazio).
  const analyses =
    draft.data.objectiveAnalyses.length > 0
      ? draft.data.objectiveAnalyses
      : computedAnalyses;

  const seedAnalyses = useCallback(() => {
    if (draft.data.objectiveAnalyses.length === 0 && computedAnalyses.length > 0) {
      updateDraft({ objectiveAnalyses: computedAnalyses });
    }
  }, [draft.data.objectiveAnalyses.length, computedAnalyses, updateDraft]);

  // Carry-over hidratação
  const seedCarryOver = useCallback(() => {
    if (draft.data.carryOver.length === 0 && carryOverDecisions.length > 0) {
      updateDraft({
        carryOver: carryOverDecisions.map((d: any) => ({
          decisionId: d.id,
          text: d.text ?? d.title ?? '(sem texto)',
          status: 'in_progress' as MbrV2CarryOverStatus,
        })),
      });
    }
  }, [draft.data.carryOver.length, carryOverDecisions, updateDraft]);

  // Step navigation
  const currentStepIndex = MBR_V2_STEP_ORDER.indexOf(draft.currentStep);
  const completedSteps = useMemo(
    () => MBR_V2_STEP_ORDER.slice(0, currentStepIndex),
    [currentStepIndex],
  );
  const goNext = useCallback(() => {
    const next = MBR_V2_STEP_ORDER[currentStepIndex + 1];
    if (next) setStep(next);
  }, [currentStepIndex, setStep]);
  const goBack = useCallback(() => {
    const prev = MBR_V2_STEP_ORDER[currentStepIndex - 1];
    if (prev) setStep(prev);
  }, [currentStepIndex, setStep]);

  const handleClose = useCallback(() => navigate('/rituals'), [navigate]);
  const handleSave = useCallback(async () => {
    try {
      await saveDraft();
      toast.success('Rascunho salvo');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar rascunho');
    }
  }, [saveDraft]);
  const handleDiscard = useCallback(async () => {
    try {
      await discardDraft();
      toast.success('Rascunho descartado');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao descartar rascunho');
    }
  }, [discardDraft]);
  const handleFinalize = useCallback(async () => {
    await clearDraft();
    toast.success('MBR v2 concluído!');
    navigate('/rituals');
  }, [clearDraft, navigate]);

  if (isLoadingCycle) return <LoadingState text="Carregando ciclo…" />;
  if (!cycle) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Não há ciclo trimestral ativo. O MBR v2 precisa de um ciclo aberto para iniciar.
            </p>
            <Button className="mt-4" onClick={() => navigate('/rituals')}>
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const finalizationCopy = getRitualFinalizationCopy('mbr-v2');

  return (
    <FullPageWizardShell
      title="MBR v2 (beta)"
      subtitle={`Mês de referência: ${draft.data.referenceMonth}`}
      steps={WIZARD_STEPS}
      currentStepId={draft.currentStep}
      completedSteps={completedSteps}
      onStepChange={(id) => setStep(id as MbrV2Step)}
      isDirty={isDirty}
      isSavingDraft={isSaving}
      onSaveDraft={handleSave}
      lastSavedAt={lastSavedAt}
      isResumingDraft={isResumingDraft}
      onDiscardDraft={handleDiscard}
      onClose={handleClose}
    >
      {draft.currentStep === 'opening-executive' && (
        <StepOpening
          referenceMonth={draft.data.referenceMonth}
          onChangeMonth={(m) => updateDraft({ referenceMonth: m })}
          summary={draft.data.panoramaCuration?.summary ?? ''}
          onChangeSummary={(s) =>
            updateDraft({
              panoramaCuration: {
                ...(draft.data.panoramaCuration ?? EMPTY_MBR_PANORAMA_CURATION),
                summary: s,
              },
            })
          }
          mbrPreCount={mbrPre?.submittedCount ?? 0}
          footer={
            <WizardFirstStepFooter
              primaryLabel="Avançar"
              onPrimary={() => {
                seedAnalyses();
                seedCarryOver();
                goNext();
              }}
            />
          }
        />
      )}

      {draft.currentStep === 'kpi-gate' && (
        <StepKpiGate
          resolutions={draft.data.kpiGateResolutions}
          onChange={(rs) => updateDraft({ kpiGateResolutions: rs })}
          footer={
            <WizardStepFooter
              showBack
              onBack={goBack}
              primaryLabel="Avançar"
              onPrimary={goNext}
            />
          }
        />
      )}

      {draft.currentStep === 'objectives-overview' && (
        <StepObjectivesOverview
          analyses={analyses}
          onUpdate={(a) => updateDraft({ objectiveAnalyses: a })}
          footer={
            <WizardStepFooter
              showBack
              onBack={goBack}
              primaryLabel="Discutir objetivos"
              onPrimary={() => {
                updateDraft({ currentObjectiveIndex: 0 });
                goNext();
              }}
              primaryDisabled={analyses.length === 0}
            />
          }
        />
      )}

      {draft.currentStep === 'objective-detail' && (
        <StepObjectiveDetail
          analyses={analyses}
          currentIndex={draft.data.currentObjectiveIndex}
          onIndexChange={(i) => updateDraft({ currentObjectiveIndex: i })}
          onMarkDiscussed={(idx) => {
            const next = analyses.map((a, i) =>
              i === idx ? { ...a, discussed: true } : a,
            );
            updateDraft({ objectiveAnalyses: next });
          }}
          objectives={orgObjectives}
          onBack={goBack}
          onComplete={goNext}
        />
      )}

      {draft.currentStep === 'loose-items' && (
        <StepLooseItems
          items={draft.data.looseItems}
          onChange={(items) => updateDraft({ looseItems: items })}
          footer={
            <WizardStepFooter
              showBack
              onBack={goBack}
              primaryLabel="Avançar"
              onPrimary={goNext}
            />
          }
        />
      )}

      {draft.currentStep === 'carry-over' && (
        <StepCarryOver
          items={draft.data.carryOver}
          onChange={(items) => updateDraft({ carryOver: items })}
          footer={
            <WizardStepFooter
              showBack
              onBack={goBack}
              primaryLabel="Avançar"
              onPrimary={goNext}
              primaryDisabled={draft.data.carryOver.some((c) => !c.status)}
            />
          }
        />
      )}

      {draft.currentStep === 'decisions' && (
        <StepDecisions
          decisions={draft.data.decisions}
          onChange={(d) => updateDraft({ decisions: d })}
          footer={
            <WizardStepFooter
              showBack
              onBack={goBack}
              primaryLabel="Avançar"
              onPrimary={goNext}
            />
          }
        />
      )}

      {draft.currentStep === 'evaluation' && (
        <EvaluationCollectionStep
          sessionId={sessionId}
          persona="mbr-v2"
          footer={
            <WizardStepFooter
              showBack
              onBack={goBack}
              primaryLabel="Avançar"
              onPrimary={goNext}
            />
          }
        />
      )}

      {draft.currentStep === 'closing' && (
        <StepClosing
          analyses={analyses}
          decisionsCount={draft.data.decisions.length}
          carryOver={draft.data.carryOver}
          checklist={draft.data.checklist}
          onChecklistChange={(c) => updateDraft({ checklist: c })}
          footer={
            <WizardLastStepFooter
              showBack
              onBack={goBack}
              onPrimary={handleFinalize}
              confirmTitle={finalizationCopy?.title ?? 'Encerrar MBR v2'}
              confirmDescription={
                finalizationCopy?.description ?? 'Encerrar o MBR v2 e registrar as decisões?'
              }
              confirmLabel={finalizationCopy?.confirmLabel ?? 'Encerrar'}
            />
          }
        />
      )}
    </FullPageWizardShell>
  );
}

// ============================================================
// STEP COMPONENTS (inline — extrair para arquivos próprios na próxima onda)
// ============================================================

function StepOpening({
  referenceMonth,
  onChangeMonth,
  summary,
  onChangeSummary,
  mbrPreCount,
  footer,
}: {
  referenceMonth: string;
  onChangeMonth: (m: string) => void;
  summary: string;
  onChangeSummary: (s: string) => void;
  mbrPreCount: number;
  footer: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <WizardStepHeader
        icon={Circle}
        title="Abertura Executiva"
        description="Curadoria do mês a partir dos Pré-MBRs recebidos"
      />
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <ReferenceMonthPicker value={referenceMonth} onChange={onChangeMonth} />
            <Badge variant="secondary">
              {mbrPreCount} Pré-MBR(s) recebidos
            </Badge>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Resumo executivo do mês</label>
            <Textarea
              rows={6}
              value={summary}
              onChange={(e) => onChangeSummary(e.target.value)}
              placeholder="Síntese do que aconteceu no mês — alavancas, ofensores e tensão para a discussão."
            />
          </div>
        </CardContent>
      </Card>
      {footer}
    </div>
  );
}

function StepKpiGate({
  resolutions,
  onChange,
  footer,
}: {
  resolutions: MbrV2DraftData['kpiGateResolutions'];
  onChange: (r: MbrV2DraftData['kpiGateResolutions']) => void;
  footer: React.ReactNode;
}) {
  const [draftKpiId, setDraftKpiId] = useState('');
  const [draftPath, setDraftPath] = useState<MbrV2KpiGateResolutionPath>('immediate_decision');
  const [draftNotes, setDraftNotes] = useState('');

  const addRow = () => {
    if (!draftKpiId.trim()) return;
    onChange([
      ...resolutions,
      { kpiId: draftKpiId.trim(), path: draftPath, notes: draftNotes.trim() || undefined },
    ]);
    setDraftKpiId('');
    setDraftNotes('');
    setDraftPath('immediate_decision');
  };

  return (
    <div className="space-y-6">
      <WizardStepHeader
        icon={Circle}
        title="KPI Gate"
        description="Para cada KPI crítico, escolha o caminho de resolução."
      />
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            <AlertTriangle className="inline h-4 w-4 mr-1" />
            4 caminhos canônicos: decidir agora, delegar investigação, marcar como
            analisado (sem ação) ou registrar bloqueio externo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground">KPI ID / nome</label>
              <Input
                value={draftKpiId}
                onChange={(e) => setDraftKpiId(e.target.value)}
                placeholder="Ex: nps_geral"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Caminho</label>
              <Select value={draftPath} onValueChange={(v) => setDraftPath(v as MbrV2KpiGateResolutionPath)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PATH_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground">Observações</label>
              <Input value={draftNotes} onChange={(e) => setDraftNotes(e.target.value)} />
            </div>
            <Button onClick={addRow} disabled={!draftKpiId.trim()}>Registrar</Button>
          </div>
          <div className="space-y-2">
            {resolutions.map((r, idx) => (
              <div key={idx} className="border rounded p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <strong>{r.kpiId}</strong>
                  <span className="ml-2 text-muted-foreground">{PATH_LABEL[r.path]}</span>
                  {r.notes ? <div className="text-xs text-muted-foreground">{r.notes}</div> : null}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(resolutions.filter((_, i) => i !== idx))}
                >
                  Remover
                </Button>
              </div>
            ))}
            {resolutions.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma resolução registrada (opcional).</p>
            )}
          </div>
        </CardContent>
      </Card>
      {footer}
    </div>
  );
}

function StepObjectivesOverview({
  analyses,
  onUpdate,
  footer,
}: {
  analyses: MbrV2DraftData['objectiveAnalyses'];
  onUpdate: (a: MbrV2DraftData['objectiveAnalyses']) => void;
  footer: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <WizardStepHeader
        icon={Circle}
        title="Objetivos Organizacionais"
        description="Lista ordenada por severidade. Ajuste tempo ou nível antes de discutir."
      />
      <div className="space-y-3">
        {analyses.map((a, idx) => {
          const sev = a.manualSeverityOverride ?? a.severity;
          return (
            <Card key={a.objectiveId}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-medium">{a.title}</div>
                    {a.drivers.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {a.drivers.join(' · ')}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={SEVERITY_TONE[sev]}>
                    {SEVERITY_LABEL[sev]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    className="w-24"
                    value={a.timeBudgetMin}
                    onChange={(e) => {
                      const v = Math.max(1, Number(e.target.value) || 1);
                      const next = [...analyses];
                      next[idx] = { ...a, timeBudgetMin: v };
                      onUpdate(next);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">min</span>
                  <Select
                    value={sev}
                    onValueChange={(v) => {
                      const newSev = v as MbrV2ObjectiveSeverity;
                      const next = [...analyses];
                      next[idx] = {
                        ...a,
                        manualSeverityOverride: newSev,
                        timeBudgetMin: MBR_V2_TIME_BUDGET_MIN[newSev],
                      };
                      onUpdate(next);
                    }}
                  >
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {analyses.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum objetivo organizacional encontrado para o ciclo atual.
          </p>
        )}
      </div>
      {footer}
    </div>
  );
}

function StepObjectiveDetail({
  analyses,
  currentIndex,
  onIndexChange,
  onMarkDiscussed,
  objectives,
  onBack,
  onComplete,
}: {
  analyses: MbrV2DraftData['objectiveAnalyses'];
  currentIndex: number;
  onIndexChange: (i: number) => void;
  onMarkDiscussed: (i: number) => void;
  objectives: any[];
  onBack: () => void;
  onComplete: () => void;
}) {
  if (analyses.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Sem objetivos para discutir.</p>
        <WizardStepFooter showBack onBack={onBack} primaryLabel="Avançar" onPrimary={onComplete} />
      </div>
    );
  }
  const current = analyses[currentIndex];
  const objMeta = objectives.find((o) => o.id === current?.objectiveId);
  const sev = current.manualSeverityOverride ?? current.severity;

  const isLast = currentIndex === analyses.length - 1;

  return (
    <div className="space-y-6">
      <WizardStepHeader
        icon={Circle}
        title={`Discussão: ${current.title}`}
        description={`Objetivo ${currentIndex + 1} de ${analyses.length} · ${current.timeBudgetMin} min · severidade ${SEVERITY_LABEL[sev]}`}
      />
      <Card>
        <CardContent className="p-6 space-y-3">
          <Badge className={SEVERITY_TONE[sev]} variant="outline">
            {SEVERITY_LABEL[sev]}
          </Badge>
          {current.drivers.length > 0 && (
            <ul className="text-sm text-muted-foreground list-disc pl-5">
              {current.drivers.map((d, i) => (<li key={i}>{d}</li>))}
            </ul>
          )}
          {objMeta?.orgKrs?.length ? (
            <div className="text-sm">
              <div className="font-medium mb-1">KRs vinculados</div>
              <ul className="space-y-1">
                {objMeta.orgKrs.map((kr: any) => (
                  <li key={kr.id} className="text-muted-foreground">
                    • {kr.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            Objetivo anterior
          </Button>
          <Button
            onClick={() => {
              onMarkDiscussed(currentIndex);
              if (isLast) onComplete();
              else onIndexChange(currentIndex + 1);
            }}
          >
            {isLast ? 'Concluir discussão' : 'Marcar como discutido e avançar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepLooseItems({
  items,
  onChange,
  footer,
}: {
  items: MbrV2DraftData['looseItems'];
  onChange: (i: MbrV2DraftData['looseItems']) => void;
  footer: React.ReactNode;
}) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  return (
    <div className="space-y-6">
      <WizardStepHeader
        icon={Circle}
        title="Itens Avulsos"
        description="Pautas que não pertencem a um objetivo organizacional."
      />
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground">Título</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground">Detalhe</label>
              <Input value={detail} onChange={(e) => setDetail(e.target.value)} />
            </div>
            <Button
              onClick={() => {
                if (!title.trim()) return;
                onChange([
                  ...items,
                  {
                    id: crypto.randomUUID(),
                    title: title.trim(),
                    detail: detail.trim() || undefined,
                    addressed: false,
                  },
                ]);
                setTitle('');
                setDetail('');
              }}
              disabled={!title.trim()}
            >
              Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={it.id} className="border rounded p-3 flex items-center justify-between gap-3">
                <div className="text-sm">
                  <strong>{it.title}</strong>
                  {it.detail && <div className="text-xs text-muted-foreground">{it.detail}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={it.addressed ? 'default' : 'outline'}
                    onClick={() => {
                      const next = [...items];
                      next[idx] = { ...it, addressed: !it.addressed };
                      onChange(next);
                    }}
                  >
                    {it.addressed ? 'Endereçado' : 'Marcar como endereçado'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onChange(items.filter((_, i) => i !== idx))}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum item avulso (opcional).</p>
            )}
          </div>
        </CardContent>
      </Card>
      {footer}
    </div>
  );
}

function StepCarryOver({
  items,
  onChange,
  footer,
}: {
  items: MbrV2DraftData['carryOver'];
  onChange: (i: MbrV2DraftData['carryOver']) => void;
  footer: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <WizardStepHeader
        icon={Circle}
        title="Carry-over"
        description="Status obrigatório para cada decisão do MBR anterior."
      />
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem decisões anteriores para revisar.
          </p>
        ) : (
          items.map((it, idx) => (
            <Card key={it.decisionId}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="text-sm flex-1">{it.text}</div>
                <Select
                  value={it.status}
                  onValueChange={(v) => {
                    const next = [...items];
                    next[idx] = { ...it, status: v as MbrV2CarryOverStatus };
                    onChange(next);
                  }}
                >
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CARRY_OVER_STATUS_LABEL).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {footer}
    </div>
  );
}

function StepDecisions({
  decisions,
  onChange,
  footer,
}: {
  decisions: MbrV2DraftData['decisions'];
  onChange: (d: MbrV2DraftData['decisions']) => void;
  footer: React.ReactNode;
}) {
  const [text, setText] = useState('');
  return (
    <div className="space-y-6">
      <WizardStepHeader
        icon={Circle}
        title="Decisões Formais"
        description="Output canônico do rito — cada decisão precisa de texto e responsável depois."
      />
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Nova decisão</label>
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex: Pausar projeto X até reavaliação em junho." />
            </div>
            <Button
              onClick={() => {
                if (!text.trim()) return;
                onChange([
                  ...decisions,
                  {
                    id: crypto.randomUUID(),
                    text: text.trim(),
                    category: 'general',
                    sourceStep: 'decisions',
                  } as any,
                ]);
                setText('');
              }}
              disabled={!text.trim()}
            >
              Registrar
            </Button>
          </div>
          <div className="space-y-2">
            {decisions.map((d: any, idx) => (
              <div key={d.id ?? idx} className="border rounded p-3 flex items-center justify-between gap-3">
                <div className="text-sm">{d.text}</div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(decisions.filter((_, i) => i !== idx))}
                >
                  Remover
                </Button>
              </div>
            ))}
            {decisions.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma decisão registrada ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
      {footer}
    </div>
  );
}

function StepClosing({
  analyses,
  decisionsCount,
  carryOver,
  checklist,
  onChecklistChange,
  footer,
}: {
  analyses: MbrV2DraftData['objectiveAnalyses'];
  decisionsCount: number;
  carryOver: MbrV2DraftData['carryOver'];
  checklist: MbrV2DraftData['checklist'];
  onChecklistChange: (c: MbrV2DraftData['checklist']) => void;
  footer: React.ReactNode;
}) {
  const discussedCount = analyses.filter((a) => a.discussed).length;
  const carryStatused = carryOver.length === 0 || carryOver.every((c) => !!c.status);
  return (
    <div className="space-y-6">
      <WizardStepHeader
        icon={Circle}
        title="Encerramento"
        description="Cobertura derivada + checklist final."
      />
      <Card>
        <CardContent className="p-6 space-y-3">
          <Coverage
            label="Objetivos discutidos"
            ok={discussedCount > 0}
            text={`${discussedCount}/${analyses.length}`}
          />
          <Coverage
            label="Decisões registradas"
            ok={decisionsCount > 0}
            text={`${decisionsCount}`}
          />
          <Coverage
            label="Carry-over com status"
            ok={carryStatused}
            text={`${carryOver.filter((c) => c.status).length}/${carryOver.length}`}
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 space-y-3">
          {(
            [
              ['decisionsHaveOwners', 'Todas as decisões têm dono'],
              ['carryOverFullyStatused', 'Carry-over 100% statusado'],
              ['evaluationCollected', 'Avaliação anônima coletada'],
              ['nextMbrScheduled', 'Próximo MBR agendado'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={!!checklist[key]}
                onChange={(e) => onChecklistChange({ ...checklist, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </CardContent>
      </Card>
      {footer}
    </div>
  );
}

function Coverage({ label, ok, text }: { label: string; ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="flex-1">{label}</span>
      <Badge variant="outline">{text}</Badge>
    </div>
  );
}
