/**
 * Shared helpers for ritual report renderers
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ReportSection({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h5 className="text-sm font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h5>
      {children}
    </div>
  );
}

export function EmptyState({ message = 'Sem dados registrados' }: { message?: string }) {
  return <p className="text-sm text-muted-foreground italic">{message}</p>;
}

const RAG_COLORS: Record<string, string> = {
  green: 'bg-status-green-muted text-status-green',
  yellow: 'bg-status-amber-muted text-status-amber',
  red: 'bg-destructive/10 text-destructive',
  no_data: 'bg-muted text-muted-foreground',
};

export function RagBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    green: 'No caminho',
    yellow: 'Em risco',
    red: 'Atrasado',
    no_data: 'Sem dados',
  };
  return (
    <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', RAG_COLORS[status] || RAG_COLORS.no_data)}>
      {labels[status] || status}
    </Badge>
  );
}

export function ConfidenceBadge({ level }: { level: string }) {
  const conf: Record<string, { label: string; color: string }> = {
    high: { label: 'Alta', color: 'bg-status-green-muted text-status-green' },
    medium: { label: 'Média', color: 'bg-status-amber-muted text-status-amber' },
    low: { label: 'Baixa', color: 'bg-destructive/10 text-destructive' },
  };
  const c = conf[level] || { label: level, color: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', c.color)}>
      {c.label}
    </Badge>
  );
}

export function formatValue(value: number | null | undefined, unit?: string): string {
  if (value == null) return '—';
  if (unit === '%') return `${value}%`;
  if (unit === 'R$') return `R$ ${value.toLocaleString('pt-BR')}`;
  return `${value} ${unit || ''}`.trim();
}
