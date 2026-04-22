/**
 * RitualHistoryCard — card colapsável de uma sessão concluída.
 * Header denso (badge/time/datas/responsável), corpo com decisões,
 * avaliações de participantes, feedback e snapshot do relatório.
 * Extraído de `RitualHistoryPage.tsx` em P3.2.
 */

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
  ChevronDown, ChevronRight, CalendarIcon, Users, User,
  Lightbulb, Clock, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useUpdateDecisionFollowUp,
  WIZARD_TYPE_LABELS,
  type RitualHistoryItem,
} from '../../hooks/useRitualHistory';
import { useOccurrenceBySession } from '../../hooks/useRitualOccurrences';
import { useDecisionThread } from '../../hooks/useDecisionThread';
import { DecisionFollowUpRow } from '../../components/wizards/shared/DecisionFollowUpRow';
import { hasParticipantEvaluations } from './constants';
import { ParticipantEvaluationsSection } from './ParticipantEvaluationsSection';
import { RitualFeedbackSection } from './RitualFeedbackSection';
import { SnapshotSummary } from './SnapshotSummary';

interface RitualHistoryCardProps {
  ritual: RitualHistoryItem;
  autoExpand?: boolean;
}

export function RitualHistoryCard({ ritual, autoExpand = false }: RitualHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const hasDecisions = ritual.decisions.length > 0;
  const isEvaluated = hasParticipantEvaluations(ritual.addendums);
  const label = WIZARD_TYPE_LABELS[ritual.wizardType] || ritual.wizardType;
  const { data: occurrence } = useOccurrenceBySession(ritual.id);
  const { mutate: updateFollowUp, isPending: isUpdatingFollowUp } = useUpdateDecisionFollowUp();
  const { mutate: addThreadMessage, isPending: isAddingMessage } = useDecisionThread();

  useEffect(() => {
    if (autoExpand) setIsExpanded(true);
  }, [autoExpand]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={cn(
        'transition-shadow',
        isExpanded && 'shadow-md',
        autoExpand && 'ring-2 ring-primary/30',
      )}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-3 sm:p-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <Badge variant="secondary" className="shrink-0 text-xs">
                  {label}
                </Badge>

                {ritual.status === 'in_progress' && (
                  <Badge variant="outline" className="shrink-0 text-[10px] border-status-yellow text-status-yellow">
                    Rascunho
                  </Badge>
                )}

                {isEvaluated && (
                  <Badge variant="outline" className="shrink-0 text-[10px] gap-1 border-status-green text-status-green">
                    <Star className="h-3 w-3" />
                    Avaliado
                  </Badge>
                )}

                {ritual.teamName && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{ritual.teamName}</span>
                  </span>
                )}

                <div className="hidden sm:flex flex-1 min-w-0" />

                {hasDecisions && (
                  <Badge variant="outline" className="shrink-0 text-xs gap-1 hidden sm:inline-flex">
                    <Lightbulb className="h-3 w-3" />
                    {ritual.decisions.length}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 sm:pl-0">
                {occurrence ? (
                  <Badge variant="outline" className="shrink-0 text-[10px] gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Previsto {format(parseISO(occurrence.planned_date), 'dd/MM', { locale: ptBR })}
                    {occurrence.actual_date && ` · Realizado ${format(parseISO(occurrence.actual_date), 'dd/MM', { locale: ptBR })}`}
                  </Badge>
                ) : ritual.completedAt ? (
                  <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">
                    Execução avulsa
                  </Badge>
                ) : null}

                {hasDecisions && (
                  <Badge variant="outline" className="shrink-0 text-xs gap-1 sm:hidden">
                    <Lightbulb className="h-3 w-3" />
                    {ritual.decisions.length}
                  </Badge>
                )}

                {ritual.completedAt ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <CalendarIcon className="h-3 w-3" />
                    {format(parseISO(ritual.completedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                ) : ritual.startedAt ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" />
                    Iniciado {format(parseISO(ritual.startedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                ) : null}

                {ritual.startedByName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[120px]">{ritual.startedByName}</span>
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Separator />
          <CardContent className="p-4 space-y-4">
            {hasDecisions ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Decisões e Registros ({ritual.decisions.length})
                </h4>
                <div className="space-y-2">
                  {ritual.decisions.map(decision => (
                    <DecisionFollowUpRow
                      key={decision.id}
                      decision={decision}
                      sessionId={ritual.id}
                      onUpdate={({ sessionId, decisionId, updates }) => {
                        updateFollowUp({ sessionId, decisionId, updates });
                      }}
                      isPending={isUpdatingFollowUp}
                      onAddMessage={({ sessionId, decisionId, content }) => {
                        addThreadMessage({ sessionId, decisionId, content });
                      }}
                      isAddingMessage={isAddingMessage}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nenhuma decisão registrada neste ritual.
              </p>
            )}

            <ParticipantEvaluationsSection addendums={ritual.addendums} />

            <RitualFeedbackSection reflectionData={ritual.reflectionData} />

            <SnapshotSummary ritual={ritual} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
