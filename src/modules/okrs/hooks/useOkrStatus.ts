import { useMemo } from 'react';
import { OkrRagStatus, OkrDirection, calculateProgress } from '../types';
import { OKR_CALCULATED_STATUS_STYLES } from '@/lib/colors';

export type OkrCalculatedStatus = 'on_track' | 'at_risk' | 'off_track' | 'not_started' | 'completed' | 'dropped';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * STATUS_CONFIG uses semantic tokens from src/lib/colors.ts
 */
export const STATUS_CONFIG: Record<OkrCalculatedStatus, StatusConfig> = {
  on_track: {
    label: OKR_CALCULATED_STATUS_STYLES.on_track.label,
    color: OKR_CALCULATED_STATUS_STYLES.on_track.text,
    bgColor: OKR_CALCULATED_STATUS_STYLES.on_track.bg,
    borderColor: OKR_CALCULATED_STATUS_STYLES.on_track.border,
  },
  at_risk: {
    label: OKR_CALCULATED_STATUS_STYLES.at_risk.label,
    color: OKR_CALCULATED_STATUS_STYLES.at_risk.text,
    bgColor: OKR_CALCULATED_STATUS_STYLES.at_risk.bg,
    borderColor: OKR_CALCULATED_STATUS_STYLES.at_risk.border,
  },
  off_track: {
    label: OKR_CALCULATED_STATUS_STYLES.off_track.label,
    color: OKR_CALCULATED_STATUS_STYLES.off_track.text,
    bgColor: OKR_CALCULATED_STATUS_STYLES.off_track.bg,
    borderColor: OKR_CALCULATED_STATUS_STYLES.off_track.border,
  },
  not_started: {
    label: OKR_CALCULATED_STATUS_STYLES.not_started.label,
    color: OKR_CALCULATED_STATUS_STYLES.not_started.text,
    bgColor: OKR_CALCULATED_STATUS_STYLES.not_started.bg,
    borderColor: OKR_CALCULATED_STATUS_STYLES.not_started.border,
  },
  completed: {
    label: OKR_CALCULATED_STATUS_STYLES.completed.label,
    color: OKR_CALCULATED_STATUS_STYLES.completed.text,
    bgColor: OKR_CALCULATED_STATUS_STYLES.completed.bg,
    borderColor: OKR_CALCULATED_STATUS_STYLES.completed.border,
  },
  dropped: {
    label: OKR_CALCULATED_STATUS_STYLES.dropped.label,
    color: OKR_CALCULATED_STATUS_STYLES.dropped.text,
    bgColor: OKR_CALCULATED_STATUS_STYLES.dropped.bg,
    borderColor: OKR_CALCULATED_STATUS_STYLES.dropped.border,
  },
};

/**
 * Calculates the automatic status of a KR based on progress vs expected progress
 * 
 * Rules:
 * - On Track: progress >= expected progress
 * - At Risk: up to 15% below expected
 * - Off Track: more than 15% below expected
 */
export function calculateAutoStatus(
  baseline: number,
  currentValue: number,
  target: number,
  direction: OkrDirection,
  periodStartDate: Date,
  periodEndDate: Date
): OkrCalculatedStatus {
  const progress = calculateProgress(baseline, currentValue, target, direction);
  
  // If progress is 0 and current equals baseline, it's not started
  if (progress === 0 && currentValue === baseline) {
    return 'not_started';
  }
  
  // If completed
  if (progress >= 100) {
    return 'completed';
  }
  
  // Calculate expected progress based on time elapsed
  const now = new Date();
  const totalDuration = periodEndDate.getTime() - periodStartDate.getTime();
  const elapsed = Math.max(0, now.getTime() - periodStartDate.getTime());
  const elapsedRatio = Math.min(1, elapsed / totalDuration);
  const expectedProgress = elapsedRatio * 100;
  
  // Calculate the gap
  const gap = expectedProgress - progress;
  
  if (gap <= 0) {
    return 'on_track';
  } else if (gap <= 15) {
    return 'at_risk';
  } else {
    return 'off_track';
  }
}

/**
 * Maps RAG status from database to calculated status
 */
export function mapRagToCalculated(ragStatus: OkrRagStatus): OkrCalculatedStatus {
  switch (ragStatus) {
    case 'green':
      return 'on_track';
    case 'yellow':
      return 'at_risk';
    case 'red':
      return 'off_track';
    case 'not_started':
      return 'not_started';
  }
}

/**
 * Hook to calculate KR status distribution
 */
export function useKrStatusDistribution(
  krs: Array<{
    status: OkrRagStatus;
    baseline: number;
    current_value: number;
    target: number;
  }> | undefined
) {
  return useMemo(() => {
    if (!krs || krs.length === 0) {
      return {
        on_track: 0,
        at_risk: 0,
        off_track: 0,
        not_started: 0,
        completed: 0,
        dropped: 0,
        total: 0,
      };
    }

    const counts = {
      on_track: 0,
      at_risk: 0,
      off_track: 0,
      not_started: 0,
      completed: 0,
      dropped: 0,
      total: krs.length,
    };

    krs.forEach((kr) => {
      const progress = calculateProgress(
        Number(kr.baseline) || 0,
        Number(kr.current_value) || 0,
        Number(kr.target) || 0,
        'up'
      );
      
      // Map RAG status but also check for completion
      if (progress >= 100) {
        counts.completed++;
      } else {
        const status = mapRagToCalculated(kr.status);
        counts[status]++;
      }
    });

    return counts;
  }, [krs]);
}
