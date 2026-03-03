/**
 * MbrTeamOkrsOverviewStep - Overview consolidado das OKRs de todos os times
 * 
 * Exibe cards de resumo (saudáveis / atenção / risco) e lista de times
 * ordenados por criticidade (risco primeiro).
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Heart, AlertTriangle, XCircle, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import type { MbrTeamOkrSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrTeamOkrsOverviewStepProps {
  teamOkrSnapshots: MbrTeamOkrSnapshot[];
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

const HEALTH_ORDER: Record<string, number> = { risk: 0, attention: 1, healthy: 2 };

function HealthBadge({ status }: { status: 'healthy' | 'attention' | 'risk' }) {
  const config = {
    healthy: { label: 'Saudável', className: 'bg-status-green-muted text-status-green' },
    attention: { label: 'Atenção', className: 'bg-status-yellow-muted text-status-yellow' },
    risk: { label: 'Risco', className: 'bg-status-red-muted text-status-red' },
  };
  const c = config[status];
  return <Badge variant="secondary" className={cn('text-xs', c.className)}>{c.label}</Badge>;
}

function TrendIcon({ objectives }: { objectives: MbrTeamOkrSnapshot['objectives'] }) {
  if (objectives.length === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const improving = objectives.filter(o => o.trend === 'improving').length;
  const declining = objectives.filter(o => o.trend === 'declining').length;
  if (improving > declining) return <TrendingUp className="h-3.5 w-3.5 text-status-green" />;
  if (declining > improving) return <TrendingDown className="h-3.5 w-3.5 text-status-red" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrTeamOkrsOverviewStep({
  teamOkrSnapshots,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: MbrTeamOkrsOverviewStepProps) {
  const { sorted, healthy, attention, risk, totalObjectives, totalKrs } = useMemo(() => {
    const sorted = [...teamOkrSnapshots].sort(
      (a, b) => (HEALTH_ORDER[a.healthStatus] ?? 2) - (HEALTH_ORDER[b.healthStatus] ?? 2)
    );
    return {
      sorted,
      healthy: teamOkrSnapshots.filter(t => t.healthStatus === 'healthy').length,
      attention: teamOkrSnapshots.filter(t => t.healthStatus === 'attention').length,
      risk: teamOkrSnapshots.filter(t => t.healthStatus === 'risk').length,
      totalObjectives: teamOkrSnapshots.reduce((s, t) => s + t.objectives.length, 0),
      totalKrs: teamOkrSnapshots.reduce((s, t) => s + t.objectives.reduce((s2, o) => s2 + o.krCount, 0), 0),
    };
  }, [teamOkrSnapshots]);

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={Users}
        title="OKRs dos Times"
        description="Visão consolidada de saúde e progresso"
        variant="primary"
        badge={`${teamOkrSnapshots.length} times`}
      />

      {/* Summary cards */}
      <div className="px-6 py-4 border-b">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard
            icon={Users}
            label="Total de Times"
            value={teamOkrSnapshots.length}
            className="text-foreground"
          />
          <SummaryCard
            icon={Heart}
            label="Saudáveis"
            value={healthy}
            className="text-status-green"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Em Atenção"
            value={attention}
            className="text-status-amber"
          />
          <SummaryCard
            icon={XCircle}
            label="Em Risco"
            value={risk}
            className="text-status-red"
          />
        </div>
      </div>

      {/* Team list */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum time com OKRs encontrado para este ciclo.
            </p>
          ) : (
            sorted.map(team => {
              const teamKrs = team.objectives.reduce((s, o) => s + o.krCount, 0);
              return (
                <Card key={team.teamId} className={cn(
                  'transition-colors',
                  team.healthStatus === 'risk' && 'border-status-red/30',
                  team.healthStatus === 'attention' && 'border-status-amber/30',
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                          team.healthStatus === 'healthy' ? 'bg-status-green-muted text-status-green'
                          : team.healthStatus === 'attention' ? 'bg-status-yellow-muted text-status-yellow'
                          : 'bg-status-red-muted text-status-red'
                        )}>
                          {team.healthScore}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{team.teamName}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{team.objectives.length} obj</span>
                            <span>·</span>
                            <span>{teamKrs} KRs</span>
                            <TrendIcon objectives={team.objectives} />
                          </div>
                        </div>
                      </div>
                      <HealthBadge status={team.healthStatus} />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Inline decisions */}
      <div className="border-t">
        <InlineDecisionInput
          decisions={decisions}
          onDecisionsChange={onDecisionsChange}
          sourceStep="team-okrs-overview"
          placeholder="Nota sobre o panorama geral dos times..."
        />
      </div>

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onContinue}
        primaryLabel="Analisar Times"
      />
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SummaryCard({ icon: Icon, label, value, className }: {
  icon: React.ElementType;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
      <Icon className={cn('h-4 w-4', className)} />
      <div>
        <p className="text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
