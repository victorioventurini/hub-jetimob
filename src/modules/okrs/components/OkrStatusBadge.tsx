import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OkrRagStatus, OkrStatus, getStatusLabel } from '../types';

interface OkrStatusBadgeProps {
  status: OkrStatus | OkrRagStatus;
  type?: 'objective' | 'kr';
  className?: string;
}

export function OkrStatusBadge({ status, type = 'objective', className }: OkrStatusBadgeProps) {
  if (type === 'objective') {
    const objectiveStatus = status as OkrStatus;
    const variants: Record<OkrStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'secondary', label: 'Rascunho' },
      active: { variant: 'default', label: 'Ativo' },
      completed: { variant: 'outline', label: 'Concluído' },
      cancelled: { variant: 'destructive', label: 'Cancelado' },
    };

    const config = variants[objectiveStatus];

    return (
      <Badge variant={config.variant} className={className}>
        {config.label}
      </Badge>
    );
  }

  // KR RAG status
  const ragStatus = status as OkrRagStatus;
  const ragColors: Record<OkrRagStatus, string> = {
    green: 'bg-green-500/10 text-green-700 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-700 border-red-500/20',
    not_started: 'bg-muted text-muted-foreground border-muted',
  };

  const ragLabels: Record<OkrRagStatus, string> = {
    green: 'No caminho',
    yellow: 'Atenção',
    red: 'Em risco',
    not_started: 'Não iniciado',
  };

  return (
    <Badge
      variant="outline"
      className={cn(ragColors[ragStatus], className)}
    >
      <span className={cn(
        'w-2 h-2 rounded-full mr-1.5',
        ragStatus === 'green' && 'bg-green-500',
        ragStatus === 'yellow' && 'bg-yellow-500',
        ragStatus === 'red' && 'bg-red-500',
        ragStatus === 'not_started' && 'bg-muted-foreground'
      )} />
      {ragLabels[ragStatus]}
    </Badge>
  );
}
