/**
 * WeeklyClosingStep — Step 4 da Weekly v2
 *
 * Encerramento padrão: checklist + ata. Reusa `ClosingStep` do framework
 * canônico via wrapper (mantém o snapshot imutável e o confirm dialog do
 * `WizardLastStepFooter`).
 */

import { useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  WizardStepHeader,
  WizardLastStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { TeamCheckinDecision, WeeklyDraftData } from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const CHECKLIST_ITEMS: Array<{ id: string; label: string }> = [
  { id: 'priorities-clear', label: 'Prioridades da semana ficaram claras' },
  { id: 'decisions-have-owners', label: 'Decisões têm responsáveis' },
  { id: 'people-signals-acknowledged', label: 'Sinais de pessoas foram acolhidos' },
  { id: 'next-weekly-scheduled', label: 'Próxima Weekly está agendada' },
];

// ============================================================
// TYPES
// ============================================================

export interface WeeklyClosingStepProps {
  closing: WeeklyDraftData['closing'];
  onClosingChange: (next: WeeklyDraftData['closing']) => void;
  decisions: TeamCheckinDecision[];
  isCompleting: boolean;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function WeeklyClosingStep({
  closing,
  onClosingChange,
  decisions,
  isCompleting,
  onComplete,
  onBack,
}: WeeklyClosingStepProps) {
  const toggle = useCallback(
    (id: string, checked: boolean) =>
      onClosingChange({
        ...closing,
        checklist: { ...closing.checklist, [id]: checked },
      }),
    [closing, onClosingChange],
  );

  const setMinutes = useCallback(
    (value: string) => onClosingChange({ ...closing, minutes: value }),
    [closing, onClosingChange],
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={CheckCircle2}
          title="Encerramento"
          description="Checklist e ata da Weekly"
          variant="green"
        />
      }
      footer={
        <WizardLastStepFooter
          onBack={onBack}
          onPrimary={onComplete}
          primaryLoading={isCompleting}
        />
      }
    >
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Checklist de governança</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <Checkbox
                  id={`weekly-closing-${item.id}`}
                  checked={!!closing.checklist?.[item.id]}
                  onCheckedChange={(v) => toggle(item.id, v === true)}
                />
                <Label
                  htmlFor={`weekly-closing-${item.id}`}
                  className="text-sm cursor-pointer leading-tight"
                >
                  {item.label}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ata da Weekly</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={closing.minutes ?? ''}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Resumo executivo do que foi decidido…"
              rows={6}
            />
          </CardContent>
        </Card>

        {decisions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Decisões registradas ({decisions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {decisions.map((d) => (
                  <li
                    key={d.id}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span>•</span>
                    <span>{d.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </WizardStepScaffold>
  );
}
