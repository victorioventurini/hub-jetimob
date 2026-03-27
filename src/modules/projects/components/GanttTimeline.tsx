/**
 * GanttTimeline — Shared HTML/CSS timeline component for projects and milestones.
 * Replaces Recharts-based Gantt with a fully custom layout supporting:
 * health dots, bar labels, done checkmarks, today line, and footer legend.
 */

import { useMemo, useRef, useState, useEffect } from 'react';
import {
  format,
  differenceInDays,
  min as dateMin,
  max as dateMax,
  parseISO,
  addDays,
  isValid,
  startOfMonth,
  addMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { AlertCircle, Check } from 'lucide-react';
import type { GanttItem, ProjectHealth } from '../types';

/* ── Props ── */

interface GanttTimelineProps {
  items: GanttItem[];
  excludedCount: number;
  showLegend?: boolean;
  onItemClick?: (item: GanttItem) => void;
}

/* ── Color helpers ── */

function barColorClass(item: GanttItem): string {
  if (item.status === 'done') return 'bg-emerald-400 dark:bg-emerald-500';
  if (item.type === 'project' && item.health) {
    const map: Record<ProjectHealth, string> = {
      on_track: 'bg-emerald-400 dark:bg-emerald-500',
      at_risk: 'bg-amber-400 dark:bg-amber-500',
      late: 'bg-red-400 dark:bg-red-500',
    };
    return map[item.health];
  }
  // milestone or planned
  if (item.status === 'in_progress') return 'bg-emerald-400 dark:bg-emerald-500';
  return 'bg-stone-300 dark:bg-stone-600';
}

function healthDotClass(item: GanttItem): string {
  if (item.type === 'project' && item.health) {
    const map: Record<ProjectHealth, string> = {
      on_track: 'bg-emerald-500',
      at_risk: 'bg-amber-500',
      late: 'bg-red-500',
    };
    return map[item.health];
  }
  if (item.status === 'done') return 'bg-emerald-500';
  if (item.status === 'in_progress') return 'bg-emerald-500';
  return 'bg-stone-400';
}

/* ── Tooltip ── */

function GanttTooltip({ item, x, y }: { item: GanttItem; x: number; y: number }) {
  return (
    <div
      className="fixed z-50 bg-popover border rounded-md shadow-md p-3 text-sm space-y-1 pointer-events-none"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-medium text-popover-foreground">{item.name}</p>
      <p className="text-muted-foreground">
        {format(parseISO(item.start_date), 'dd/MM/yy')} → {format(parseISO(item.due_date), 'dd/MM/yy')}
      </p>
      {item.completion_pct !== undefined && (
        <p className="text-muted-foreground">{item.completion_pct}% concluído</p>
      )}
      {item.notes && (
        <p className="text-xs text-muted-foreground mt-1 max-w-xs whitespace-pre-wrap">{item.notes}</p>
      )}
    </div>
  );
}

/* ── Component ── */

export function GanttTimeline({ items, excludedCount, showLegend = true, onItemClick }: GanttTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ item: GanttItem; x: number; y: number } | null>(null);

  // Compute timeline range and months
  const { validItems, tlStart, tlEnd, totalDays, months, todayOffset } = useMemo(() => {
    const valid = items.filter((i) => {
      const s = parseISO(i.start_date);
      const e = parseISO(i.due_date);
      return isValid(s) && isValid(e);
    });

    if (!valid.length) {
      return { validItems: valid, tlStart: new Date(), tlEnd: new Date(), totalDays: 0, months: [], todayOffset: -1 };
    }

    const allStarts = valid.map((i) => parseISO(i.start_date));
    const allEnds = valid.map((i) => parseISO(i.due_date));
    const tlStart = addDays(dateMin(allStarts), -7);
    const tlEnd = addDays(dateMax(allEnds), 14);
    const totalDays = Math.max(differenceInDays(tlEnd, tlStart), 1);

    // Month markers
    const months: { label: string; leftPct: number; widthPct: number }[] = [];
    let cursor = startOfMonth(tlStart);
    while (cursor <= tlEnd) {
      const nextMonth = addMonths(cursor, 1);
      const mStart = cursor < tlStart ? tlStart : cursor;
      const mEnd = nextMonth > tlEnd ? tlEnd : nextMonth;
      const leftPct = (differenceInDays(mStart, tlStart) / totalDays) * 100;
      const widthPct = (differenceInDays(mEnd, mStart) / totalDays) * 100;
      months.push({
        label: format(cursor, 'MMM', { locale: ptBR }),
        leftPct,
        widthPct,
      });
      cursor = nextMonth;
    }

    const today = new Date();
    const todayOff = differenceInDays(today, tlStart);
    const todayOffset = todayOff >= 0 && todayOff <= totalDays ? (todayOff / totalDays) * 100 : -1;

    return { validItems: valid, tlStart, tlEnd, totalDays, months, todayOffset };
  }, [items]);

  if (!validItems.length) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-muted-foreground">Nenhum item com datas definidas para exibir.</p>
        {excludedCount > 0 && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            {excludedCount} item(ns) sem datas foram omitidos.
          </p>
        )}
      </div>
    );
  }

  const NAME_COL = 'minmax(160px, 240px)';

  return (
    <div className="space-y-2">
      {excludedCount > 0 && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          {excludedCount} item(ns) sem datas foram omitidos.
        </p>
      )}

      <div ref={containerRef} className="overflow-x-auto rounded-lg border bg-card">
        <div style={{ minWidth: 700 }}>
          {/* Header */}
          <div
            className="grid border-b bg-muted/40"
            style={{ gridTemplateColumns: `${NAME_COL} 1fr` }}
          >
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Projeto / Milestone
            </div>
            <div className="relative py-2">
              {months.map((m, i) => (
                <span
                  key={i}
                  className="absolute text-xs text-muted-foreground font-medium"
                  style={{ left: `${m.leftPct}%`, top: '50%', transform: 'translateY(-50%)' }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div className="relative">
            {/* Today line */}
            {todayOffset >= 0 && (
              <div
                className="absolute top-0 bottom-0 z-10 pointer-events-none"
                style={{ left: `calc(${NAME_COL.includes('240') ? '240px' : '160px'})` }}
              >
                {/* We need the today line relative to the bar area */}
              </div>
            )}

            {validItems.map((item, idx) => {
              const s = parseISO(item.start_date);
              const e = parseISO(item.due_date);
              const leftPct = (differenceInDays(s, tlStart) / totalDays) * 100;
              const widthPct = Math.max((differenceInDays(e, s) / totalDays) * 100, 1);
              const isDone = item.status === 'done';
              const isMilestone = item.type === 'milestone';

              return (
                <div
                  key={item.id}
                  className={cn(
                    'grid items-center border-b last:border-b-0 transition-colors',
                    onItemClick && 'hover:bg-muted/30 cursor-pointer',
                  )}
                  style={{ gridTemplateColumns: `${NAME_COL} 1fr`, minHeight: 40 }}
                  onClick={() => onItemClick?.(item)}
                  onMouseMove={(e) => setTooltip({ item, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Name column */}
                  <div className={cn('flex items-center gap-2 px-3 py-1.5 min-w-0', isMilestone && 'pl-7')}>
                    <span className={cn('w-2 h-2 rounded-full shrink-0', healthDotClass(item))} />
                    <span className="text-sm truncate text-foreground">
                      {item.name}
                    </span>
                  </div>

                  {/* Bar area */}
                  <div className="relative h-7 mx-2">
                    {/* Month grid lines */}
                    {idx === 0 && null /* rendered once via absolute */}

                    {/* Bar */}
                    <div
                      className={cn(
                        'absolute top-0.5 bottom-0.5 rounded-md flex items-center overflow-hidden transition-all',
                        barColorClass(item),
                        isMilestone ? 'opacity-80' : 'opacity-90',
                      )}
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        minWidth: 20,
                      }}
                    >
                      <span className="px-2 text-xs font-medium text-white truncate flex items-center gap-1">
                        {isDone && <Check className="h-3 w-3 shrink-0" />}
                        {item.name}
                      </span>
                    </div>

                    {/* Today line (per row) */}
                    {todayOffset >= 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none"
                        style={{ left: `${todayOffset}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="flex flex-wrap items-center gap-4 px-3 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">
              {todayOffset >= 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-px h-3 bg-primary" />
                  Hoje ({format(new Date(), 'dd MMM', { locale: ptBR })})
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> No prazo
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Em risco
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Atrasado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-400" /> Planejado
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Floating tooltip */}
      {tooltip && <GanttTooltip item={tooltip.item} x={tooltip.x} y={tooltip.y} />}
    </div>
  );
}
