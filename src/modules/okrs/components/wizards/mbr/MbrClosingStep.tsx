/**
 * MbrClosingStep - Etapa 5: Encerramento & Governança
 * 
 * Checklist obrigatório de 4 itens + feedback anônimo obrigatório.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Plus, X, MessageSquare, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardLastStepFooter } from '../shared';
import type {
  MbrGovernanceChecklist,
  RitualImprovementFeedback,
  TeamCheckinDecision,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrClosingStepProps {
  decisions: TeamCheckinDecision[];
  checklist: MbrGovernanceChecklist;
  onChecklistChange: (checklist: MbrGovernanceChecklist) => void;
  ritualFeedback: RitualImprovementFeedback[];
  onRitualFeedbackChange: (feedback: RitualImprovementFeedback[]) => void;
  onComplete: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrClosingStep({
  decisions,
  checklist,
  onChecklistChange,
  ritualFeedback,
  onRitualFeedbackChange,
  onComplete,
  onBack,
}: MbrClosingStepProps) {
  const [feedbackText, setFeedbackText] = useState('');

  const handleCheckChange = (key: keyof MbrGovernanceChecklist, value: boolean) => {
    onChecklistChange({ ...checklist, [key]: value });
  };

  const handleAddFeedback = () => {
    if (!feedbackText.trim()) return;
    const fb: RitualImprovementFeedback = {
      id: `fb-${Date.now()}`,
      text: feedbackText.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    onRitualFeedbackChange([...ritualFeedback, fb]);
    setFeedbackText('');
  };

  const handleRemoveFeedback = (id: string) => {
    onRitualFeedbackChange(ritualFeedback.filter(f => f.id !== id));
  };

  const allChecked =
    checklist.strategicFocusClear &&
    checklist.nextStepsHaveOwners &&
    checklist.nonPrioritiesClear &&
    checklist.communicateInAllHands;

  const hasFeedback = ritualFeedback.length > 0;
  const canComplete = allChecked && hasFeedback;

  // Summary counts
  const decisionCount = decisions.filter(d => d.category === 'decision').length;
  const focusCount = decisions.filter(d => d.category === 'focus_adjustment').length;
  const nextStepCount = decisions.filter(d => d.category === 'next_step').length;

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={ShieldCheck}
        title="Encerramento & Governança"
        description="Confirme o alinhamento antes de finalizar"
        variant="green"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="bg-status-blue-muted text-status-blue">
              {decisionCount} decisões
            </Badge>
            <Badge variant="secondary" className="bg-status-purple-muted text-status-purple">
              {focusCount} ajustes de foco
            </Badge>
            <Badge variant="secondary" className="bg-status-green-muted text-status-green">
              {nextStepCount} próximos passos
            </Badge>
          </div>

          {/* Governance checklist */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Checklist de Governança
            </h4>

            <div className="space-y-3">
              {[
                { key: 'strategicFocusClear' as const, label: 'Está claro o foco estratégico do próximo mês' },
                { key: 'nextStepsHaveOwners' as const, label: 'Todos os próximos passos têm responsável' },
                { key: 'nonPrioritiesClear' as const, label: 'Está claro o que NÃO será prioridade' },
                { key: 'communicateInAllHands' as const, label: 'Se necessário, isso será comunicado no All Hands' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Checkbox
                    id={key}
                    checked={checklist[key]}
                    onCheckedChange={(checked) => handleCheckChange(key, checked as boolean)}
                  />
                  <Label htmlFor={key} className="cursor-pointer text-sm">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Anonymous ritual feedback */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Como podemos melhorar essa reunião?
            </h4>
            <p className="text-xs text-muted-foreground">
              Feedback anônimo — não será associado ao seu nome.
            </p>

            <div className="flex gap-2">
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Sugestão de melhoria..."
                className="text-sm min-h-[48px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddFeedback();
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 flex-shrink-0 self-end"
                onClick={handleAddFeedback}
                disabled={!feedbackText.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {ritualFeedback.length > 0 && (
              <div className="space-y-2">
                {ritualFeedback.map((fb) => (
                  <Card key={fb.id}>
                    <CardContent className="p-3 flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm flex-1">{fb.text}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleRemoveFeedback(fb.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <WizardLastStepFooter
        onBack={onBack}
        onPrimary={onComplete}
        primaryDisabled={!canComplete}
      />
      {!canComplete && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          {!allChecked && 'Complete o checklist'}
          {allChecked && !hasFeedback && 'Adicione pelo menos um feedback sobre a reunião'}
        </p>
      )}
    </div>
  );
}
