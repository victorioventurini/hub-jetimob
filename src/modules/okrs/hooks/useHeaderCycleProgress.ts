import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useBu } from "@/contexts/BuContext";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { queryKeys } from "@/lib/queryKeys";

type CycleStatus = "planning" | "active" | "closed";
type QuarterLabel = "Q1" | "Q2" | "Q3" | "Q4";

interface HeaderCycleRow {
  id: string;
  name: string;
  type: "quarter" | "year";
  status: CycleStatus;
  start_date: string;
  end_date: string;
}

export interface HeaderQuarterProgress {
  label: QuarterLabel;
  state: "done" | "active" | "future";
  percent: number;
  cycleId: string | null;
}

interface HeaderCycleProgressResult {
  quarters: HeaderQuarterProgress[];
  yearPercent: number;
  activeQuarterLabel: QuarterLabel | null;
  activeQuarterPercent: number;
  hasQuarterData: boolean;
  isLoading: boolean;
  error: Error | null;
}

const QUARTERS: QuarterLabel[] = ["Q1", "Q2", "Q3", "Q4"];

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function calculateTemporalPercent(startDate: string, endDate: string, today = new Date()) {
  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (today <= start) return 0;
  if (today >= end) return 100;

  const totalDays = Math.max(1, differenceInCalendarDays(end, start));
  const elapsedDays = Math.max(0, differenceInCalendarDays(today, start));
  return clamp(Math.round((elapsedDays / totalDays) * 100));
}

function getQuarterLabelFromCycle(cycle: Pick<HeaderCycleRow, "name" | "start_date">): QuarterLabel {
  const qMatch = cycle.name.match(/q([1-4])/i);
  if (qMatch) return `Q${qMatch[1]}` as QuarterLabel;

  const month = parseISO(cycle.start_date).getMonth();
  const quarterNumber = Math.floor(month / 3) + 1;
  return `Q${quarterNumber}` as QuarterLabel;
}

function calculateCalendarYearPercent(today = new Date()) {
  const year = today.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const totalDays = Math.max(1, differenceInCalendarDays(yearEnd, yearStart));
  const elapsedDays = clamp(differenceInCalendarDays(today, yearStart), 0, totalDays);

  return clamp(Math.round((elapsedDays / totalDays) * 100));
}

export function useHeaderCycleProgress(): HeaderCycleProgressResult {
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const currentYear = new Date().getFullYear();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.okrs.headerCycles(currentBuId, currentYear),
    queryFn: async () => {
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      const { data: cycles, error } = await supabase
        .from("cycles")
        .select("id, name, type, status, start_date, end_date")
        .eq("bu_id", currentBuId)
        .in("type", ["quarter", "year"])
        .gte("start_date", yearStart)
        .lte("end_date", yearEnd)
        .order("start_date", { ascending: true });

      if (error) throw error;
      return (cycles ?? []) as HeaderCycleRow[];
    },
    enabled: !!currentBuId,
    staleTime: 2 * 60 * 1000,
  });

  return useMemo(() => {
    const today = new Date();
    const quartersMap = new Map<QuarterLabel, HeaderCycleRow>();
    const quarterCycles = (data ?? []).filter((cycle) => cycle.type === "quarter");

    quarterCycles.forEach((cycle) => {
      const label = getQuarterLabelFromCycle(cycle);
      if (!quartersMap.has(label)) {
        quartersMap.set(label, cycle);
      }
    });

    const quarters: HeaderQuarterProgress[] = QUARTERS.map((label) => {
      const cycle = quartersMap.get(label);

      if (!cycle) {
        return { label, state: "future", percent: 0, cycleId: null };
      }

      const percentByDate = calculateTemporalPercent(cycle.start_date, cycle.end_date, today);
      const startsAt = parseISO(cycle.start_date);
      const endsAt = parseISO(cycle.end_date);

      if (cycle.status === "closed") {
        return { label, state: "done", percent: 100, cycleId: cycle.id };
      }

      if (cycle.status === "active") {
        return { label, state: "active", percent: percentByDate, cycleId: cycle.id };
      }

      if (today > endsAt) {
        return { label, state: "done", percent: 100, cycleId: cycle.id };
      }

      if (today >= startsAt && today <= endsAt) {
        return { label, state: "active", percent: percentByDate, cycleId: cycle.id };
      }

      return { label, state: "future", percent: 0, cycleId: cycle.id };
    });

    const activeQuarter = quarters.find((quarter) => quarter.state === "active") ?? null;
    const yearCycle = (data ?? []).find((cycle) => cycle.type === "year");
    const yearPercent = yearCycle
      ? calculateTemporalPercent(yearCycle.start_date, yearCycle.end_date, today)
      : calculateCalendarYearPercent(today);

    return {
      quarters,
      yearPercent,
      activeQuarterLabel: activeQuarter?.label ?? null,
      activeQuarterPercent: activeQuarter?.percent ?? 0,
      hasQuarterData: quarterCycles.length > 0,
      isLoading,
      error: (error as Error | null) ?? null,
    };
  }, [data, error, isLoading]);
}
