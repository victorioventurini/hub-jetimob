/**
 * MilestoneCreateForm — Inline form for creating milestones with name, due_date and owner.
 */

import { useState } from 'react';
import { Plus, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MilestoneCreateFormProps {
  onSubmit: (data: { name: string; due_date: string | null; owner_id: string | null }) => void;
  isPending?: boolean;
}

export function MilestoneCreateForm({ onSubmit, isPending }: MilestoneCreateFormProps) {
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
      owner_id: ownerId,
    });
    setName('');
    setDueDate(undefined);
    setOwnerId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Novo milestone..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Due date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 text-xs justify-start',
                !dueDate && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
              {dueDate ? format(dueDate, "dd MMM yyyy", { locale: ptBR }) : 'Prazo'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Owner selector */}
        <div className="min-w-[180px]">
          <BuUserSelect
            value={ownerId ?? undefined}
            onValueChange={setOwnerId}
            placeholder="Responsável"
            allowNone
            noneLabel="Sem responsável"
          />
        </div>
      </div>
    </div>
  );
}
