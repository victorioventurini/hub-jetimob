/**
 * Hooks para dados da Home - queries reais do banco
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";

interface QuickStatsData {
  totalProfiles: number;
  newProfilesThisMonth: number;
  totalTeams: number;
  activeOkrs: number;
  completedKrsPercentage: number;
}

export function useQuickStats() {
  const { currentBu } = useBu();

  return useQuery({
    queryKey: ["quick-stats", currentBu?.id],
    queryFn: async (): Promise<QuickStatsData> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch profiles count
      let profilesQuery = supabase
        .from("profiles")
        .select("id, created_at", { count: "exact", head: false })
        .is("deleted_at", null)
        .eq("employment_status", "active");

      if (currentBu?.id) {
        profilesQuery = profilesQuery.eq("bu_id", currentBu.id);
      }

      const { data: profiles, count: totalProfiles } = await profilesQuery;

      // Count new profiles this month
      const newProfilesThisMonth =
        profiles?.filter(
          (p) => new Date(p.created_at) >= startOfMonth
        ).length || 0;

      // Fetch teams count
      let teamsQuery = supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("status", "active");

      if (currentBu?.id) {
        teamsQuery = teamsQuery.eq("bu_id", currentBu.id);
      }

      const { count: totalTeams } = await teamsQuery;

      // Fetch active OKRs (org objectives)
      let okrsQuery = supabase
        .from("okr_org_objectives")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null)
        .eq("year", now.getFullYear());

      if (currentBu?.id) {
        okrsQuery = okrsQuery.eq("bu_id", currentBu.id);
      }

      const { count: activeOkrs } = await okrsQuery;

      // Fetch team KRs for completion percentage
      let krsQuery = supabase
        .from("okr_team_key_results")
        .select("id, status")
        .is("deleted_at", null);

      if (currentBu?.id) {
        krsQuery = krsQuery.eq("bu_id", currentBu.id);
      }

      const { data: krs } = await krsQuery;

      const completedKrs = krs?.filter((kr) => kr.status === "green").length || 0;
      const totalKrs = krs?.length || 0;
      const completedKrsPercentage =
        totalKrs > 0 ? Math.round((completedKrs / totalKrs) * 100) : 0;

      return {
        totalProfiles: totalProfiles || 0,
        newProfilesThisMonth,
        totalTeams: totalTeams || 0,
        activeOkrs: activeOkrs || 0,
        completedKrsPercentage,
      };
    },
    enabled: true,
  });
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

  return useQuery({
    queryKey: ["new-jetimobers", currentBu?.id, limit],
    queryFn: async (): Promise<NewJetimober[]> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let query = supabase
        .from("profiles")
        .select(
          `
          id,
          display_name,
          job_title,
          photo_url,
          start_date,
          team:teams(name)
        `
        )
        .is("deleted_at", null)
        .eq("employment_status", "active")
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
          jobTitle: profile.job_title || "Sem cargo",
          team: (profile.team as { name: string } | null)?.name || "Sem time",
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
  const currentMonth = new Date().getMonth() + 1;

  return useQuery({
    queryKey: ["birthdays", currentBu?.id, currentMonth],
    queryFn: async (): Promise<Birthday[]> => {
      let query = supabase
        .from("profiles")
        .select(
          `
          id,
          display_name,
          job_title,
          photo_url,
          birth_day,
          birth_month,
          team:teams(name)
        `
        )
        .is("deleted_at", null)
        .eq("employment_status", "active")
        .eq("birth_month", currentMonth)
        .not("birth_day", "is", null)
        .order("birth_day", { ascending: true });

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((profile) => ({
        id: profile.id,
        name: profile.display_name || "Sem nome",
        jobTitle: profile.job_title || "Sem cargo",
        team: (profile.team as { name: string } | null)?.name || "Sem time",
        photoUrl: profile.photo_url || undefined,
        birthDay: profile.birth_day!,
        birthMonth: profile.birth_month!,
      }));
    },
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
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ["work-anniversaries", currentBu?.id, currentMonth],
    queryFn: async (): Promise<WorkAnniversary[]> => {
      // Fetch profiles with start_date in current month (any year)
      let query = supabase
        .from("profiles")
        .select(
          `
          id,
          display_name,
          job_title,
          photo_url,
          start_date,
          team:teams(name)
        `
        )
        .is("deleted_at", null)
        .eq("employment_status", "active")
        .not("start_date", "is", null);

      if (currentBu?.id) {
        query = query.eq("bu_id", currentBu.id);
      }

      const { data, error } = await query;

      if (error) throw error;

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
            jobTitle: profile.job_title || "Sem cargo",
            team: (profile.team as { name: string } | null)?.name || "Sem time",
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

interface ModuleItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  status: string;
}

export function useModules() {
  return useQuery({
    queryKey: ["modules-home"],
    queryFn: async (): Promise<ModuleItem[]> => {
      const { data, error } = await supabase
        .from("modules")
        .select("id, name, description, icon, route, status")
        .in("status", ["active", "coming_soon"])
        .order("display_order", { ascending: true })
        .limit(6);

      if (error) throw error;

      return (data || []).map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description || "",
        icon: m.icon || "box",
        route: m.route || "/",
        status: m.status,
      }));
    },
  });
}
