/**
 * CollaboratorReflectionStep - Etapa 4 do Wizard Colaborador
 * 
 * Reflexão final com 1-2 perguntas:
 * - O que mais impactou seus resultados esta semana?
 * - Você precisa de ajuda em algo específico?
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Send,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CollaboratorReflection, CollaboratorCheckinResult } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorReflectionStepProps {
  results: CollaboratorCheckinResult[];
  onComplete: (reflection: CollaboratorReflection) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorReflectionStep({
  results,
  onComplete,
  onBack,
  isSubmitting = false,
}: CollaboratorReflectionStepProps) {
  const [impactSummary, setImpactSummary] = useState('');
  const [helpNeeded, setHelpNeeded] = useState('');
  const [needsHelp, setNeedsHelp] = useState(false);

  // Stats from results
  const completed = results.filter(r => !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const withBlockers = results.filter(r => r.blocker).length;

  const handleSubmit = () => {
    onComplete({
      impactSummary: impactSummary.trim() || undefined,
      helpNeeded: needsHelp && helpNeeded.trim() ? helpNeeded.trim() : undefined,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Reflexão final</h3>
            <p className="text-sm text-muted-foreground">
              Momento de pausar e pensar sobre a semana
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4 border-b bg-muted/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500">
              {completed} atualizados
            </Badge>
          </div>
          {skipped > 0 && (
            <Badge variant="secondary">
              {skipped} pulados
            </Badge>
          )}
          {withBlockers > 0 && (
            <Badge variant="destructive">
              {withBlockers} com bloqueador
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Question 1 */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <Label htmlFor="impact" className="text-base font-medium">
                O que mais impactou seus resultados esta semana?
              </Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Compartilhe aprendizados, conquistas ou desafios
              </p>
            </div>
          </div>
          <Textarea
            id="impact"
            value={impactSummary}
            onChange={(e) => setImpactSummary(e.target.value)}
            placeholder="Ex: Consegui avançar bem no projeto X depois de alinhar com o time de design..."
            className="min-h-[120px] resize-none"
          />
        </div>

        {/* Question 2 */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              id="needs-help"
              checked={needsHelp}
              onCheckedChange={(checked) => setNeedsHelp(checked === true)}
              className="mt-1"
            />
            <div className="flex-1">
              <Label 
                htmlFor="needs-help" 
                className="text-base font-medium cursor-pointer flex items-center gap-2"
              >
                <HelpCircle className="h-5 w-5 text-primary" />
                Você precisa de ajuda em algo específico?
              </Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Marque se precisar de suporte do seu líder ou time
              </p>
            </div>
          </div>

          {needsHelp && (
            <div className="ml-8">
              <Textarea
                id="help-needed"
                value={helpNeeded}
                onChange={(e) => setHelpNeeded(e.target.value)}
                placeholder="Descreva o que você precisa..."
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 Isso será visível para seu líder no próximo check-in
              </p>
            </div>
          )}
        </div>

        {/* Tip */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground italic text-center">
            "A ferramenta não cobra. Ela ajuda a pensar."
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>

          <Button 
            onClick={handleSubmit} 
            className="flex-1" 
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Enviar atualização
          </Button>
        </div>
      </div>
    </div>
  );
}
