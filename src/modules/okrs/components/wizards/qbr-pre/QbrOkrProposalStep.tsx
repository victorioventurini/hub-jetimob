/**
 * QbrOkrProposalStep - Inline OKR creation sub-flow for QBR Pre wizard
 * 
 * Supports MULTIPLE objectives, each with its own KRs.
 * All changes are draft-only (stored in proposedOkrs within QbrPreDraftData).
 * Does NOT persist to database — the QBR Post wizard handles promotion.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Target, Plus, Minus,
  TrendingUp, TrendingDown, Equal,
  ChevronRight, ChevronLeft, CheckCircle2, Pencil, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
} from '../shared';
import { BuUserSelect, UnitSelect } from '@/components/selects';
import { useProposalValidation } from '@/modules/okrs/hooks/useProposalValidation';
import { ProposalValidationCard } from './ProposalValidationCard';
import type {
  DraftTeamKr,
  OkrDirection,
  ProposedObjectiveEntry,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type EditSubStep = 'objective' | 'kr-detail';

export interface QbrOkrProposalStepProps {
  proposedOkrs: ProposedObjectiveEntry[];
  teamId: string;
  teamName?: string;
  onProposedOkrsChange: (okrs: ProposedObjectiveEntry[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

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

// ============================================================
// SUB-STEP: OBJECTIVE (includes KR count)
// ============================================================

function ObjectiveSubStep({
  objective,
  krCount,
  onChange,
  onKrCountChange,
  onNext,
  onBack,
}: {
  objective: ProposedObjectiveEntry['objective'];
  krCount: number;
  onChange: (obj: ProposedObjectiveEntry['objective']) => void;
  onKrCountChange: (count: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = objective.title.trim().length >= 10 && krCount >= 1;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="obj-title" className="text-sm font-medium">
            Título do Objetivo
          </Label>
          <Input
            id="obj-title"
            placeholder="Ex: Consolidar presença digital no segmento de locação"
            value={objective.title}
            onChange={(e) => onChange({ ...objective, title: e.target.value })}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Mínimo 10 caracteres. Descreva o resultado desejado, não a atividade.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="obj-desc" className="text-sm font-medium">
            Descrição <span className="text-muted-foreground">(opcional)</span>
          </Label>
          <Textarea
            id="obj-desc"
            placeholder="Contexto adicional sobre por que este objetivo é prioritário..."
            value={objective.description}
            onChange={(e) => onChange({ ...objective, description: e.target.value })}
            rows={3}
            className="text-sm resize-none"
          />
        </div>

        {/* KR count selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quantos Key Results?</Label>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    Defina quantos KRs este objetivo terá (1 a 5)
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onKrCountChange(Math.max(1, krCount - 1))}
                    disabled={krCount <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{krCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onKrCountChange(Math.min(5, krCount + 1))}
                    disabled={krCount >= 5}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onNext}
        primaryDisabled={!canContinue}
        backLabel="Voltar"
        primaryLabel="Detalhar KRs"
      />
    </div>
  );
}

// ============================================================
// SUB-STEP: KR DETAIL
// ============================================================

function KrDetailSubStep({
  objectiveTitle,
  objectiveDescription,
  krCount,
  draftKrs,
  teamId,
  teamName,
  onChange,
  onNext,
  onBack,
}: {
  objectiveTitle: string;
  objectiveDescription?: string;
  krCount: number;
  draftKrs: DraftTeamKr[];
  teamId: string;
  teamName?: string;
  onChange: (krs: DraftTeamKr[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [activeSlot, setActiveSlot] = useState(0);

  // Ensure draftKrs has enough entries
  const ensuredKrs = useMemo(() => {
    const krs = [...draftKrs];
    while (krs.length < krCount) {
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
  }, [draftKrs, krCount]);

  const currentKr = ensuredKrs[activeSlot];

  const updateKr = useCallback((updates: Partial<DraftTeamKr>) => {
    const next = ensuredKrs.map((kr, i) =>
      i === activeSlot ? { ...kr, ...updates } : kr
    );
    onChange(next);
  }, [ensuredKrs, activeSlot, onChange]);

  const allFilled = ensuredKrs.slice(0, krCount).every(kr => kr.title.trim().length >= 5);

  // AI Validation
  const { assessment, isLoading: validationLoading, error: validationError, validate, reset: resetValidation } = useProposalValidation();

  // Reset validation when KRs change
  useEffect(() => {
    if (assessment) resetValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKrs]);

  const handleValidate = useCallback(() => {
    validate({
      objectiveTitle,
      objectiveDescription,
      teamName,
      draftKrs: ensuredKrs.slice(0, krCount),
    });
  }, [validate, objectiveTitle, objectiveDescription, teamName, ensuredKrs, krCount]);

  if (!currentKr) return null;

  return (
    <div className="space-y-4">
      {/* Slot navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: krCount }).map((_, idx) => {
          const kr = ensuredKrs[idx];
          const filled = kr?.title?.trim().length >= 5;
          return (
            <Button
              key={idx}
              variant={idx === activeSlot ? 'default' : 'outline'}
              size="sm"
              className={cn('h-7 text-xs gap-1', filled && idx !== activeSlot && 'border-primary/40')}
              onClick={() => setActiveSlot(idx)}
            >
              {filled && <CheckCircle2 className="h-3 w-3" />}
              KR {idx + 1}
            </Button>
          );
        })}
      </div>

      {/* Current KR form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            KR {activeSlot + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Título do Key Result</Label>
            <Input
              placeholder="Ex: Atingir 85% de satisfação em NPS de locação"
              value={currentKr.title}
              onChange={(e) => updateKr({ title: e.target.value })}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Direção</Label>
              <div className="flex gap-1">
                {DIRECTION_OPTIONS.map((opt) => {
                  const DirIcon = opt.icon;
                  return (
                    <Button
                      key={opt.value}
                      variant={currentKr.direction === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs flex-1 gap-1"
                      onClick={() => updateKr({ direction: opt.value })}
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
                value={currentKr.baseline}
                onChange={(e) => updateKr({ baseline: Number(e.target.value) })}
                className="text-sm h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Meta</Label>
              <Input
                type="number"
                value={currentKr.target}
                onChange={(e) => updateKr({ target: Number(e.target.value) })}
                className="text-sm h-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Unidade</Label>
              <UnitSelect
                value={currentKr.unit}
                onChange={(unit) => updateKr({ unit })}
                showLabel={false}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Responsável</Label>
              <BuUserSelect
                value={currentKr.owner_user_id || ''}
                onValueChange={(id) => updateKr({ owner_user_id: id || null })}
                teamId={teamId}
                placeholder="Selecionar..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation between slots */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveSlot(Math.max(0, activeSlot - 1))}
          disabled={activeSlot === 0}
          className="text-xs gap-1"
        >
          <ChevronLeft className="h-3 w-3" /> Anterior
        </Button>
        {activeSlot < krCount - 1 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveSlot(activeSlot + 1)}
            className="text-xs gap-1"
          >
            Próximo <ChevronRight className="h-3 w-3" />
          </Button>
        ) : null}
      </div>

      <Separator />

      {/* AI Validation */}
      {allFilled && (
        <ProposalValidationCard
          assessment={assessment}
          isLoading={validationLoading}
          error={validationError}
          onValidate={handleValidate}
          onReset={resetValidation}
          canValidate={allFilled}
        />
      )}

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onNext}
        primaryDisabled={!allFilled}
        backLabel="Voltar ao Objetivo"
        primaryLabel="Concluir Objetivo"
      />
    </div>
  );
}

