/**
 * QbrOkrProposalStep - Inline OKR creation sub-flow for QBR Pre wizard
 * 
 * Composes 3 mini-steps: Objective → KR Plan → KR Detail
 * All changes are draft-only (stored in proposedOkrs within QbrPreDraftData).
 * Does NOT persist to database — the QBR Post wizard handles promotion.
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Target, Plus, Minus, Wrench, Link2, TrendingUp, TrendingDown, Equal,
  ChevronRight, ChevronLeft, SkipForward, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
} from '../shared';
import { BuUserSelect, UnitSelect } from '@/components/selects';
import type {
  TeamOkrCreationWizardState,
  DraftTeamKr,
  OkrKrType,
  OkrDirection,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type SubStep = 'objective' | 'kr-plan' | 'kr-detail';

export interface QbrOkrProposalStepProps {
  proposedOkrs: Partial<TeamOkrCreationWizardState>;
  teamId: string;
  teamName?: string;
  onProposedOkrsChange: (okrs: Partial<TeamOkrCreationWizardState>) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// KR TYPE CONFIG
// ============================================================

const KR_TYPE_CONFIG: Record<OkrKrType, {
  label: string;
  description: string;
  icon: typeof Target;
  colorClass: string;
}> = {
  foundational: {
    label: 'Fundacional',
    description: 'Resultado direto do time',
    icon: Target,
    colorClass: 'text-primary',
  },
  contribution: {
    label: 'Contribuição',
    description: 'Contribui para KR de outro time',
    icon: Link2,
    colorClass: 'text-status-blue',
  },
  enabler: {
    label: 'Habilitador',
    description: 'Cria condições para outros resultados',
    icon: Wrench,
    colorClass: 'text-status-amber',
  },
};

const DIRECTION_OPTIONS: { value: OkrDirection; label: string; icon: typeof TrendingUp }[] = [
  { value: 'up', label: 'Aumentar', icon: TrendingUp },
  { value: 'down', label: 'Reduzir', icon: TrendingDown },
  { value: 'maintain', label: 'Manter', icon: Equal },
];

// ============================================================
// SUB-STEP: OBJECTIVE
// ============================================================

function ObjectiveSubStep({
  objective,
  onChange,
  onNext,
  onBack,
}: {
  objective: TeamOkrCreationWizardState['objective'];
  onChange: (obj: TeamOkrCreationWizardState['objective']) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const canContinue = objective.title.trim().length >= 10;

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
      </div>

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onNext}
        primaryDisabled={!canContinue}
        backLabel="Voltar"
        primaryLabel="Definir KRs"
      />
    </div>
  );
}

// ============================================================
// SUB-STEP: KR PLAN
// ============================================================

function KrPlanSubStep({
  objectiveTitle,
  krPlan,
  onChange,
  onNext,
  onBack,
}: {
  objectiveTitle: string;
  krPlan: TeamOkrCreationWizardState['krPlan'];
  onChange: (plan: TeamOkrCreationWizardState['krPlan']) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const total = krPlan.foundational + krPlan.contribution + krPlan.enabler;
  const canContinue = total >= 1 && total <= 5 && krPlan.foundational >= 1;

  const adjustCount = (type: keyof typeof krPlan, delta: number) => {
    const newVal = Math.max(0, Math.min(5, krPlan[type] + delta));
    onChange({ ...krPlan, [type]: newVal });
  };

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">
            Objetivo: <span className="font-medium text-foreground">{objectiveTitle}</span>
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(Object.keys(KR_TYPE_CONFIG) as OkrKrType[]).map((type) => {
          const config = KR_TYPE_CONFIG[type];
          const Icon = config.icon;
          return (
            <Card key={type}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={cn('h-4 w-4 shrink-0', config.colorClass)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => adjustCount(type, -1)}
                      disabled={krPlan[type] <= 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{krPlan[type]}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => adjustCount(type, 1)}
                      disabled={total >= 5}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Total: {total} KR{total !== 1 ? 's' : ''}</span>
        {!canContinue && (
          <span className="text-destructive">
            {total === 0 ? 'Mínimo 1 KR fundacional' : total > 5 ? 'Máximo 5 KRs' : 'Ao menos 1 fundacional'}
          </span>
        )}
      </div>

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onNext}
        primaryDisabled={!canContinue}
        backLabel="Voltar ao Objetivo"
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
  krPlan,
  draftKrs,
  teamId,
  onChange,
  onNext,
  onBack,
}: {
  objectiveTitle: string;
  krPlan: TeamOkrCreationWizardState['krPlan'];
  draftKrs: DraftTeamKr[];
  teamId: string;
  onChange: (krs: DraftTeamKr[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  // Build slots from plan
  const slots = useMemo(() => {
    const s: { type: OkrKrType; index: number }[] = [];
    (['foundational', 'contribution', 'enabler'] as OkrKrType[]).forEach(type => {
      for (let i = 0; i < (krPlan[type] || 0); i++) {
        s.push({ type, index: s.length });
      }
    });
    return s;
  }, [krPlan]);

  const [activeSlot, setActiveSlot] = useState(0);

  // Ensure draftKrs has enough entries
  const ensuredKrs = useMemo(() => {
    const krs = [...draftKrs];
    while (krs.length < slots.length) {
      const slot = slots[krs.length];
      krs.push({
        id: `draft-kr-${Date.now()}-${krs.length}`,
        type: slot.type,
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
  }, [draftKrs, slots]);

  const currentKr = ensuredKrs[activeSlot];
  const currentSlot = slots[activeSlot];

  const updateKr = useCallback((updates: Partial<DraftTeamKr>) => {
    const next = ensuredKrs.map((kr, i) =>
      i === activeSlot ? { ...kr, ...updates } : kr
    );
    onChange(next);
  }, [ensuredKrs, activeSlot, onChange]);

  const allFilled = ensuredKrs.slice(0, slots.length).every(kr => kr.title.trim().length >= 5);

  if (!currentSlot || !currentKr) return null;

  const config = KR_TYPE_CONFIG[currentSlot.type];
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Slot navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {slots.map((slot, idx) => {
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
            <Icon className={cn('h-4 w-4', config.colorClass)} />
            KR {activeSlot + 1} — {config.label}
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
        {activeSlot < slots.length - 1 ? (
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

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onNext}
        primaryDisabled={!allFilled}
        backLabel="Voltar ao Plano"
        primaryLabel="Avançar para Resumo"
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
  onProposedOkrsChange,
  onContinue,
  onBack,
}: QbrOkrProposalStepProps) {
  const [subStep, setSubStep] = useState<SubStep>(() => {
    if (proposedOkrs.draftKrs && proposedOkrs.draftKrs.length > 0) return 'kr-detail';
    if (proposedOkrs.objective?.title?.trim()) return 'kr-plan';
    return 'objective';
  });

  const objective = useMemo(() => proposedOkrs.objective || {
    title: '', description: '', org_objective_id: null, cycle_id: null,
  }, [proposedOkrs.objective]);

  const krPlan = useMemo(() => proposedOkrs.krPlan || {
    foundational: 1, contribution: 0, enabler: 0,
  }, [proposedOkrs.krPlan]);

  const draftKrs = useMemo(() => proposedOkrs.draftKrs || [], [proposedOkrs.draftKrs]);

  const updateField = useCallback(<K extends keyof TeamOkrCreationWizardState>(
    key: K,
    value: TeamOkrCreationWizardState[K],
  ) => {
    onProposedOkrsChange({ ...proposedOkrs, [key]: value });
  }, [proposedOkrs, onProposedOkrsChange]);

  const subStepLabel = subStep === 'objective' ? '1/3 — Objetivo'
    : subStep === 'kr-plan' ? '2/3 — Plano de KRs'
    : '3/3 — Detalhamento';

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Target}
          title="Proposta de OKRs"
          description="Rascunho para o próximo ciclo — será revisado no QBR"
          variant="primary"
          badge={subStepLabel}
        />
      }
      footer={null}
    >
      <div className="p-6 space-y-4">
        {/* Skip option */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onContinue}
            className="text-xs gap-1 text-muted-foreground"
          >
            <SkipForward className="h-3 w-3" />
            Pular proposta
          </Button>
        </div>

        {subStep === 'objective' && (
          <ObjectiveSubStep
            objective={objective}
            onChange={(obj) => updateField('objective', obj)}
            onNext={() => setSubStep('kr-plan')}
            onBack={onBack}
          />
        )}

        {subStep === 'kr-plan' && (
          <KrPlanSubStep
            objectiveTitle={objective.title}
            krPlan={krPlan}
            onChange={(plan) => updateField('krPlan', plan)}
            onNext={() => setSubStep('kr-detail')}
            onBack={() => setSubStep('objective')}
          />
        )}

        {subStep === 'kr-detail' && (
          <KrDetailSubStep
            objectiveTitle={objective.title}
            krPlan={krPlan}
            draftKrs={draftKrs}
            teamId={teamId}
            onChange={(krs) => updateField('draftKrs', krs)}
            onNext={onContinue}
            onBack={() => setSubStep('kr-plan')}
          />
        )}
      </div>
    </WizardStepScaffold>
  );
}
