import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useMemo } from "react";
import { differenceInDays, parseISO, isAfter, isBefore, isWithinInterval } from "date-fns";

export interface Cycle {
  id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string;
  planning_date: string | null;
  review_date: string | null;
  retro_date: string | null;
  parent_cycle_id: string | null;
}

/**
 * Fetches all cycles ordered by start date (newest first).
 */
export function useCycles() {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ["okr-cycles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as Cycle[];
    },
  });
}

/**
 * Fetches active/current cycles (where today is within start/end).
 */
export function useActiveCycles() {
  const { data: allCycles, ...rest } = useCycles();
  
  const activeCycles = useMemo(() => {
    if (!allCycles) return [];
    
    const today = new Date();
    return allCycles.filter(cycle => {
      const start = parseISO(cycle.start_date);
      const end = parseISO(cycle.end_date);
      return isWithinInterval(today, { start, end });
    });
  }, [allCycles]);

  return { data: activeCycles, ...rest };
}

/**
 * Fetches a single cycle by ID.
 */
export function useCycle(cycleId: string | null | undefined) {
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: ["okr-cycle", cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      
      const { data, error } = await supabase
        .from("cycles")
        .select("*")
        .eq("id", cycleId)
        .maybeSingle();

      if (error) throw error;
      return data as Cycle | null;
    },
    enabled: !!cycleId,
  });
}

/**
 * Calculates time-based metrics for a cycle.
 */
export function useCycleProgress(cycle: Cycle | null | undefined) {
  return useMemo(() => {
    if (!cycle) {
      return {
        totalDays: 0,
        elapsedDays: 0,
        remainingDays: 0,
        percentElapsed: 0,
        isActive: false,
        hasStarted: false,
        hasEnded: false,
      };
    }

    const today = new Date();
    const start = parseISO(cycle.start_date);
    const end = parseISO(cycle.end_date);

    const totalDays = differenceInDays(end, start);
    const elapsedDays = Math.max(0, differenceInDays(today, start));
    const remainingDays = Math.max(0, differenceInDays(end, today));
    const percentElapsed = totalDays > 0 ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 0;

    const hasStarted = !isBefore(today, start);
    const hasEnded = isAfter(today, end);
    const isActive = hasStarted && !hasEnded;

    return {
      totalDays,
      elapsedDays,
      remainingDays,
      percentElapsed,
      isActive,
      hasStarted,
      hasEnded,
    };
  }, [cycle]);
}

/**
 * Checks if a date extends beyond the cycle end date.
 */
export function useDateCycleValidation(date: string | null | undefined, cycle: Cycle | null | undefined) {
  return useMemo(() => {
    if (!date || !cycle) {
      return {
        isWithinCycle: true,
        extendsBeyondCycle: false,
        daysAfterCycle: 0,
      };
    }

    const targetDate = parseISO(date);
    const cycleEnd = parseISO(cycle.end_date);
    const cycleStart = parseISO(cycle.start_date);

    const extendsBeyondCycle = isAfter(targetDate, cycleEnd);
    const isBeforeCycleStart = isBefore(targetDate, cycleStart);
    const daysAfterCycle = extendsBeyondCycle ? differenceInDays(targetDate, cycleEnd) : 0;

    return {
      isWithinCycle: !extendsBeyondCycle && !isBeforeCycleStart,
      extendsBeyondCycle,
      isBeforeCycleStart,
      daysAfterCycle,
    };
  }, [date, cycle]);
}

/**
 * Determines expected progress based on cycle elapsed time.
 * Useful for RAG status calculation.
 */
export function useExpectedProgress(actualProgress: number, cycle: Cycle | null | undefined) {
  const cycleProgress = useCycleProgress(cycle);

  return useMemo(() => {
    if (!cycle || !cycleProgress.isActive) {
      return {
        expectedProgress: 0,
        progressDelta: 0,
        isAhead: false,
        isBehind: false,
        isOnTrack: true,
      };
    }

    const expectedProgress = cycleProgress.percentElapsed;
    const progressDelta = actualProgress - expectedProgress;

    // Consider "on track" if within 10% tolerance
    const tolerance = 10;
    const isAhead = progressDelta > tolerance;
    const isBehind = progressDelta < -tolerance;
    const isOnTrack = !isAhead && !isBehind;

    return {
      expectedProgress,
      progressDelta,
      isAhead,
      isBehind,
      isOnTrack,
    };
  }, [actualProgress, cycle, cycleProgress]);
}