// ============================================================
// OBJECTIVE LIST VIEW
// ============================================================

function ObjectiveListView({
  entries,
  onEdit,
  onRemove,
  onAdd,
  onContinue,
  onBack,
}: {
  entries: ProposedObjectiveEntry[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const hasEntries = entries.length > 0;
  const allComplete = entries.length > 0 && entries.every(isEntryComplete);

  return (
    <div className="space-y-4">
      {entries.map((entry, idx) => {
        const total = getKrCount(entry);
        const filledKrs = entry.draftKrs.filter(kr => kr.title.trim().length >= 5).length;
        const complete = isEntryComplete(entry);

        return (
          <Card key={entry.id} className={cn(complete && 'border-primary/30')}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <p className="text-sm font-medium truncate">
                      {entry.objective.title || 'Objetivo sem título'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <Badge variant="outline" className="text-[10px]">
                      {filledKrs}/{total} KR{total !== 1 ? 's' : ''}
                    </Badge>
                    {!complete && (
                      <Badge variant="secondary" className="text-[10px] text-status-amber">
                        Incompleto
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(idx)}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onRemove(idx)}
                    title="Remover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add objective button */}
      <Button
        variant="outline"
        className="w-full gap-2 border-dashed text-sm"
        onClick={onAdd}
      >
        <Plus className="h-4 w-4" />
        Adicionar Objetivo
      </Button>

      {!hasEntries && (
        <p className="text-xs text-center text-muted-foreground">
          Adicione pelo menos 1 objetivo para o próximo ciclo, ou pule esta etapa.
        </p>
      )}

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onContinue}
        primaryDisabled={hasEntries && !allComplete}
        backLabel="Voltar"
        primaryLabel={hasEntries ? 'Avançar para Resumo' : 'Pular proposta'}
      />
    </div>
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
}: QbrOkrProposalStepProps) {
  // Which objective is being edited (null = list view)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editSubStep, setEditSubStep] = useState<EditSubStep>('objective');

  const currentEntry = editingIndex !== null ? proposedOkrs[editingIndex] : null;

  const handleAdd = useCallback(() => {
    const newEntry = createEmptyEntry();
    const updated = [...proposedOkrs, newEntry];
    onProposedOkrsChange(updated);
    setEditingIndex(updated.length - 1);
    setEditSubStep('objective');
  }, [proposedOkrs, onProposedOkrsChange]);

  const handleEdit = useCallback((index: number) => {
    const entry = proposedOkrs[index];
    if (!entry) return;
    if (entry.objective.title.trim().length < 10) {
      setEditSubStep('objective');
    } else {
      setEditSubStep('kr-detail');
    }
    setEditingIndex(index);
  }, [proposedOkrs]);

  const handleRemove = useCallback((index: number) => {
    const updated = proposedOkrs.filter((_, i) => i !== index);
    onProposedOkrsChange(updated);
  }, [proposedOkrs, onProposedOkrsChange]);

  const updateCurrentEntry = useCallback((updates: Partial<ProposedObjectiveEntry>) => {
    if (editingIndex === null) return;
    const updated = proposedOkrs.map((entry, i) =>
      i === editingIndex ? { ...entry, ...updates } : entry
    );
    onProposedOkrsChange(updated);
  }, [editingIndex, proposedOkrs, onProposedOkrsChange]);

  const handleKrCountChange = useCallback((count: number) => {
    if (editingIndex === null) return;
    // Store all KRs in foundational count (type is hidden)
    updateCurrentEntry({
      krPlan: { foundational: count, contribution: 0, enabler: 0 },
    });
  }, [editingIndex, updateCurrentEntry]);

  const finishEditing = useCallback(() => {
    if (editingIndex !== null) {
      const entry = proposedOkrs[editingIndex];
      if (entry && !entry.objective.title.trim()) {
        handleRemove(editingIndex);
      }
    }
    setEditingIndex(null);
    setEditSubStep('objective');
  }, [editingIndex, proposedOkrs, handleRemove]);

  const handleBackFromObjective = useCallback(() => {
    if (editingIndex !== null) {
      const entry = proposedOkrs[editingIndex];
      if (entry && !entry.objective.title.trim()) {
        handleRemove(editingIndex);
      }
    }
    setEditingIndex(null);
    setEditSubStep('objective');
  }, [editingIndex, proposedOkrs, handleRemove]);

  // Determine badge label
  const badgeLabel = editingIndex !== null
    ? `Objetivo ${editingIndex + 1} — ${editSubStep === 'objective' ? '1/2 Objetivo' : '2/2 KRs'}`
    : `${proposedOkrs.length} objetivo${proposedOkrs.length !== 1 ? 's' : ''}`;

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
      footer={null}
    >
      <div className="p-6 space-y-4">
        {/* List view */}
        {editingIndex === null && (
          <ObjectiveListView
            entries={proposedOkrs}
            onEdit={handleEdit}
            onRemove={handleRemove}
            onAdd={handleAdd}
            onContinue={onContinue}
            onBack={onBack}
          />
        )}

        {/* Editing view: Objective */}
        {editingIndex !== null && currentEntry && editSubStep === 'objective' && (
          <ObjectiveSubStep
            objective={currentEntry.objective}
            krCount={getKrCount(currentEntry)}
            onChange={(obj) => updateCurrentEntry({ objective: obj })}
            onKrCountChange={handleKrCountChange}
            onNext={() => setEditSubStep('kr-detail')}
            onBack={handleBackFromObjective}
          />
        )}

        {/* Editing view: KR Detail */}
        {editingIndex !== null && currentEntry && editSubStep === 'kr-detail' && (
          <KrDetailSubStep
            objectiveTitle={currentEntry.objective.title}
            objectiveDescription={currentEntry.objective.description}
            krCount={getKrCount(currentEntry)}
            draftKrs={currentEntry.draftKrs}
            teamId={teamId}
            teamName={teamName}
            onChange={(krs) => updateCurrentEntry({ draftKrs: krs })}
            onNext={finishEditing}
            onBack={() => setEditSubStep('objective')}
          />
        )}
      </div>
    </WizardStepScaffold>
  );
}
