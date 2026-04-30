/**
 * MilestoneScheduleContext — Painel exibido dentro do MilestoneDialog
 * mostrando os milestones já cadastrados do mesmo projeto, em formato
 * de lista, com destaque para conflitos de datas com o milestone em
 * edição/criação.
 *
 * Apenas UI/leitura — não dispara queries nem mutations.
 *
 * SSOT: docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md §Projetos
 *       mem://features/projects/holistic-module-architecture-v2
 */

import { memo, useMemo } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MilestoneStatus } from '../types';

export interface ScheduleMilestone {
  id: string;
  name: string;
  status: MilestoneStatus;
  start_date: string | null;
  due_date: string | null;
  owner_id?: string | null;
  notes?: string | null;
  deleted_at?: string | null;
}

interface MilestoneScheduleContextProps {
  milestones: ScheduleMilestone[];
  currentMilestoneId?: string;
  /** Datas digitadas no form (controladas pelo dialog). */
  previewStart?: string;
  previewDue?: string;
  previewName?: string;
  projectStartDate?: string | null;
  projectDueDate?: string | null;
}

function statusDotClass(status: MilestoneStatus): string {
  if (status === 'done') return 'bg-emerald-500';
  if (status === 'in_progress') return 'bg-emerald-500';
  return 'bg-stone-400';
}

function statusLabel(status: MilestoneStatus): string {
  if (status === 'done') return 'concluído';
  if (status === 'in_progress') return 'em andamento';
  return 'a fazer';
}

function isValidISO(d: string | null | undefined): d is string {
  return !!d && isValid(parseISO(d));
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export const MilestoneScheduleContext = memo(function MilestoneScheduleContext({
  milestones,
  currentMilestoneId,
  previewStart,
  previewDue,
}: MilestoneScheduleContextProps) {
  const sorted = useMemo(() => {
    return [...milestones]
      .filter((m) => !m.deleted_at)
      .sort((a, b) => (a.start_date ?? a.due_date ?? '').localeCompare(b.start_date ?? b.due_date ?? ''));
  }, [milestones]);

  const previewValid =
    isValidISO(previewStart) &&
    isValidISO(previewDue) &&
    (previewStart as string) <= (previewDue as string);

  const conflicts = useMemo(() => {
    if (!previewValid) return [] as ScheduleMilestone[];
    return sorted.filter((m) => {
      if (m.id === currentMilestoneId) return false;
      if (!isValidISO(m.start_date) || !isValidISO(m.due_date)) return false;
      return rangesOverlap(previewStart!, previewDue!, m.start_date, m.due_date);
    });
  }, [sorted, previewValid, previewStart, previewDue, currentMilestoneId]);

  const conflictIds = useMemo(() => new Set(conflicts.map((m) => m.id)), [conflicts]);

  if (sorted.length === 0) return null;

  return (
    <div className="min-w-0 space-y-2 overflow-hidden rounded-lg border bg-muted/20 p-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h4 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Milestones do projeto ({sorted.length})
        </h4>
      </div>

      <ScheduleList
        items={sorted}
        currentMilestoneId={currentMilestoneId}
        conflictIds={conflictIds}
      />

      {conflicts.length > 0 && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            As datas escolhidas se sobrepõem a:{' '}
            {conflicts
              .map(
                (m) =>
                  `${m.name} (${format(parseISO(m.start_date!), 'dd MMM', { locale: ptBR })} → ${format(parseISO(m.due_date!), 'dd MMM', { locale: ptBR })})`,
              )
              .join('; ')}
            .
          </span>
        </div>
      )}
    </div>
  );
});

interface ScheduleListProps {
  items: ScheduleMilestone[];
  currentMilestoneId?: string;
  conflictIds: Set<string>;
}

function ScheduleList({ items, currentMilestoneId, conflictIds }: ScheduleListProps) {
  return (
    <ul className="max-h-[200px] divide-y divide-border overflow-y-auto rounded-md border bg-card">
      {items.map((m) => {
        const isCurrent = m.id === currentMilestoneId;
        const isConflict = conflictIds.has(m.id);
        const hasDates = isValidISO(m.start_date) && isValidISO(m.due_date);
        return (
          <li
            key={m.id}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 text-xs',
              isCurrent && 'bg-muted',
              isConflict && 'text-amber-700 dark:text-amber-300',
            )}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass(m.status))} />
            <span className="flex-1 truncate font-medium text-foreground">
              {m.name}
              {isCurrent && <span className="ml-1 text-muted-foreground">(este)</span>}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {hasDates
                ? `${format(parseISO(m.start_date!), 'dd MMM', { locale: ptBR })} → ${format(parseISO(m.due_date!), 'dd MMM', { locale: ptBR })}`
                : 'sem datas'}
            </span>
            <span className="hidden shrink-0 text-muted-foreground sm:inline">
              {statusLabel(m.status)}
            </span>
            {isConflict && <AlertTriangle className="h-3 w-3 shrink-0" />}
          </li>
        );
      })}
    </ul>
  );
}
