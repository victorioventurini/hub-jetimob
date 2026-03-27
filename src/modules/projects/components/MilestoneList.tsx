import { useState } from 'react';
import { CheckCircle2, Circle, Clock, ChevronRight, CalendarIcon, User, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isPast, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ProjectMilestone, MilestoneStatus } from '../types';
import { MilestoneKrLinkSection } from './MilestoneKrLinkSection';

interface MilestoneListProps {
  milestones: ProjectMilestone[];
  projectId: string;
  onStatusChange?: (milestoneId: string, status: MilestoneStatus) => void;
  onUpdate?: (milestoneId: string, updates: { due_date?: string | null; owner_id?: string | null }) => void;
  onDelete?: (milestoneId: string) => void;
  canEditKrLinks?: boolean;
  canEdit?: boolean;
  compact?: boolean;
  /** Map of owner_id → { display_name, photo_url } for displaying avatars */
  ownerProfiles?: Record<string, { display_name: string | null; photo_url: string | null }>;
}

const statusIcon: Record<MilestoneStatus, React.ReactNode> = {
  todo: <Circle className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Clock className="h-4 w-4 text-blue-500" />,
  done: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
};

const nextStatus: Record<MilestoneStatus, MilestoneStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

export function MilestoneList({
  milestones, projectId, onStatusChange, onUpdate, onDelete,
  canEditKrLinks, canEdit, compact, ownerProfiles,
}: MilestoneListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (milestones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">Nenhum milestone cadastrado.</p>
    );
  }

  const sorted = milestones
    .filter((m) => !m.deleted_at)
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || (a.created_at ?? '').localeCompare(b.created_at ?? ''));

  return (
    <ul className="space-y-1">
      {sorted.map((m) => {
        const isExpanded = expandedId === m.id;
        const ownerProfile = m.owner_id ? ownerProfiles?.[m.owner_id] : null;
        const isOverdue = m.due_date && m.status !== 'done' && isPast(parseISO(m.due_date));

        return (
          <li key={m.id}>
            <div
              className={cn(
                'flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors',
                compact && 'py-1',
              )}
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-90')} />
              </button>

              <button
                type="button"
                onClick={() => onStatusChange?.(m.id, nextStatus[m.status])}
                className="shrink-0"
                disabled={!onStatusChange}
              >
                {statusIcon[m.status]}
              </button>

              <span className={cn(
                'text-sm flex-1 truncate',
                m.status === 'done' && 'line-through text-muted-foreground',
              )}>
                {m.name}
              </span>

              {/* Owner avatar */}
              {ownerProfile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={ownerProfile.photo_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">
                        {(ownerProfile.display_name ?? '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {ownerProfile.display_name ?? 'Responsável'}
                  </TooltipContent>
                </Tooltip>
              )}

              {m.due_date && (
                <span className={cn(
                  'text-xs shrink-0',
                  isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
                )}>
                  {format(parseISO(m.due_date), "dd MMM", { locale: ptBR })}
                </span>
              )}
            </div>

            {isExpanded && (
              <div className="ml-8 pl-2 border-l border-border space-y-3 py-2">
                {/* Inline editing for due_date and owner */}
                {canEdit && onUpdate && (
                  <div className="flex gap-2 flex-wrap items-center">
                    {/* Due date inline edit */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            'h-7 text-xs justify-start',
                            !m.due_date && 'text-muted-foreground',
                            isOverdue && 'border-destructive/50 text-destructive',
                          )}
                        >
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {m.due_date
                            ? format(parseISO(m.due_date), "dd MMM yyyy", { locale: ptBR })
                            : 'Definir prazo'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={m.due_date ? parseISO(m.due_date) : undefined}
                          onSelect={(date) => {
                            onUpdate(m.id, {
                              due_date: date ? date.toISOString().split('T')[0] : null,
                            });
                          }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Owner inline edit */}
                    <div className="min-w-[180px]">
                      <BuUserSelect
                        value={m.owner_id ?? undefined}
                        onValueChange={(v) => onUpdate(m.id, { owner_id: v })}
                        placeholder="Responsável"
                        allowNone
                        noneLabel="Sem responsável"
                      />
                    </div>

                    {/* Delete button */}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => onDelete(m.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}

                {/* KR links */}
                <MilestoneKrLinkSection
                  milestoneId={m.id}
                  projectId={projectId}
                  canEdit={canEditKrLinks ?? false}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
