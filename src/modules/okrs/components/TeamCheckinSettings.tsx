import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, RefreshCw } from 'lucide-react';

interface TeamCheckinSettingsProps {
  teamId: string;
  teamName: string;
  currentFrequency?: string;
  currentDay?: number;
  currentDeadlineHour?: number;
  isLeader?: boolean;
}

const DAYS_OF_WEEK = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Segunda-feira' },
  { value: '2', label: 'Terça-feira' },
  { value: '3', label: 'Quarta-feira' },
  { value: '4', label: 'Quinta-feira' },
  { value: '5', label: 'Sexta-feira' },
  { value: '6', label: 'Sábado' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, '0')}:00`,
}));

export function TeamCheckinSettings({
  teamId,
  teamName,
  currentFrequency = 'weekly',
  currentDay = 1,
  currentDeadlineHour = 18,
  isLeader = false,
}: TeamCheckinSettingsProps) {
  const supabase = useBuScopedSupabase();
  const [frequency, setFrequency] = useState(currentFrequency);
  const [day, setDay] = useState(currentDay.toString());
  const [deadlineHour, setDeadlineHour] = useState(currentDeadlineHour.toString());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateSettings = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('teams')
        .update({
          checkin_frequency: frequency,
          checkin_day: parseInt(day),
          checkin_deadline_hour: parseInt(deadlineHour),
          updated_at: new Date().toISOString(),
        })
        .eq('id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast({
        title: 'Configurações atualizadas',
        description: 'As configurações de check-in do time foram salvas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const hasChanges =
    frequency !== currentFrequency ||
    parseInt(day) !== currentDay ||
    parseInt(deadlineHour) !== currentDeadlineHour;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4" />
          Rituais de Check-in
        </CardTitle>
        <CardDescription>
          Configure quando o time {teamName} deve fazer check-in dos OKRs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Frequência
            </Label>
            <Select
              value={frequency}
              onValueChange={setFrequency}
              disabled={!isLeader}
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    Semanal (recomendado)
                  </span>
                </SelectItem>
                <SelectItem value="biweekly">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    Quinzenal
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day of week */}
          <div className="space-y-2">
            <Label htmlFor="day" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Dia preferencial
            </Label>
            <Select value={day} onValueChange={setDay} disabled={!isLeader}>
              <SelectTrigger id="day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Deadline hour */}
          <div className="space-y-2">
            <Label htmlFor="hour" className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Prazo limite
            </Label>
            <Select
              value={deadlineHour}
              onValueChange={setDeadlineHour}
              disabled={!isLeader}
            >
              <SelectTrigger id="hour">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HOURS.map((h) => (
                  <SelectItem key={h.value} value={h.value}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary message */}
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p>
            O time deverá fazer check-in dos OKRs{' '}
            <strong className="text-foreground">
              {frequency === 'weekly' ? 'toda semana' : 'a cada duas semanas'}
            </strong>{' '}
            até{' '}
            <strong className="text-foreground">
              {DAYS_OF_WEEK.find((d) => d.value === day)?.label} às{' '}
              {deadlineHour.padStart(2, '0')}:00
            </strong>
            .
          </p>
        </div>

        {/* Save button */}
        {isLeader && (
          <div className="flex justify-end">
            <Button
              onClick={() => updateSettings.mutate()}
              disabled={!hasChanges || updateSettings.isPending}
            >
              {updateSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
