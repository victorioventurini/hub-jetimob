/**
 * LastCheckinBadge - Exibe a data do último check-in realizado
 */

import { Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LastCheckinBadgeProps {
  lastCompletedAt: string | null;
  isLoading?: boolean;
}

export function LastCheckinBadge({ lastCompletedAt, isLoading }: LastCheckinBadgeProps) {
  if (isLoading) return null;

  const label = lastCompletedAt
    ? `Último check-in: ${format(parseISO(lastCompletedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
    : 'Nenhum check-in anterior';

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Calendar className="h-3.5 w-3.5" />
      <span>{label}</span>
    </div>
  );
}
