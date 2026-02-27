import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { queryKeys } from "@/lib/queryKeys";

export interface PublicProfile {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  display_name: string;
  work_email: string;
  job_title: string;  // Mapped from job_titles join
  photo_url: string | null;
  city: string;
  state: string;
  work_mode: "onsite" | "hybrid" | "remote";
  employment_status: "active" | "vacation" | "terminated" | "external";
  start_date: string;
  team_id: string | null;
  team: { id: string; name: string } | null;
  manager: { id: string; display_name: string; photo_url: string | null } | null;
  bu_id: string | null;
  // Additional fields
  birth_day: number | null;
  birth_month: number | null;
  whatsapp_personal: string | null;
  instagram_id: string | null;
  discord_id: string | null;
}

export function usePublicProfile(profileId?: string) {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.publicProfile.profile(profileId ?? null, currentBu?.id ?? null),
    queryFn: async () => {
      if (!profileId || !currentBu?.id) return null;

      // Use secure function that applies field-level privacy controls
      // Sensitive contact data (WhatsApp, Instagram, Discord) only visible for own profile
      // Birthday data visible to all BU members (business decision for internal communication)
      const { data, error } = await supabase
        .rpc("get_profile_with_privacy", { p_profile_id: profileId });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const profileData = data[0];
      
      // Verify BU visibility via canonical view (User Directory Global v2)
      const { data: directoryCheck } = await supabase
        .from("v_bu_active_profiles")
        .select("id")
        .eq("id", profileData.id)
        .eq("bu_id", currentBu.id)
        .maybeSingle();
      
      if (!directoryCheck) return null;

      // Fetch team data
      let team = null;
      if (profileData.team_id) {
        const { data: teamData } = await supabase
          .from("teams")
          .select("id, name")
          .eq("id", profileData.team_id)
          .maybeSingle();
        team = teamData;
      }

      // Fetch job title
      let jobTitle = "Sem cargo";
      if (profileData.job_title_id) {
        const { data: jobTitleData } = await supabase
          .from("job_titles")
          .select("name")
          .eq("id", profileData.job_title_id)
          .maybeSingle();
        if (jobTitleData) jobTitle = jobTitleData.name;
      }

      // Fetch manager separately if exists
      let manager = null;
      if (profileData.manager_user_id) {
        const { data: managerData } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url")
          .eq("id", profileData.manager_user_id)
          .maybeSingle();
        manager = managerData;
      }

      // Fetch membership job title override (BU-specific job title)
      // Priority: membership.job_title_id > profile.job_title_id
      if (profileData.user_id) {
        const { data: membershipData } = await supabase
          .from("bu_user_memberships")
          .select("job_title_id, job_title:job_titles!bu_user_memberships_job_title_id_fkey(name)")
          .eq("profile_id", profileId)
          .eq("bu_id", currentBu.id)
          .is("deleted_at", null)
          .maybeSingle();
        
        // If membership has a specific job title, use it
        if (membershipData?.job_title_id && membershipData?.job_title) {
          jobTitle = (membershipData.job_title as { name: string }).name;
        }
      }
      
      return { 
        id: profileData.id,
        user_id: profileData.user_id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        display_name: profileData.display_name,
        work_email: profileData.work_email,
        photo_url: profileData.photo_url,
        city: profileData.city,
        state: profileData.state,
        work_mode: profileData.work_mode as "onsite" | "hybrid" | "remote",
        employment_status: profileData.employment_status as "active" | "vacation" | "terminated" | "external",
        start_date: profileData.start_date,
        team_id: profileData.team_id,
        bu_id: profileData.bu_id,
        birth_day: profileData.birth_day,
        birth_month: profileData.birth_month,
        // Sensitive fields - will be null unless viewing own profile
        whatsapp_personal: profileData.whatsapp_personal,
        instagram_id: profileData.instagram_id,
        discord_id: profileData.discord_id,
        team,
        manager,
        job_title: jobTitle,
      } as PublicProfile;
    },
    enabled: !!profileId && !!currentBu?.id,
  });
}

export function useUserOkrs(userId?: string) {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.publicProfile.okrs(userId ?? null, currentBu?.id ?? null),
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
  const supabase = useBuScopedSupabase();

  return useQuery({
    queryKey: queryKeys.publicProfile.kpis(userId ?? null, currentBu?.id ?? null),
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
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  
  return useQuery({
    queryKey: queryKeys.publicProfile.squads(userId ?? null, currentBu?.id ?? null),
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
            team:teams!squads_team_id_fkey(id, name, bu_id)
          )
        `)
        .eq("user_id", userId)
        .is("deleted_at", null);

      if (error) throw error;
      // Filter squads to only those belonging to current BU
      return (data || []).filter((m: any) => m.squad?.team?.bu_id === currentBu?.id);
    },
    enabled: !!userId && !!currentBu?.id,
  });
}

export function useUserBuMemberships(profileId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.publicProfile.buMemberships(profileId ?? null),
    queryFn: async () => {
      if (!profileId) return [];

      // Query directly by profile_id (Identity Cutover v3.0)
      const { data, error } = await supabase
        .from("bu_user_memberships")
        .select(`
          id,
          role_in_bu,
          bu:bu_units!bu_user_memberships_bu_id_fkey(id, name, logo_url)
        `)
        .eq("profile_id", profileId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
  });
}
