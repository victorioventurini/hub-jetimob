/**
 * LastCheckinBadge - Exibe a data do último check-in realizado
 */

import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LastCheckinBadgeProps {
  lastCompletedAt: string | null;
  isLoading?: boolean;
  className?: string;
}

export function LastCheckinBadge({ lastCompletedAt, isLoading, className }: LastCheckinBadgeProps) {
  if (isLoading) return null;

  const label = lastCompletedAt
    ? `Último check-in: ${format(parseISO(lastCompletedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
    : 'Nenhum check-in anterior';

  return (
    <div className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 max-w-full', className)}>
      <Calendar className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate block">{label}</span>
    </div>
  );
}
