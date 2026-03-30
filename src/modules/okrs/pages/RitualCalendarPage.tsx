/**
 * RitualCalendarPage - Configuração de cadências e calendário de rituais
 * 
 * Acesso: Admin da BU
 * Três abas: Cadências, Calendário, Saúde
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Trash2,
  Users, Clock, CheckCircle2, XCircle, RefreshCw, CalendarIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUrlTab } from '@/shared/url';
import { usePageTitle } from '@/hooks/usePageTitle';
import { WIZARD_TYPE_LABELS } from '../hooks/useRitualHistory';
import {
  useRitualCadences,
  useCreateCadence,
  useDeleteCadence,
  type CreateCadenceParams,
} from '../hooks/useRitualCadences';
import {
  useRitualOccurrences,
  useRescheduleOccurrence,
  type RitualOccurrence,
  type OccurrenceStatus,
} from '../hooks/useRitualOccurrences';
import { useRitualAdherence } from '../hooks/useRitualAdherence';
import type { WizardPersona } from '../types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
};

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_CONFIG: Record<OccurrenceStatus, { label: string; color: string; dotColor: string }> = {
  scheduled: { label: 'Agendado', color: 'bg-muted text-muted-foreground', dotColor: 'bg-muted-foreground/40' },
  completed_on_time: { label: 'No prazo', color: 'bg-status-green-muted text-status-green', dotColor: 'bg-status-green' },
  completed_late: { label: 'Com atraso', color: 'bg-status-amber-muted text-status-amber', dotColor: 'bg-status-amber' },
  missed: { label: 'Não executado', color: 'bg-destructive/10 text-destructive', dotColor: 'bg-destructive' },
  rescheduled: { label: 'Reagendado', color: 'bg-status-blue-muted text-status-blue', dotColor: 'bg-status-blue' },
};

/** Rituais recorrentes (exclui criação de OKRs/KRs) */
const RECURRENT_WIZARD_TYPES: WizardPersona[] = [
  'collaborator',
  'leader-prep',
  'team-checkin',
  'managers-checkin',
  'clevel-checkin',
  'mbr',
  'qbr-pre',
];

// ============================================================
// PAGE
// ============================================================

