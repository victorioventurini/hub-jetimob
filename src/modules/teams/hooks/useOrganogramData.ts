/**
 * useOrganogramData - Hook para buscar dados do organograma
 */
import { useQuery } from "@tanstack/react-query";
import { useOptionalBuClient } from "@/integrations/supabase/getOptionalBuClient";
import { OrganogramNode, OrganogramData } from "../types/organogram";
import { organogramKeys } from "@/lib/queryKeys/organogram";

export function useOrganogramData() {
  const { client: supabase, isReady, buId } = useOptionalBuClient();

  return useQuery({
    queryKey: organogramKeys.data(buId ?? null),
    queryFn: async (): Promise<OrganogramData> => {
      if (!supabase || !buId) {
        return { ceo: null, areas: [] };
      }

      // 1. Buscar CEO (primeiro admin da BU)
      const { data: adminUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("bu_id", buId)
        .eq("role", "admin")
        .limit(1);

      let ceoData: { id: string; display_name: string; photo_url: string | null; work_email: string | null } | null = null;
      if (adminUsers?.[0]?.user_id) {
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, photo_url, work_email")
          .eq("id", adminUsers[0].user_id)
          .maybeSingle();
        ceoData = data;
      }

      // 2. Buscar áreas
      const { data: areasData } = await supabase
        .from("areas")
        .select("id, name, color, leader_user_id")
        .eq("bu_id", buId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name");

      // 3. Buscar times
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, parent_team_id, area_id, leader_user_id")
        .eq("bu_id", buId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name");

      // 4. Buscar membros
      const { data: membersData } = await supabase
        .from("profiles")
        .select("id, display_name, photo_url, work_email, team_id")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .not("team_id", "is", null)
        .order("display_name");

      // 5. Buscar squads
      const { data: squadsData } = await supabase
        .from("squads")
        .select("id, name")
        .eq("bu_id", buId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name");

      // 6. Squad-team links
      const squadIds = (squadsData || []).map(s => s.id);
      const { data: squadTeamsData } = squadIds.length > 0 
        ? await supabase.from("squad_teams").select("squad_id, team_id").in("squad_id", squadIds)
        : { data: [] };

      // Build hierarchy
      const areas = areasData || [];
      const teams = teamsData || [];
      const members = membersData || [];
      const squads = squadsData || [];
      const squadTeams = squadTeamsData || [];

      // Group members by team
      const membersByTeam = new Map<string, typeof members>();
      members.forEach(m => {
        if (m.team_id) {
          const arr = membersByTeam.get(m.team_id) || [];
          arr.push(m);
          membersByTeam.set(m.team_id, arr);
        }
      });

      // Group squads by team
      const squadsByTeam = new Map<string, typeof squads>();
      squadTeams.forEach(st => {
        const squad = squads.find(s => s.id === st.squad_id);
        if (squad) {
          const arr = squadsByTeam.get(st.team_id) || [];
          arr.push(squad);
          squadsByTeam.set(st.team_id, arr);
        }
      });

      // Build team nodes
      const buildTeamNode = (team: typeof teams[0], isSubteam: boolean): OrganogramNode => {
        const teamMembers = membersByTeam.get(team.id) || [];
        const teamSquads = squadsByTeam.get(team.id) || [];
        const subteams = teams.filter(t => t.parent_team_id === team.id);
        
        const children: OrganogramNode[] = [];
        
        subteams.forEach(sub => children.push(buildTeamNode(sub, true)));
        
        teamSquads.forEach(squad => {
          children.push({
            id: squad.id,
            type: 'squad',
            name: squad.name,
            path: `/teams/squads/${squad.id}`,
            children: [],
          });
        });

        if (subteams.length === 0) {
          teamMembers.forEach(member => {
            children.push({
              id: member.id,
              type: 'person',
              name: member.display_name,
              email: member.work_email || undefined,
              photoUrl: member.photo_url,
              path: `/users/${member.id}`,
              children: [],
            });
          });
        }

        return {
          id: team.id,
          type: isSubteam ? 'subteam' : 'team',
          name: team.name,
          path: `/teams/${team.id}`,
          children,
        };
      };

      // Build area nodes
      const areaNodes: OrganogramNode[] = areas.map(area => {
        const areaTeams = teams.filter(t => t.area_id === area.id && !t.parent_team_id);
        return {
          id: area.id,
          type: 'area',
          name: area.name,
          color: area.color,
          path: '/settings/areas',
          children: areaTeams.map(team => buildTeamNode(team, false)),
        };
      });

      // Orphan teams
      const orphanTeams = teams.filter(t => !t.area_id && !t.parent_team_id);
      if (orphanTeams.length > 0) {
        areaNodes.push({
          id: 'no-area',
          type: 'area',
          name: 'Sem Área',
          color: '#6B7280',
          path: '/teams',
          children: orphanTeams.map(team => buildTeamNode(team, false)),
        });
      }

      const ceoNode: OrganogramNode | null = ceoData ? {
        id: ceoData.id,
        type: 'ceo',
        name: ceoData.display_name,
        email: ceoData.work_email || undefined,
        photoUrl: ceoData.photo_url,
        role: 'CEO',
        path: `/users/${ceoData.id}`,
        children: areaNodes,
      } : null;

      return { ceo: ceoNode, areas: ceoNode ? [] : areaNodes };
    },
    enabled: isReady && !!buId && !!supabase,
    staleTime: 2 * 60 * 1000,
  });
}
