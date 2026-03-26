import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProjectMilestone, MilestoneStatus } from '../types';

interface MilestoneListProps {
  milestones: ProjectMilestone[];
  onStatusChange?: (milestoneId: string, status: MilestoneStatus) => void;
  compact?: boolean;
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

export function MilestoneList({ milestones, onStatusChange, compact }: MilestoneListProps) {
  if (milestones.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">Nenhum milestone cadastrado.</p>
    );
  }

  return (
    <ul className="space-y-1">
      {milestones
        .filter((m) => !m.deleted_at)
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || (a.created_at ?? '').localeCompare(b.created_at ?? ''))
        .map((m) => (
          <li
            key={m.id}
            className={cn(
              'flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors',
              compact && 'py-1',
            )}
          >
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
            {m.due_date && (
              <span className="text-xs text-muted-foreground shrink-0">
                {format(parseISO(m.due_date), "dd MMM", { locale: ptBR })}
              </span>
            )}
          </li>
        ))}
    </ul>
  );
}
