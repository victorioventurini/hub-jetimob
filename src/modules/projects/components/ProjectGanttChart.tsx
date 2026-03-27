/**
 * ProjectGanttChart — Timeline horizontal de projetos e milestones
 */

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, differenceInDays, min as dateMin, max as dateMax, parseISO, addDays, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GanttItem, ProjectHealth, ProjectStatus, MilestoneStatus } from '../types';
import { AlertCircle } from 'lucide-react';

interface ProjectGanttChartProps {
  items: GanttItem[];
  excludedCount: number;
}

// Status/health → color mapping using CSS variables
function getBarColor(item: GanttItem): string {
  if (item.type === 'project' && item.health) {
    const healthColors: Record<ProjectHealth, string> = {
      on_track: 'hsl(var(--success, 142 71% 45%))',
      at_risk: 'hsl(var(--warning, 38 92% 50%))',
      late: 'hsl(var(--destructive))',
    };
    return healthColors[item.health];
  }

  const statusColors: Record<string, string> = {
    planned: 'hsl(var(--muted-foreground))',
    todo: 'hsl(var(--muted-foreground))',
    in_progress: 'hsl(var(--primary))',
    paused: 'hsl(var(--warning, 38 92% 50%))',
    done: 'hsl(var(--success, 142 71% 45%))',
    cancelled: 'hsl(var(--muted-foreground) / 0.5)',
  };
  return statusColors[item.status] || 'hsl(var(--primary))';
}

function statusLabel(status: ProjectStatus | MilestoneStatus): string {
  const map: Record<string, string> = {
    planned: 'Planejado',
    todo: 'A fazer',
    in_progress: 'Em andamento',
    paused: 'Pausado',
    done: 'Concluído',
    cancelled: 'Cancelado',
  };
  return map[status] || status;
}

function healthLabel(health: ProjectHealth): string {
  const map: Record<ProjectHealth, string> = {
    on_track: 'No prazo',
    at_risk: 'Em risco',
    late: 'Atrasado',
  };
  return map[health];
}

interface ChartDatum {
  name: string;
  startOffset: number;
  duration: number;
  item: GanttItem;
}

export function ProjectGanttChart({ items, excludedCount }: ProjectGanttChartProps) {
  const navigate = useNavigate();
  const [containerWidth, setContainerWidth] = useState(0);
  const isMobile = containerWidth > 0 && containerWidth < 640;

  const { data, timelineStart, timelineEnd, monthTicks } = useMemo(() => {
    // Filter out items with invalid dates defensively
    const validItems = items.filter((i) => {
      const s = parseISO(i.start_date);
      const e = parseISO(i.due_date);
      return isValid(s) && isValid(e);
    });

    if (!validItems.length) return { data: [], timelineStart: new Date(), timelineEnd: new Date(), monthTicks: [] };

    const allStarts = validItems.map((i) => parseISO(i.start_date));
    const allEnds = validItems.map((i) => parseISO(i.due_date));

    const tlStart = addDays(dateMin(allStarts), -7);
    const tlEnd = addDays(dateMax(allEnds), 7);
    const totalDays = differenceInDays(tlEnd, tlStart);

    const data: ChartDatum[] = validItems.map((item) => {
      const s = parseISO(item.start_date);
      const e = parseISO(item.due_date);
      const startOffset = differenceInDays(s, tlStart);
      const duration = Math.max(differenceInDays(e, s), 1);
      const prefix = item.type === 'milestone' ? '  ▸ ' : '';

      return {
        name: `${prefix}${item.name}`,
        startOffset,
        duration,
        item,
      };
    });

    // Month ticks for X axis
    const ticks: number[] = [];
    let cursor = new Date(tlStart.getFullYear(), tlStart.getMonth(), 1);
    while (cursor <= tlEnd) {
      const dayOffset = differenceInDays(cursor, tlStart);
      if (dayOffset >= 0) ticks.push(dayOffset);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return { data, timelineStart: tlStart, timelineEnd: tlEnd, monthTicks: ticks };
  }, [items]);

  const handleBarClick = useCallback(
    (datum: ChartDatum) => {
      const projectId = datum.item.type === 'project' ? datum.item.id : datum.item.parent_id;
      if (projectId) navigate(`/projects/${projectId}`);
    },
    [navigate]
  );

  if (!items.length) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-muted-foreground">Nenhum projeto com datas definidas para exibir no Gantt.</p>
        {excludedCount > 0 && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            {excludedCount} projeto(s) sem datas de início/fim foram omitidos.
          </p>
        )}
      </div>
    );
  }

  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const barHeight = 28;
  const chartHeight = Math.max(data.length * (barHeight + 8) + 60, 200);

  return (
    <div className="space-y-2">
      {excludedCount > 0 && (
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          {excludedCount} projeto(s) sem datas foram omitidos do Gantt.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card">
        <div style={{ minWidth: Math.max(800, totalDays * 4) }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 16, right: 24, bottom: 16, left: 0 }}
              barSize={barHeight}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                domain={[0, totalDays]}
                ticks={monthTicks}
                tickFormatter={(val: number) => {
                  const d = addDays(timelineStart, val);
                  return format(d, 'MMM yy', { locale: ptBR });
                }}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={200}
                tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const datum = payload[0]?.payload as ChartDatum;
                  if (!datum?.item) return null;
                  const { item } = datum;
                  return (
                    <div className="bg-popover border rounded-md shadow-md p-3 text-sm space-y-1">
                      <p className="font-medium text-popover-foreground">{item.name}</p>
                      <p className="text-muted-foreground">
                        {format(parseISO(item.start_date), 'dd/MM/yy')} → {format(parseISO(item.due_date), 'dd/MM/yy')}
                      </p>
                      <p className="text-muted-foreground">Status: {statusLabel(item.status)}</p>
                      {item.health && (
                        <p className="text-muted-foreground">Saúde: {healthLabel(item.health)}</p>
                      )}
                    </div>
                  );
                }}
              />
              {/* Invisible bar for offset */}
              <Bar dataKey="startOffset" stackId="gantt" fill="transparent" isAnimationActive={false} />
              {/* Visible bar for duration */}
              <Bar
                dataKey="duration"
                stackId="gantt"
                radius={[4, 4, 4, 4]}
                isAnimationActive={false}
                onClick={(_: unknown, index: number) => handleBarClick(data[index])}
                className="cursor-pointer"
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={getBarColor(entry.item)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
