/**
 * SummaryAndSubmitStep — Step final de ritos preparatórios (read-only).
 * Sem InlineDecisionInput — exibe consolidação final.
 */

import { memo } from 'react';
import { Send } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DecisionCard } from '../../DecisionCard';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { SummaryAndSubmitStepConfig } from '../types';
import { useDecisionsAggregator } from '../hooks/useDecisionsAggregator';

export interface SummaryAndSubmitStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: SummaryAndSubmitStepConfig;
  data: { summaryText?: string };
  onDataChange: (next: { summaryText?: string }) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
}

export const SummaryAndSubmitStep = memo(function SummaryAndSubmitStep({
  persona,
  version,
  stepId,
  decisions,
  footer,
}: SummaryAndSubmitStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const { fromOtherSteps, totalCount } = useDecisionsAggregator(decisions, stepId);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Send}
          title={label.title}
          description={label.subtitle}
          variant="primary"
          badge={totalCount > 0 ? `${totalCount} decisões` : undefined}
        />
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Decisões registradas <Badge variant="secondary" className="ml-1 text-xs">{totalCount}</Badge>
          </h3>
          {fromOtherSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhuma decisão registrada neste rito.</p>
          ) : (
            fromOtherSteps.map((group) => (
              <Card key={group.sourceStep} className="p-3 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.sourceStep} · {group.count}
                </p>
                {group.decisions.map((d) => (
                  <DecisionCard key={d.id} decision={d} onUpdate={() => {}} onRemove={() => {}} />
                ))}
              </Card>
            ))
          )}
        </section>
      </div>
    </WizardStepScaffold>
  );
});
