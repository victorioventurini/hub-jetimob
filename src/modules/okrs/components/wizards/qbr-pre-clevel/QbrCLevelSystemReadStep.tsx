/**
 * QbrCLevelSystemReadStep - Step 1: Leitura do Sistema
 * 
 * Síntese consolidada dos wizards pré-QBR dos líderes:
 * - Scorecard do ciclo por área (RAG agregado)
 * - Padrões transversais dos aprendizados
 * - KPIs organizacionais com evolução
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Eye, Target, Activity, BookOpen, Ghost, AlertTriangle,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardFirstStepFooter,
  WizardStepScaffold,
} from '../shared';
import type { QbrPreSnapshot, MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface LeaderPreSubmission {
  teamId: string;
  teamName: string;
  snapshot: QbrPreSnapshot;
}

export interface QbrCLevelSystemReadStepProps {
  leaderSubmissions: LeaderPreSubmission[];
  orgKpiSnapshots: MbrKpiSnapshot[];
  teamsWithoutSubmission: Array<{ teamId: string; teamName: string }>;
  isLoading?: boolean;
  onContinue: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function aggregateKrStates(submissions: LeaderPreSubmission[]) {
  let achieved = 0, atRisk = 0, offTrack = 0, other = 0;
  for (const sub of submissions) {
    for (const kr of sub.snapshot.krFinalStates) {
      if (kr.state === 'achieved' || kr.state === 'exceeded') achieved++;
      else if (kr.state === 'at_risk') atRisk++;
      else if (kr.state === 'off_track' || kr.state === 'not_achieved') offTrack++;
      else other++;
    }
  }
  return { achieved, atRisk, offTrack, other, total: achieved + atRisk + offTrack + other };
}

function aggregateZombieKpis(submissions: LeaderPreSubmission[]) {
  const all = new Set<string>();
  for (const sub of submissions) {
    for (const id of sub.snapshot.zombieCandidates) all.add(id);
  }
  return all.size;
}

function aggregateKpisToCreate(submissions: LeaderPreSubmission[]) {
  return submissions.reduce((acc, sub) => acc + sub.snapshot.kpisToCreate.length, 0);
}

function extractTopLearnings(submissions: LeaderPreSubmission[], field: 'whatWorked' | 'whatDidntWork' | 'debts'): string[] {
  return submissions
    .map(s => s.snapshot.learnings[field])
    .filter(t => t.trim().length > 0)
    .slice(0, 5);
}

const TREND_ICON = {
  improving: TrendingUp,
  declining: TrendingDown,
  stable: Minus,
} as const;

// ============================================================
// COMPONENT
// ============================================================

export function QbrCLevelSystemReadStep({
  leaderSubmissions,
  orgKpiSnapshots,
  teamsWithoutSubmission,
  isLoading,
  onContinue,
}: QbrCLevelSystemReadStepProps) {
  const krAgg = useMemo(() => aggregateKrStates(leaderSubmissions), [leaderSubmissions]);
  const zombieCount = useMemo(() => aggregateZombieKpis(leaderSubmissions), [leaderSubmissions]);
  const kpisToCreateCount = useMemo(() => aggregateKpisToCreate(leaderSubmissions), [leaderSubmissions]);
  const topLearnings = useMemo(() => ({
    worked: extractTopLearnings(leaderSubmissions, 'whatWorked'),
    didntWork: extractTopLearnings(leaderSubmissions, 'whatDidntWork'),
    debts: extractTopLearnings(leaderSubmissions, 'debts'),
  }), [leaderSubmissions]);

  const achievementRate = krAgg.total > 0 ? Math.round((krAgg.achieved / krAgg.total) * 100) : 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Eye}
          title="Leitura do Sistema"
          description={`${leaderSubmissions.length} time${leaderSubmissions.length !== 1 ? 's' : ''} submeteram o pré-QBR`}
          variant="primary"
          badge={`${leaderSubmissions.length} submissions`}
        />
      }
      footer={
        <WizardFirstStepFooter
          onPrimary={onContinue}
          primaryLabel="Continuar"
        />
      }
    >
      <div className="p-6 space-y-6">
        {/* Teams without submission warning */}
        {teamsWithoutSubmission.length > 0 && (
          <Card className="border-status-amber/30 bg-status-amber-muted/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-status-amber shrink-0" />
                <span>
                  {teamsWithoutSubmission.length} time{teamsWithoutSubmission.length > 1 ? 's' : ''} sem
                  submissão: {teamsWithoutSubmission.map(t => t.teamName).join(', ')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scorecard do ciclo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Scorecard do Ciclo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-status-green">{krAgg.achieved}</p>
                <p className="text-xs text-muted-foreground">Alcançados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-status-amber">{krAgg.atRisk}</p>
                <p className="text-xs text-muted-foreground">Em risco</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-status-red">{krAgg.offTrack}</p>
                <p className="text-xs text-muted-foreground">Fora da meta</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">{krAgg.other}</p>
                <p className="text-xs text-muted-foreground">Outros</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={achievementRate} className="flex-1" />
              <span className="text-sm font-medium">{achievementRate}% taxa de alcance</span>
            </div>
          </CardContent>
        </Card>

        {/* KPIs org */}
        {orgKpiSnapshots.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                KPIs Organizacionais ({orgKpiSnapshots.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {orgKpiSnapshots.slice(0, 8).map(kpi => {
                const isAlert = kpi.ragStatus === 'red' || kpi.ragStatus === 'yellow';
                return (
                  <div key={kpi.kpiId} className="flex items-center justify-between gap-2 text-sm">
                    <span className={cn('truncate flex-1', isAlert && 'font-medium')}>{kpi.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {kpi.currentValue != null ? kpi.currentValue : '—'} {kpi.unit}
                      </span>
                      <Badge variant="outline" className={cn(
                        'text-xs',
                        kpi.ragStatus === 'green' && 'text-status-green',
                        kpi.ragStatus === 'yellow' && 'text-status-amber',
                        kpi.ragStatus === 'red' && 'text-status-red',
                      )}>
                        {kpi.ragStatus === 'green' ? 'OK' : kpi.ragStatus === 'yellow' ? '⚠' : kpi.ragStatus === 'red' ? '✗' : '—'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Sinalizações dos líderes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {zombieCount > 0 && (
            <Card className="border-dashed">
              <CardContent className="p-3 flex items-center gap-2">
                <Ghost className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{zombieCount} KPI{zombieCount > 1 ? 's' : ''} zombie sinalizados</span>
              </CardContent>
            </Card>
          )}
          {kpisToCreateCount > 0 && (
            <Card className="border-dashed">
              <CardContent className="p-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm">{kpisToCreateCount} KPI{kpisToCreateCount > 1 ? 's' : ''} sugeridos para criação</span>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Aprendizados consolidados */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Aprendizados Consolidados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topLearnings.worked.length > 0 && (
              <div>
                <p className="text-xs font-medium text-status-green mb-1">✓ Manter</p>
                {topLearnings.worked.map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground line-clamp-2">• {t}</p>
                ))}
              </div>
            )}
            {topLearnings.didntWork.length > 0 && (
              <div>
                <p className="text-xs font-medium text-status-red mb-1">✗ Parar</p>
                {topLearnings.didntWork.map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground line-clamp-2">• {t}</p>
                ))}
              </div>
            )}
            {topLearnings.debts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-status-amber mb-1">⚠ Dívidas</p>
                {topLearnings.debts.map((t, i) => (
                  <p key={i} className="text-xs text-muted-foreground line-clamp-2">• {t}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
