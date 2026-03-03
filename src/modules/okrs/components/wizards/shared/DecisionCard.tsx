/**
 * DecisionCard - Componente compartilhado para exibição/edição de decisões
 * 
 * Usado por MbrDecisionsStep e TeamDecisionsStep.
 * Suporta: edição inline, reclassificação, owner (BuUserSelect) e deadline (Calendar).
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { TextareaAutoSubmit } from '@/components/ui/textarea-auto-submit';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BuUserSelect } from '@/components/selects';
import {
  Lightbulb, Target, CheckCircle2, X, Pencil, Check,
  CalendarIcon, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const CATEGORY_CONFIG = {
  decision: { label: 'Decisão', icon: Lightbulb, color: 'bg-status-blue-muted text-status-blue' },
  focus_adjustment: { label: 'Ajuste de Foco', icon: Target, color: 'bg-status-purple-muted text-status-purple' },
  next_step: { label: 'Próximo Passo', icon: CheckCircle2, color: 'bg-status-green-muted text-status-green' },
} as const;

const CATEGORIES = ['decision', 'focus_adjustment', 'next_step'] as const;

// ============================================================
// TYPES
// ============================================================

export interface DecisionCardProps {
  decision: TeamCheckinDecision;
  onUpdate: (id: string, updates: Partial<TeamCheckinDecision>) => void;
  onRemove: (id: string) => void;
  /** Show category reclassification badges (MBR uses this) */
  showReclassify?: boolean;
  /** Show owner and deadline fields (default: true) */
  showOwnerDeadline?: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export function DecisionCard({
  decision,
  onUpdate,
  onRemove,
  showReclassify = false,
  showOwnerDeadline = true,
}: DecisionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(decision.text);
  const config = CATEGORY_CONFIG[decision.category];
  const Icon = config.icon;

  const handleSave = () => {
    if (editText.trim()) onUpdate(decision.id, { text: editText.trim() });
    setIsEditing(false);
  };

  const deadlineDate = decision.deadline ? parseISO(decision.deadline) : undefined;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <Icon className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Text row */}
            {isEditing ? (
              <div className="flex gap-2">
                <TextareaAutoSubmit
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="text-sm"
                  autoFocus
                  onSubmit={handleSave}
                  minRows={1}
                  maxRows={4}
                  onKeyDownCapture={(e) => { if (e.key === 'Escape') setIsEditing(false); }}
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 self-end" onClick={handleSave}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-sm">{decision.text}</p>
            )}

            {/* Category badge (non-reclassify mode) */}
            {!showReclassify && (
              <Badge variant="secondary" className={cn('text-xs', config.color)}>
                {config.label}
              </Badge>
            )}

            {/* Category reclassification badges */}
            {showReclassify && (
              <div className="flex gap-1">
                {CATEGORIES.map((cat) => {
                  const c = CATEGORY_CONFIG[cat];
                  return (
                    <Badge
                      key={cat}
                      variant="outline"
                      className={cn(
                        'text-[10px] h-5 px-1.5 cursor-pointer transition-colors',
                        decision.category === cat && c.color
                      )}
                      onClick={() => onUpdate(decision.id, { category: cat })}
                    >
                      {c.label}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Owner + Deadline row */}
            {showOwnerDeadline && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Owner */}
                <div className="w-[180px]">
                  <BuUserSelect
                    value={decision.owner?.id}
                    onValueChange={() => {
                      // handled by onUserSelected
                    }}
                    onUserSelected={(user) => {
                      if (user) {
                        onUpdate(decision.id, { owner: { id: user.id, name: user.displayName } });
                      } else {
                        onUpdate(decision.id, { owner: undefined });
                      }
                    }}
                    placeholder="Responsável"
                    allowNone
                    noneLabel="Sem responsável"
                    showSearch
                    showBadges={false}
                    className="h-8 text-xs"
                  />
                </div>

                {/* Deadline */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-8 px-2.5 text-xs font-normal gap-1.5',
                        !decision.deadline && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {deadlineDate
                        ? format(deadlineDate, 'dd/MM', { locale: ptBR })
                        : 'Prazo'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadlineDate}
                      onSelect={(date) => {
                        onUpdate(decision.id, {
                          deadline: date ? date.toISOString() : null,
                        });
                      }}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>

                {/* Pending indicators */}
                {!decision.owner && !decision.deadline && (
                  <span className="text-[10px] text-muted-foreground italic">
                    Pendente
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isEditing && (
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => { setEditText(decision.text); setIsEditing(true); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
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
