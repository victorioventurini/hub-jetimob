/**
 * HighlightsAndRisksStep — Step tripartite (acelerou / travou / atenção).
 * Variante 'learnings-risks' usado no Pré-QBR (worked / didn't / debt).
 */

import { memo } from 'react';
import { TrendingUp } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Card } from '@/components/ui/card';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { HighlightsAndRisksStepConfig } from '../types';
import type { HighlightItem } from '../config/stepContentAdapters';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';

export interface HighlightsAndRisksStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: HighlightsAndRisksStepConfig;
  data: HighlightItem[];
  onDataChange: (next: HighlightItem[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
}

const SECTION_TITLES: Record<HighlightsAndRisksStepConfig['variant'], Record<string, string>> = {
  'highlights-risks': {
    accelerated: 'Acelerou',
    blocked: 'Travou',
    attention: 'Atenção',
  },
  'learnings-risks': {
    worked: 'O que funcionou',
    'didnt-work': 'O que não funcionou',
    debt: 'Débitos',
  },
};

export const HighlightsAndRisksStep = memo(function HighlightsAndRisksStep({
  persona,
  version,
  stepId,
  config,
  data,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: HighlightsAndRisksStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const sectionKeys = Object.keys(SECTION_TITLES[config.variant]);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={TrendingUp}
          title={label.title}
          description={label.subtitle}
          variant="primary"
        />
      }
      bottomFixed={
        suppressInlineDecisions ? undefined : (
          <InlineDecisionsSlot
            stepId={stepId}
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
          />
        )
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-6">
        {sectionKeys.map((type) => {
          const items = data.filter((h) => h.type === type);
          return (
            <section key={type} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {SECTION_TITLES[config.variant][type]}
              </h3>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Sem registros.</p>
              ) : (
                items.map((h) => (
                  <Card key={h.id} className="p-3">
                    <p className="font-medium text-sm">{h.title}</p>
                    {h.description && <p className="text-xs text-muted-foreground mt-1">{h.description}</p>}
                  </Card>
                ))
              )}
            </section>
          );
        })}
      </div>
    </WizardStepScaffold>
  );
});
