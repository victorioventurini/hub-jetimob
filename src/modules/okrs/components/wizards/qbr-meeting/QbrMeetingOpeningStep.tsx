/**
 * QbrMeetingOpeningStep - Step 1: Abertura e Direcionamentos do C-Level
 * 
 * Carrega relatório pré-QBR e direcionamentos do C-Level como pauta pré-definida.
 * Inclui scorecard do quarter, retrospectiva, OKRs org, pauta obrigatória e agenda da reunião.
 */

import { useState, type ReactNode } from 'react';
import { TeamKrsToggle } from '../shared/TeamKrsToggle';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Presentation, Megaphone, Target, Activity, HelpCircle, Lightbulb, Ban, Swords,
  TrendingUp, AlertTriangle, XCircle, Users, ListChecks, CheckCircle2, ChevronDown,
  ArrowUp, ArrowDown, Minus, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
  InlineDecisionInput,
  KpiStatusBlocks,
} from '../shared';
import { OkrProgressBar } from '../../OkrProgressBar';
import { OkrStatusBadge } from '../../OkrStatusBadge';
import type { QbrCLevelSnapshot, MbrKpiSnapshot } from '@/modules/okrs/types/wizard';
import type { OrgObjectiveWithKrs } from '@/modules/okrs/hooks/queries/aggregateTypes';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';
// ============================================================
// TYPES
// ============================================================

export interface QbrMeetingScorecardMetrics {
  healthy: number;
  atRisk: number;
  offTrack: number;
  noSubmission: number;
}

export interface PreviousQuarterTeamData {
  teamId: string;
  teamName: string;
  previousHealth: 'healthy' | 'attention' | 'risk' | null;
  currentHealth: 'healthy' | 'attention' | 'risk' | null;
}

export interface QbrMeetingOpeningStepProps {
  cLevelDirectives: QbrCLevelSnapshot['directives'];
  cLevelStrategicAnalysis?: QbrCLevelSnapshot['strategicAnalysis'];
  cLevelSessionExists: boolean;
  leaderSummaryCount: number;
  orgKpiSnapshots: MbrKpiSnapshot[];
  orgObjectives: OrgObjectiveWithKrs[];
  scorecardMetrics: QbrMeetingScorecardMetrics;
  currentStepIndex: number;
  /** Dados de retrospectiva do quarter anterior */
  previousQuarterData?: PreviousQuarterTeamData[];
  /** Decisões inline */
  decisions?: TeamCheckinDecision[];
  onDecisionsChange?: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  /** Slot opcional renderizado no topo do conteúdo (ex.: PreparationStatusCard) */
  topSlot?: ReactNode;
}

// ============================================================
// CONSTANTS
// ============================================================

const DIRECTIVE_ICONS = {
  strategic_question: HelpCircle,
  hypothesis: Lightbulb,
  non_priority: Ban,
  challenge: Swords,
} as const;

const DIRECTIVE_COLORS = {
  strategic_question: 'text-primary',
  hypothesis: 'text-status-amber',
  non_priority: 'text-status-red',
  challenge: 'text-purple-600',
} as const;

const AGENDA_TIME_FIXED = [5, 0, 15, 10, 10]; // Step 2 is dynamic

const AGG_STATUS_CONFIG = {
  on_track: { label: 'No ritmo', className: 'bg-status-green-muted text-status-green' },
  at_risk: { label: 'Em risco', className: 'bg-status-amber-muted text-status-amber' },
  off_track: { label: 'Fora da meta', className: 'bg-status-red-muted text-status-red' },
} as const;

const HEALTH_CONFIG = {
  healthy: { label: '🟢 healthy', className: 'text-status-green' },
  attention: { label: '🟡 attention', className: 'text-status-amber' },
  risk: { label: '🔴 risk', className: 'text-status-red' },
} as const;

// ============================================================
// SUB-COMPONENTS
// ============================================================

