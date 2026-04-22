/**
 * WeeklyPeopleStep — Step 3 da Weekly v2
 *
 * Canal duplo:
 *  - Canal 1: temas priorizados em Pré-Weekly cuja categoria='pessoas'
 *  - Canal 2: sinais estruturais (peopleSignals) agrupados por tipo
 *
 * Canal 2 SEMPRE renderiza, mesmo quando o Canal 1 está vazio — pessoas é
 * estrutural e não pode ser silenciado.
 */

import { memo, useMemo } from 'react';
import { Users, MessageSquare, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import { useWeeklyPreWeeklyAggregation } from '@/modules/okrs/hooks';
import type {
  TeamCheckinDecision,
  WeeklyPeopleSignalAggregated,
  WeeklyPriorityItem,
  PreWeeklyPeopleSignal,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const SIGNAL_TYPE_LABEL: Record<PreWeeklyPeopleSignal['type'], string> = {
  celebracao: 'Celebrações',
  risco: 'Riscos',
  mudanca: 'Mudanças',
  feedback: 'Feedbacks',
};

// ============================================================
// TYPES
// ============================================================

export interface WeeklyPeopleStepProps {
  referenceWeek: string;
  notes: string;
  onNotesChange: (next: string) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// CARDS
// ============================================================

const PeopleTopicCard = memo(function PeopleTopicCard({ item }: { item: WeeklyPriorityItem }) {
  return (
    <li className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">{item.topic.title || '(sem título)'}</span>
        <Badge variant="secondary" className="text-xs">{item.teamName}</Badge>
        <Badge variant="outline" className="text-xs">{item.topic.priority}</Badge>
      </div>
      {item.topic.context && (
        <p className="text-xs text-muted-foreground">{item.topic.context}</p>
      )}
    </li>
  );
});

const SignalCard = memo(function SignalCard({ item }: { item: WeeklyPeopleSignalAggregated }) {
  return (
    <li className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">{item.teamName}</Badge>
      </div>
      <p className="text-sm">{item.signal.description || '(sem descrição)'}</p>
    </li>
  );
});

// ============================================================
// COMPONENT
// ============================================================

export function WeeklyPeopleStep({
  referenceWeek,
  notes,
  onNotesChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: WeeklyPeopleStepProps) {
  const { topics, peopleSignals, isLoading } = useWeeklyPreWeeklyAggregation(referenceWeek);

  const channel1 = useMemo(
    () => topics.filter((t) => t.topic.category === 'pessoas'),
    [topics],
  );

  const channel2ByType = useMemo(() => {
    const map = new Map<PreWeeklyPeopleSignal['type'], WeeklyPeopleSignalAggregated[]>();
    for (const s of peopleSignals) {
      const arr = map.get(s.signal.type) ?? [];
      arr.push(s);
      map.set(s.signal.type, arr);
    }
    return map;
  }, [peopleSignals]);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Users}
          title="Pessoas"
          description="Temas e sinais estruturais sobre o time da BU"
          variant="purple"
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="weekly-people"
          placeholder="Registrar decisão sobre pessoas…"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Continuar para Encerramento"
        />
      }
    >
      <div className="p-6 space-y-4">
        {/* Canal 1 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Temas priorizados ({channel1.length})
            </CardTitle>
            <CardDescription>
              Itens onde líderes selecionaram a categoria "Pessoas" no Pré-Weekly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
            {!isLoading && channel1.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Nenhum tema de pessoas priorizado nesta semana.
              </p>
            )}
            {!isLoading && channel1.length > 0 && (
              <ul className="space-y-2">
                {channel1.map((item) => (
                  <PeopleTopicCard key={item.id} item={item} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Canal 2 — sempre renderiza */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Sinais estruturais ({peopleSignals.length})
            </CardTitle>
            <CardDescription>
              Sinais consolidados do Step 3 dos Pré-Weeklies — independente do que foi priorizado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['celebracao', 'risco', 'mudanca', 'feedback'] as const).map((type) => {
              const items = channel2ByType.get(type) ?? [];
              return (
                <div key={type} className="space-y-2">
                  <h4 className="text-xs uppercase text-muted-foreground font-semibold">
                    {SIGNAL_TYPE_LABEL[type]} ({items.length})
                  </h4>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Sem sinais.</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((item) => (
                        <SignalCard key={item.id} item={item} />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notas do facilitador</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Notas livres sobre pessoas…"
              rows={4}
            />
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
