/**
 * PreWeeklySourcesStep — Step 1 do Pré-Weekly v2
 *
 * "Suas fontes desta semana" — destilação individual.
 *
 * Reúne, de forma read-only, o que o gestor JÁ registrou nesta semana
 * (collaborator check-in, leader-prep, team-checkin) e oferece um espaço
 * livre de reflexão para preparar a destilação dos próximos steps.
 *
 * SCAFFOLDING: consome dados existentes em `okr_wizard_sessions` (sem novas
 * tabelas, sem agente). A leitura é puramente observacional — ainda não há
 * persistência de "itens fonte" estruturados (Onda 4 backend).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { startOfWeek, endOfWeek } from 'date-fns';
import { Inbox, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useIdentity } from '@/hooks/useIdentity';
import { useBu } from '@/contexts/BuContext';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { getRitualLabel } from '@/modules/okrs/constants/ritualLabels';
import { preWeeklyKeys } from '@/lib/queryKeys/okrs';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface PreWeeklySourcesStepProps {
  sourcesReflection: string;
  onSourcesReflectionChange: (text: string) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  referenceWeek: string; // YYYY-MM-DD
  onContinue: () => void;
}

// ============================================================
// HOOK — fontes da semana do gestor logado
// ============================================================

interface SessionItem {
  id: string;
  wizard_type: string;
  completed_at: string | null;
  status: string;
}

function useUserWeeklySources(referenceWeek: string) {
  const { profileId } = useIdentity();
  const { currentBuId } = useBu();
  const buSupabase = useBuScopedSupabase();

  return useQuery({
    queryKey: preWeeklyKeys.userSources(currentBuId, profileId, referenceWeek),
    enabled: !!currentBuId && !!profileId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<SessionItem[]> => {
      const ref = referenceWeek ? new Date(referenceWeek) : new Date();
      const weekStart = startOfWeek(ref, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(ref, { weekStartsOn: 1 }).toISOString();

      const { data, error } = await buSupabase
        .from('okr_wizard_sessions')
        .select('id, wizard_type, completed_at, status')
        .eq('started_by', profileId!)
        .in('wizard_type', ['collaborator', 'leader-prep', 'team-checkin'])
        .gte('completed_at', weekStart)
        .lte('completed_at', weekEnd)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as SessionItem[];
    },
  });
}

// ============================================================
// COMPONENT
// ============================================================

export function PreWeeklySourcesStep({
  sourcesReflection,
  onSourcesReflectionChange,
  decisions,
  onDecisionsChange,
  referenceWeek,
  onContinue,
}: PreWeeklySourcesStepProps) {
  const { data: sessions, isLoading } = useUserWeeklySources(referenceWeek);

  const grouped = useMemo(() => {
    const map = new Map<string, SessionItem[]>();
    for (const s of sessions ?? []) {
      const arr = map.get(s.wizard_type) ?? [];
      arr.push(s);
      map.set(s.wizard_type, arr);
    }
    return Array.from(map.entries());
  }, [sessions]);

  const hasSources = (sessions?.length ?? 0) > 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Inbox}
          title="Suas fontes desta semana"
          description="O que você já registrou e vai destilar para a Weekly"
          variant="primary"
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="pre-weekly-sources"
          placeholder="Registrar uma decisão ou observação a partir das fontes…"
        />
      }
      footer={
        <WizardFirstStepFooter
          onPrimary={onContinue}
          primaryLabel="Continuar para Pauta"
        />
      }
    >
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ritos concluídos por você nesta semana
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            )}
            {!isLoading && !hasSources && (
              <p className="text-sm text-muted-foreground">
                Nenhum rito registrado por você nesta semana ainda. Você pode
                seguir adiante mesmo assim — a destilação é livre.
              </p>
            )}
            {!isLoading && hasSources && (
              <ul className="space-y-2">
                {grouped.map(([type, items]) => (
                  <li
                    key={type}
                    className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
                  >
                    <span className="text-sm font-medium">
                      {getRitualLabel(type)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {items.length} {items.length === 1 ? 'sessão' : 'sessões'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reflexão livre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="sources-reflection" className="text-xs text-muted-foreground">
              Antes de selecionar a pauta, escreva o que você levaria para a
              Weekly se tivesse só 30 segundos. Isso vai virar matéria-prima
              da destilação.
            </Label>
            <Textarea
              id="sources-reflection"
              value={sourcesReflection}
              onChange={(e) => onSourcesReflectionChange(e.target.value)}
              placeholder="Ex.: Time entregou X mas houve atrito em Y; KR Z destravou…"
              rows={5}
            />
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
