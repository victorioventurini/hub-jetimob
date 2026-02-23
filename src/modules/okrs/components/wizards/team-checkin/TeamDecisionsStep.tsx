/**
 * TeamDecisionsStep - Etapa 4 do Wizard Check-in do Time
 * 
 * Consolidação de decisões e próximos passos:
 * - Exibe todos os registros de steps anteriores agrupados por sourceStep
 * - Permite adicionar, editar e remover registros
 * - Checklist de saída
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { TextareaAutoSubmit } from '@/components/ui/textarea-auto-submit';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Plus, X, Lightbulb, Target, Users, Pencil, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardLastStepFooter } from '../shared';
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
// CONSTANTS
// ============================================================

const CATEGORY_CONFIG = {
  decision: { label: 'Decisão', icon: Lightbulb, color: 'bg-status-blue-muted text-status-blue' },
  focus_adjustment: { label: 'Ajuste de Foco', icon: Target, color: 'bg-status-purple-muted text-status-purple' },
  next_step: { label: 'Próximo Passo', icon: CheckCircle2, color: 'bg-status-green-muted text-status-green' },
} as const;

const SOURCE_STEP_LABELS: Record<string, string> = {
  opening: 'Da Abertura',
  'kr-review': 'Da Revisão de KRs',
  initiatives: 'Das Iniciativas',
  decisions: 'Desta Etapa',
};

// ============================================================
// SUBCOMPONENTS
// ============================================================

function DecisionCard({
  decision,
  onUpdate,
  onRemove,
}: {
  decision: TeamCheckinDecision;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(decision.text);
  const config = CATEGORY_CONFIG[decision.category];
  const Icon = config.icon;

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(decision.id, editText.trim());
    }
    setIsEditing(false);
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Icon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-2">
                <TextareaAutoSubmit
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="text-sm"
                  autoFocus
                  onSubmit={() => handleSave()}
                  minRows={1}
                  maxRows={4}
                  onBlur={() => { /* keep editing on blur */ }}
                  onKeyDownCapture={(e) => {
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 self-end" onClick={handleSave}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-sm">{decision.text}</p>
            )}
            <Badge variant="secondary" className={cn("text-xs mt-1", config.color)}>
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => { setEditText(decision.text); setIsEditing(true); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(decision.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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

  // Group decisions by sourceStep
  const groupedDecisions = useMemo(() => {
    const groups: Record<string, TeamCheckinDecision[]> = {};
    const stepOrder = ['opening', 'kr-review', 'initiatives', 'decisions'];
    
    for (const d of decisions) {
      const step = d.sourceStep || 'decisions';
      if (!groups[step]) groups[step] = [];
      groups[step].push(d);
    }
    
    // Return ordered
    return stepOrder
      .filter(step => groups[step]?.length > 0)
      .map(step => ({ step, label: SOURCE_STEP_LABELS[step] || step, items: groups[step] }));
  }, [decisions]);

  const handleAddDecision = () => {
    if (!newDecision.trim()) return;

    const decision: TeamCheckinDecision = {
      id: `decision-${Date.now()}`,
      text: newDecision.trim(),
      category: decisionCategory,
      sourceStep: 'decisions',
    };

    onDecisionsChange([...decisions, decision]);
    setNewDecision('');
  };

  const handleRemoveDecision = (id: string) => {
    onDecisionsChange(decisions.filter(d => d.id !== id));
  };

  const handleUpdateDecision = (id: string, text: string) => {
    onDecisionsChange(decisions.map(d => d.id === id ? { ...d, text } : d));
  };

  const handleChecklistChange = (key: keyof TeamCheckinChecklist, value: boolean) => {
    onChecklistChange({ ...checklist, [key]: value });
  };

  const allChecked = checklist.knowWhatToFocus && 
                     checklist.knowWhatNotToDo && 
                     checklist.knowWhoIsResponsible;

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={CheckCircle2}
        title="Decisões e Próximos Passos"
        description={`${decisions.length} registro${decisions.length !== 1 ? 's' : ''} no total`}
        variant="green"
      />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Add decision */}
          <div className="space-y-3">
            <Label>Adicionar registro</Label>
            <div className="flex gap-2">
              <TextareaAutoSubmit
                value={newDecision}
                onChange={(e) => setNewDecision(e.target.value)}
                placeholder="Ex: Priorizar feature X esta semana"
                onSubmit={() => handleAddDecision()}
                minRows={1}
                maxRows={4}
              />
              <Button onClick={handleAddDecision} disabled={!newDecision.trim()} className="self-end">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              {(['decision', 'focus_adjustment', 'next_step'] as const).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
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

          {/* Consolidated decisions grouped by sourceStep */}
          {groupedDecisions.length > 0 && (
            <div className="space-y-4">
              {groupedDecisions.map(({ step, label, items }) => (
                <div key={step} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                  </p>
                  {items.map((decision) => (
                    <DecisionCard
                      key={decision.id}
                      decision={decision}
                      onUpdate={handleUpdateDecision}
                      onRemove={handleRemoveDecision}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {decisions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum registro ainda. Adicione decisões, ajustes de foco ou próximos passos.
            </p>
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

      <WizardLastStepFooter
        onBack={onBack}
        onPrimary={onComplete}
        primaryDisabled={!allChecked}
      />
      {!allChecked && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          Complete o checklist para finalizar
        </p>
      )}
    </div>
  );
}
