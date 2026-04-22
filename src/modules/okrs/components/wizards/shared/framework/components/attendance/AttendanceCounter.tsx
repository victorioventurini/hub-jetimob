/**
 * AttendanceCounter — "X de Y presentes"
 * Apresentacional puro. Sem dependência de hook/persona.
 */
import { cn } from '@/lib/utils';

export interface AttendanceCounterProps {
  presentCount: number;
  totalCount: number;
  className?: string;
}

export function AttendanceCounter({ presentCount, totalCount, className }: AttendanceCounterProps) {
  return (
    <div className={cn('text-sm font-medium text-muted-foreground', className)}>
      <span className="text-foreground">{presentCount}</span> de{' '}
      <span className="text-foreground">{totalCount}</span> presentes
    </div>
  );
}
