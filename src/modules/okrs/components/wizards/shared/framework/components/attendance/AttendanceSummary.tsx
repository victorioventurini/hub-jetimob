/**
 * AttendanceSummary — view read-only para histórico/dashboard.
 * Mostra ícones ✓/✗ por linha + contagem total.
 */
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceParticipantRow } from '../../hooks/useSessionAttendance';
import { AttendanceCounter } from './AttendanceCounter';

export interface AttendanceSummaryProps {
  participants: AttendanceParticipantRow[];
  presentCount: number;
  totalCount: number;
  className?: string;
}

export function AttendanceSummary({
  participants,
  presentCount,
  totalCount,
  className,
}: AttendanceSummaryProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <AttendanceCounter presentCount={presentCount} totalCount={totalCount} />
      <ul className="space-y-1.5">
        {participants.map((p) => (
          <li key={p.profileId} className="flex items-center gap-2 text-sm">
            {p.isPresent ? (
              <Check className="h-4 w-4 text-primary" aria-label="Presente" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground" aria-label="Ausente" />
            )}
            <span className={cn(p.isPresent ? 'text-foreground' : 'text-muted-foreground')}>
              {p.name}
              {p.role && <span className="text-muted-foreground"> · {p.role}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
