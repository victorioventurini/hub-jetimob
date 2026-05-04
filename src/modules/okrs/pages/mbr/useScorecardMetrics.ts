/**
 * Métricas do scorecard agregadas a partir dos snapshots de OKRs de time.
 */
import { useMemo } from 'react';
import { calculateKrState } from '@/modules/okrs/hooks';
import type { MbrTeamOkrSnapshot } from '@/modules/okrs/types/wizard';

export function useScorecardMetrics(
  snapshots: MbrTeamOkrSnapshot[],
  cycleEndDate: string | undefined,
) {
  return useMemo(() => {
    let healthy = 0;
    let atRisk = 0;
    let offTrack = 0;
    const cycleEnded = cycleEndDate ? new Date(cycleEndDate) < new Date() : false;

    for (const team of snapshots) {
      for (const obj of team.objectives) {
        for (const kr of obj.keyResults) {
          const s = String(kr.status);
          const progress = kr.progress ?? 0;
          const daysSince = kr.lastCheckinAt
            ? Math.floor(
                (Date.now() - new Date(kr.lastCheckinAt).getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : 999;
          const mappedStatus =
            s === 'on_track' || s === 'green'
              ? ('green' as const)
              : s === 'at_risk' || s === 'yellow'
                ? ('yellow' as const)
                : s === 'off_track' || s === 'red'
                  ? ('red' as const)
                  : ('not_started' as const);
          const state = calculateKrState({
            progress,
            status: mappedStatus,
            daysSinceCheckin: daysSince,
            cycleEnded,
          });
          if (state === 'healthy' || state === 'achieved' || state === 'exceeded') healthy++;
          else if (state === 'at_risk' || state === 'stagnant') atRisk++;
          else if (state === 'off_track' || state === 'not_achieved') offTrack++;
        }
      }
    }
    const noSubmission = snapshots.filter((t) => t.objectives.length === 0).length;
    return { healthy, atRisk, offTrack, noSubmission };
  }, [snapshots, cycleEndDate]);
}
