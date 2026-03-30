/**
 * MilestoneStatusSelect — Inline status selector for milestones.
 * Three states: todo, in_progress, done.
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Circle, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MilestoneStatus } from '../types';

const OPTIONS: Array<{ value: MilestoneStatus; label: string; icon: React.ReactNode; color: string }> = [
  { value: 'todo', label: 'A fazer', icon: <Circle className="h-3.5 w-3.5" />, color: 'text-muted-foreground' },
  { value: 'in_progress', label: 'Em andamento', icon: <Clock className="h-3.5 w-3.5" />, color: 'text-amber-500' },
  { value: 'done', label: 'Concluído', icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-emerald-500' },
];

interface MilestoneStatusSelectProps {
  value: MilestoneStatus;
  onValueChange: (status: MilestoneStatus) => void;
  disabled?: boolean;
  className?: string;
}

export function MilestoneStatusSelect({ value, onValueChange, disabled, className }: MilestoneStatusSelectProps) {
  const selected = OPTIONS.find(o => o.value === value) ?? OPTIONS[0];

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as MilestoneStatus)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          'h-7 w-auto min-w-[130px] text-xs border-none bg-transparent shadow-none px-1.5 gap-1.5 focus:ring-0',
          selected.color,
          className,
        )}
      >
        <SelectValue>
          <span className={cn('flex items-center gap-1.5', selected.color)}>
            {selected.icon}
            {selected.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className={cn('flex items-center gap-1.5', opt.color)}>
              {opt.icon}
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
