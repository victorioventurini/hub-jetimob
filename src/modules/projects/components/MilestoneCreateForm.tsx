/**
 * MilestoneCreateForm — Inline form for creating milestones with name, start_date, due_date and owner.
 */

import { useState } from 'react';
import { Plus, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MilestoneCreateFormProps {
  onSubmit: (data: { name: string; start_date: string; due_date: string; owner_id: string | null; notes: string | null }) => void;
  isPending?: boolean;
}

export function MilestoneCreateForm({ onSubmit, isPending }: MilestoneCreateFormProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const dateOrderInvalid = !!startDate && !!dueDate && startDate > dueDate;
  const canSubmit = !!name.trim() && !!startDate && !!dueDate && !dateOrderInvalid && !isPending;

  const handleSubmit = () => {
    if (!canSubmit || !startDate || !dueDate) return;
    onSubmit({
      name: name.trim(),
      start_date: format(startDate, 'yyyy-MM-dd'),
      due_date: format(dueDate, 'yyyy-MM-dd'),
      owner_id: ownerId,
      notes: notes.trim() || null,
    });
    setName('');
    setStartDate(undefined);
    setDueDate(undefined);
    setOwnerId(null);
    setNotes('');
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
          disabled={!canSubmit}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Start date picker — obrigatório */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 text-xs justify-start',
                !startDate && 'text-destructive border-destructive/50',
                dateOrderInvalid && 'border-destructive/50 text-destructive',
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
              {startDate ? format(startDate, "dd MMM yyyy", { locale: ptBR }) : 'Início *'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Due date picker — obrigatório */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 text-xs justify-start',
                !dueDate && 'text-destructive border-destructive/50',
                dateOrderInvalid && 'border-destructive/50 text-destructive',
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
              {dueDate ? format(dueDate, "dd MMM yyyy", { locale: ptBR }) : 'Prazo *'}
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

      {dateOrderInvalid && (
        <p className="text-xs text-destructive">
          A data de início deve ser anterior ou igual à data de fim.
        </p>
      )}

      <Textarea
        placeholder="Observações, bloqueios, contexto..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="text-sm min-h-[56px]"
      />
    </div>
  );
}
