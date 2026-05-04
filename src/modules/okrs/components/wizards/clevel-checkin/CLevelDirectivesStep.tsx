/**
 * CLevelDirectivesStep - Diretrizes para comunicação
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone } from 'lucide-react';
import { WizardLastStepFooter } from '../shared';
import { getRitualFinalizationCopy } from '@/modules/okrs/constants/ritualLabels';

export interface CLevelDirectivesStepProps {
  value: string;
  onChange: (value: string) => void;
  onComplete: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export function CLevelDirectivesStep({
  value,
  onChange,
  onComplete,
  onBack,
  isSubmitting = false,
}: CLevelDirectivesStepProps) {
  const copy = getRitualFinalizationCopy('clevel-checkin');

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-success/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-success/10">
            <Megaphone className="h-5 w-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Diretrizes para a Organização</h3>
            <p className="text-sm text-muted-foreground">
              Mensagem para comunicar aos times
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <Label htmlFor="directives" className="text-base font-medium">
              Quais diretrizes devem ser comunicadas?
            </Label>
            <Textarea
              id="directives"
              placeholder="Ex: Foco total em entregas Q1, reduzir reuniões desnecessárias..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[200px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              💡 Essas diretrizes podem ser compartilhadas com os times
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Footer canônico com modal de confirmação */}
      <WizardLastStepFooter
        onBack={onBack}
        backDisabled={isSubmitting}
        onPrimary={onComplete}
        primaryLoading={isSubmitting}
        primaryLabel="Concluir Check-in"
        confirmTitle={copy?.title ?? 'Concluir Check-in Executivo'}
        confirmDescription={copy?.description}
        confirmLabel={copy?.confirmLabel ?? 'Concluir check-in'}
      />
    </div>
  );
}
