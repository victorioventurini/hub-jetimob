import { useQuery } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useIdentity } from '@/hooks/useIdentity';
import { queryKeys } from '@/lib/queryKeys';

export interface PendingCheckin {
  kr_id: string;
  kr_title: string;
  owner_user_id: string | null;
  co_responsibles: string[] | null;
  team_id: string;
  current_value: number;
  target: number;
  baseline: number;
  direction: 'up' | 'down';
  unit: string;
  status: 'green' | 'yellow' | 'red' | 'not_started';
  last_checkin_at: string | null;
  team_name: string;
  checkin_frequency: 'weekly' | 'biweekly';
  checkin_day: number;
  checkin_deadline_hour: number;
  objective_title: string | null;
  objective_id: string | null;
  is_overdue: boolean;
  days_since_checkin: number | null;
  // Shared OKR fields
  is_shared?: boolean;
  primary_team_id?: string;
  primary_team_name?: string;
}

// Get day name in Portuguese
export function getDayName(day: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[day] || 'Segunda';
}

// Check if today is the check-in day for a team
export function isCheckinDay(checkinDay: number): boolean {
  const today = new Date().getDay();
  return today === checkinDay;
}

// Calculate if a check-in is due this week
export function isCheckinDueThisWeek(
  lastCheckinAt: string | null,
  frequency: 'weekly' | 'biweekly',
  checkinDay: number
): boolean {
  if (!lastCheckinAt) return true;
  
  const lastCheckin = new Date(lastCheckinAt);
  const now = new Date();
  const daysSinceCheckin = Math.floor((now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24));
  
  if (frequency === 'weekly') {
    return daysSinceCheckin >= 7;
  } else {
    return daysSinceCheckin >= 14;
  }
}

/**
 * Hook to fetch pending check-ins for the current user (or impersonated user)
 * Returns KRs that are owned by or co-responsible by the user and need check-ins
 * 
 * Suporta impersonação: quando super_admin está simulando, mostra check-ins do usuário impersonado
 */
export function usePendingCheckins() {
  const { profileId, isImpersonating } = useIdentity();
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: isImpersonating 
      ? [...queryKeys.okrs.pendingCheckins(buId, undefined), 'impersonated', profileId]
      : queryKeys.okrs.pendingCheckins(buId, undefined),
    queryFn: async () => {
      if (!profileId || !supabase) return [];

      // Query the view for pending check-ins with explicit fields
      const { data, error } = await supabase
        .from('v_pending_checkins')
        .select('kr_id, kr_title, owner_user_id, co_responsibles, team_id, current_value, target, baseline, direction, unit, status, last_checkin_at, team_name, checkin_frequency, checkin_day, checkin_deadline_hour, objective_title, objective_id, is_overdue, days_since_checkin')
        .or(`owner_user_id.eq.${profileId},co_responsibles.cs.{${profileId}}`);

      if (error) {
        console.error('Error fetching pending checkins:', error);
        throw error;
      }

      return (data || []) as PendingCheckin[];
    },
    enabled: !!profileId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch all pending check-ins for a team (for team leaders)
 */
export function useTeamPendingCheckins(teamId?: string) {
  const { client: supabase, isReady, buId } = useOptionalBuClient();
  
  return useQuery({
    queryKey: queryKeys.okrs.pendingCheckins(buId, teamId),
    queryFn: async () => {
      if (!teamId || !supabase) return [];

      const { data, error } = await supabase
        .from('v_pending_checkins')
        .select('kr_id, kr_title, owner_user_id, co_responsibles, team_id, current_value, target, baseline, direction, unit, status, last_checkin_at, team_name, checkin_frequency, checkin_day, checkin_deadline_hour, objective_title, objective_id, is_overdue, days_since_checkin')
        .eq('team_id', teamId);

      if (error) {
        console.error('Error fetching team pending checkins:', error);
        throw error;
      }

      return (data || []) as PendingCheckin[];
    },
    enabled: !!teamId && isReady && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get check-in status summary for the current user
 */
export function useCheckinSummary() {
  const { data: pendingCheckins, isLoading } = usePendingCheckins();

  const summary = {
    total: pendingCheckins?.length || 0,
    overdue: pendingCheckins?.filter(c => c.is_overdue).length || 0,
    dueThisWeek: pendingCheckins?.filter(c => 
      isCheckinDueThisWeek(c.last_checkin_at, c.checkin_frequency, c.checkin_day)
    ).length || 0,
    upToDate: pendingCheckins?.filter(c => !c.is_overdue).length || 0,
  };

  return { summary, isLoading };
}
