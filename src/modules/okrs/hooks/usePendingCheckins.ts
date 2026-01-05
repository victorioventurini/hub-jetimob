import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
 * Hook to fetch pending check-ins for the current user
 * Returns KRs that are owned by or co-responsible by the user and need check-ins
 */
export function usePendingCheckins() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-checkins', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Query the view for pending check-ins
      const { data, error } = await supabase
        .from('v_pending_checkins')
        .select('*')
        .or(`owner_user_id.eq.${user.id},co_responsibles.cs.{${user.id}}`);

      if (error) {
        console.error('Error fetching pending checkins:', error);
        throw error;
      }

      return (data || []) as PendingCheckin[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook to fetch all pending check-ins for a team (for team leaders)
 */
export function useTeamPendingCheckins(teamId?: string) {
  return useQuery({
    queryKey: ['team-pending-checkins', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('v_pending_checkins')
        .select('*')
        .eq('team_id', teamId);

      if (error) {
        console.error('Error fetching team pending checkins:', error);
        throw error;
      }

      return (data || []) as PendingCheckin[];
    },
    enabled: !!teamId,
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
