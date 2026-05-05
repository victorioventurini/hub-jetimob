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
  /** Sub-step opcional para isolar notas em steps com paginação interna. */
  subStep?: string | null;
  /** Metadata extra a ser injetado em novas decisões. */
  metadataFactory?: () => Record<string, unknown> | undefined;
}

export function InlineDecisionsSlot({
  stepId,
  decisions,
  onDecisionsChange,
  placeholder,
  subStep,
  metadataFactory,
}: InlineDecisionsSlotProps) {
  return (
    <div className="border-t bg-card/50 backdrop-blur-sm">
      <InlineDecisionInput
        decisions={decisions}
        onDecisionsChange={onDecisionsChange}
        sourceStep={stepId}
        placeholder={placeholder}
        subStep={subStep}
        metadataFactory={metadataFactory}
      />
    </div>
  );
}