function ScorecardGrid({ metrics }: { metrics: QbrMeetingScorecardMetrics }) {
  const cards = [
    { label: 'No ritmo', value: metrics.healthy, icon: TrendingUp, color: 'text-status-green', bg: 'bg-status-green/10' },
    { label: 'Em risco', value: metrics.atRisk, icon: AlertTriangle, color: 'text-status-amber', bg: 'bg-status-amber/10' },
    { label: 'Fora da meta', value: metrics.offTrack, icon: XCircle, color: 'text-status-red', bg: 'bg-status-red/10' },
    { label: 'Sem submissão', value: metrics.noSubmission, icon: Users, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4" />
          Scorecard do Quarter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={cn('rounded-lg p-3 text-center', card.bg)}>
                <Icon className={cn('h-5 w-5 mx-auto mb-1', card.color)} />
                <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
                <p className="text-[11px] text-muted-foreground">{card.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function QuarterRetrospective({ data }: { data: PreviousQuarterTeamData[] }) {
  if (data.length === 0) return null;

  const getTrend = (prev: string | null, curr: string | null) => {
    if (!prev || !curr) return null;
    const order = { healthy: 3, attention: 2, risk: 1 };
    const diff = (order[curr as keyof typeof order] || 0) - (order[prev as keyof typeof order] || 0);
    if (diff > 0) return { label: '↑ Melhorou', icon: ArrowUp, className: 'text-status-green' };
    if (diff < 0) return { label: '↓ Piorou', icon: ArrowDown, className: 'text-status-red' };
    return { label: '→ Estável', icon: Minus, className: 'text-muted-foreground' };
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Entrega do quarter por time
        </CardTitle>
        <p className="text-xs text-muted-foreground">Contexto pré-analisado. A sala usa isso para calibrar as aprovações.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 pr-2 font-medium text-muted-foreground">Time</th>
                <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Quarter anterior</th>
                <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Quarter atual</th>
                <th className="text-center py-1.5 pl-2 font-medium text-muted-foreground">Tendência</th>
              </tr>
            </thead>
            <tbody>
              {data.map(team => {
                const trend = getTrend(team.previousHealth, team.currentHealth);
                return (
                  <tr key={team.teamId} className="border-b last:border-b-0">
                    <td className="py-1.5 pr-2 font-medium">{team.teamName}</td>
                    <td className="text-center py-1.5 px-2">
                      {team.previousHealth ? (
                        <span className={HEALTH_CONFIG[team.previousHealth]?.className}>
                          {HEALTH_CONFIG[team.previousHealth]?.label}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center py-1.5 px-2">
                      {team.currentHealth ? (
                        <span className={HEALTH_CONFIG[team.currentHealth]?.className}>
                          {HEALTH_CONFIG[team.currentHealth]?.label}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center py-1.5 pl-2">
                      {trend ? (
                        <span className={trend.className}>{trend.label}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function OrgOkrsSummary({ objectives }: { objectives: OrgObjectiveWithKrs[] }) {
  const [showTeamKrs, setShowTeamKrs] = useState(true);

  if (objectives.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Como chegamos aqui — OKRs da empresa ({objectives.length})
          </CardTitle>
          <TeamKrsToggle visible={showTeamKrs} onToggle={() => setShowTeamKrs(v => !v)} />
        </div>
        <p className="text-xs text-muted-foreground">Analisado pelo C-Level no Pré-QBR. Use como contexto, não para reanalisar.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {objectives.map(obj => (
          <Collapsible key={obj.id} defaultOpen={false}>
            <CollapsibleTrigger className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30 transition-colors text-left">
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform [[data-state=closed]_&]:rotate-[-90deg]" />
              <span className="font-medium truncate flex-1 min-w-0">{obj.title}</span>
              <Badge variant="outline" className={cn('text-[10px] shrink-0', AGG_STATUS_CONFIG[obj.aggregatedStatus]?.className)}>
                {AGG_STATUS_CONFIG[obj.aggregatedStatus]?.label || obj.aggregatedStatus}
              </Badge>
              <span className="text-xs text-muted-foreground shrink-0">{obj.aggregatedProgress.toFixed(0)}%</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 space-y-2 pt-1">
              {obj.orgKrs.map(orgKr => (
                <div key={orgKr.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <OkrStatusBadge status={orgKr.status} type="kr" className="shrink-0" />
                    <span className="text-xs truncate flex-1">{orgKr.title}</span>
                  </div>
                  <OkrProgressBar
                    baseline={orgKr.baseline}
                    current={orgKr.current_value}
                    target={orgKr.target}
                    direction={orgKr.direction}
                    status={orgKr.status}
                    size="sm"
                  />
                  {showTeamKrs && (
                    orgKr.linkedTeamKrs.length > 0 ? (
                      <div className="pl-3 space-y-0.5 border-l-2 border-primary/20">
                        {orgKr.linkedTeamKrs.map(tkr => (
                          <div key={tkr.id} className="flex items-center gap-2 text-xs">
                            <OkrStatusBadge status={tkr.status} type="kr" className="shrink-0 scale-75" />
                            <span className="text-muted-foreground truncate">{tkr.team_name}</span>
                            <span className="truncate flex-1">{tkr.title}</span>
                            <span className="text-muted-foreground shrink-0">{tkr.progress.toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic pl-3">Sem contribuição neste quarter</p>
                    )
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
}

function MeetingAgenda({ currentStepIndex, leaderCount }: { currentStepIndex: number; leaderCount: number }) {
  const agendaItems = [
    { title: 'Abertura', subtitle: 'Pauta e direcionamentos' },
    { title: 'Revisão de OKRs', subtitle: `${leaderCount} times para revisar` },
    { title: 'Decisões estratégicas', subtitle: 'Registrar decisões-chave' },
    { title: 'Compromissos cross-área', subtitle: 'Formalizar dependências' },
    { title: 'Encerramento e governança', subtitle: 'Checklist e feedback' },
  ];

  const times = [
    AGENDA_TIME_FIXED[0],
    leaderCount * 9,
    AGENDA_TIME_FIXED[2],
    AGENDA_TIME_FIXED[3],
    AGENDA_TIME_FIXED[4],
  ];
  const totalMinutes = times.reduce((a, b) => a + b, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Agenda da Reunião
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {agendaItems.map((item, i) => {
          const isActive = i === currentStepIndex;
          const isDone = i < currentStepIndex;
          const timeLabel = i === 1 ? `~${times[i]} min` : `${times[i]} min`;

          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive && 'bg-primary/10 font-medium',
                isDone && 'text-muted-foreground',
              )}
            >
              <span className={cn(
                'flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold shrink-0',
                isActive ? 'bg-primary text-primary-foreground' : isDone ? 'bg-muted text-muted-foreground' : 'bg-muted/50 text-muted-foreground',
              )}>
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', isActive && 'text-primary')}>{item.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">
                {timeLabel}
              </Badge>
              {isActive && (
                <Badge variant="outline" className="text-[10px] text-primary shrink-0">Atual</Badge>
              )}
            </div>
          );
        })}
        <div className="flex items-center justify-end pt-2 border-t mt-2">
          <span className="text-xs text-muted-foreground">
            Tempo total estimado: <span className="font-medium text-foreground">~{totalMinutes} min</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingOpeningStep({
  cLevelDirectives,
  cLevelStrategicAnalysis,
  cLevelSessionExists,
  leaderSummaryCount,
  orgKpiSnapshots,
  orgObjectives,
  scorecardMetrics,
  currentStepIndex,
  previousQuarterData,
  decisions = [],
  onDecisionsChange,
  onContinue,
  topSlot,
}: QbrMeetingOpeningStepProps) {
  const alertKpis = orgKpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow');

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Presentation}
          title="Contexto da reunião"
          tooltip="qbr-meeting-opening"
          description="O C-Level analisou o quarter e definiu a pauta. Aqui está o que você precisa saber antes de começar."
          variant="primary"
          badge={`${leaderSummaryCount} times`}
        />
      }
      bottomFixed={
        onDecisionsChange ? (
          <InlineDecisionInput
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
            sourceStep="qbr-meeting-opening"
          />
        ) : undefined
      }
      footer={
        <WizardFirstStepFooter onPrimary={onContinue} primaryLabel="Iniciar Revisão de OKRs" />
      }
    >
      <div className="p-6 space-y-6">
        {topSlot}
        {/* Bloco 1 — Agenda da reunião */}
        <MeetingAgenda currentStepIndex={currentStepIndex} leaderCount={leaderSummaryCount} />


        {/* Bloco 3 — Retrospectiva do quarter anterior */}
        {previousQuarterData && previousQuarterData.length > 0 && (
          <QuarterRetrospective data={previousQuarterData} />
        )}

        {/* Bloco 4 — OKRs da empresa neste quarter */}
        <OrgOkrsSummary objectives={orgObjectives} />

        {/* Bloco 5 — Pauta obrigatória do C-Level */}
        {cLevelStrategicAnalysis?.whatNotToDo && (
          <Card className="border-status-red/20">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-status-red mb-1 flex items-center gap-1">
                <Ban className="h-3 w-3" /> Vetos estratégicos — não entra no próximo ciclo
              </p>
              <p className="text-sm text-muted-foreground">{cLevelStrategicAnalysis.whatNotToDo}</p>
            </CardContent>
          </Card>
        )}

        {cLevelSessionExists && cLevelDirectives.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                O que queremos que a sala decida ({cLevelDirectives.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground">Cada item abaixo é pauta obrigatória. Não saia da reunião sem endereçar.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {cLevelDirectives.map((d, i) => {
                const Icon = DIRECTIVE_ICONS[d.category];
                const color = DIRECTIVE_COLORS[d.category];
                return (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', color)} />
                    <span>{d.text}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {!cLevelSessionExists && (
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="p-4 text-center">
              <Megaphone className="h-5 w-5 text-muted-foreground/50 mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">
                O Pré-QBR Executivo não foi submetido. A pauta obrigatória não está disponível.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Bloco 5 — KPIs em alerta */}
        {alertKpis.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                KPIs em Alerta ({alertKpis.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {alertKpis.slice(0, 5).map(kpi => (
                <div key={kpi.kpiId} className="flex items-center justify-between text-xs gap-2">
                  <KpiNameLink kpiId={kpi.kpiId} name={kpi.name} className="flex-1 text-xs" />
                  <span className="text-muted-foreground shrink-0">
                    {kpi.currentValue != null ? kpi.currentValue : '—'}{kpi.target != null ? ` / ${kpi.target}` : ''} {kpi.unit}
                  </span>
                  <Badge variant="outline" className={cn(
                    'text-[10px]',
                    kpi.ragStatus === 'red' ? 'text-status-red' : 'text-status-amber'
                  )}>
                    {kpi.ragStatus === 'red' ? '✗' : '⚠'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Bloco 6b — KPIs desatualizados e pendentes */}
        <KpiStatusBlocks kpiSnapshots={orgKpiSnapshots} />
      </div>
    </WizardStepScaffold>
  );
}
