/**
 * QbrBalanceStep - Step 1: Balanço do Ciclo
 * 
 * Hierarchical view: Objectives → KRs → Linked Initiatives/Projects/Milestones.
 * Unlinked projects appear at the bottom.
 */

import { useMemo, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
  
  KrLinkedDetails,
  CarryOverDecisionsSection,
  InlineAgendaSuggestionInput,
} from '../shared';
import {
  KR_STATE_CONFIG,
  type KrState,
} from '@/modules/okrs/hooks';
import { UnlinkedProjectsList } from './UnlinkedProjectsList';
import type {
  QbrPreDraftData,
  TeamCheckinDecision,
  RitualAgendaSuggestion,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrBalanceStepProps {
  krFinalStates: QbrPreDraftData['krFinalStates'];
  onKrFinalStatesChange: (states: QbrPreDraftData['krFinalStates']) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  teamId?: string;
  /** Slot opcional renderizado no topo do conteúdo (ex.: PreparationStatusCard) */
  topSlot?: ReactNode;
  /** Decisões pendentes do Pré-QBR anterior do mesmo time (carry-over). */
  carryOverDecisions?: TeamCheckinDecision[];
  /** Sugestões de pauta acumuladas no wizard (todas as etapas). */
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  /** Texto do trigger do collapsible de sugestões. Ex: "Registrar sugestão de pauta para o MBR". */
  agendaTriggerLabel?: string;
}

interface ObjectiveGroup {
  objectiveId: string;
  objectiveTitle: string;
  krs: QbrPreDraftData['krFinalStates'];
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrBalanceStep({
  krFinalStates,
  decisions,
  onDecisionsChange,
  onContinue,
  teamId,
  topSlot,
  carryOverDecisions,
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
}: QbrBalanceStepProps) {
  // Group KRs by objective
  const objectiveGroups = useMemo(() => {
    const map = new Map<string, ObjectiveGroup>();
    for (const kr of krFinalStates) {
      const key = kr.objectiveId || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          objectiveId: kr.objectiveId,
          objectiveTitle: kr.objectiveTitle || 'Objetivo',
          krs: [],
        });
      }
      map.get(key)!.krs.push(kr);
    }
    return Array.from(map.values());
  }, [krFinalStates]);

  // State summary for score cards
  const stateSummary = useMemo(() => {
    const summary: Record<KrState, number> = {
      not_started: 0, healthy: 0, stagnant: 0, at_risk: 0,
      off_track: 0, achieved: 0, exceeded: 0, not_achieved: 0,
    };
    for (const kr of krFinalStates) {
      const state = (kr.state as KrState) || 'not_started';
      if (state in summary) summary[state]++;
    }
    return summary;
  }, [krFinalStates]);

  const totalKrs = krFinalStates.length;
  const achievedCount = stateSummary.achieved + stateSummary.exceeded;

  // Collect all KR ids for unlinked projects filtering
  const allKrIds = useMemo(() => krFinalStates.map(kr => kr.krId), [krFinalStates]);

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={BarChart3}
          title="Balanço do Ciclo"
          tooltip="qbr-balance"
          description="Revise o desempenho dos KRs do ciclo que está encerrando"
          variant="primary"
          badge={`${totalKrs} KRs`}
        />
      }
      footer={
        <WizardFirstStepFooter
          onPrimary={onContinue}
          primaryLabel="Continuar"
        />
      }
      bottomFixed={
        agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
          <InlineAgendaSuggestionInput
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            sourceStep="qbr-balance"
            triggerLabel={agendaTriggerLabel}
          />
        ) : undefined
      }
    >
      <div className="p-6 space-y-6">
        {topSlot}
        <CarryOverDecisionsSection
          items={carryOverDecisions}
          contextLabel="do Pré-QBR anterior"
          showSeparator={false}
        />
        {/* Score summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-status-green">{achievedCount}</p>
              <p className="text-xs text-muted-foreground">Alcançados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-status-amber">{stateSummary.at_risk}</p>
              <p className="text-xs text-muted-foreground">Em risco</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-status-red">{stateSummary.off_track + stateSummary.not_achieved}</p>
              <p className="text-xs text-muted-foreground">Fora da meta</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stateSummary.stagnant + stateSummary.not_started}</p>
              <p className="text-xs text-muted-foreground">Estagnados</p>
            </CardContent>
          </Card>
        </div>

        {/* Objectives → KRs hierarchy */}
        <div className="space-y-4">
          {objectiveGroups.map((group) => (
            <Card key={group.objectiveId}>
              <CardContent className="p-4 space-y-3">
                {/* Objective header */}
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-semibold truncate">{group.objectiveTitle}</p>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {group.krs.length} KR{group.krs.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {/* KRs for this objective */}
                <div className="space-y-2 pl-2 border-l-2 border-primary/20 ml-2">
                  {group.krs.map((kr) => {
                    const state = (kr.state as KrState) || 'not_started';
                    const config = KR_STATE_CONFIG[state];
                    const Icon = config.icon;

                    return (
                      <div key={kr.krId} className="pl-3 py-2">
                        <div className="flex items-start gap-3">
                          <div className={cn('p-1.5 rounded-md shrink-0', config.bgClass)}>
                            <Icon className={cn('h-4 w-4', config.colorClass)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{kr.krTitle}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className={cn('text-xs', config.colorClass)}>
                                {config.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(kr.finalProgress)}% progresso
                              </span>
                              {kr.paceStatus && (
                                <span className="text-xs text-muted-foreground">
                                  · {kr.paceStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Linked initiatives, projects & milestones — expanded by default */}
                        <KrLinkedDetails krId={kr.krId} defaultExpanded />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          {krFinalStates.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum KR encontrado para o ciclo atual.
            </p>
          )}
        </div>

        {/* Unlinked projects & milestones */}
        {teamId && (
          <UnlinkedProjectsList teamId={teamId} linkedKrIds={allKrIds} />
        )}
      </div>
    </WizardStepScaffold>
  );
}
