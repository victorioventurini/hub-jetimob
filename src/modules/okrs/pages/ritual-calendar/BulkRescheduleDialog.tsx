/**
 * BulkRescheduleDialog — reagenda em massa todas as ocorrências do mesmo rito
 * + mesma data origem (status 'scheduled' ou 'missed') na BU ativa.
 *
 * Pode ser disparado:
 *  - Contextualmente a partir do `OccurrenceSheet` (rito + data pré-preenchidos);
 *  - Manualmente a partir do header da `CalendarTab` (escolha livre).
 */

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Info, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_TYPE_LABELS } from '../../hooks/useRitualHistory';
import {
  useBulkRescheduleEligibleOccurrences,
  useRescheduleOccurrencesBulk,
} from '../../hooks/useRitualOccurrences';
import type { WizardPersona } from '../../types/wizard';
import { BULK_RESCHEDULABLE_WIZARD_TYPES } from './constants';

interface BulkRescheduleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Quando preenchido, trava a seleção de rito e data origem (modo contextual). */
  initialWizardType?: string | null;
  initialDate?: string | null;
}

export function BulkRescheduleDialog({
  open,
  onOpenChange,
  initialWizardType,
  initialDate,
}: BulkRescheduleDialogProps) {
  const isContextual = !!initialWizardType && !!initialDate;

  const [wizardType, setWizardType] = useState<string | null>(initialWizardType ?? null);
  const [sourceDate, setSourceDate] = useState<Date | undefined>(
    initialDate ? parseISO(initialDate) : undefined,
  );
  const [newDate, setNewDate] = useState<Date | undefined>();

  // Reset on open
  useEffect(() => {
    if (open) {
      setWizardType(initialWizardType ?? null);
      setSourceDate(initialDate ? parseISO(initialDate) : undefined);
      setNewDate(undefined);
    }
  }, [open, initialWizardType, initialDate]);

  const sourceDateStr = sourceDate ? format(sourceDate, 'yyyy-MM-dd') : null;

  const { data: eligible = [], isLoading: loadingPreview } =
    useBulkRescheduleEligibleOccurrences({
      wizardType,
      plannedDate: sourceDateStr,
      enabled: open,
    });

  const { mutate: bulkReschedule, isPending } = useRescheduleOccurrencesBulk();

  const canConfirm =
    !!wizardType && !!sourceDateStr && !!newDate && eligible.length > 0 && !isPending;

  const handleConfirm = () => {
    if (!wizardType || !sourceDateStr || !newDate) return;
    bulkReschedule(
      {
        wizardType,
        plannedDate: sourceDateStr,
        newDate: format(newDate, 'yyyy-MM-dd'),
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reagendar em massa</DialogTitle>
          <DialogDescription>
            Move todas as ocorrências do mesmo rito + data, em todos os times da BU.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rito */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rito</Label>
            {isContextual ? (
              <div className="rounded-md border px-3 py-2 text-sm">
                {WIZARD_TYPE_LABELS[wizardType as WizardPersona] || wizardType}
              </div>
            ) : (
              <Select value={wizardType ?? ''} onValueChange={(v) => setWizardType(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o rito" />
                </SelectTrigger>
                <SelectContent>
                  {BULK_RESCHEDULABLE_WIZARD_TYPES.map((wt) => (
                    <SelectItem key={wt} value={wt}>
                      {WIZARD_TYPE_LABELS[wt] || wt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data origem */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Data atual</Label>
            {isContextual ? (
              <div className="rounded-md border px-3 py-2 text-sm">
                {sourceDate ? format(sourceDate, 'dd/MM/yyyy', { locale: ptBR }) : '—'}
              </div>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start', !sourceDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {sourceDate
                      ? format(sourceDate, 'dd/MM/yyyy', { locale: ptBR })
                      : 'Selecione a data atual'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={sourceDate}
                    onSelect={setSourceDate}
                    className="p-3 pointer-events-auto"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Preview */}
          {wizardType && sourceDateStr && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                {loadingPreview
                  ? 'Calculando…'
                  : `${eligible.length} ocorrência(s) serão reagendadas`}
              </div>
              {eligible.length > 0 && (
                <ScrollArea className="max-h-32">
                  <ul className="text-xs text-muted-foreground space-y-0.5 pr-3">
                    {eligible.map((o) => (
                      <li key={o.id} className="truncate">
                        • {o.teamName ?? 'Sem time'}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
              {!loadingPreview && eligible.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma ocorrência elegível nesta data.
                </p>
              )}
            </div>
          )}

          {/* Nova data */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nova data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start', !newDate && 'text-muted-foreground')}
                  disabled={eligible.length === 0}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {newDate
                    ? format(newDate, 'dd/MM/yyyy', { locale: ptBR })
                    : 'Selecione a nova data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Apenas ocorrências com status “Agendado” ou “Não executado” serão afetadas.
              Ritos já concluídos ou previamente reagendados são preservados.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {isPending ? 'Reagendando…' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
