import { useMemo } from 'react';
import { OkrRagStatus, OkrDirection, calculateProgress } from '../types';

export type OkrCalculatedStatus = 'on_track' | 'at_risk' | 'off_track' | 'not_started' | 'completed' | 'dropped';

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const STATUS_CONFIG: Record<OkrCalculatedStatus, StatusConfig> = {
  on_track: {
    label: 'No Caminho',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-500',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  at_risk: {
    label: 'Em Risco',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-500',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  off_track: {
    label: 'Fora do Caminho',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  not_started: {
    label: 'Não Iniciado',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-400',
    borderColor: 'border-slate-200 dark:border-slate-700',
  },
  completed: {
    label: 'Concluído',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  dropped: {
    label: 'Descontinuado',
    color: 'text-slate-500 dark:text-slate-500',
    bgColor: 'bg-slate-300',
    borderColor: 'border-slate-200 dark:border-slate-700',
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
