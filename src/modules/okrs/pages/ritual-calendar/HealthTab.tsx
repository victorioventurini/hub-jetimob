/**
 * HealthTab — aderência por time aos rituais no período selecionado.
 * Extraído de `RitualCalendarPage.tsx` em P3.2.
 */

import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle2, Users, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamSelect } from '@/components/selects/TeamSelect';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { WIZARD_TYPE_LABELS } from '../../hooks/useRitualHistory';
import { useRitualAdherence } from '../../hooks/useRitualAdherence';
import { RECURRENT_WIZARD_TYPES } from './constants';

export function HealthTab() {
  const today = new Date();
  const defaultStart = subDays(today, 30);

  const [startDate, setStartDate] = useState<Date | undefined>(defaultStart);
  const [endDate, setEndDate] = useState<Date | undefined>(today);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string | undefined>(undefined);

  const { data: adherence, isLoading } = useRitualAdherence({
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    teamId: teamFilter,
    wizardType: typeFilter || null,
    userId: userFilter || null,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2 lg:col-span-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Período</Label>
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left font-normal h-9", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                      {startDate ? format(startDate, 'dd/MM/yy', { locale: ptBR }) : 'Início'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left font-normal h-9", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                      {endDate ? format(endDate, 'dd/MM/yy', { locale: ptBR }) : 'Fim'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rito</Label>
              <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os ritos" />
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

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Time</Label>
              <TeamSelect
                value={teamFilter ?? undefined}
                onValueChange={setTeamFilter}
                includeAll
                allLabel="Todos os times"
                placeholder="Todos os times"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Usuário</Label>
              <BuUserSelect
                value={userFilter}
                onValueChange={(v) => setUserFilter(v ?? undefined)}
                placeholder="Todos os usuários"
                allowNone
                noneLabel="Todos os usuários"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : !adherence || adherence.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Nenhum dado de aderência disponível para os filtros selecionados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Aderência de{' '}
            {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : '—'} a{' '}
            {endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : '—'} — percentual de rituais executados vs. planejados.
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
                      'text-destructive',
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
        </>
      )}
    </div>
  );
}
