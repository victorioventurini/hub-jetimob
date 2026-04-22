/**
 * CadencesTab — aba de configuração de cadências de rituais.
 * Extraído de `RitualCalendarPage.tsx` em P3.2.
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, Plus, Trash2, Users, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIZARD_TYPE_LABELS } from '../../hooks/useRitualHistory';
import {
  useRitualCadences,
  useCreateCadence,
  useDeleteCadence,
  type CreateCadenceParams,
} from '../../hooks/useRitualCadences';
import type { WizardPersona } from '../../types/wizard';
import { FREQUENCY_LABELS, DAY_LABELS, RECURRENT_WIZARD_TYPES } from './constants';

export function CadencesTab() {
  const { data: cadences, isLoading } = useRitualCadences();
  const [showDialog, setShowDialog] = useState(false);

  const grouped = useMemo(() => {
    if (!cadences) return new Map<string, typeof cadences>();
    const map = new Map<string, typeof cadences>();
    for (const c of cadences) {
      const list = map.get(c.wizardType) || [];
      list.push(c);
      map.set(c.wizardType, list);
    }
    return map;
  }, [cadences]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nova Cadência
        </Button>
      </div>

      {grouped.size === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma cadência configurada.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie cadências para gerar automaticamente as datas dos rituais.
            </p>
          </CardContent>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([wizardType, items]) => (
          <Card key={wizardType}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {WIZARD_TYPE_LABELS[wizardType as WizardPersona] || wizardType}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map(cadence => (
                <CadenceRow key={cadence.id} cadence={cadence} />
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {showDialog && (
        <CreateCadenceDialog open={showDialog} onOpenChange={setShowDialog} />
      )}
    </div>
  );
}

function CadenceRow({
  cadence,
}: {
  cadence: ReturnType<typeof useRitualCadences>['data'] extends (infer T)[] | undefined ? T : never;
}) {
  const { mutate: deleteCadence, isPending } = useDeleteCadence();

  if (!cadence) return null;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center gap-3 min-w-0">
        {cadence.teamName && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span className="truncate max-w-[150px]">{cadence.teamName}</span>
          </span>
        )}
        <Badge variant="outline" className="text-xs">
          {FREQUENCY_LABELS[cadence.frequency] || cadence.frequency}
        </Badge>
        {cadence.dayOfWeek != null && (
          <span className="text-xs text-muted-foreground">{DAY_LABELS[cadence.dayOfWeek]}</span>
        )}
        {cadence.dayOfMonth != null && (
          <span className="text-xs text-muted-foreground">Dia {cadence.dayOfMonth}</span>
        )}
        {cadence.responsibleName && (
          <span className="text-xs text-muted-foreground">→ {cadence.responsibleName}</span>
        )}
        {!cadence.isActive && (
          <Badge variant="secondary" className="text-[10px]">Inativa</Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => deleteCadence(cadence.id)}
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CreateCadenceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { mutate: createCadence, isPending } = useCreateCadence();
  const [wizardType, setWizardType] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [dayOfMonth, setDayOfMonth] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>();

  const handleCreate = () => {
    if (!wizardType || !frequency || !startDate) return;

    const params: CreateCadenceParams = {
      wizardType,
      frequency,
      startDate: format(startDate, 'yyyy-MM-dd'),
    };

    if (['weekly', 'biweekly'].includes(frequency) && dayOfWeek) {
      params.dayOfWeek = parseInt(dayOfWeek);
    }
    if (['monthly', 'quarterly'].includes(frequency) && dayOfMonth) {
      params.dayOfMonth = parseInt(dayOfMonth);
    }

    createCadence(params, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Cadência</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de Rito</Label>
            <Select value={wizardType} onValueChange={setWizardType}>
              <SelectTrigger><SelectValue placeholder="Selecione o rito" /></SelectTrigger>
              <SelectContent>
                {RECURRENT_WIZARD_TYPES.map(wt => (
                  <SelectItem key={wt} value={wt}>
                    {WIZARD_TYPE_LABELS[wt] || wt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Frequência</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {['weekly', 'biweekly'].includes(frequency) && (
            <div>
              <Label>Dia da Semana</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {DAY_LABELS.map((label, i) => (
                    <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {['monthly', 'quarterly'].includes(frequency) && (
            <div>
              <Label>Dia do Mês</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={e => setDayOfMonth(e.target.value)}
                placeholder="1-28"
              />
            </div>
          )}

          <div>
            <Label>Data de Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleCreate}
            disabled={isPending || !wizardType || !frequency || !startDate}
          >
            {isPending ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
