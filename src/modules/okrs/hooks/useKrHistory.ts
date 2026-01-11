import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { useMemo } from "react";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { queryKeys } from "@/lib/queryKeys";

export interface KrCheckinHistory {
  id: string;
  date: string;
  previous_value: number | null;
  current_value: number;
  confidence: 'high' | 'medium' | 'low';
  comments: string | null;
  blockers: string | null;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    photo_url: string | null;
  } | null;
}

export interface KrHistoryData {
  checkins: KrCheckinHistory[];
  trend: 'up' | 'down' | 'stable';
  currentValue: number | null;
  previousValue: number | null;
  variation: number | null;
  totalCheckins: number;
}

/**
 * Fetches KR check-in history for visualization
 */
export function useKrHistory(krId: string | null | undefined) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: queryKeys.okrs.krCheckinHistory(buId ?? null, krId ?? null),
    queryFn: async (): Promise<KrHistoryData | null> => {
      if (!krId || !supabase) return null;

      // Fetch checkins with explicit fields and limit
      const { data: checkins, error } = await supabase
        .from('okr_checkins')
        .select(`
          id, date, previous_value, current_value, confidence,
          comments, blockers, created_at, user_id
        `)
        .eq('kr_id', krId)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!checkins || checkins.length === 0) {
        return {
          checkins: [],
          trend: 'stable',
          currentValue: null,
          previousValue: null,
          variation: null,
          totalCheckins: 0,
        };
      }

      // Get unique user IDs
      const userIds = [...new Set(checkins.map(c => c.user_id).filter(Boolean))];
      
      // Fetch user profiles
      let userMap: Record<string, { id: string; display_name: string; photo_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, photo_url')
          .in('id', userIds);
        
        if (profiles) {
          userMap = profiles.reduce((acc, p) => {
            acc[p.id] = {
              id: p.id,
              display_name: p.display_name || 'Usuário',
              photo_url: p.photo_url,
            };
            return acc;
          }, {} as typeof userMap);
        }
      }

      // Map checkins with user info
      const mappedCheckins: KrCheckinHistory[] = checkins.map(c => ({
        id: c.id,
        date: c.date,
        previous_value: c.previous_value,
        current_value: c.current_value,
        confidence: c.confidence as 'high' | 'medium' | 'low',
        comments: c.comments,
        blockers: c.blockers,
        created_at: c.created_at,
        user: c.user_id ? userMap[c.user_id] || null : null,
      }));

      // Calculate trend
      const currentValue = mappedCheckins[0]?.current_value ?? null;
      const previousValue = mappedCheckins[1]?.current_value ?? mappedCheckins[0]?.previous_value ?? null;

      let trend: 'up' | 'down' | 'stable' = 'stable';
      let variation: number | null = null;

      if (currentValue !== null && previousValue !== null && previousValue !== 0) {
        variation = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
        if (variation > 0.5) trend = 'up';
        else if (variation < -0.5) trend = 'down';
      }

      return {
        checkins: mappedCheckins,
        trend,
        currentValue,
        previousValue,
        variation,
        totalCheckins: checkins.length,
      };
    },
    enabled: !!krId && isReady && !!supabase,
  });
}

/**
 * Formats KR history for chart display
 */
export function useKrChartData(
  checkins: KrCheckinHistory[] | undefined,
  baseline: number,
  target: number
) {
  return useMemo(() => {
    if (!checkins?.length) {
      return {
        data: [],
        minValue: Math.min(baseline, target) * 0.9,
        maxValue: Math.max(baseline, target) * 1.1,
      };
    }

    // Reverse to show oldest first in chart
    const sortedCheckins = [...checkins].reverse();

    const data = sortedCheckins.map((c) => ({
      date: format(parseISO(c.date), "dd/MM", { locale: ptBR }),
      fullDate: format(parseISO(c.date), "dd MMM yyyy", { locale: ptBR }),
      value: c.current_value,
      confidence: c.confidence,
    }));

    const values = sortedCheckins.map((c) => c.current_value);
    const allValues = [...values, baseline, target];
    const minValue = Math.min(...allValues) * 0.9;
    const maxValue = Math.max(...allValues) * 1.1;

    return {
      data,
      minValue: Math.floor(minValue),
      maxValue: Math.ceil(maxValue),
    };
  }, [checkins, baseline, target]);
}
