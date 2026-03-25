/**
 * QbrPostDecisionsStep - Step 2: Decisões complementares
 * 
 * Carrega decisões do meeting snapshot e permite complementar com novas decisões.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gavel, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

export interface QbrPostDecisionsStepProps {
  meetingDecisions: TeamCheckinDecision[];
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrPostDecisionsStep({
  meetingDecisions,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: QbrPostDecisionsStepProps) {
  const totalDecisions = meetingDecisions.length + decisions.length;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Gavel}
          title="Decisões Complementares"
          description="Decisões da reunião + novas decisões pós-QBR"
          variant="primary"
          badge={`${totalDecisions} total`}
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="qbr-post-decisions"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Meeting decisions (read-only) */}
        {meetingDecisions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Decisões da Reunião ({meetingDecisions.length})</span>
            </div>
            {meetingDecisions.map(d => (
              <Card key={d.id} className="border-dashed opacity-80">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px]">{d.category}</Badge>
                    <span className="flex-1">{d.text}</span>
                    {d.owner?.name && (
                      <span className="text-xs text-muted-foreground">→ {d.owner.name}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* New post-QBR decisions */}
        {decisions.length > 0 && (
          <div className="space-y-3">
            <span className="text-sm font-medium">Decisões Complementares ({decisions.length})</span>
            {decisions.map(d => (
              <DecisionCard
                key={d.id}
                decision={d}
                onUpdate={(id, updates) => {
                  onDecisionsChange(decisions.map(dd => dd.id === id ? { ...dd, ...updates } : dd));
                }}
                onRemove={(id) => {
                  onDecisionsChange(decisions.filter(dd => dd.id !== id));
                }}
                showOwnerDeadline
              />
            ))}
          </div>
        )}

        {totalDecisions === 0 && (
          <div className="text-center py-8">
            <Gavel className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma decisão registrada. Use o campo abaixo para adicionar.
            </p>
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
