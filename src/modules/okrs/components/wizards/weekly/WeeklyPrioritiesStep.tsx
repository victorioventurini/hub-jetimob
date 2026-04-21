/**
 * WeeklyPrioritiesStep — Step 2 da Weekly v2
 *
 * Lista consolidada de prioridades cross-times (categoria ≠ 'pessoas')
 * extraídas dos Pré-Weeklies concluídos da semana. Carry-over da última
 * Weekly fica disponível via subseção (placeholder — será populado por
 * `useLastCompletedSession('weekly')` quando a Weekly v2 já tiver histórico).
 */

import { memo, useMemo } from 'react';
import { ListChecks, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
} from '../shared';
import { useWeeklyPreWeeklyAggregation } from '@/modules/okrs/hooks/useWeeklyPreWeeklyAggregation';
import type {
  TeamCheckinDecision,
  WeeklyPriorityItem,
} from '@/modules/okrs/types/wizard';

// ============================================================
// CONSTANTS
// ============================================================

const PRIORITY_BADGE: Record<'low' | 'medium' | 'high', string> = {
  high: 'bg-status-red-muted text-status-red',
  medium: 'bg-status-amber-muted text-status-amber',
  low: 'bg-muted text-muted-foreground',
};

// ============================================================
// TYPES
// ============================================================

export interface WeeklyPrioritiesStepProps {
  referenceWeek: string;
  notes: string;
  onNotesChange: (next: string) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// CARD
// ============================================================

const PriorityCard = memo(function PriorityCard({ item }: { item: WeeklyPriorityItem }) {
  return (
    <li className="rounded-md border bg-muted/30 px-3 py-2 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">{item.topic.title || '(sem título)'}</span>
        <Badge className={cn('text-xs border-0', PRIORITY_BADGE[item.topic.priority])}>
          {item.topic.priority}
        </Badge>
        <Badge variant="outline" className="text-xs">{item.topic.category}</Badge>
        <Badge variant="secondary" className="text-xs">{item.teamName}</Badge>
      </div>
      {item.topic.context && (
        <p className="text-xs text-muted-foreground">{item.topic.context}</p>
      )}
    </li>
  );
});

// ============================================================
// COMPONENT
// ============================================================

export function WeeklyPrioritiesStep({
  referenceWeek,
  notes,
  onNotesChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: WeeklyPrioritiesStepProps) {
  const { topics, isLoading } = useWeeklyPreWeeklyAggregation(referenceWeek);

  const cross = useMemo(
    () => topics.filter((t) => t.topic.category !== 'pessoas'),
    [topics],
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ListChecks}
          title="Prioridades da Semana"
          description="Temas cross-times de Performance e Projetos"
          variant="primary"
          rightContent={
            <Badge variant="outline" className="text-xs">
              {cross.length} {cross.length === 1 ? 'tema' : 'temas'}
            </Badge>
          }
        />
      }
      bottomFixed={
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="weekly-priorities"
          placeholder="Registrar decisão sobre prioridades…"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Continuar para Pessoas"
        />
      }
    >
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Consolidação dos Pré-Weekly
            </CardTitle>
            <CardDescription>
              Temas que cada líder destilou e que sobem para esta Weekly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            )}
            {!isLoading && cross.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Nenhum tema cross-times nesta semana.
              </p>
            )}
            {!isLoading && cross.length > 0 && (
              <ul className="space-y-2">
                {cross.map((item) => (
                  <PriorityCard key={item.id} item={item} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notas do facilitador</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="weekly-priorities-notes" className="sr-only">
              Notas
            </Label>
            <Textarea
              id="weekly-priorities-notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Notas livres sobre prioridades…"
              rows={4}
            />
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
