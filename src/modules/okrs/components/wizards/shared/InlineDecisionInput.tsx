/**
 * InlineDecisionInput - Componente compacto para registrar decisões em qualquer step do wizard
 * 
 * Colapsável por padrão, exibe badge com contagem quando há registros.
 * Filtra e exibe somente decisions com sourceStep correspondente.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TextareaAutoSubmit } from '@/components/ui/textarea-auto-submit';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, X, ChevronDown, Lightbulb, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface InlineDecisionInputProps {
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  sourceStep: string;
  placeholder?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_CONFIG = {
  decision: { label: 'Decisão', icon: Lightbulb, color: 'bg-status-blue-muted text-status-blue' },
  focus_adjustment: { label: 'Ajuste de Foco', icon: Target, color: 'bg-status-purple-muted text-status-purple' },
  next_step: { label: 'Próximo Passo', icon: CheckCircle2, color: 'bg-status-green-muted text-status-green' },
} as const;

// ============================================================
// COMPONENT
// ============================================================

export function InlineDecisionInput({
  decisions,
  onDecisionsChange,
  sourceStep,
  placeholder = 'Registrar decisão, ajuste de foco ou próximo passo...',
}: InlineDecisionInputProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<TeamCheckinDecision['category']>('decision');

  // Filter decisions for this step
  const stepDecisions = decisions.filter(d => d.sourceStep === sourceStep);

  const handleAdd = () => {
    if (!text.trim()) return;

    const newDecision: TeamCheckinDecision = {
      id: `decision-${Date.now()}`,
      text: text.trim(),
      category,
      sourceStep: sourceStep as TeamCheckinDecision['sourceStep'],
    };

    onDecisionsChange([...decisions, newDecision]);
    setText('');
  };

  const handleRemove = (id: string) => {
    onDecisionsChange(decisions.filter(d => d.id !== id));
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground min-w-0"
        >
          <span className="flex items-center gap-2 text-xs min-w-0 flex-1">
            <Lightbulb className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Registrar nota / decisão</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            {stepDecisions.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {stepDecisions.length}
              </Badge>
            )}
            <ChevronDown className={cn(
              "h-3.5 w-3.5 transition-transform",
              isOpen && "rotate-180"
            )} />
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-3">
          {/* Category selector */}
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {(Object.entries(CATEGORY_CONFIG) as [TeamCheckinDecision['category'], typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][]).map(([cat, config]) => (
              <Badge
                key={cat}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors text-xs shrink-0",
                  category === cat && config.color
                )}
                onClick={() => setCategory(cat)}
              >
                {config.label}
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <TextareaAutoSubmit
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="text-sm"
              onSubmit={() => handleAdd()}
              minRows={1}
              maxRows={3}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 flex-shrink-0 self-end"
              onClick={handleAdd}
              disabled={!text.trim()}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Step decisions list */}
          {stepDecisions.length > 0 && (
            <div className="space-y-1.5">
              {stepDecisions.map((decision) => {
                const config = CATEGORY_CONFIG[decision.category];
                const Icon = config.icon;

                return (
                  <div
                    key={decision.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm min-w-0 max-w-full"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{decision.text}</span>
                    <Badge variant="secondary" className={cn("text-[10px] h-4 px-1 shrink-0", config.color)}>
                      {config.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => handleRemove(decision.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
