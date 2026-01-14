/**
 * CLevelInsightsStep - Insights estratégicos
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

export interface CLevelInsightsStepProps {
  onContinue: () => void;
  onBack: () => void;
}

export function CLevelInsightsStep({
  onContinue,
  onBack,
}: CLevelInsightsStepProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-amber-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Lightbulb className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Insights Estratégicos</h3>
            <p className="text-sm text-muted-foreground">
              Pontos de atenção identificados automaticamente
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">NPS precisa de atenção</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O indicador está abaixo da meta e com tendência estável. 
                    Recomenda-se revisar as iniciativas de satisfação do cliente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Receita em boa trajetória</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O OKR de receita está com tendência de melhoria. 
                    Manter o foco nas ações atuais.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
