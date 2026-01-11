/**
 * KrSharedCheckStep - Step 5: Validação de OKRs Compartilhadas
 * Só aparece se o objetivo for compartilhado
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepFooter } from '../shared';
import type { DraftTeamKr } from '@/modules/okrs/types/wizard';

export interface KrSharedCheckStepProps {
  draftKrs: DraftTeamKr[];
  primaryTeamName: string;
  contributingTeamNames: string[];
  onAdjust: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export function KrSharedCheckStep({
  draftKrs,
  primaryTeamName,
  contributingTeamNames,
  onAdjust,
  onContinue,
  onBack,
}: KrSharedCheckStepProps) {
  const foundationalKrs = draftKrs.filter(kr => kr.type === 'foundational');
  const hasMultipleFoundational = foundationalKrs.length > 1;
  const hasFoundational = foundationalKrs.length > 0;

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Validação de OKR Compartilhada</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Verificando coerência dos KRs em contexto colaborativo.
            </p>
          </div>

          <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Objetivo compartilhado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Time principal: <span className="font-medium">{primaryTeamName}</span>
                  {contributingTeamNames.length > 0 && (
                    <> • Contribuidores: {contributingTeamNames.join(', ')}</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {hasMultipleFoundational && (
            <Card className="border-orange-200 dark:border-orange-800/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  Atenção: Múltiplos KRs Fundacionais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  KRs Fundacionais em OKRs compartilhadas podem gerar conflitos entre times.
                  Considere converter alguns para KRs de Contribuição.
                </p>
                <Button variant="outline" size="sm" onClick={onAdjust}>
                  Ajustar KRs
                </Button>
              </CardContent>
            </Card>
          )}

          {!hasMultipleFoundational && hasFoundational && (
            <Card className="border-green-200 dark:border-green-800/50">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="font-medium mb-2">Configuração adequada</h3>
                <p className="text-sm text-muted-foreground">
                  Seus KRs estão bem distribuídos para um contexto colaborativo.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Em OKRs compartilhadas, prefira KRs de Contribuição. Eles deixam claro
                o que cada time entrega sem criar conflitos de responsabilidade.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Continuar"
        onPrimary={onContinue}
      />
    </div>
  );
}
