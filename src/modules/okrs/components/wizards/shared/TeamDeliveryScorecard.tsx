/**
 * TeamDeliveryScorecard — Scorecard de entrega de um time no quarter
 *
 * Reutilizável em:
 * - QbrCLevelQuarterBalanceStep (Section B)
 * - QbrMeetingOkrReviewStep (scorecard por time antes da revisão)
 *
 * Dados derivados de orgObjectives → linkedTeamKrs via calculateKrState.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateKrState } from '../../../hooks/useKrStateInsights';
import { calculateProgress } from '../../../types';
import { differenceInDays, parseISO } from 'date-fns';
import type { OrgObjectiveWithKrs } from '../../../hooks/queries/aggregateTypes';

// ============================================================
// TYPES
// ============================================================

export interface TeamDeliveryScorecardData {
  teamId: string;
  teamName: string;
  totalKrs: number;
  achieved: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  notStarted: number;
  noCheckin: number;
  healthScore: 'healthy' | 'attention' | 'risk' | 'not_started';
}

export interface TeamDeliveryScorecardProps {
  data: TeamDeliveryScorecardData;
  /** Compact mode hides team name header — used when team is already identified by context */
  compact?: boolean;
}

// ============================================================
// HELPERS
// ============================================================

const HEALTH_CONFIG = {
  healthy: { label: 'Saudável', icon: CheckCircle2, className: 'text-status-green bg-status-green-muted', border: 'border-status-green/20' },
  attention: { label: 'Em risco', icon: AlertTriangle, className: 'text-status-amber bg-status-amber-muted', border: 'border-status-amber/20' },
  risk: { label: 'Crítico', icon: AlertTriangle, className: 'text-status-red bg-status-red-muted', border: 'border-status-red/20' },
  not_started: { label: 'Não iniciado', icon: Clock, className: 'text-muted-foreground bg-muted', border: 'border-muted' },
} as const;

export function computeTeamHealth(metrics: {
  totalKrs: number;
  atRisk: number;
  offTrack: number;
  notStarted: number;
}): 'healthy' | 'attention' | 'risk' | 'not_started' {
  if (metrics.totalKrs === 0) return 'not_started';
  if (metrics.notStarted === metrics.totalKrs) return 'not_started';
  const riskRatio = (metrics.atRisk + metrics.offTrack + metrics.notStarted) / metrics.totalKrs;
  if (riskRatio >= 0.5) return 'risk';
  if (riskRatio >= 0.25) return 'attention';
  return 'healthy';
}

/**
 * Build scorecard data for a single team from org objectives.
 */
export function buildTeamScorecardFromOrgObjectives(
  teamId: string,
  teamName: string,
  orgObjectives: OrgObjectiveWithKrs[],
): TeamDeliveryScorecardData {
  let totalKrs = 0;
  let achieved = 0;
  let onTrack = 0;
  let atRisk = 0;
  let offTrack = 0;
  let notStarted = 0;
  let noCheckin = 0;

  const now = new Date();

  for (const obj of orgObjectives) {
    for (const orgKr of obj.orgKrs) {
      for (const tkr of orgKr.linkedTeamKrs) {
        if (tkr.team_id !== teamId) continue;
        totalKrs++;

        const progress = calculateProgress(
          tkr.baseline ?? 0,
          tkr.current_value ?? 0,
          tkr.target ?? 0,
          tkr.direction as any,
        );
        const daysSinceCheckin = tkr.last_checkin_at
          ? differenceInDays(now, parseISO(tkr.last_checkin_at))
          : 999;

        const state = calculateKrState({
          progress,
          status: (tkr.status || 'not_started') as any,
          daysSinceCheckin,
          cycleEnded: false,
        });

        if (state === 'achieved' || state === 'exceeded') achieved++;
        else if (state === 'healthy') onTrack++;
        else if (state === 'at_risk' || state === 'stagnant') atRisk++;
        else if (state === 'off_track' || state === 'not_achieved') offTrack++;
        else if (state === 'not_started') notStarted++;

        if (daysSinceCheckin >= 14) noCheckin++;
      }
    }
  }

  return {
    teamId,
    teamName,
    totalKrs,
    achieved,
    onTrack,
    atRisk,
    offTrack,
    notStarted,
    noCheckin,
    healthScore: computeTeamHealth({ totalKrs, atRisk, offTrack, notStarted }),
  };
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamDeliveryScorecard({ data, compact = false }: TeamDeliveryScorecardProps) {
  const health = HEALTH_CONFIG[data.healthScore];
  const HealthIcon = health.icon;

  if (data.totalKrs === 0) return null;

  return (
    <div className={cn('border rounded-lg p-4 space-y-3', health.border)}>
      {!compact && (
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h4 className="font-medium text-sm truncate min-w-0">{data.teamName}</h4>
          <Badge variant="outline" className={cn('text-xs shrink-0', health.className)}>
            <HealthIcon className="h-3 w-3 mr-1" />
            {health.label}
          </Badge>
        </div>
      )}
      {compact && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Como o time chegou aqui</span>
          <Badge variant="outline" className={cn('text-xs shrink-0', health.className)}>
            <HealthIcon className="h-3 w-3 mr-1" />
            {health.label}
          </Badge>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-status-green shrink-0" />
          <span className="text-muted-foreground">Alcançadas:</span>
          <span className="font-medium">{data.achieved}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />
          <span className="text-muted-foreground">No ritmo:</span>
          <span className="font-medium">{data.onTrack}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-status-amber shrink-0" />
          <span className="text-muted-foreground">Em risco:</span>
          <span className="font-medium">{data.atRisk}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-status-red shrink-0" />
          <span className="text-muted-foreground">Fora da meta:</span>
          <span className="font-medium">{data.offTrack}</span>
        </div>
        {data.notStarted > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50 shrink-0" />
            <span className="text-muted-foreground">Não iniciadas:</span>
            <span className="font-medium">{data.notStarted}</span>
          </div>
        )}
        {data.noCheckin > 0 && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Sem check-in:</span>
            <span className="font-medium">{data.noCheckin}</span>
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        Total: {data.totalKrs} KRs
      </div>
    </div>
  );
}
