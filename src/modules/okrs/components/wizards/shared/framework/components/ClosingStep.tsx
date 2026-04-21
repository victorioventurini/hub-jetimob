/**
 * ClosingStep — Step de Encerramento (read-only para decisões).
 * Renderiza blocos configuráveis: checklist | feedback | minutes | ceo-letter | next-30-days.
 */

import { memo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { ClosingStepConfig } from '../types';

export interface ClosingStepData {
  checklist?: Record<string, boolean>;
  feedback?: { rating?: number; text?: string };
  minutes?: string;
  ceoLetter?: string;
  next30Days?: { ceo?: string; coo?: string; cpto?: string };
}

export interface ClosingStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: ClosingStepConfig;
  data: ClosingStepData;
  onDataChange: (next: ClosingStepData) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
}

const BLOCK_TITLES: Record<ClosingStepConfig['blocks'][number], string> = {
  checklist: 'Checklist de governança',
  feedback: 'Feedback do rito',
  minutes: 'Ata',
  'ceo-letter': 'Carta do CEO',
  'next-30-days': 'Próximos 30 dias',
};

export const ClosingStep = memo(function ClosingStep({
  persona,
  version,
  stepId,
  config,
  data,
  onDataChange,
  footer,
}: ClosingStepProps) {
  const label = getStepLabel(persona, stepId, version);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={CheckCircle2}
          title={label.title}
          description={label.subtitle}
          variant="green"
        />
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-6">
        {config.blocks.map((block) => (
          <section key={block} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{BLOCK_TITLES[block]}</h3>
            <Card className="p-4">
              {block === 'minutes' && (
                <Textarea
                  value={data.minutes ?? ''}
                  onChange={(e) => onDataChange({ ...data, minutes: e.target.value })}
                  placeholder="Ata do rito..."
                  className="min-h-[120px]"
                />
              )}
              {block === 'ceo-letter' && (
                <Textarea
                  value={data.ceoLetter ?? ''}
                  onChange={(e) => onDataChange({ ...data, ceoLetter: e.target.value })}
                  placeholder="Carta do CEO..."
                  className="min-h-[120px]"
                />
              )}
              {block === 'feedback' && (
                <Textarea
                  value={data.feedback?.text ?? ''}
                  onChange={(e) => onDataChange({ ...data, feedback: { ...data.feedback, text: e.target.value } })}
                  placeholder="Como podemos melhorar este rito? (anônimo)"
                  className="min-h-[80px]"
                />
              )}
              {block === 'checklist' && (
                <p className="text-xs text-muted-foreground italic">Checklist específico do rito.</p>
              )}
              {block === 'next-30-days' && (
                <div className="space-y-2">
                  {(['ceo', 'coo', 'cpto'] as const).map((role) => (
                    <Textarea
                      key={role}
                      value={data.next30Days?.[role] ?? ''}
                      onChange={(e) =>
                        onDataChange({
                          ...data,
                          next30Days: { ...data.next30Days, [role]: e.target.value },
                        })
                      }
                      placeholder={`Prioridade ${role.toUpperCase()} próximos 30 dias`}
                      className="min-h-[60px]"
                    />
                  ))}
                </div>
              )}
            </Card>
          </section>
        ))}
      </div>
    </WizardStepScaffold>
  );
});
