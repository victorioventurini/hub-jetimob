/**
 * QbrOkrProposalStep - Inline OKR creation for QBR Pre wizard
 *
 * Single-screen flow: each objective is an expandable card showing
 * title, description, KR count selector and all KR forms inline.
 * Max 4 objectives × 4 KRs each.
 *
 * AI validation via useProposalValidation / ProposalValidationCard
 * is embedded per-objective card.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Target, Plus, Minus,
  TrendingUp, TrendingDown, Equal,
  CheckCircle2, Trash2, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineAgendaSuggestionInput,
} from '../shared';
import { BuUserSelect, UnitSelect } from '@/components/selects';
import { useProposalValidation } from '@/modules/okrs/hooks';
import { ProposalValidationCard } from './ProposalValidationCard';
import { OKR_LIMITS } from '@/modules/okrs/utils/linkingRules';
import type {
  DraftTeamKr,
  OkrDirection,
  ProposedObjectiveEntry,
  RitualAgendaSuggestion,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrOkrProposalStepProps {
  proposedOkrs: ProposedObjectiveEntry[];
  teamId: string;
  teamName?: string;
  onProposedOkrsChange: (okrs: ProposedObjectiveEntry[]) => void;
  onContinue: () => void;
  onBack: () => void;
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  agendaTriggerLabel?: string;
  agendaCategoryless?: boolean;
}

// ============================================================
// CONSTANTS
// ============================================================

const MAX_OBJECTIVES = OKR_LIMITS.MAX_OBJECTIVES_PER_TEAM;
const MAX_KRS_PER_OBJECTIVE = OKR_LIMITS.MAX_KRS_PER_OBJECTIVE;

const DIRECTION_OPTIONS: { value: OkrDirection; label: string; icon: typeof TrendingUp }[] = [
  { value: 'up', label: 'Aumentar', icon: TrendingUp },
  { value: 'down', label: 'Reduzir', icon: TrendingDown },
  { value: 'maintain', label: 'Manter', icon: Equal },
];

// ============================================================
// HELPERS
// ============================================================

function createEmptyEntry(): ProposedObjectiveEntry {
  return {
    id: `obj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    objective: { title: '', description: '', org_objective_id: null, cycle_id: null },
    krPlan: { foundational: 1, contribution: 0, enabler: 0 },
    draftKrs: [],
  };
}

function getKrCount(entry: ProposedObjectiveEntry): number {
  return entry.krPlan.foundational + entry.krPlan.contribution + entry.krPlan.enabler;
}

function isEntryComplete(entry: ProposedObjectiveEntry): boolean {
  const total = getKrCount(entry);
  return (
    entry.objective.title.trim().length >= 10 &&
    total >= 1 &&
    entry.draftKrs.length >= total &&
    entry.draftKrs.slice(0, total).every(kr => kr.title.trim().length >= 5)
  );
}

function ensureKrs(draftKrs: DraftTeamKr[], count: number): DraftTeamKr[] {
  const krs = [...draftKrs];
  while (krs.length < count) {
    krs.push({
      id: `draft-kr-${Date.now()}-${krs.length}`,
      type: 'foundational',
      title: '',
      unit: '%',
      baseline: 0,
      target: 100,
      direction: 'up',
      owner_user_id: null,
      linked_org_kr_id: null,
    });
  }
  return krs;
}

// ============================================================
// INLINE KR FORM
// ============================================================

function InlineKrForm({
  kr,
  index,
  teamId,
  onChange,
}: {
  kr: DraftTeamKr;
  index: number;
  teamId: string;
  onChange: (updates: Partial<DraftTeamKr>) => void;
}) {
  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] shrink-0">KR {index + 1}</Badge>
          {kr.title.trim().length >= 5 && (
            <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Título do Key Result</Label>
          <Input
            placeholder="Ex: Atingir 85% de satisfação em NPS de locação"
            value={kr.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="text-sm h-8"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Direção</Label>
            <div className="flex gap-1">
              {DIRECTION_OPTIONS.map((opt) => {
                const DirIcon = opt.icon;
                return (
                  <Button
                    key={opt.value}
                    variant={kr.direction === opt.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs flex-1 gap-0.5 px-1"
                    onClick={() => onChange({ direction: opt.value })}
                    title={opt.label}
                  >
                    <DirIcon className="h-3 w-3" />
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Baseline</Label>
            <Input
              type="number"
              value={kr.baseline}
              onChange={(e) => onChange({ baseline: Number(e.target.value) })}
              className="text-sm h-7"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Meta</Label>
            <Input
              type="number"
              value={kr.target}
              onChange={(e) => onChange({ target: Number(e.target.value) })}
              className="text-sm h-7"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Unidade</Label>
            <UnitSelect
              value={kr.unit}
              onChange={(unit) => onChange({ unit })}
              showLabel={false}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Responsável</Label>
            <BuUserSelect
              value={kr.owner_user_id || ''}
              onValueChange={(id) => onChange({ owner_user_id: id || null })}
              teamId={teamId}
              placeholder="Selecionar..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// INLINE OBJECTIVE CARD
// ============================================================

function InlineObjectiveCard({
  entry,
  index,
  teamId,
  teamName,
  isOpen,
  onToggle,
  onUpdate,
  onRemove,
}: {
  entry: ProposedObjectiveEntry;
  index: number;
  teamId: string;
  teamName?: string;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<ProposedObjectiveEntry>) => void;
  onRemove: () => void;
}) {
  const krCount = getKrCount(entry);
  const complete = isEntryComplete(entry);
  const ensuredKrs = useMemo(() => ensureKrs(entry.draftKrs, krCount), [entry.draftKrs, krCount]);

  // AI Validation — independent per objective
  const {
    assessment,
    isLoading: validationLoading,
    error: validationError,
    validate,
    reset: resetValidation,
  } = useProposalValidation();

  // Reset validation when KRs change
  useEffect(() => {
    if (assessment) resetValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.draftKrs]);

  const allKrsFilled = ensuredKrs.slice(0, krCount).every(kr => kr.title.trim().length >= 5);

  const handleValidate = useCallback(() => {
    validate({
      objectiveTitle: entry.objective.title,
      objectiveDescription: entry.objective.description,
      teamName,
      draftKrs: ensuredKrs.slice(0, krCount),
    });
  }, [validate, entry.objective.title, entry.objective.description, teamName, ensuredKrs, krCount]);

  const handleKrCountChange = useCallback((count: number) => {
    onUpdate({
      krPlan: { foundational: count, contribution: 0, enabler: 0 },
    });
  }, [onUpdate]);

  const handleKrChange = useCallback((krIndex: number, updates: Partial<DraftTeamKr>) => {
    const next = ensuredKrs.map((kr, i) =>
      i === krIndex ? { ...kr, ...updates } : kr
    );
    onUpdate({ draftKrs: next });
  }, [ensuredKrs, onUpdate]);

  const filledKrs = ensuredKrs.filter(kr => kr.title.trim().length >= 5).length;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={cn('transition-colors', complete && 'border-primary/30')}>
        {/* Collapsed header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                {complete ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-medium truncate">
                  {entry.objective.title || `Objetivo ${index + 1}`}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <Badge variant="outline" className="text-[10px]">
                  {filledKrs}/{krCount} KR{krCount !== 1 ? 's' : ''}
                </Badge>
                {!complete && entry.objective.title.trim().length > 0 && (
                  <Badge variant="secondary" className="text-[10px] text-status-amber">
                    Incompleto
                  </Badge>
                )}
              </div>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform shrink-0',
                isOpen && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>

        {/* Expanded content */}
        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            <Separator />

            {/* Objective fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Objetivo
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-destructive hover:text-destructive gap-1"
                  onClick={(e) => { e.stopPropagation(); onRemove(); }}
                >
                  <Trash2 className="h-3 w-3" /> Remover
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Título do Objetivo</Label>
                <Input
                  placeholder="Ex: Consolidar presença digital no segmento de locação"
                  value={entry.objective.title}
                  onChange={(e) =>
                    onUpdate({ objective: { ...entry.objective, title: e.target.value } })
                  }
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Mínimo 10 caracteres. Descreva o resultado desejado, não a atividade.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Descrição <span className="text-muted-foreground">(opcional)</span>
                </Label>
                <Textarea
                  placeholder="Contexto adicional sobre por que este objetivo é prioritário..."
                  value={entry.objective.description}
                  onChange={(e) =>
                    onUpdate({ objective: { ...entry.objective, description: e.target.value } })
                  }
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            {/* KR count selector */}
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Quantos Key Results? (1 a {MAX_KRS_PER_OBJECTIVE})
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleKrCountChange(Math.max(1, krCount - 1))}
                  disabled={krCount <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-5 text-center text-sm font-medium">{krCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleKrCountChange(Math.min(MAX_KRS_PER_OBJECTIVE, krCount + 1))}
                  disabled={krCount >= MAX_KRS_PER_OBJECTIVE}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Inline KR forms */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Key Results
              </Label>
              {Array.from({ length: krCount }).map((_, krIdx) => (
                <InlineKrForm
                  key={ensuredKrs[krIdx]?.id ?? krIdx}
                  kr={ensuredKrs[krIdx]}
                  index={krIdx}
                  teamId={teamId}
                  onChange={(updates) => handleKrChange(krIdx, updates)}
                />
              ))}
            </div>

            {/* AI Validation */}
            {entry.objective.title.trim().length >= 10 && (
              <ProposalValidationCard
                assessment={assessment}
                isLoading={validationLoading}
                error={validationError}
                onValidate={handleValidate}
                onReset={resetValidation}
                canValidate={allKrsFilled}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function QbrOkrProposalStep({
  proposedOkrs,
  teamId,
  teamName,
  onProposedOkrsChange,
  onContinue,
  onBack,
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
}: QbrOkrProposalStepProps) {
  // Track which objective card is open (auto-expand newly added)
  const [openIndex, setOpenIndex] = useState<number | null>(
    proposedOkrs.length > 0 ? 0 : null,
  );

  const handleAdd = useCallback(() => {
    if (proposedOkrs.length >= MAX_OBJECTIVES) return;
    const newEntry = createEmptyEntry();
    const updated = [...proposedOkrs, newEntry];
    onProposedOkrsChange(updated);
    setOpenIndex(updated.length - 1);
  }, [proposedOkrs, onProposedOkrsChange]);

  const handleRemove = useCallback((index: number) => {
    const updated = proposedOkrs.filter((_, i) => i !== index);
    onProposedOkrsChange(updated);
    if (openIndex === index) {
      setOpenIndex(updated.length > 0 ? Math.min(index, updated.length - 1) : null);
    } else if (openIndex !== null && openIndex > index) {
      setOpenIndex(openIndex - 1);
    }
  }, [proposedOkrs, onProposedOkrsChange, openIndex]);

  const handleUpdate = useCallback((index: number, updates: Partial<ProposedObjectiveEntry>) => {
    const updated = proposedOkrs.map((entry, i) =>
      i === index ? { ...entry, ...updates } : entry
    );
    onProposedOkrsChange(updated);
  }, [proposedOkrs, onProposedOkrsChange]);

  const hasEntries = proposedOkrs.length > 0;
  const allComplete = hasEntries && proposedOkrs.every(isEntryComplete);

  const badgeLabel = `${proposedOkrs.length} objetivo${proposedOkrs.length !== 1 ? 's' : ''}`;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="Proposta de OKRs"
          tooltip="qbr-okr-proposal"
          description="Rascunhos para o próximo ciclo — serão revisados no QBR"
          variant="primary"
          badge={badgeLabel}
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={hasEntries && !allComplete}
          backLabel="Voltar"
          primaryLabel={hasEntries ? 'Avançar para Resumo' : 'Pular proposta'}
        />
      }
      bottomFixed={
        agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
          <InlineAgendaSuggestionInput
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            sourceStep="qbr-okr-proposal"
            triggerLabel={agendaTriggerLabel}
            categoryless
          />
        ) : undefined
      }
    >
      <div className="p-6 space-y-4">
        {/* Objective cards */}
        {proposedOkrs.map((entry, idx) => (
          <InlineObjectiveCard
            key={entry.id}
            entry={entry}
            index={idx}
            teamId={teamId}
            teamName={teamName}
            isOpen={openIndex === idx}
            onToggle={() => setOpenIndex(openIndex === idx ? null : idx)}
            onUpdate={(updates) => handleUpdate(idx, updates)}
            onRemove={() => handleRemove(idx)}
          />
        ))}

        {/* Add objective button */}
        {proposedOkrs.length < MAX_OBJECTIVES && (
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed text-sm"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            Adicionar Objetivo {proposedOkrs.length > 0 && `(${proposedOkrs.length}/${MAX_OBJECTIVES})`}
          </Button>
        )}

        {!hasEntries && (
          <p className="text-xs text-center text-muted-foreground">
            Adicione pelo menos 1 objetivo para o próximo ciclo, ou pule esta etapa.
          </p>
        )}
      </div>
    </WizardStepScaffold>
  );
}
