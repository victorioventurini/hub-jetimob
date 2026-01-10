/**
 * useCycleCheckins - Hook para página consolidada de check-ins do ciclo
 * 
 * Consome a RPC get_cycle_checkins que retorna:
 * - Feed de check-ins paginado
 * - Agregações (total, % em dia, atrasados)
 * - Lista de KRs overdue
 */

import { useQuery } from "@tanstack/react-query";
import { useOptionalBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

// ============================================================
// TYPES
// ============================================================

export interface CycleCheckinsFilters {
  teamId?: string;
  ownerId?: string;
  confidence?: 'high' | 'medium' | 'low' | 'all';
  ragStatus?: 'green' | 'yellow' | 'red' | 'all';
  dateFrom?: string;
  dateTo?: string;
  onlyOverdue?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CheckinFeedItem {
  id: string;
  created_at: string;
  current_value: number;
  previous_value: number | null;
  confidence: 'high' | 'medium' | 'low';
  comments: string | null;
  blockers: string | null;
  kr_id: string;
  kr_title: string;
  kr_status: 'green' | 'yellow' | 'red' | 'not_started';
  objective_id: string;
  objective_title: string;
  team_id: string;
  team_name: string;
  user_id: string | null;
  user_name: string | null;
  user_photo: string | null;
}

export interface CycleCheckinsAggregates {
  total_checkins: number;
  krs_on_track_percent: number;
  krs_overdue_count: number;
  total_krs: number;
  krs_with_recent_checkin: number;
  avg_confidence: string;
}

export interface OverdueKr {
  kr_id: string;
  kr_title: string;
  status: 'green' | 'yellow' | 'red' | 'not_started';
  team_id: string;
  team_name: string;
  owner_id: string | null;
  owner_name: string | null;
  owner_photo: string | null;
  last_checkin_at: string | null;
  days_since_checkin: number;
}

interface CycleCheckinsResponse {
  checkins: CheckinFeedItem[];
  aggregates: CycleCheckinsAggregates;
  overdue_krs: OverdueKr[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useCycleCheckins(
  cycleId: string | null | undefined,
  filters: CycleCheckinsFilters = {}
) {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBuId } = useBu();

  // Build filters object for RPC
  const rpcFilters = {
    team_id: filters.teamId || null,
    owner_id: filters.ownerId || null,
    confidence: filters.confidence === 'all' ? null : filters.confidence,
    rag_status: filters.ragStatus === 'all' ? null : filters.ragStatus,
    date_from: filters.dateFrom || null,
    date_to: filters.dateTo || null,
    only_overdue: filters.onlyOverdue || false,
    search: filters.search || '',
    page: filters.page || 1,
    page_size: filters.pageSize || 20,
  };

  return useQuery({
    queryKey: queryKeys.okrs.cycleCheckins(currentBuId, cycleId || undefined, rpcFilters),
    queryFn: async (): Promise<CycleCheckinsResponse> => {
      if (!supabase || !cycleId) {
        return {
          checkins: [],
          aggregates: {
            total_checkins: 0,
            krs_on_track_percent: 0,
            krs_overdue_count: 0,
            total_krs: 0,
            krs_with_recent_checkin: 0,
            avg_confidence: 'medium',
          },
          overdue_krs: [],
          pagination: { page: 1, page_size: 20, total: 0, total_pages: 0 },
        };
      }

      const { data, error } = await supabase.rpc('get_cycle_checkins', {
        p_cycle_id: cycleId,
        p_filters: rpcFilters,
      });

      if (error) throw error;
      
      // The RPC returns JSONB, so data is already parsed
      return data as unknown as CycleCheckinsResponse;
    },
    enabled: !!supabase && !!cycleId && !!currentBuId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================================
// HELPER: Formatar "há X dias"
// ============================================================

export function formatDaysSince(days: number): string {
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 7) return `há ${days} dias`;
  if (days < 14) return "há 1 semana";
  if (days < 30) return `há ${Math.floor(days / 7)} semanas`;
  if (days < 60) return "há 1 mês";
  return `há ${Math.floor(days / 30)} meses`;
}
