/**
 * ManagersAdjustmentsStep - Etapa 3 do Wizard Check-in de Gestores
 * 
 * Ajustes de foco:
 * - Registrar decisões de alinhamento
 * - Ajustes de prioridade entre áreas
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  X,
  Target,
  Lightbulb,
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

export interface ManagersAdjustmentsStepProps {
  adjustments: string[];
  onAdjustmentsChange: (adjustments: string[]) => void;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function ManagersAdjustmentsStep({
  adjustments,
  onAdjustmentsChange,
  onComplete,
  onBack,
}: ManagersAdjustmentsStepProps) {
  const [newAdjustment, setNewAdjustment] = useState('');

  const handleAdd = () => {
    if (!newAdjustment.trim()) return;
    onAdjustmentsChange([...adjustments, newAdjustment.trim()]);
    setNewAdjustment('');
  };

  const handleRemove = (index: number) => {
    onAdjustmentsChange(adjustments.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-green-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Ajustes de Foco</h3>
            <p className="text-sm text-muted-foreground">
              Registre decisões de alinhamento entre áreas
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Add adjustment */}
          <div className="space-y-3">
            <Label>Adicionar ajuste</Label>
            <div className="flex gap-2">
              <Input
                value={newAdjustment}
                onChange={(e) => setNewAdjustment(e.target.value)}
                placeholder="Ex: Área X prioriza entrega para Área Y"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Button onClick={handleAdd} disabled={!newAdjustment.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Adjustments list */}
          {adjustments.length > 0 ? (
            <div className="space-y-2">
              {adjustments.map((adjustment, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Target className="h-4 w-4 mt-1 text-green-600" />
                      <p className="flex-1 text-sm">{adjustment}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum ajuste registrado ainda</p>
            </div>
          )}

          <Separator />

          {/* Suggestions */}
          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Sugestões de ajustes
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Prioridades de entrega entre áreas</li>
              <li>• Rebalanceamento de recursos</li>
              <li>• Mudanças de escopo ou prazo</li>
              <li>• Dependências que precisam de atenção</li>
            </ul>
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
          <Button onClick={onComplete} className="flex-1" size="lg">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Concluir Check-in
          </Button>
        </div>
      </div>
    </div>
  );
}
