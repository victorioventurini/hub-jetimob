/**
 * MilestoneScheduleContext — Painel exibido dentro do MilestoneDialog
 * mostrando os milestones já cadastrados do mesmo projeto, com toggle
 * Lista/Gantt e preview reativo do milestone em edição/criação.
 *
 * Apenas UI/leitura — não dispara queries nem mutations.
 *
 * SSOT: docs/canonical/TECHNICAL_CONTEXT_REGISTRY.md §Projetos
 *       mem://features/projects/holistic-module-architecture-v2
 */

import { memo, useMemo, useState } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GanttTimeline } from './GanttTimeline';
import { ProjectViewToggle, type ProjectViewMode } from './ProjectViewToggle';
import type { GanttItem, MilestoneStatus } from '../types';

const PREVIEW_ID = '__preview__';

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
  previewName,
}: MilestoneScheduleContextProps) {
  const [viewMode, setViewMode] = useState<ProjectViewMode>('gantt');

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

  const ganttItems = useMemo<GanttItem[]>(() => {
    const items: GanttItem[] = [];
    let excludedCount = 0;

    for (const m of sorted) {
      // O próprio milestone (em edição) é substituído pelo preview, se houver.
      if (m.id === currentMilestoneId && previewValid) continue;
      if (!isValidISO(m.start_date) || !isValidISO(m.due_date)) {
        excludedCount++;
        continue;
      }
      items.push({
        id: m.id,
        type: 'milestone',
        name: m.id === currentMilestoneId ? `${m.name} (este)` : m.name,
        start_date: m.start_date,
        due_date: m.due_date,
        status: m.status,
        owner_id: m.owner_id ?? undefined,
        notes: m.notes ?? null,
      });
    }

    if (previewValid) {
      items.push({
        id: PREVIEW_ID,
        type: 'milestone',
        name: `${previewName?.trim() || 'Novo milestone'} (prévia)`,
        start_date: previewStart!,
        due_date: previewDue!,
        status: 'planned' as MilestoneStatus,
        owner_id: undefined,
        notes: null,
      });
    }

    return items;
    // excludedCount intencionalmente ignorado no painel (UX enxuta).
  }, [sorted, currentMilestoneId, previewValid, previewStart, previewDue, previewName]);

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Milestones do projeto ({sorted.length})
        </h4>
        <div className="hidden sm:block">
          <ProjectViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Mobile: sempre lista. Desktop: respeita o toggle. */}
      <div className="sm:hidden">
        <ScheduleList
          items={sorted}
          currentMilestoneId={currentMilestoneId}
          conflictIds={conflictIds}
        />
      </div>
      <div className="hidden sm:block">
        {viewMode === 'gantt' ? (
          <div className="max-h-[200px] overflow-y-auto">
            <GanttTimeline items={ganttItems} excludedCount={0} showLegend={false} />
          </div>
        ) : (
          <ScheduleList
            items={sorted}
            currentMilestoneId={currentMilestoneId}
            conflictIds={conflictIds}
          />
        )}
      </div>

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
