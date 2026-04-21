/**
 * ReflectionStep — Step exclusivo do Check-in Individual (exceção documentada).
 */

import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { ReflectionStepConfig } from '../types';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';

export interface ReflectionStepData {
  impactSummary?: string;
  helpNeeded?: string;
}

export interface ReflectionStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: ReflectionStepConfig;
  data: ReflectionStepData;
  onDataChange: (next: ReflectionStepData) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
}

export const ReflectionStep = memo(function ReflectionStep({
  persona,
  version,
  stepId,
  data,
  onDataChange,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
}: ReflectionStepProps) {
  const label = getStepLabel(persona, stepId, version);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Sparkles}
          title={label.title}
          description={label.subtitle}
          variant="purple"
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
        <div className="space-y-2">
          <Label htmlFor="impact-summary">Qual foi o seu maior impacto na semana?</Label>
          <Textarea
            id="impact-summary"
            value={data.impactSummary ?? ''}
            onChange={(e) => onDataChange({ ...data, impactSummary: e.target.value })}
            className="min-h-[100px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="help-needed">Onde você precisa de ajuda?</Label>
          <Textarea
            id="help-needed"
            value={data.helpNeeded ?? ''}
            onChange={(e) => onDataChange({ ...data, helpNeeded: e.target.value })}
            className="min-h-[100px]"
          />
        </div>
      </div>
    </WizardStepScaffold>
  );
});
