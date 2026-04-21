/**
 * _InlineDecisionsSlot — wrapper interno usado por TODOS os componentes
 * do framework para garantir o registro inline ubíquo de decisões.
 *
 * Renderiza `InlineDecisionInput` com `sourceStep` populado a partir do
 * `stepId` corrente — sem hardcode. Componentes do framework devem passá-lo
 * em `bottomFixed` do `WizardStepScaffold` (exceto quando
 * `suppressInlineDecisions=true` na definição do step).
 */

import { InlineDecisionInput } from '../../InlineDecisionInput';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

export interface InlineDecisionsSlotProps {
  stepId: string;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  placeholder?: string;
}

export function InlineDecisionsSlot({
  stepId,
  decisions,
  onDecisionsChange,
  placeholder,
}: InlineDecisionsSlotProps) {
  return (
    <div className="border-t bg-card/50 backdrop-blur-sm">
      <InlineDecisionInput
        decisions={decisions}
        onDecisionsChange={onDecisionsChange}
        sourceStep={stepId}
        placeholder={placeholder}
      />
    </div>
  );
}
