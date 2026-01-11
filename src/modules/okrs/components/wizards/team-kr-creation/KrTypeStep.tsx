/**
 * KrTypeStep - Step 3: Composição dos Tipos de KR
 * 
 * Planejar o equilíbrio correto entre resultado e meio
 * Reutiliza lógica do TeamOkrKrTypeStep
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

export interface KrTypeStepProps {
  objectiveTitle: string;
  isSharedObjective: boolean;
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
  sharedWarning?: string;
}

const KR_TYPES: KrTypeInfo[] = [
  {
    type: 'foundational',
    title: 'Fundacional',
    description: 'Prova que o objetivo aconteceu. É o resultado mais importante.',
    example: 'NPS acima de 72 pontos',
    icon: Target,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    required: true,
    sharedWarning: 'Em OKRs compartilhadas, evite múltiplos KRs Fundacionais para não gerar conflitos.',
  },
  {
    type: 'contribution',
    title: 'Contribuição',
    description: 'Resultado do time que alimenta um objetivo maior. Ideal para OKRs compartilhadas.',
    example: 'Pipeline de R$ 2M gerado para meta de receita',
    icon: Link2,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    required: false,
  },
  {
    type: 'enabler',
    title: 'Habilitador',
    description: 'Entrega necessária para viabilizar os outros resultados.',
    example: 'Sistema de tracking implementado',
    icon: Wrench,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    required: false,
  },
];

// ============================================================
// COMPONENT
// ============================================================

export function KrTypeStep({
  objectiveTitle,
  isSharedObjective,
  krPlan,
  onKrPlanChange,
  onContinue,
  onBack,
}: KrTypeStepProps) {
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
              <h2 className="text-lg font-semibold">Tipos de Key Results</h2>
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
                  Todo objetivo precisa de pelo menos 1 KR fundacional. 
                  {isSharedObjective && ' Em OKRs compartilhadas, prefira KRs de Contribuição.'}
                  {!isSharedObjective && ' Habilitadores ajudam, mas não substituem resultado.'}
                </p>
              </div>
            </div>
          </div>

          {/* KR Type Cards */}
          <div className="space-y-4">
            {KR_TYPES.map(krType => {
              const count = krPlan[krType.type];
              const Icon = krType.icon;
              const showSharedWarning = isSharedObjective && krType.sharedWarning && count > 0;
              
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
                  <CardContent className="pt-2 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      <Info className="h-3 w-3 shrink-0" />
                      <span>Exemplo: {krType.example}</span>
                    </div>
                    
                    {showSharedWarning && (
                      <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 p-2 rounded">
                        <Info className="h-3 w-3 shrink-0" />
                        <span>{krType.sharedWarning}</span>
                      </div>
                    )}
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
                  totalKrs > 3 && totalKrs <= 5 && "bg-yellow-100 text-yellow-700 border-yellow-300",
                  totalKrs > 5 && "bg-red-100 text-red-700 border-red-300"
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
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                Adicione pelo menos 1 KR Fundacional para continuar.
              </p>
            )}
          </div>

          {/* Ask to Vic prompts */}
          <div className="p-4 border rounded-lg border-dashed">
            <p className="text-sm font-medium mb-2">Pergunte ao Vic:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• "O que é um KR Fundacional?"</li>
              <li>• "Quando faz sentido usar KR de Contribuição?"</li>
              <li>• "Qual o risco de usar só habilitadores?"</li>
            </ul>
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
