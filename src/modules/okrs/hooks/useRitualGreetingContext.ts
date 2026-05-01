/**
 * useRitualGreetingContext — Calcula os badges contextuais da saudação
 * de cada rito (semana, ordinal de check-in, mês no quarter, ciclo
 * que encerra/abre).
 *
 * Centraliza a lógica para que os Step 1 dos ritos consumam apenas
 * `<RitualGreeting {...ctx} />`.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getISOWeek, differenceInCalendarMonths } from 'date-fns';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import { useActiveCycle } from '@/modules/okrs/hooks';
import {
  getRitualGreetingConfig,
  type RitualCadence,
} from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export interface RitualGreetingContext {
  cadence: RitualCadence | undefined;
  cycleName: string | null;
  weekNumber?: number | null;
  checkInOrdinal?: number | null;
  monthLabel?: string | null;
  monthInQuarter?: 1 | 2 | 3 | null;
  closingCycleName?: string | null;
  openingCycleName?: string | null;
  isLoading: boolean;
}

interface UseRitualGreetingContextOptions {
  ritualSlug: WizardPersona;
  /** Para wizards "checkin" semanais — usado para contar ordinal do usuário. */
  effectiveUserId?: string | null;
  /** Para wizards de time semanais — usado para contar ordinal por time. */
  teamId?: string | null;
  /** Wizard type usado em okr_wizard_sessions. Default = ritualSlug. */
  wizardType?: string;
}

export function useRitualGreetingContext({
  ritualSlug,
  effectiveUserId,
  teamId,
  wizardType,
}: UseRitualGreetingContextOptions): RitualGreetingContext {
  const config = getRitualGreetingConfig(ritualSlug);
  const cadence = config?.cadence;

  const { activeQuarterlyCycle, isLoading: isLoadingCycle } = useActiveCycle();
  const supabase = useBuScopedSupabase();

  const sessionType = wizardType ?? ritualSlug;
  const ordinalEnabled =
    cadence === 'weekly' &&
    !!activeQuarterlyCycle?.id &&
    (!!effectiveUserId || !!teamId);

  const { data: ordinalData, isLoading: isLoadingOrdinal } = useQuery({
    queryKey: [
      'ritual-greeting-ordinal',
      sessionType,
      activeQuarterlyCycle?.id ?? null,
      effectiveUserId ?? null,
      teamId ?? null,
    ] as const,
    enabled: ordinalEnabled,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('okr_wizard_sessions')
        .select('id, started_at, completed_at, status, started_by, team_id', { count: 'exact', head: true })
        .eq('wizard_type', sessionType)
        .eq('status', 'completed');

      const cycleStart = activeQuarterlyCycle?.start_date;
      const cycleEnd = activeQuarterlyCycle?.end_date;
      if (cycleStart) query = query.gte('completed_at', cycleStart);
      if (cycleEnd) query = query.lte('completed_at', `${cycleEnd}T23:59:59`);

      if (effectiveUserId) query = query.eq('started_by', effectiveUserId);
      if (teamId) query = query.eq('team_id', teamId);

      const { count, error } = await query;
      if (error) throw error;
      // O próximo check-in (este) será o (count + 1)-ésimo
      return (count ?? 0) + 1;
    },
  });

  return useMemo<RitualGreetingContext>(() => {
    const cycleName = activeQuarterlyCycle?.name ?? null;
    const today = new Date();

    let weekNumber: number | null = null;
    let monthLabel: string | null = null;
    let monthInQuarter: 1 | 2 | 3 | null = null;
    let closingCycleName: string | null = null;
    let openingCycleName: string | null = null;

    if (cadence === 'weekly') {
      weekNumber = getISOWeek(today);
    }

    if (cadence === 'monthly') {
      monthLabel = `${MONTH_NAMES_PT[today.getMonth()]} ${today.getFullYear()}`;
      const cycleStart = activeQuarterlyCycle?.start_date
        ? new Date(activeQuarterlyCycle.start_date)
        : null;
      if (cycleStart) {
        const diff = differenceInCalendarMonths(today, cycleStart);
        const m = Math.min(Math.max(diff + 1, 1), 3);
        monthInQuarter = m as 1 | 2 | 3;
      }
    }

    if (cadence === 'quarterly') {
      // Para QBR: o ciclo ativo geralmente é o que está encerrando.
      // O próximo é derivado pelo nome (Qx YYYY -> Qy YYYY) — fallback simples.
      closingCycleName = activeQuarterlyCycle?.name ?? null;
      openingCycleName = nextQuarterName(activeQuarterlyCycle?.name ?? null);
    }

    return {
      cadence,
      cycleName,
      weekNumber,
      checkInOrdinal: ordinalEnabled ? (ordinalData ?? null) : null,
      monthLabel,
      monthInQuarter,
      closingCycleName,
      openingCycleName,
      isLoading: isLoadingCycle || (ordinalEnabled && isLoadingOrdinal),
    };
  }, [
    activeQuarterlyCycle,
    cadence,
    ordinalData,
    ordinalEnabled,
    isLoadingCycle,
    isLoadingOrdinal,
  ]);
}

/** Q1 2026 -> Q2 2026 ; Q4 2026 -> Q1 2027. Retorna null se formato desconhecido. */
function nextQuarterName(name: string | null): string | null {
  if (!name) return null;
  const m = /^Q([1-4])\s+(\d{4})$/.exec(name.trim());
  if (!m) return null;
  const q = Number(m[1]);
  const y = Number(m[2]);
  if (q === 4) return `Q1 ${y + 1}`;
  return `Q${q + 1} ${y}`;
}
