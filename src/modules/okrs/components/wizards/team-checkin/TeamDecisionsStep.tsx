/**
 * TeamDecisionsStep - Etapa 4 do Wizard Check-in do Time
 * 
 * Registro de decisões e próximos passos:
 * - Decisões tomadas na reunião
 * - Ajustes de foco
 * - Checklist de saída
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  CheckCircle2,
  Plus,
  X,
  Lightbulb,
  Target,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamCheckinDecision, TeamCheckinChecklist } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface TeamDecisionsStepProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  checklist: TeamCheckinChecklist;
  onChecklistChange: (checklist: TeamCheckinChecklist) => void;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamDecisionsStep({
  decisions,
  onDecisionsChange,
  checklist,
  onChecklistChange,
  onComplete,
  onBack,
}: TeamDecisionsStepProps) {
  const [newDecision, setNewDecision] = useState('');
  const [decisionCategory, setDecisionCategory] = useState<TeamCheckinDecision['category']>('decision');

  const handleAddDecision = () => {
    if (!newDecision.trim()) return;

    const decision: TeamCheckinDecision = {
      id: `decision-${Date.now()}`,
      text: newDecision.trim(),
      category: decisionCategory,
    };

    onDecisionsChange([...decisions, decision]);
    setNewDecision('');
  };

  const handleRemoveDecision = (id: string) => {
    onDecisionsChange(decisions.filter(d => d.id !== id));
  };

  const handleChecklistChange = (key: keyof TeamCheckinChecklist, value: boolean) => {
    onChecklistChange({ ...checklist, [key]: value });
  };

  const allChecked = checklist.knowWhatToFocus && 
                     checklist.knowWhatNotToDo && 
                     checklist.knowWhoIsResponsible;

  const getCategoryConfig = (category: TeamCheckinDecision['category']) => {
    switch (category) {
      case 'decision':
        return { label: 'Decisão', icon: Lightbulb, color: 'bg-blue-100 text-blue-700' };
      case 'focus_adjustment':
        return { label: 'Ajuste de Foco', icon: Target, color: 'bg-purple-100 text-purple-700' };
      case 'next_step':
        return { label: 'Próximo Passo', icon: CheckCircle2, color: 'bg-green-100 text-green-700' };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-green-500/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Decisões e Próximos Passos</h3>
            <p className="text-sm text-muted-foreground">
              Registre o que foi decidido nesta reunião
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Add decision */}
          <div className="space-y-3">
            <Label>Adicionar registro</Label>
            <div className="flex gap-2">
              <Input
                value={newDecision}
                onChange={(e) => setNewDecision(e.target.value)}
                placeholder="Ex: Priorizar feature X esta semana"
                onKeyDown={(e) => e.key === 'Enter' && handleAddDecision()}
              />
              <Button onClick={handleAddDecision} disabled={!newDecision.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {(['decision', 'focus_adjustment', 'next_step'] as const).map((cat) => {
                const config = getCategoryConfig(cat);
                return (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={cn(
                      "cursor-pointer transition-colors",
                      decisionCategory === cat && config.color
                    )}
                    onClick={() => setDecisionCategory(cat)}
                  >
                    {config.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Decisions list */}
          {decisions.length > 0 && (
            <div className="space-y-2">
              {decisions.map((decision) => {
                const config = getCategoryConfig(decision.category);
                const Icon = config.icon;

                return (
                  <Card key={decision.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{decision.text}</p>
                          <Badge variant="secondary" className={cn("text-xs mt-1", config.color)}>
                            {config.label}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveDecision(decision.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Separator />

          {/* Exit checklist */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Checklist de Saída
            </h4>
            <p className="text-sm text-muted-foreground">
              Antes de encerrar, confirme que todos sabem:
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="focus"
                  checked={checklist.knowWhatToFocus}
                  onCheckedChange={(checked) => 
                    handleChecklistChange('knowWhatToFocus', checked as boolean)
                  }
                />
                <Label htmlFor="focus" className="cursor-pointer">
                  Sei no que focar esta semana
                </Label>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="not-do"
                  checked={checklist.knowWhatNotToDo}
                  onCheckedChange={(checked) => 
                    handleChecklistChange('knowWhatNotToDo', checked as boolean)
                  }
                />
                <Label htmlFor="not-do" className="cursor-pointer">
                  Sei o que NÃO devo priorizar agora
                </Label>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="responsible"
                  checked={checklist.knowWhoIsResponsible}
                  onCheckedChange={(checked) => 
                    handleChecklistChange('knowWhoIsResponsible', checked as boolean)
                  }
                />
                <Label htmlFor="responsible" className="cursor-pointer">
                  Sei quem é responsável pelo quê
                </Label>
              </div>
            </div>
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
            onClick={onComplete} 
            className="flex-1" 
            size="lg"
            disabled={!allChecked}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Concluir Check-in
          </Button>
        </div>
        {!allChecked && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Complete o checklist para finalizar
          </p>
        )}
      </div>
    </div>
  );
}
