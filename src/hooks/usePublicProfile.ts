import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBu } from "@/contexts/BuContext";

export interface PublicProfile {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  work_email: string;
  job_title: string;
  photo_url: string | null;
  city: string;
  state: string;
  work_mode: "onsite" | "hybrid" | "remote";
  employment_status: "active" | "vacation" | "terminated";
  start_date: string;
  team_id: string | null;
  team: { id: string; name: string } | null;
  manager: { id: string; display_name: string; photo_url: string | null } | null;
  bu_id: string | null;
}

export function usePublicProfile(profileId?: string) {
  const { currentBu } = useBu();

  return useQuery({
    queryKey: ["public-profile", profileId, currentBu?.id],
    queryFn: async () => {
      if (!profileId || !currentBu?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          first_name,
          last_name,
          display_name,
          work_email,
          job_title,
          photo_url,
          city,
          state,
          work_mode,
          employment_status,
          start_date,
          team_id,
          bu_id,
          manager_user_id,
          team:teams!fk_profiles_team(id, name)
        `)
        .eq("id", profileId)
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) throw error;

      // Fetch manager separately if exists
      let manager = null;
      if (data?.manager_user_id) {
        const { data: managerData } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url")
          .eq("id", data.manager_user_id)
          .maybeSingle();
        manager = managerData;
      }
      
      return data ? { ...data, manager } as PublicProfile : null;
    },
    enabled: !!profileId && !!currentBu?.id,
  });
}

export function useUserOkrs(userId?: string) {
  const { currentBu } = useBu();

  return useQuery({
    queryKey: ["user-okrs", userId, currentBu?.id],
    queryFn: async () => {
      if (!userId || !currentBu?.id) return { objectives: [], keyResults: [] };

      // Fetch team objectives where user is owner
      const { data: objectives, error: objError } = await supabase
        .from("okr_team_objectives")
        .select(`
          id,
          title,
          status,
          is_shared,
          team_id,
          team:teams!okr_team_objectives_team_id_fkey(id, name),
          key_results:okr_team_key_results(id, title, status, current_value, target, baseline, direction)
        `)
        .eq("owner_user_id", userId)
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null);

      if (objError) throw objError;

      // Fetch key results where user is owner or co-responsible
      const { data: krs, error: krError } = await supabase
        .from("okr_team_key_results")
        .select(`
          id,
          title,
          status,
          current_value,
          target,
          baseline,
          direction,
          last_checkin_at,
          team_id,
          team:teams!okr_team_key_results_team_id_fkey(id, name),
          objective:okr_team_objectives!okr_team_key_results_team_objective_id_fkey(id, title)
        `)
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null)
        .or(`owner_user_id.eq.${userId},co_responsibles.cs.{${userId}}`);

      if (krError) throw krError;

      return {
        objectives: objectives || [],
        keyResults: krs || [],
      };
    },
    enabled: !!userId && !!currentBu?.id,
  });
}

export function useUserKpis(userId?: string) {
  const { currentBu } = useBu();

  return useQuery({
    queryKey: ["user-kpis", userId, currentBu?.id],
    queryFn: async () => {
      if (!userId || !currentBu?.id) return [];

      const { data, error } = await supabase
        .from("kpi_metrics")
        .select(`
          id,
          name,
          status,
          target_value,
          unit,
          team:teams!kpi_metrics_team_id_fkey(id, name),
          values:kpi_values(value, reference_date)
        `)
        .eq("owner_user_id", userId)
        .eq("bu_id", currentBu.id)
        .is("deleted_at", null)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && !!currentBu?.id,
  });
}

export function useUserSquads(userId?: string) {
  return useQuery({
    queryKey: ["user-squads", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("squad_memberships")
        .select(`
          id,
          role,
          squad:squads!squad_memberships_squad_id_fkey(
            id,
            name,
            description,
            team_id,
            team:teams!squads_team_id_fkey(id, name)
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useUserBuMemberships(userId?: string) {
  return useQuery({
    queryKey: ["user-bu-memberships", userId],
    queryFn: async () => {
      if (!userId) return [];

      // Get profile to find user_id (auth id)
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", userId)
        .single();

      if (!profile?.user_id) return [];

      const { data, error } = await supabase
        .from("bu_user_memberships")
        .select(`
          id,
          role_in_bu,
          bu:bu_units!bu_user_memberships_bu_id_fkey(id, name, logo_url)
        `)
        .eq("user_id", profile.user_id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}
