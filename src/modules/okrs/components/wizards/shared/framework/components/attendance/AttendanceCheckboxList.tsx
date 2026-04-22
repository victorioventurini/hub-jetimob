/**
 * AttendanceCheckboxList — Lista de participantes com checkbox de presença.
 * Apresentacional puro: recebe linhas + handler. Sem regras de permissão.
 */
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { AttendanceParticipantRow } from '../../hooks/useSessionAttendance';

export interface AttendanceCheckboxListProps {
  participants: AttendanceParticipantRow[];
  onToggle: (profileId: string) => void;
  disabled?: boolean;
  className?: string;
}

export function AttendanceCheckboxList({
  participants,
  onToggle,
  disabled,
  className,
}: AttendanceCheckboxListProps) {
  if (participants.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Nenhum participante esperado encontrado.
      </p>
    );
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {participants.map((p) => (
        <li key={p.profileId} className="flex items-center gap-3">
          <Checkbox
            id={`attendance-${p.profileId}`}
            checked={p.isPresent}
            disabled={disabled}
            onCheckedChange={() => onToggle(p.profileId)}
          />
          <label
            htmlFor={`attendance-${p.profileId}`}
            className="flex-1 cursor-pointer text-sm"
          >
            <span className="font-medium text-foreground">{p.name}</span>
            {p.role && <span className="text-muted-foreground"> · {p.role}</span>}
            {p.teamName && (
              <span className="text-muted-foreground"> · {p.teamName}</span>
            )}
          </label>
        </li>
      ))}
    </ul>
  );
}
