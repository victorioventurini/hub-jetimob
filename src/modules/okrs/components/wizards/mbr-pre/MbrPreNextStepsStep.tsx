/**
 * MbrPreNextStepsStep - Step 4: Próximos Passos
 * 
 * O líder declara o foco do time para o próximo mês:
 * - Campo de texto livre para foco principal
 * - Lista dinâmica de itens priorizados (add/remove)
 * - Lista de dependências cross-team (add/remove)
 */

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Compass, Plus, Trash2, Link2 } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrPreNextSteps {
  focus: string;
  prioritizedItems: string[];
  crossDependencies: string[];
}

export interface MbrPreNextStepsStepProps {
  nextSteps: MbrPreNextSteps;
  onNextStepsChange: (nextSteps: MbrPreNextSteps) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrPreNextStepsStep({
  nextSteps,
  onNextStepsChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: MbrPreNextStepsStepProps) {
  const [newPriority, setNewPriority] = useState('');
  const [newDependency, setNewDependency] = useState('');

  const addPriority = () => {
    const trimmed = newPriority.trim();
    if (!trimmed) return;
    onNextStepsChange({
      ...nextSteps,
      prioritizedItems: [...nextSteps.prioritizedItems, trimmed],
    });
    setNewPriority('');
  };

  const removePriority = (index: number) => {
    onNextStepsChange({
      ...nextSteps,
      prioritizedItems: nextSteps.prioritizedItems.filter((_, i) => i !== index),
    });
  };

  const addDependency = () => {
    const trimmed = newDependency.trim();
    if (!trimmed) return;
    onNextStepsChange({
      ...nextSteps,
      crossDependencies: [...nextSteps.crossDependencies, trimmed],
    });
    setNewDependency('');
  };

  const removeDependency = (index: number) => {
    onNextStepsChange({
      ...nextSteps,
      crossDependencies: nextSteps.crossDependencies.filter((_, i) => i !== index),
    });
  };

  const hasContent = nextSteps.focus.trim() || nextSteps.prioritizedItems.length > 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Compass}
          title="Próximos Passos"
          description="O que o time planeja executar nas próximas semanas"
          variant="primary"
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="mbr-pre-next-steps"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={!hasContent}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Focus */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Foco do próximo mês
          </Label>
          <Textarea
            value={nextSteps.focus}
            onChange={(e) => onNextStepsChange({ ...nextSteps, focus: e.target.value })}
            placeholder="Descreva o foco principal do time para as próximas semanas..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* Prioritized items */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Iniciativas / projetos priorizados
          </Label>
          
          {nextSteps.prioritizedItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
              <span className="text-sm flex-1">{item}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removePriority(i)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Input
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPriority())}
              placeholder="Adicionar iniciativa ou projeto..."
              className="text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={addPriority}
              disabled={!newPriority.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Cross-team dependencies */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4" />
            Dependências de outros times
          </Label>
          
          {nextSteps.crossDependencies.map((dep, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0">•</span>
              <span className="text-sm flex-1">{dep}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeDependency(i)}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Input
              value={newDependency}
              onChange={(e) => setNewDependency(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDependency())}
              placeholder="Ex: Precisamos que o time de Engenharia entregue a API até dia 15..."
              className="text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={addDependency}
              disabled={!newDependency.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </WizardStepScaffold>
  );
}
