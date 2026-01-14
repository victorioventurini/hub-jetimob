/**
 * CLevelDecisionsStep - Decisões estratégicas
 */

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
} from 'lucide-react';

export interface CLevelDecisionsStepProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function CLevelDecisionsStep({
  value,
  onChange,
  onContinue,
  onBack,
}: CLevelDecisionsStepProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Decisões Estratégicas</h3>
            <p className="text-sm text-muted-foreground">
              Registre os direcionamentos definidos neste check-in
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <Label htmlFor="decisions" className="text-base font-medium">
              Quais decisões foram tomadas?
            </Label>
            <Textarea
              id="decisions"
              placeholder="Ex: Priorizar investimento em produto X, pausar expansão para região Y..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[200px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              💡 Essas decisões ficarão registradas no histórico do ciclo
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>

          <Button 
            onClick={onContinue}
            className="flex-1"
            size="lg"
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
