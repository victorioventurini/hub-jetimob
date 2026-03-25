/**
 * QbrCLevelDirectivesStep - Step 4: Direcionamentos e Decisões
 * 
 * Direcionamentos com categorias (strategic_question, hypothesis, non_priority, challenge).
 * Decisões via DecisionCard + InlineDecisionInput com category 'strategic_proposal'.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Megaphone, Plus, X, HelpCircle, Lightbulb, Ban, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import type { QbrCLevelSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

type DirectiveCategory = QbrCLevelSnapshot['directives'][number]['category'];

export interface QbrCLevelDirectivesStepProps {
  directives: QbrCLevelSnapshot['directives'];
  onDirectivesChange: (directives: QbrCLevelSnapshot['directives']) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_CONFIG: Record<DirectiveCategory, { label: string; icon: typeof HelpCircle; color: string }> = {
  strategic_question: { label: 'Pergunta estratégica', icon: HelpCircle, color: 'text-primary' },
  hypothesis: { label: 'Hipótese', icon: Lightbulb, color: 'text-status-amber' },
  non_priority: { label: 'Não-prioridade', icon: Ban, color: 'text-status-red' },
  challenge: { label: 'Desafio', icon: Swords, color: 'text-purple-600' },
};

// ============================================================
// COMPONENT
// ============================================================

export function QbrCLevelDirectivesStep({
  directives,
  onDirectivesChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: QbrCLevelDirectivesStepProps) {
  const [newCategory, setNewCategory] = useState<DirectiveCategory>('strategic_question');
  const [newText, setNewText] = useState('');

  const handleAdd = () => {
    if (!newText.trim()) return;
    onDirectivesChange([
      ...directives,
      { text: newText.trim(), category: newCategory },
    ]);
    setNewText('');
  };

  const handleRemove = (index: number) => {
    onDirectivesChange(directives.filter((_, i) => i !== index));
  };

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Megaphone}
          title="Direcionamentos e Decisões"
          description="Pauta obrigatória para a reunião QBR"
          variant="amber"
          badge={`${directives.length} itens`}
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="qbr-clevel-directives"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
        />
      }
    >
      <div className="p-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Defina os temas que devem ser debatidos na reunião QBR. Cada item entra como pauta obrigatória.
        </p>

        {/* Add new directive */}
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex gap-2">
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as DirectiveCategory)}>
                <SelectTrigger className="w-[200px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(CATEGORY_CONFIG) as [DirectiveCategory, typeof CATEGORY_CONFIG[DirectiveCategory]][]).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-1.5">
                          <Icon className={cn('h-3 w-3', cfg.color)} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Descreva o direcionamento..."
                className="text-sm flex-1"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAdd}
                disabled={!newText.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Directives list */}
        {directives.length > 0 && (
          <div className="space-y-2">
            {directives.map((d, i) => {
              const cfg = CATEGORY_CONFIG[d.category];
              const Icon = cfg.icon;
              return (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className={cn('text-[10px]', cfg.color)}>
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-sm">{d.text}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {directives.length === 0 && (
          <div className="text-center py-8">
            <Megaphone className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum direcionamento adicionado. Use o formulário acima para definir a pauta do QBR.
            </p>
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
