/**
 * MilestoneGanttChart — Timeline horizontal dos milestones de um projeto
 */

import { useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { format, differenceInDays, min as dateMin, max as dateMax, parseISO, addDays, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ProjectMilestone, MilestoneStatus } from '../types';
import { AlertCircle } from 'lucide-react';

interface MilestoneGanttChartProps {
  milestones: ProjectMilestone[];
  projectStartDate?: string | null;
  projectDueDate?: string | null;
}

function getStatusColor(status: MilestoneStatus, isOverdue: boolean): string {
  if (isOverdue && status !== 'done') return 'hsl(var(--destructive))';
  const map: Record<MilestoneStatus, string> = {
    todo: 'hsl(var(--muted-foreground))',
    in_progress: 'hsl(var(--primary))',
    done: 'hsl(var(--success, 142 71% 45%))',
  };
  return map[status];
}

function statusLabel(status: MilestoneStatus): string {
  const map: Record<MilestoneStatus, string> = {
    todo: 'A fazer',
    in_progress: 'Em andamento',
    done: 'Concluído',
  };
  return map[status];
}

interface ChartDatum {
  name: string;
  startOffset: number;
  duration: number;
  milestone: ProjectMilestone;
  isOverdue: boolean;
}

export function MilestoneGanttChart({ milestones, projectStartDate, projectDueDate }: MilestoneGanttChartProps) {
  const activeMilestones = useMemo(
    () => milestones.filter((m) => !m.deleted_at && m.due_date),
    [milestones]
  );

  const { data, timelineStart, totalDays, todayOffset } = useMemo(() => {
    if (!activeMilestones.length)
      return { data: [], timelineStart: new Date(), totalDays: 0, todayOffset: 0 };

    const allStarts = activeMilestones.map((m) => parseISO(m.created_at));
    const allEnds = activeMilestones.map((m) => parseISO(m.due_date!));

    if (projectStartDate) allStarts.push(parseISO(projectStartDate));
    if (projectDueDate) allEnds.push(parseISO(projectDueDate));

    const tlStart = addDays(dateMin(allStarts), -7);
    const tlEnd = addDays(dateMax(allEnds), 7);
    const totalDays = differenceInDays(tlEnd, tlStart);
    const today = new Date();
    const todayOffset = differenceInDays(today, tlStart);

    const sorted = [...activeMilestones].sort(
      (a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || a.created_at.localeCompare(b.created_at)
    );

    const data: ChartDatum[] = sorted.map((m) => {
      const s = parseISO(m.created_at);
      const e = parseISO(m.due_date!);
      const isOverdue = m.status !== 'done' && e < today;

      return {
        name: m.name,
        startOffset: differenceInDays(s, tlStart),
        duration: Math.max(differenceInDays(e, s), 1),
        milestone: m,
        isOverdue,
      };
    });

    return { data, timelineStart: tlStart, totalDays, todayOffset };
  }, [activeMilestones, projectStartDate, projectDueDate]);

  if (!activeMilestones.length) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          Nenhum milestone com data de entrega para exibir.
        </p>
      </div>
    );
  }

  const barHeight = 24;
  const chartHeight = Math.max(data.length * (barHeight + 8) + 60, 160);

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div style={{ minWidth: Math.max(500, totalDays * 3) }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 12, right: 20, bottom: 12, left: 0 }}
            barSize={barHeight}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              domain={[0, totalDays]}
              tickFormatter={(val: number) => {
                const d = addDays(timelineStart, val);
                return format(d, 'dd MMM', { locale: ptBR });
              }}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const datum = payload[0]?.payload as ChartDatum;
                if (!datum?.milestone) return null;
                const { milestone: m } = datum;
                return (
                  <div className="bg-popover border rounded-md shadow-md p-3 text-sm space-y-1">
                    <p className="font-medium text-popover-foreground">{m.name}</p>
                    <p className="text-muted-foreground">
                      Entrega: {format(parseISO(m.due_date!), 'dd/MM/yyyy')}
                    </p>
                    <p className="text-muted-foreground">Status: {statusLabel(m.status)}</p>
                    {datum.isOverdue && (
                      <p className="text-destructive text-xs font-medium">⚠ Atrasado</p>
                    )}
                  </div>
                );
              }}
            />
            {/* Today line */}
            {todayOffset > 0 && todayOffset < totalDays && (
              <ReferenceLine
                x={todayOffset}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: 'Hoje',
                  position: 'top',
                  fill: 'hsl(var(--primary))',
                  fontSize: 10,
                }}
              />
            )}
            <Bar dataKey="startOffset" stackId="gantt" fill="transparent" isAnimationActive={false} />
            <Bar
              dataKey="duration"
              stackId="gantt"
              radius={[4, 4, 4, 4]}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={getStatusColor(entry.milestone.status, entry.isOverdue)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
