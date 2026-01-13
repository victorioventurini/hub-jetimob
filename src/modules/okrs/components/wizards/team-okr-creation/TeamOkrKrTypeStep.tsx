/**
 * TeamOkrKrTypeStep - Step 4: Escolhendo KRs
 * 
 * Cap. 5 do storytelling:
 * - Explica tipos de KR (Fundacional, Contribuição, Habilitador)
 * - Usuário planeja quantos KRs de cada tipo
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, Link2, Wrench, Plus, Minus, Sparkles, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepFooter } from '../shared';
import { AskToVicInline } from '@/modules/vic/components/AskToVic';
import type { OkrKrType } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface KrPlan {
  foundational: number;
  contribution: number;
  enabler: number;
}

export interface TeamOkrKrTypeStepProps {
  objectiveTitle: string;
  krPlan: KrPlan;
  onKrPlanChange: (plan: KrPlan) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// KR TYPE DEFINITIONS
// ============================================================

interface KrTypeInfo {
  type: OkrKrType;
  title: string;
  description: string;
  example: string;
  icon: typeof Target;
  color: string;
  bgColor: string;
  required: boolean;
}

const KR_TYPES: KrTypeInfo[] = [
  {
    type: 'foundational',
    title: 'Fundacional',
    description: 'Prova que o objetivo aconteceu. É o resultado mais importante.',
    example: 'NPS acima de 72 pontos',
    icon: Target,
    color: 'text-status-green',
    bgColor: 'bg-status-green-muted',
    required: true,
  },
  {
    type: 'contribution',
    title: 'Contribuição',
    description: 'Resultado do time que alimenta um objetivo maior.',
    example: 'Pipeline de R$ 2M gerado para meta de receita',
    icon: Link2,
    color: 'text-status-blue',
    bgColor: 'bg-status-blue-muted',
    required: false,
  },
  {
    type: 'enabler',
    title: 'Habilitador',
    description: 'Entrega necessária para viabilizar os outros resultados.',
    example: 'Sistema de tracking implementado',
    icon: Wrench,
    color: 'text-status-orange',
    bgColor: 'bg-status-orange-muted',
    required: false,
  },
];

// ============================================================
// COMPONENT
// ============================================================

export function TeamOkrKrTypeStep({
  objectiveTitle,
  krPlan,
  onKrPlanChange,
  onContinue,
  onBack,
}: TeamOkrKrTypeStepProps) {
  const totalKrs = krPlan.foundational + krPlan.contribution + krPlan.enabler;
  const hasFoundational = krPlan.foundational > 0;
  const canContinue = hasFoundational && totalKrs >= 1 && totalKrs <= 5;

  const handleIncrement = (type: OkrKrType) => {
    if (totalKrs >= 5) return;
    onKrPlanChange({
      ...krPlan,
      [type]: krPlan[type] + 1,
    });
  };

  const handleDecrement = (type: OkrKrType) => {
    if (krPlan[type] <= 0) return;
    // Foundational must have at least 1 if it's the only type with count
    if (type === 'foundational' && krPlan[type] === 1 && totalKrs === 1) return;
    onKrPlanChange({
      ...krPlan,
      [type]: krPlan[type] - 1,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Escolhendo os KRs</h2>
              <AskToVicInline
                context={{
                  module: 'okrs',
                  wizard: 'creation',
                  step: 'kr-type',
                  objectiveTitle,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Como o objetivo <span className="font-medium">"{objectiveTitle}"</span> se sustenta?
            </p>
          </div>

          {/* Coach Insight */}
          <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Dica do Coach</p>
                <p className="text-sm text-muted-foreground">
                  Todo objetivo precisa de pelo menos 1 KR fundacional. Habilitadores ajudam, 
                  mas não substituem resultado.
                </p>
              </div>
            </div>
          </div>

          {/* KR Type Cards */}
          <div className="space-y-4">
            {KR_TYPES.map(krType => {
              const count = krPlan[krType.type];
              const Icon = krType.icon;
              
              return (
                <Card 
                  key={krType.type}
                  className={cn(
                    "transition-all",
                    count > 0 && "ring-2 ring-primary/30"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", krType.bgColor)}>
                          <Icon className={cn("h-5 w-5", krType.color)} />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {krType.title}
                            {krType.required && (
                              <Badge variant="outline" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {krType.description}
                          </CardDescription>
                        </div>
                      </div>
                      
                      {/* Counter */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDecrement(krType.type)}
                          disabled={count === 0 || (krType.type === 'foundational' && count === 1 && totalKrs === 1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold text-lg">
                          {count}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleIncrement(krType.type)}
                          disabled={totalKrs >= 5}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <Info className="h-3 w-3 shrink-0" />
                      <span>Exemplo: {krType.example}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total de KRs planejados</span>
              <Badge 
                variant={totalKrs >= 1 && totalKrs <= 3 ? "default" : "outline"}
                className={cn(
                  totalKrs > 3 && totalKrs <= 5 && "bg-status-yellow-muted text-status-yellow border-status-yellow/30",
                  totalKrs > 5 && "bg-status-red-muted text-status-red border-status-red/30"
                )}
              >
                {totalKrs} / 5 máximo
              </Badge>
            </div>
            {totalKrs > 3 && (
              <p className="text-xs text-muted-foreground mt-2">
                Times com 3 KRs têm maior foco. Considere priorizar.
              </p>
            )}
            {!hasFoundational && (
              <p className="text-xs text-status-red mt-2">
                Adicione pelo menos 1 KR Fundacional para continuar.
              </p>
            )}
          </div>
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Detalhar KRs"
        onPrimary={onContinue}
        primaryDisabled={!canContinue}
      />
    </div>
  );
}
