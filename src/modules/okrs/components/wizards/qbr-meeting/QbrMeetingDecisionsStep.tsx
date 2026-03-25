/**
 * QbrMeetingDecisionsStep - Step 3: Decisões com donos e prazos (gate)
 * 
 * owner_user_id obrigatório. deadline obrigatório.
 * Gate: mínimo de uma decisão registrada.
 */

import { Gavel } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
  DecisionCard,
} from '../shared';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrMeetingDecisionsStepProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingDecisionsStep({
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: QbrMeetingDecisionsStepProps) {
  const hasMinimumDecisions = decisions.length >= 1;
  const allHaveOwners = decisions.every(d => d.owner?.id);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Gavel}
          title="Decisões Estratégicas"
          description="Toda decisão precisa de dono e prazo"
          variant="primary"
          badge={`${decisions.length} decisão(ões)`}
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="qbr-meeting-decisions"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={!hasMinimumDecisions}
          primaryLabel={hasMinimumDecisions ? 'Continuar' : 'Registre pelo menos 1 decisão'}
        />
      }
    >
      <div className="p-6 space-y-4">
        {decisions.length === 0 ? (
          <div className="text-center py-12">
            <Gavel className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma decisão registrada. Use o campo abaixo para adicionar.
            </p>
          </div>
        ) : (
          decisions.map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              onUpdate={(id, updates) => {
                onDecisionsChange(
                  decisions.map(d => d.id === id ? { ...d, ...updates } : d)
                );
              }}
              onRemove={(id) => {
                onDecisionsChange(decisions.filter(d => d.id !== id));
              }}
              showOwnerDeadline
            />
          ))
        )}

        {decisions.length > 0 && !allHaveOwners && (
          <p className="text-xs text-status-amber flex items-center gap-1">
            ⚠ Algumas decisões não têm dono definido. Defina antes de encerrar.
          </p>
        )}
      </div>
    </WizardStepScaffold>
  );
}
