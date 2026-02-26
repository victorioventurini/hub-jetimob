/**
 * Hooks para dados da Home - queries reais do banco
 */

import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";


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
    staleTime: 5 * 60 * 1000, // 5 minutes - data changes rarely
    queryFn: async (): Promise<NewJetimober[]> => {
      // Buscar colaboradores dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Use canonical view for user directory - view already includes team_name via JOIN
      // Filter by user_type = 'internal' AND employment_status != 'external' to show only internal employees
      let query = supabase
        .from("v_bu_active_profiles")
        .select(
          `
          id,
          display_name,
          job_title_name,
          team_name,
          photo_url,
          start_date
        `
        )
        .eq("user_type", "internal") // Only internal users
        .neq("employment_status", "external") // Exclude external employment status
        .gte("start_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("start_date", { ascending: false })
        .limit(limit);

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const now = new Date();
      return (data || []).map((profile) => {
        const startDate = new Date(profile.start_date);
        const diffTime = Math.abs(now.getTime() - startDate.getTime());
        const daysAgo = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: profile.id,
          name: profile.display_name || "Sem nome",
          jobTitle: profile.job_title_name || "Sem cargo",
          team: profile.team_name || "Sem time",
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
  /** Days until birthday (0 = today) */
  daysUntil: number;
}

/**
 * Retorna aniversariantes dos próximos 15 dias
 */
export function useBirthdays() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizar para meia-noite para comparação correta

  return useQuery({
    queryKey: queryKeys.home.birthdays(currentBu?.id ?? null, "next15days"),
    staleTime: 10 * 60 * 1000, // 10 minutes - birthdays don't change
    queryFn: async (): Promise<Birthday[]> => {
      // Fetch all users with birth_day set, then filter client-side for next 15 days
      let query = supabase
        .from("v_bu_active_profiles")
        .select(
          `
          id,
          display_name,
          job_title_name,
          team_name,
          photo_url,
          birth_day,
          birth_month
        `
        )
        .eq("user_type", "internal") // Only internal users
        .neq("employment_status", "external") // Exclude external employment status
        .not("birth_day", "is", null)
        .not("birth_month", "is", null);

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const currentYear = today.getFullYear();

      // Calculate days until birthday and filter next 15 days
      return (data || [])
        .map((profile) => {
          const birthDay = profile.birth_day!;
          const birthMonth = profile.birth_month!;

          // Calculate next birthday
          let birthdayThisYear = new Date(currentYear, birthMonth - 1, birthDay);
          if (birthdayThisYear < today) {
            // Birthday already passed this year, use next year
            birthdayThisYear = new Date(currentYear + 1, birthMonth - 1, birthDay);
          }

          const diffTime = birthdayThisYear.getTime() - today.getTime();
          const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return {
            id: profile.id,
            name: profile.display_name || "Sem nome",
            jobTitle: profile.job_title_name || "Sem cargo",
            team: profile.team_name || "Sem time",
            photoUrl: profile.photo_url || undefined,
            birthDay,
            birthMonth,
            daysUntil,
          };
        })
        .filter((person) => person.daysUntil >= 0 && person.daysUntil <= 15)
        .sort((a, b) => a.daysUntil - b.daysUntil);
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
  anniversaryMonth: number;
  /** Days until anniversary (0 = today) */
  daysUntil: number;
}

/**
 * Retorna aniversários de empresa dos próximos 15 dias
 */
export function useWorkAnniversaries() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizar para meia-noite para comparação correta
  const currentYear = today.getFullYear();

  return useQuery({
    queryKey: queryKeys.home.anniversaries(currentBu?.id ?? null, "next15days"),
    staleTime: 10 * 60 * 1000, // 10 minutes - anniversaries don't change
    queryFn: async (): Promise<WorkAnniversary[]> => {
      // Fetch all users with start_date, then filter client-side
      let query = supabase
        .from("v_bu_active_profiles")
        .select(
          `
          id,
          display_name,
          job_title_name,
          team_name,
          photo_url,
          start_date
        `
        )
        .eq("user_type", "internal") // Only internal users
        .neq("employment_status", "external") // Exclude external employment status
        .not("start_date", "is", null);

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate days until anniversary and filter next 15 days
      return (data || [])
        .map((profile) => {
          const startDate = new Date(profile.start_date);
          const startDay = startDate.getDate();
          const startMonth = startDate.getMonth() + 1;
          const startYear = startDate.getFullYear();

          // Calculate next anniversary
          let anniversaryThisYear = new Date(currentYear, startMonth - 1, startDay);
          let yearsAtCompany = currentYear - startYear;

          if (anniversaryThisYear < today) {
            // Anniversary already passed this year, use next year
            anniversaryThisYear = new Date(currentYear + 1, startMonth - 1, startDay);
            yearsAtCompany = currentYear + 1 - startYear;
          }

          const diffTime = anniversaryThisYear.getTime() - today.getTime();
          const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          return {
            id: profile.id,
            name: profile.display_name || "Sem nome",
            jobTitle: profile.job_title_name || "Sem cargo",
            team: profile.team_name || "Sem time",
            photoUrl: profile.photo_url || undefined,
            startDate: profile.start_date,
            yearsAtCompany,
            anniversaryDay: startDay,
            anniversaryMonth: startMonth,
            daysUntil,
          };
        })
        // Filter: next 15 days AND at least 1 year at company
        .filter((person) => person.daysUntil >= 0 && person.daysUntil <= 15 && person.yearsAtCompany >= 1)
        .sort((a, b) => a.daysUntil - b.daysUntil);
    },
  });
}
