/**
 * QbrMeetingDecisionsStep - Step 3: Decisões com donos e prazos (gate)
 * 
 * owner_user_id obrigatório. deadline obrigatório.
 * Gate: mínimo de uma decisão registrada.
 * Inclui: vínculo a diretivas C-Level e tipo de decisão (strategic/tactical).
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Gavel, Zap, Target } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
  DecisionCard,
} from '../shared';
import type { TeamCheckinDecision, QbrCLevelSnapshot } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrMeetingDecisionsStepProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** Diretivas do C-Level para vínculo */
  cLevelDirectives?: QbrCLevelSnapshot['directives'];
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingDecisionsStep({
  decisions,
  onDecisionsChange,
  cLevelDirectives = [],
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
          tooltip="qbr-meeting-decisions"
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
            <div key={decision.id} className="space-y-2">
              <DecisionCard
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

              <div className="flex items-center gap-2 pl-7">

                {/* Related directive select */}
                {cLevelDirectives.length > 0 && (
                  <Select
                    value={decision.relatedDirectiveId || '__none__'}
                    onValueChange={(v) => {
                      onDecisionsChange(decisions.map(d =>
                        d.id === decision.id
                          ? { ...d, relatedDirectiveId: v === '__none__' ? undefined : v }
                          : d
                      ));
                    }}
                  >
                    <SelectTrigger className="h-6 text-[10px] w-auto min-w-[140px] max-w-[240px]">
                      <SelectValue placeholder="Relacionado a..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem vínculo</SelectItem>
                      {cLevelDirectives.map((dir, i) => (
                        <SelectItem key={`dir-${i}`} value={`directive-${i}`}>
                          {dir.text.slice(0, 60)}{dir.text.length > 60 ? '…' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Show related directive ref badge */}
              {decision.relatedDirectiveId && cLevelDirectives.length > 0 && (
                <div className="pl-7">
                  <Badge variant="secondary" className="text-[10px]">
                    Ref: {cLevelDirectives[parseInt(decision.relatedDirectiveId.replace('directive-', ''))]?.text?.slice(0, 40)}…
                  </Badge>
                </div>
              )}
            </div>
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
