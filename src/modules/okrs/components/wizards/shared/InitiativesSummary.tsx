/**
 * InitiativesSummary - Resumo de iniciativas vinculadas a KRs
 * 
 * Exibe iniciativas linkadas com destaque para:
 * - Iniciativas bloqueadas
 * - Iniciativas atrasadas
 * - Iniciativas recém-iniciadas
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Play,
  Ban,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Initiative, InitiativeStatus } from '@/modules/okrs/types/initiative';

// ============================================================
// TYPES
// ============================================================

export interface InitiativesSummaryProps {
  initiatives: Initiative[];
  onMarkAtRisk?: (initiativeId: string, atRisk: boolean) => void;
  onAddComment?: (initiativeId: string, comment: string) => void;
  markedAtRisk?: string[];
  className?: string;
  editable?: boolean;
}

// ============================================================
// HELPERS
// ============================================================

const STATUS_CONFIG: Record<InitiativeStatus, {
  label: string;
  icon: typeof Play;
  className: string;
  highlight?: boolean;
}> = {
  planned: {
    label: 'Planejada',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  },
  in_progress: {
    label: 'Em andamento',
    icon: Play,
    className: 'bg-primary/10 text-primary',
  },
  blocked: {
    label: 'Bloqueada',
    icon: Ban,
    className: 'bg-danger-muted text-danger-muted-foreground',
    highlight: true,
  },
  completed: {
    label: 'Concluída',
    icon: CheckCircle2,
    className: 'bg-success-muted text-success-muted-foreground',
  },
};

function isOverdue(initiative: Initiative): boolean {
  if (!initiative.expected_end_date) return false;
  if (initiative.status === 'completed') return false;
  return new Date(initiative.expected_end_date) < new Date();
}

function isRecentlyStarted(initiative: Initiative): boolean {
  if (initiative.status !== 'in_progress') return false;
  if (!initiative.start_date) return false;
  const daysSinceStart = Math.floor(
    (Date.now() - new Date(initiative.start_date).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceStart <= 7;
}

// ============================================================
// COMPONENT
// ============================================================

export function InitiativesSummary({
  initiatives,
  onMarkAtRisk,
  onAddComment,
  markedAtRisk = [],
  className,
  editable = false,
}: InitiativesSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expandedInitiative, setExpandedInitiative] = useState<string | null>(null);

  if (initiatives.length === 0) {
    return (
      <div className={cn("rounded-lg border bg-muted/30 p-4", className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          <span className="text-sm">Nenhuma iniciativa vinculada a este KR</span>
        </div>
      </div>
    );
  }

  // Categorize initiatives
  const blockedInitiatives = initiatives.filter(i => i.status === 'blocked');
  const overdue = initiatives.filter(i => isOverdue(i));
  const recentlyStarted = initiatives.filter(i => isRecentlyStarted(i));
  const needsAttention = [...new Set([...blockedInitiatives, ...overdue])];

  const handleCommentChange = (id: string, comment: string) => {
    setComments(prev => ({ ...prev, [id]: comment }));
    onAddComment?.(id, comment);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className={cn("rounded-lg border bg-card", className)}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full p-4 text-left">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Iniciativas</span>
              <Badge variant="secondary" className="text-xs">
                {initiatives.length}
              </Badge>
              {needsAttention.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {needsAttention.length} atenção
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {/* Attention section */}
            {needsAttention.length > 0 && (
              <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20">
                <p className="text-xs font-medium text-destructive mb-2">
                  ⚠️ Iniciativas que merecem atenção:
                </p>
                <ul className="space-y-1.5">
                    {needsAttention.map(init => (
                    <li key={init.id} className="text-xs">
                      <span className="font-medium">{init.name}</span>
                      {init.status === 'blocked' && (
                        <span className="text-danger ml-1">
                          (bloqueada)
                        </span>
                      )}
                      {isOverdue(init) && (
                        <span className="text-destructive ml-1">(atrasada)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recently started */}
            {recentlyStarted.length > 0 && (
              <div className="p-3 rounded-md bg-status-green-muted border border-status-green/30">
                <p className="text-xs font-medium text-status-green mb-2">
                  🚀 Iniciadas recentemente:
                </p>
                <ul className="space-y-1">
                  {recentlyStarted.map(init => (
                    <li key={init.id} className="text-xs">{init.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* All initiatives list */}
            <div className="space-y-2">
              {initiatives.map(init => {
                const config = STATUS_CONFIG[init.status];
                const StatusIcon = config.icon;
                const isAtRisk = markedAtRisk.includes(init.id);
                const isItemExpanded = expandedInitiative === init.id;

                return (
                  <div 
                    key={init.id}
                    className={cn(
                      "rounded-md border p-3 transition-colors",
                      config.highlight && "border-destructive/30 bg-destructive/5",
                      isAtRisk && "border-destructive/50 bg-destructive/5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {editable && (
                        <Checkbox
                          checked={isAtRisk}
                          onCheckedChange={(checked) => 
                            onMarkAtRisk?.(init.id, checked === true)
                          }
                          className="mt-0.5"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {init.name}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={cn("text-xs flex-shrink-0", config.className)}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          {isOverdue(init) && (
                            <Badge variant="destructive" className="text-xs">
                              Atrasada
                            </Badge>
                          )}
                        </div>
                        
                        {init.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {init.description}
                          </p>
                        )}

                        {/* Progress */}
                        {init.progress !== undefined && init.progress !== null && init.progress > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${init.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {init.progress}%
                            </span>
                          </div>
                        )}
                      </div>

                      {editable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setExpandedInitiative(isItemExpanded ? null : init.id)}
                        >
                          {isItemExpanded ? 'Menos' : 'Comentar'}
                        </Button>
                      )}
                    </div>

                    {/* Comment section */}
                    {editable && isItemExpanded && (
                      <div className="mt-3 pt-3 border-t">
                        <Textarea
                          value={comments[init.id] || ''}
                          onChange={(e) => handleCommentChange(init.id, e.target.value)}
                          placeholder="Adicionar comentário sobre esta iniciativa..."
                          className="min-h-[60px] text-sm resize-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Question prompt */}
            {editable && (
              <p className="text-xs text-muted-foreground italic text-center pt-2">
                Alguma iniciativa merece atenção do time ou do líder na próxima reunião?
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
