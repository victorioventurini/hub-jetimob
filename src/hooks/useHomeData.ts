/**
 * Hooks para dados da Home - queries reais do banco
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Helper function that accepts supabase client as parameter (DI pattern)
async function fetchTeamsById(
  supabase: SupabaseClient<Database>,
  teamIds: Array<string | null | undefined>
) {
  const uniqueIds = Array.from(new Set(teamIds.filter((id): id is string => !!id)));
  if (uniqueIds.length === 0) return {} as Record<string, string>;

  const { data, error } = await supabase
    .from("teams")
    .select("id, name")
    .is("deleted_at", null)
    .in("id", uniqueIds);

  if (error) throw error;

  return (data || []).reduce<Record<string, string>>((acc, team) => {
    acc[team.id] = team.name;
    return acc;
  }, {});
}


interface NewJetimober {
  id: string;
  name: string;
  jobTitle: string;
  team: string;
  photoUrl?: string;
  startDate: string;
  daysAgo: number;
}

export function useNewJetimobers(limit = 5) {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.home.newJetimobers(currentBu?.id ?? null, limit),
    queryFn: async (): Promise<NewJetimober[]> => {
      // Buscar colaboradores dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Use canonical view for user directory
      let query = supabase
        .from("v_bu_active_profiles")
        .select(
          `
          id,
          display_name,
          job_title_name,
          photo_url,
          start_date,
          team_id
        `
        )
        .gte("start_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("start_date", { ascending: false })
        .limit(limit);

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const teamsById = await fetchTeamsById(supabase, (data || []).map((p) => p.team_id));

      const now = new Date();
      return (data || []).map((profile) => {
        const startDate = new Date(profile.start_date);
        const diffTime = Math.abs(now.getTime() - startDate.getTime());
        const daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: profile.id,
          name: profile.display_name || "Sem nome",
          jobTitle: profile.job_title_name || "Sem cargo",
          team: teamsById[profile.team_id] || "Sem time",
          photoUrl: profile.photo_url || undefined,
          startDate: profile.start_date,
          daysAgo,
        };
      });
    },
  });
}

interface Birthday {
  id: string;
  name: string;
  jobTitle: string;
  team: string;
  photoUrl?: string;
  birthDay: number;
  birthMonth: number;
}

export function useBirthdays() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const currentMonth = new Date().getMonth() + 1;

  return useQuery({
    queryKey: queryKeys.home.birthdays(currentBu?.id ?? null, currentMonth),
    queryFn: async (): Promise<Birthday[]> => {
      // Use canonical view for user directory
      let query = supabase
        .from("v_bu_active_profiles")
        .select(
          `
          id,
          display_name,
          job_title_name,
          photo_url,
          birth_day,
          birth_month,
          team_id
        `
        )
        .eq("birth_month", currentMonth)
        .not("birth_day", "is", null)
        .order("birth_day", { ascending: true });

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const teamsById = await fetchTeamsById(supabase, (data || []).map((p) => p.team_id));

      return (data || []).map((profile) => ({
        id: profile.id,
        name: profile.display_name || "Sem nome",
        jobTitle: profile.job_title_name || "Sem cargo",
        team: teamsById[profile.team_id] || "Sem time",
        photoUrl: profile.photo_url || undefined,
        birthDay: profile.birth_day!,
        birthMonth: profile.birth_month!,
      }));
    },
    enabled: true,
  });
}

interface WorkAnniversary {
  id: string;
  name: string;
  jobTitle: string;
  team: string;
  photoUrl?: string;
  startDate: string;
  yearsAtCompany: number;
  anniversaryDay: number;
}

export function useWorkAnniversaries() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: queryKeys.home.anniversaries(currentBu?.id ?? null, currentMonth),
    queryFn: async (): Promise<WorkAnniversary[]> => {
      // Use canonical view for user directory
      let query = supabase
        .from("v_bu_active_profiles")
        .select(
          `
          id,
          display_name,
          job_title_name,
          photo_url,
          start_date,
          team_id
        `
        )
        .not("start_date", "is", null);

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const teamsById = await fetchTeamsById(supabase, (data || []).map((p) => p.team_id));

      // Filter by current month and exclude current year (no anniversary in first year)
      return (data || [])
        .filter((profile) => {
          const startDate = new Date(profile.start_date);
          const startMonth = startDate.getMonth() + 1;
          const startYear = startDate.getFullYear();
          return startMonth === currentMonth && startYear < currentYear;
        })
        .map((profile) => {
          const startDate = new Date(profile.start_date);
          const yearsAtCompany = currentYear - startDate.getFullYear();

          return {
            id: profile.id,
            name: profile.display_name || "Sem nome",
            jobTitle: profile.job_title_name || "Sem cargo",
            team: teamsById[profile.team_id] || "Sem time",
            photoUrl: profile.photo_url || undefined,
            startDate: profile.start_date,
            yearsAtCompany,
            anniversaryDay: startDate.getDate(),
          };
        })
        .sort((a, b) => a.anniversaryDay - b.anniversaryDay);
    },
  });
}

