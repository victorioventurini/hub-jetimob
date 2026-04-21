/**
 * DecisionsStep — Step formal de Decisões.
 *
 * Consolida visualmente:
 * - Novas decisões (registradas no próprio step)
 * - Decisões inline de outros steps (agrupadas por sourceStep)
 * - Compromissos cross-área (subseção, quando includeCrossArea)
 * - Carry-over do rito anterior (subseção, quando includeCarryOver)
 *
 * O próprio step também ativa o `InlineDecisionInput` (sourceStep = stepId),
 * mantendo a regra ubíqua.
 */

import { memo } from 'react';
import { Lightbulb } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DecisionCard } from '../../DecisionCard';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { DecisionsStepConfig } from '../types';
import { useDecisionsAggregator } from '../hooks/useDecisionsAggregator';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';

export interface DecisionsStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: DecisionsStepConfig;
  data: {
    carryOverDecisions?: TeamCheckinDecision[];
    crossAreaDecisions?: TeamCheckinDecision[];
  };
  onDataChange: (next: DecisionsStepProps['data']) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
}

export const DecisionsStep = memo(function DecisionsStep({
  persona,
  version,
  stepId,
  config,
  data,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: DecisionsStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const { fromOtherSteps, fromCurrentStep, totalCount } = useDecisionsAggregator(decisions, stepId);

  const handleUpdate = (id: string, updates: Partial<TeamCheckinDecision>) => {
    onDecisionsChange(decisions.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };
  const handleRemove = (id: string) => {
    onDecisionsChange(decisions.filter((d) => d.id !== id));
  };
  const noopUpdate = (_id: string, _updates: Partial<TeamCheckinDecision>) => {};
  const noopRemove = (_id: string) => {};

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Lightbulb}
          title={label.title}
          description={label.subtitle}
          variant="primary"
          badge={totalCount > 0 ? `${totalCount}` : undefined}
        />
      }
      bottomFixed={
        suppressInlineDecisions ? undefined : (
          <InlineDecisionsSlot
            stepId={stepId}
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
            placeholder="Registrar nova decisão deste rito..."
          />
        )
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Novas decisões registradas no próprio step */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Novas decisões <Badge variant="secondary" className="ml-1 text-xs">{fromCurrentStep.length}</Badge>
          </h3>
          {fromCurrentStep.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Use o painel inferior para registrar decisões deste rito.
            </p>
          ) : (
            fromCurrentStep.map((d) => (
              <DecisionCard
                key={d.id}
                decision={d}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
              />
            ))
          )}
        </section>

        {/* Consolidação de decisões inline de outros steps */}
        {config.groupInlineBySource && fromOtherSteps.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Decisões registradas durante o rito</h3>
            {fromOtherSteps.map((group) => (
              <Card key={group.sourceStep} className="p-3 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.sourceStep} · {group.count}
                </p>
                {group.decisions.map((d) => (
                  <DecisionCard
                    key={d.id}
                    decision={d}
                    onUpdate={(updates) => handleUpdate(d.id, updates)}
                    onRemove={() => handleRemove(d.id)}
                  />
                ))}
              </Card>
            ))}
          </section>
        )}

        {/* Compromissos cross-área */}
        {config.includeCrossArea && data.crossAreaDecisions && data.crossAreaDecisions.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Compromissos cross-área</h3>
            {data.crossAreaDecisions.map((d) => (
              <DecisionCard key={d.id} decision={d} onUpdate={() => {}} onRemove={() => {}} />
            ))}
          </section>
        )}

        {/* Carry-over do rito anterior */}
        {config.includeCarryOver && data.carryOverDecisions && data.carryOverDecisions.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Carry-over do rito anterior <Badge variant="outline" className="ml-1 text-xs">{data.carryOverDecisions.length}</Badge>
            </h3>
            {data.carryOverDecisions.map((d) => (
              <DecisionCard key={d.id} decision={d} onUpdate={() => {}} onRemove={() => {}} />
            ))}
          </section>
        )}
      </div>
    </WizardStepScaffold>
  );
});
