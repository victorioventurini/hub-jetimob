/**
 * QbrMeetingOpeningStep - Step 1: Abertura e Direcionamentos do C-Level
 * 
 * Carrega relatório pré-QBR e direcionamentos do C-Level como pauta pré-definida.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Presentation, Megaphone, Target, Activity, HelpCircle, Lightbulb, Ban, Swords,
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

export interface QbrMeetingOpeningStepProps {
  cLevelDirectives: QbrCLevelSnapshot['directives'];
  cLevelStrategicAnalysis?: QbrCLevelSnapshot['strategicAnalysis'];
  leaderSummaryCount: number;
  orgKpiSnapshots: MbrKpiSnapshot[];
  onContinue: () => void;
}

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

// ============================================================
// COMPONENT
// ============================================================

export function QbrMeetingOpeningStep({
  cLevelDirectives,
  cLevelStrategicAnalysis,
  leaderSummaryCount,
  orgKpiSnapshots,
  onContinue,
}: QbrMeetingOpeningStepProps) {
  const alertKpis = orgKpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow');

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Presentation}
          title="Abertura do QBR"
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
        {/* C-Level strategic analysis summary */}
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

        {/* Directives as agenda */}
        {cLevelDirectives.length > 0 && (
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

        {/* Alert KPIs */}
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
      </div>
    </WizardStepScaffold>
  );
}
