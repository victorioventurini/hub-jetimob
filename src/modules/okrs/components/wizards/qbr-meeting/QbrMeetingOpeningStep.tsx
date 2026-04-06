/**
 * QbrMeetingOpeningStep - Step 1: Abertura e Direcionamentos do C-Level
 * 
 * Carrega relatório pré-QBR e direcionamentos do C-Level como pauta pré-definida.
 * Inclui scorecard do quarter, pauta obrigatória e agenda da reunião.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Presentation, Megaphone, Target, Activity, HelpCircle, Lightbulb, Ban, Swords,
  TrendingUp, AlertTriangle, XCircle, Users, ListChecks, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { QbrCLevelSnapshot, QbrPreSnapshot, MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrMeetingScorecardMetrics {
  healthy: number;
  atRisk: number;
  offTrack: number;
  noSubmission: number;
}

export interface QbrMeetingOpeningStepProps {
  cLevelDirectives: QbrCLevelSnapshot['directives'];
  cLevelStrategicAnalysis?: QbrCLevelSnapshot['strategicAnalysis'];
  cLevelSessionExists: boolean;
  leaderSummaryCount: number;
  orgKpiSnapshots: MbrKpiSnapshot[];
  scorecardMetrics: QbrMeetingScorecardMetrics;
  currentStepIndex: number;
  onContinue: () => void;
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

const MEETING_AGENDA = [
  { title: 'Abertura', subtitle: 'Pauta e direcionamentos' },
  { title: 'Revisão de OKRs', subtitle: 'N times para revisar' },
  { title: 'Decisões estratégicas', subtitle: 'Registrar decisões-chave' },
  { title: 'Compromissos cross-área', subtitle: 'Formalizar dependências' },
  { title: 'Encerramento e governança', subtitle: 'Checklist e feedback' },
];

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

function MeetingAgenda({ currentStepIndex, leaderCount }: { currentStepIndex: number; leaderCount: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListChecks className="h-4 w-4" />
          Agenda da Reunião
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {MEETING_AGENDA.map((item, i) => {
          const isActive = i === currentStepIndex;
          const isDone = i < currentStepIndex;
          const subtitle = i === 1 ? `${leaderCount} times para revisar` : item.subtitle;

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
                <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
              </div>
              {isActive && (
                <Badge variant="outline" className="text-[10px] text-primary shrink-0">Atual</Badge>
              )}
            </div>
          );
        })}
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
  scorecardMetrics,
  currentStepIndex,
  onContinue,
}: QbrMeetingOpeningStepProps) {
  const alertKpis = orgKpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow');

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Presentation}
          title="Abertura do QBR"
          tooltip="qbr-meeting-opening"
          description="Contexto e direcionamentos estratégicos"
          variant="primary"
          badge={`${leaderSummaryCount} times`}
        />
      }
      footer={
        <WizardFirstStepFooter onPrimary={onContinue} primaryLabel="Iniciar Revisão de OKRs" />
      }
    >
      <div className="p-6 space-y-6">
        {/* Bloco 1 — Scorecard do quarter */}
        <ScorecardGrid metrics={scorecardMetrics} />

        {/* Bloco 2 — Pauta obrigatória do C-Level */}
        {cLevelStrategicAnalysis?.whatNotToDo && (
          <Card className="border-status-red/20">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-status-red mb-1 flex items-center gap-1">
                <Ban className="h-3 w-3" /> O que NÃO fazer
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
                Pauta Obrigatória ({cLevelDirectives.length})
              </CardTitle>
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
                O Pré-QBR C-Level não foi submetido. A pauta obrigatória não está disponível.
              </p>
            </CardContent>
          </Card>
        )}

        {/* KPIs em alerta (mantido) */}
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
                <div key={kpi.kpiId} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{kpi.name}</span>
                  <Badge variant="outline" className={cn(
                    'text-[10px]',
                    kpi.ragStatus === 'red' ? 'text-status-red' : 'text-status-amber'
                  )}>
                    {kpi.currentValue != null ? `${kpi.currentValue} ${kpi.unit}` : '—'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Bloco 3 — Agenda da reunião */}
        <MeetingAgenda currentStepIndex={currentStepIndex} leaderCount={leaderSummaryCount} />
      </div>
    </WizardStepScaffold>
  );
}
