/**
 * QbrCLevelQuarterBalanceStep - Balanço do Quarter (Read-only)
 *
 * Seção A: OKRs Organizacionais com contribuições dos times
 * Seção B: Scorecard de entrega por time
 *
 * Usa hook existente: useAllOrgObjectivesView
 * Sem campos de input — step puramente informativo.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { WizardStepHeader } from '../shared/WizardStepHeader';
import { WizardStepFooter } from '../shared/WizardStepFooter';
import { TeamKrsToggle } from '../shared/TeamKrsToggle';
import { TeamDeliveryScorecard, buildTeamScorecardFromOrgObjectives } from '../shared/TeamDeliveryScorecard';
import type { TeamDeliveryScorecardData } from '../shared/TeamDeliveryScorecard';
import { OkrProgressBar } from '../../OkrProgressBar';
import { OkrStatusBadge } from '../../OkrStatusBadge';
import { KrStateInline } from '../../insights';
import { calculateKrState } from '../../../hooks/useKrStateInsights';
import { calculateProgress } from '../../../types';
import { useAllOrgObjectivesView } from '../../../hooks/queries/useOrgObjectiveViewQueries';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, parseISO } from 'date-fns';
import { LoadingState } from '@/components/ui/loading-state';
import type { OrgKrWithTeamKrs, TeamKrLinked } from '../../../hooks/queries/aggregateTypes';

// ============================================================
// TYPES
// ============================================================

interface QbrCLevelQuarterBalanceStepProps {
  cycleId: string;
  cycleName: string;
  year: number;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

/** Build CalculateKrStateParams from a KR-like object */
function buildKrStateParams(kr: {
  baseline: number;
  current_value: number;
  target: number;
  direction: string;
  status: string;
  last_checkin_at: string | null;
}) {
  const now = new Date();
  const progress = calculateProgress(kr.baseline ?? 0, kr.current_value ?? 0, kr.target ?? 0, kr.direction as any);
  const daysSinceCheckin = kr.last_checkin_at
    ? differenceInDays(now, parseISO(kr.last_checkin_at))
    : 999;

  return {
    progress,
    status: (kr.status || 'not_started') as 'green' | 'yellow' | 'red' | 'not_started',
    daysSinceCheckin,
    cycleEnded: false, // QBR Pre happens while cycle is still active/closing
  };
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function AggregatedStatusBadge({ status }: { status: 'on_track' | 'at_risk' | 'off_track' }) {
  const config = {
    on_track: { label: 'No ritmo', className: 'bg-status-green-muted text-status-green' },
    at_risk: { label: 'Em risco', className: 'bg-status-amber-muted text-status-amber' },
    off_track: { label: 'Fora da meta', className: 'bg-status-red-muted text-status-red' },
  };
  const c = config[status] || config.off_track;
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

function TeamKrRow({ tkr }: { tkr: TeamKrLinked }) {
  const krState = calculateKrState(buildKrStateParams(tkr));

  return (
    <div className="flex items-center gap-3 py-1.5 pl-6 text-sm min-w-0">
      <span className="text-muted-foreground truncate min-w-0 flex-1 max-w-[180px]">
        {tkr.team_name}
      </span>
      <span className="truncate min-w-0 flex-1">{tkr.title}</span>
      <OkrStatusBadge status={tkr.status} type="kr" className="shrink-0" />
      <span className="text-xs text-muted-foreground shrink-0 w-12 text-right">
        {tkr.progress.toFixed(0)}%
      </span>
      <KrStateInline state={krState} className="shrink-0" />
    </div>
  );
}

function OrgKrCard({ orgKr, showTeamKrs }: { orgKr: OrgKrWithTeamKrs; showTeamKrs: boolean }) {
  const krState = calculateKrState(buildKrStateParams({
    ...orgKr,
    last_checkin_at: null,
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 min-w-0">
        <OkrStatusBadge status={orgKr.status} type="kr" className="shrink-0" />
        <span className="text-sm font-medium truncate min-w-0 flex-1">{orgKr.title}</span>
        <KrStateInline state={krState} className="shrink-0" />
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
          <div className="border-l-2 border-primary/20 ml-2 space-y-0.5">
            {orgKr.linkedTeamKrs.map(tkr => (
              <TeamKrRow key={tkr.id} tkr={tkr} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pl-6 italic">
            Nenhum time contribuiu para esta KR neste quarter
          </p>
        )
      )}
    </div>
  );
}

function OrgObjectiveCard({ objective, showTeamKrs }: { objective: import('../../../hooks/queries/aggregateTypes').OrgObjectiveWithKrs; showTeamKrs: boolean }) {
  return (
    <Collapsible defaultOpen>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors min-w-0 text-left">
          <Target className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium truncate min-w-0 flex-1">{objective.title}</span>
          <AggregatedStatusBadge status={objective.aggregatedStatus} />
          <span className="text-sm text-muted-foreground shrink-0">
            {objective.aggregatedProgress.toFixed(0)}%
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform [[data-state=closed]_&]:rotate-[-90deg]" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t">
            {objective.orgKrs.map(orgKr => (
              <OrgKrCard key={orgKr.id} orgKr={orgKr} showTeamKrs={showTeamKrs} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============================================================
// TEAM SCORECARD
// ============================================================

interface TeamScorecardData {
  teamId: string;
  teamName: string;
  totalKrs: number;
  achieved: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  notStarted: number;
  stagnant: number;
  healthScore: 'healthy' | 'attention' | 'risk';
}

function getHealthScore(metrics: {
  totalKrs: number;
  krsAtRisk: number;
  krsStagnant: number;
  krsNotStarted: number;
}): 'healthy' | 'attention' | 'risk' {
  if (metrics.totalKrs === 0) return 'attention';
  const riskRatio = (metrics.krsAtRisk + metrics.krsStagnant + metrics.krsNotStarted) / metrics.totalKrs;
  if (riskRatio >= 0.5) return 'risk';
  if (riskRatio >= 0.25) return 'attention';
  return 'healthy';
}

const HEALTH_CONFIG = {
  healthy: { label: 'Saudável', icon: CheckCircle2, className: 'text-status-green bg-status-green-muted' },
  attention: { label: 'Atenção', icon: AlertTriangle, className: 'text-status-amber bg-status-amber-muted' },
  risk: { label: 'Em risco', icon: AlertTriangle, className: 'text-status-red bg-status-red-muted' },
} as const;

function TeamScorecardCard({ team }: { team: TeamScorecardData }) {
  const health = HEALTH_CONFIG[team.healthScore];
  const HealthIcon = health.icon;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <h4 className="font-medium text-sm truncate min-w-0">{team.teamName}</h4>
        <Badge variant="outline" className={cn('text-xs shrink-0', health.className)}>
          <HealthIcon className="h-3 w-3 mr-1" />
          {health.label}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-status-green shrink-0" />
          <span className="text-muted-foreground">Alcançadas:</span>
          <span className="font-medium">{team.achieved}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
          <span className="text-muted-foreground">No ritmo:</span>
          <span className="font-medium">{team.onTrack}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-status-amber shrink-0" />
          <span className="text-muted-foreground">Em risco:</span>
          <span className="font-medium">{team.atRisk}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-status-red shrink-0" />
          <span className="text-muted-foreground">Fora da meta:</span>
          <span className="font-medium">{team.offTrack}</span>
        </div>
        {team.notStarted > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50 shrink-0" />
            <span className="text-muted-foreground">Não iniciadas:</span>
            <span className="font-medium">{team.notStarted}</span>
          </div>
        )}
        {team.stagnant > 0 && (
          <div className="flex items-center gap-1.5 col-span-2">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Sem check-in (14d+):</span>
            <span className="font-medium text-muted-foreground">{team.stagnant}</span>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Total: {team.totalKrs} KRs
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function QbrCLevelQuarterBalanceStep({
  cycleId,
  cycleName,
  year,
  onContinue,
  onBack,
}: QbrCLevelQuarterBalanceStepProps) {
  const buSupabase = useBuScopedSupabase();
  const { currentBuId } = useBu();

  // Fetch active teams
  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['qbr-clevel', 'balance-teams', currentBuId],
    enabled: !!buSupabase && !!currentBuId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await buSupabase
        .from('teams')
        .select('id, name')
        .eq('bu_id', currentBuId!)
        .is('deleted_at', null)
        .is('parent_team_id', null)
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
  });

  // Section A: Org OKRs with team contributions
  const { data: orgObjectives, isLoading: isLoadingOrg } = useAllOrgObjectivesView(year, cycleId);

  // Build scorecard data from orgObjectives (derive per-team metrics)
  const teamScorecards: TeamScorecardData[] = useMemo(() => {
    if (!teams || !orgObjectives) return [];

    const teamMap = new Map<string, TeamScorecardData>();
    for (const t of teams) {
      teamMap.set(t.id, {
        teamId: t.id,
        teamName: t.name,
        totalKrs: 0,
        achieved: 0,
        onTrack: 0,
        atRisk: 0,
        offTrack: 0,
        notStarted: 0,
        stagnant: 0,
        healthScore: 'healthy',
      });
    }

    // Walk through all org objectives -> org KRs -> linked team KRs
    for (const obj of orgObjectives) {
      for (const orgKr of obj.orgKrs) {
        for (const tkr of orgKr.linkedTeamKrs) {
          const entry = teamMap.get(tkr.team_id);
          if (!entry) continue;

          entry.totalKrs++;

          const state = calculateKrState(buildKrStateParams(tkr));

          if (state === 'achieved' || state === 'exceeded') entry.achieved++;
          else if (state === 'healthy') entry.onTrack++;
          else if (state === 'at_risk' || state === 'stagnant') entry.atRisk++;
          else if (state === 'off_track' || state === 'not_achieved') entry.offTrack++;
          else if (state === 'not_started') entry.notStarted++;

          if (state === 'stagnant') entry.stagnant++;
        }
      }
    }

    // Calculate health scores
    for (const entry of teamMap.values()) {
      entry.healthScore = getHealthScore({
        totalKrs: entry.totalKrs,
        krsAtRisk: entry.atRisk,
        krsStagnant: entry.stagnant,
        krsNotStarted: entry.notStarted,
      });
    }

    return Array.from(teamMap.values()).filter(t => t.totalKrs > 0);
  }, [teams, orgObjectives]);

  const isLoading = isLoadingTeams || isLoadingOrg;
  const [showTeamKrs, setShowTeamKrs] = useState(true);

  return (
    <WizardStepScaffold
      header={
         <WizardStepHeader
          icon={BarChart3}
          title={`Balanço do Quarter — ${cycleName}`}
          tooltip="qbr-clevel-balance"
          description={`Desempenho dos OKRs organizacionais e entrega dos times no ${cycleName}`}
          variant="primary"
        />
      }
      footer={
        <WizardStepFooter
          showBack
          onBack={onBack}
          primaryLabel="Continuar"
          onPrimary={onContinue}
        />
      }
    >
      <div className="p-6 space-y-8">
        {isLoading ? (
          <LoadingState text="Carregando dados do quarter..." />
        ) : (
          <>
            {/* Section A — OKRs Organizacionais */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">
                  Como foram os OKRs da empresa no {cycleName}
                </h3>
                <TeamKrsToggle visible={showTeamKrs} onToggle={() => setShowTeamKrs(v => !v)} />
              </div>

              {(!orgObjectives || orgObjectives.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum OKR organizacional cadastrado para {year}.</p>
                  <Link
                    to="/okrs/org-view"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-2"
                  >
                    Ver Visão Organizacional <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orgObjectives.map(obj => (
                    <OrgObjectiveCard key={obj.id} objective={obj} showTeamKrs={showTeamKrs} />
                  ))}
                </div>
              )}
            </section>

            {/* Section B — Scorecard por Time */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">
                  O que cada time entregou
                </h3>
              </div>

              {teamScorecards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum time tem KRs vinculadas a OKRs organizacionais no {cycleName}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamScorecards.map(team => (
                    <TeamScorecardCard key={team.teamId} team={team} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </WizardStepScaffold>
  );
}
