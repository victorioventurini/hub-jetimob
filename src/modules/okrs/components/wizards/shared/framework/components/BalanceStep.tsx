/**
 * BalanceStep — Step de Balanço (parametrizado por período).
 *
 * Usado como abertura preparatória (Pré-Check-in/Pré-MBR/Pré-QBR) e como
 * Abertura/Abertura Executiva em ritos decisórios.
 */

import { memo } from 'react';
import { ScrollText } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Textarea } from '@/components/ui/textarea';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { BalanceStepConfig } from '../types';
import type { BalanceContent } from '../config/stepContentAdapters';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';

export interface BalanceStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: BalanceStepConfig;
  data: BalanceContent;
  onDataChange: (next: BalanceContent) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
}

export const BalanceStep = memo(function BalanceStep({
  persona,
  version,
  stepId,
  data,
  onDataChange,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: BalanceStepProps) {
  const label = getStepLabel(persona, stepId, version);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ScrollText}
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
      <div className="p-4 md:p-6 space-y-4">
        <Textarea
          value={data.narrative}
          onChange={(e) => onDataChange({ ...data, narrative: e.target.value })}
          placeholder="Escreva o balanço do período..."
          className="min-h-[200px] resize-y"
        />
        {data.highlights && data.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.highlights.map((h) => (
              <span
                key={h.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs"
              >
                <span className="font-medium">{h.label}</span>
                {h.value && <span className="text-muted-foreground">{h.value}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
});
