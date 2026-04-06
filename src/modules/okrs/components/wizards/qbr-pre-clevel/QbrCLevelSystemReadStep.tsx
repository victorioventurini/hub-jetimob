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
import { AddendumBadge } from '../shared/AddendumBadge';
import type { QbrPreSnapshot, MbrKpiSnapshot } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface LeaderPreSubmission {
  teamId: string;
  teamName: string;
  snapshot: QbrPreSnapshot;
  addendums?: Array<{ text: string; created_at: string; created_by: string }>;
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
  const items: Array<{ description: string; suggestedScope: string; relatedKrTitle: string; teamName: string }> = [];
  for (const sub of submissions) {
    for (const kpi of sub.snapshot.kpisToCreate) {
      items.push({ ...kpi, teamName: sub.teamName });
    }
  }
  return items;
}

function extractTopLearnings(submissions: LeaderPreSubmission[], field: 'whatWorked' | 'whatDidntWork' | 'debts'): Array<{ text: string; teamName: string }> {
  return submissions
    .filter(s => s.snapshot.learnings[field].trim().length > 0)
    .map(s => ({ text: s.snapshot.learnings[field], teamName: s.teamName }))
    .slice(0, 10);
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
  const kpisToCreate = useMemo(() => aggregateKpisToCreate(leaderSubmissions), [leaderSubmissions]);
  const topLearnings = useMemo(() => ({
    worked: extractTopLearnings(leaderSubmissions, 'whatWorked'),
    didntWork: extractTopLearnings(leaderSubmissions, 'whatDidntWork'),
    debts: extractTopLearnings(leaderSubmissions, 'debts'),
  }), [leaderSubmissions]);

  const achievementRate = krAgg.total > 0 ? Math.round((krAgg.achieved / krAgg.total) * 100) : 0;

  // Teams with addendums
  const teamsWithAddendums = useMemo(() => 
    leaderSubmissions.filter(s => s.addendums && s.addendums.length > 0),
    [leaderSubmissions]
  );

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Eye}
          title="Leitura do Sistema"
          tooltip="qbr-clevel-system-read"
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
        {/* Teams submission status */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-primary shrink-0" />
              <span>
                {leaderSubmissions.length} time{leaderSubmissions.length !== 1 ? 's' : ''} submeteram: {leaderSubmissions.map(s => s.teamName).join(', ')}
              </span>
            </div>
          </CardContent>
        </Card>

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
          {kpisToCreate.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  {kpisToCreate.length} KPI{kpisToCreate.length > 1 ? 's' : ''} sugeridos para criação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {kpisToCreate.map((kpi, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{kpi.description}</p>
                      {kpi.relatedKrTitle && (
                        <p className="text-xs text-muted-foreground truncate">KR: {kpi.relatedKrTitle}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {kpi.suggestedScope && (
                        <Badge variant="outline" className="text-[10px]">{kpi.suggestedScope}</Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">{kpi.teamName}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Adendos dos líderes — section after signals */}
        {teamsWithAddendums.length > 0 && (
          <Card className="border-status-amber/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                📝 Adendos dos Líderes
                <Badge variant="outline" className="text-[10px] text-status-amber border-status-amber/30">
                  {teamsWithAddendums.length} time{teamsWithAddendums.length > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamsWithAddendums.map(sub => (
                <div key={sub.teamId} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{sub.teamName}</span>
                    <AddendumBadge addendums={sub.addendums!} badgeOnly />
                  </div>
                  <AddendumBadge addendums={sub.addendums!} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

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
                {topLearnings.worked.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground mb-1">
                    <span className="line-clamp-2 flex-1">• {item.text}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{item.teamName}</Badge>
                  </div>
                ))}
              </div>
            )}
            {topLearnings.didntWork.length > 0 && (
              <div>
                <p className="text-xs font-medium text-status-red mb-1">✗ Parar</p>
                {topLearnings.didntWork.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground mb-1">
                    <span className="line-clamp-2 flex-1">• {item.text}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{item.teamName}</Badge>
                  </div>
                ))}
              </div>
            )}
            {topLearnings.debts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-status-amber mb-1">⚠ Dívidas</p>
                {topLearnings.debts.map((item, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground mb-1">
                    <span className="line-clamp-2 flex-1">• {item.text}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">{item.teamName}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </WizardStepScaffold>
  );
}