export default function RitualCalendarPage() {
  usePageTitle('Calendário de Ritos');
  const [activeTab, setActiveTab] = useUrlTab('cadences');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
          title="Calendário de Ritos"
          description="Configure cadências de rituais e acompanhe a aderência dos times."
          breadcrumbs={[
            { label: 'Configurações', href: '/settings' },
            { label: 'Calendário de Ritos' },
          ]}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="cadences">Cadências</TabsTrigger>
            <TabsTrigger value="calendar">Calendário</TabsTrigger>
            <TabsTrigger value="health">Saúde</TabsTrigger>
          </TabsList>

          <TabsContent value="cadences">
            <CadencesTab />
          </TabsContent>

          <TabsContent value="calendar">
            <CalendarTab />
          </TabsContent>

          <TabsContent value="health">
            <HealthTab />
          </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// CADENCES TAB
// ============================================================

function CadencesTab() {
  const { data: cadences, isLoading } = useRitualCadences();
  const [showDialog, setShowDialog] = useState(false);

  // Group by wizard type
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
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
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

function CadenceRow({ cadence }: { cadence: ReturnType<typeof useRitualCadences>['data'] extends (infer T)[] | undefined ? T : never }) {
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

// ============================================================
// CREATE CADENCE DIALOG
// ============================================================

function CreateCadenceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
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

// ============================================================
// CALENDAR TAB
// ============================================================

function CalendarTab() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedOccurrence, setSelectedOccurrence] = useState<RitualOccurrence | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [hasAutoNavigated, setHasAutoNavigated] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const { data: occurrences, isLoading, error } = useRitualOccurrences({
    year,
    month,
    teamId: teamFilter || undefined,
    wizardType: typeFilter || undefined,
  });

  // Auto-navigate to next month with data if current month is empty
  const shouldAutoNav = !isLoading && !hasAutoNavigated && (occurrences ?? []).length === 0;
  
  // Check next month for data when current is empty
  const nextMonth = addMonths(currentMonth, 1);
  const { data: nextMonthOccs } = useRitualOccurrences({
    year: nextMonth.getFullYear(),
    month: nextMonth.getMonth(),
    teamId: teamFilter || undefined,
    wizardType: typeFilter || undefined,
  });

  // Auto-navigate once if current month empty but next month has data
  if (shouldAutoNav && (nextMonthOccs ?? []).length > 0) {
    setCurrentMonth(nextMonth);
    setHasAutoNavigated(true);
  }

  // Group occurrences by date
  const byDate = useMemo(() => {
    const map = new Map<string, RitualOccurrence[]>();
    for (const occ of occurrences ?? []) {
      const list = map.get(occ.plannedDate) || [];
      list.push(occ);
      map.set(occ.plannedDate, list);
    }
    return map;
  }, [occurrences]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start for alignment
  const startDow = getDay(monthStart);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setHasAutoNavigated(true); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setHasAutoNavigated(true); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de rito" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os ritos</SelectItem>
              {RECURRENT_WIZARD_TYPES.map(wt => (
                <SelectItem key={wt} value={wt}>
                  {WIZARD_TYPE_LABELS[wt] || wt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card>
          <CardContent className="py-6 text-center">
            <XCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-sm text-destructive">Erro ao carregar ocorrências do calendário.</p>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      {isLoading ? (
        <Skeleton className="h-[400px] w-full" />
      ) : (
        <Card>
          <CardContent className="p-4">
            {/* Empty month hint */}
            {(occurrences ?? []).length === 0 && !error && (
              <div className="text-center py-4 mb-3 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Nenhuma ocorrência neste mês. Use as setas para navegar entre meses.
                </p>
              </div>
            )}

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for alignment */}
              {Array.from({ length: startDow }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20" />
              ))}

              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayOccs = byDate.get(dateStr) || [];
                const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      'h-20 rounded-lg border p-1.5 text-xs overflow-hidden',
                      isToday && 'border-primary/50 bg-primary/5',
                      dayOccs.length > 0 && 'cursor-pointer hover:bg-muted/50'
                    )}
                    onClick={() => dayOccs.length > 0 && setSelectedOccurrence(dayOccs[0])}
                  >
                    <span className={cn('font-medium', isToday && 'text-primary')}>
                      {format(day, 'd')}
                    </span>
                    {/* Occurrence pills */}
                    <div className="flex flex-col gap-0.5 mt-1">
                      {dayOccs.slice(0, 2).map(occ => (
                        <div
                          key={occ.id}
                          className={cn(
                            'flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate',
                            STATUS_CONFIG[occ.status].color
                          )}
                          title={`${WIZARD_TYPE_LABELS[occ.wizardType as WizardPersona] || occ.wizardType} — ${STATUS_CONFIG[occ.status].label}`}
                        >
                          <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', STATUS_CONFIG[occ.status].dotColor)} />
                          <span className="truncate">
                            {WIZARD_TYPE_LABELS[occ.wizardType as WizardPersona]?.split(' ')[0] || occ.wizardType}
                          </span>
                        </div>
                      ))}
                      {dayOccs.length > 2 && (
                        <span className="text-[10px] text-muted-foreground pl-1">
                          +{dayOccs.length - 2} mais
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className={cn('h-2.5 w-2.5 rounded-full', cfg.dotColor)} />
                  {cfg.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Occurrence detail sheet */}
      {selectedOccurrence && (
        <OccurrenceSheet
          occurrence={selectedOccurrence}
          open={!!selectedOccurrence}
          onOpenChange={open => !open && setSelectedOccurrence(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// OCCURRENCE DETAIL SHEET
// ============================================================

function OccurrenceSheet({
  occurrence,
  open,
  onOpenChange,
}: {
  occurrence: RitualOccurrence;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { mutate: reschedule, isPending } = useRescheduleOccurrence();
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [showReschedule, setShowReschedule] = useState(false);

  const statusCfg = STATUS_CONFIG[occurrence.status];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {WIZARD_TYPE_LABELS[occurrence.wizardType as WizardPersona] || occurrence.wizardType}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
          </div>

          {occurrence.teamName && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              {occurrence.teamName}
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

          {/* Actions */}
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
                        { onSuccess: () => onOpenChange(false) }
                      );
                    }}
                  >
                    {isPending ? 'Reagendando...' : 'Confirmar'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {occurrence.sessionId && (
            <Button variant="outline" className="w-full" asChild>
              <Link to={`/okrs/ritual-history?session=${occurrence.sessionId}`}>
                Ver no histórico
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// HEALTH TAB
// ============================================================

function HealthTab() {
  const { data: adherence, isLoading } = useRitualAdherence(90);

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  if (!adherence || adherence.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Nenhum dado de aderência disponível. Configure cadências e aguarde as primeiras ocorrências.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Aderência nos últimos 90 dias — percentual de rituais executados vs. planejados.
      </p>

      <div className="grid gap-3">
        {adherence.map(team => (
          <Card key={team.teamId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{team.teamName}</span>
                </div>
                <span className={cn(
                  'text-lg font-bold',
                  team.adherencePercent >= 80 ? 'text-status-green' :
                  team.adherencePercent >= 50 ? 'text-status-amber' :
                  'text-destructive'
                )}>
                  {team.adherencePercent}%
                </span>
              </div>
              <Progress
                value={team.adherencePercent}
                className="h-2"
              />
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                <span>{team.completed} de {team.total} realizados</span>
                {team.missed > 0 && (
                  <span className="text-destructive">{team.missed} não executados</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
