/**
 * OccurrenceSheet — sheet de detalhe/reagendamento de uma ocorrência de ritual.
 * Extraído de `RitualCalendarPage.tsx` em P3.2.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, RefreshCw, CalendarIcon, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_TYPE_LABELS } from '../../hooks/useRitualHistory';
import {
  useRescheduleOccurrence,
  type RitualOccurrence,
} from '../../hooks/useRitualOccurrences';
import type { WizardPersona } from '../../types/wizard';
import { STATUS_CONFIG, BULK_RESCHEDULABLE_WIZARD_TYPES } from './constants';
import { BulkRescheduleDialog } from './BulkRescheduleDialog';

interface OccurrenceSheetProps {
  occurrence: RitualOccurrence;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expectedCount?: number;
  completedCount?: number;
}

export function OccurrenceSheet({
  occurrence,
  open,
  onOpenChange,
  expectedCount,
  completedCount,
}: OccurrenceSheetProps) {
  const { mutate: reschedule, isPending } = useRescheduleOccurrence();
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [showReschedule, setShowReschedule] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  const isBulkEligible =
    BULK_RESCHEDULABLE_WIZARD_TYPES.includes(occurrence.wizardType as WizardPersona) &&
    (occurrence.status === 'scheduled' || occurrence.status === 'missed');

  const statusCfg = STATUS_CONFIG[occurrence.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {WIZARD_TYPE_LABELS[occurrence.wizardType as WizardPersona] || occurrence.wizardType}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          <div className="flex items-center gap-2">
            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
          </div>

          {occurrence.teamName && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              {occurrence.teamName}
            </div>
          )}

          {expectedCount != null && expectedCount > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Participantes esperados</span>
                <span className="font-medium">{completedCount ?? 0} de {expectedCount}</span>
              </div>
              <Progress value={((completedCount ?? 0) / expectedCount) * 100} className="h-2" />
              {(completedCount ?? 0) < expectedCount && occurrence.status === 'missed' && (
                <p className="text-xs text-destructive">
                  {expectedCount - (completedCount ?? 0)} colaborador(es) não realizou(aram) o check-in.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data prevista</span>
              <span className="font-medium">
                {format(parseISO(occurrence.plannedDate), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>

            {occurrence.actualDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data real</span>
                <span className="font-medium">
                  {format(parseISO(occurrence.actualDate), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            )}

            {occurrence.rescheduledFrom && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original</span>
                <span className="text-muted-foreground line-through">
                  {format(parseISO(occurrence.rescheduledFrom), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {occurrence.status === 'scheduled' && (
            <div className="space-y-3">
              {!showReschedule ? (
                <Button variant="outline" className="w-full" onClick={() => setShowReschedule(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reagendar
                </Button>
              ) : (
                <div className="space-y-2">
                  <Label>Nova data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start", !rescheduleDate && "text-muted-foreground")}>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {rescheduleDate ? format(rescheduleDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={rescheduleDate}
                        onSelect={setRescheduleDate}
                        className="p-3 pointer-events-auto"
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    className="w-full"
                    disabled={!rescheduleDate || isPending}
                    onClick={() => {
                      if (!rescheduleDate) return;
                      reschedule(
                        { occurrenceId: occurrence.id, newDate: format(rescheduleDate, 'yyyy-MM-dd') },
                        { onSuccess: () => onOpenChange(false) },
                      );
                    }}
                  >
                    {isPending ? 'Reagendando...' : 'Confirmar'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {isBulkEligible && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowBulk(true)}
            >
              <CalendarRange className="h-4 w-4 mr-2" />
              Reagendar todos os times deste rito
            </Button>
          )}

          {occurrence.sessionId && (
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/rituals/history?session=${occurrence.sessionId}`}>
                Ver no histórico
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>

      <BulkRescheduleDialog
        open={showBulk}
        onOpenChange={setShowBulk}
        initialWizardType={occurrence.wizardType}
        initialDate={occurrence.plannedDate}
      />
    </Sheet>
  );
}
