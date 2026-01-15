/**
 * useOrganogramData - Hook para buscar dados do organograma
 */
import { useQuery } from "@tanstack/react-query";
import { useBuScopedSupabase } from "@/integrations/supabase/useBuScopedSupabase";
import { useBu } from "@/contexts/BuContext";
import { OrganogramNode, OrganogramData } from "../types/organogram";
import { organogramKeys } from "@/lib/queryKeys/organogram";

type ProfileData = { id: string; display_name: string; photo_url: string | null; work_email: string | null };
type AreaRow = { id: string; name: string; color: string | null; leader_user_id: string | null };
type TeamRow = { id: string; name: string; parent_team_id: string | null; area_id: string | null; leader_user_id: string | null };
type MemberRow = { id: string; display_name: string; photo_url: string | null; work_email: string | null; team_id: string | null };
type SquadRow = { id: string; name: string };
type SquadTeamRow = { squad_id: string; team_id: string };

export function useOrganogramData() {
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  const buId = currentBu?.id ?? null;

  return useQuery({
    queryKey: organogramKeys.data(buId),
    queryFn: async (): Promise<OrganogramData> => {
      if (!buId) return { ceo: null, areas: [] };

      // Use any to avoid deep type instantiation issues
      const db = supabase as any;

      // 1. Buscar CEO (victorio@jetimob.com ou primeiro super_admin)
      let ceoData: ProfileData | null = null;
      
      // Primeiro tenta buscar victorio como CEO
      const { data: victorioData } = await db
        .from("profiles")
        .select("id, display_name, photo_url, work_email")
        .eq("work_email", "victorio@jetimob.com")
        .eq("bu_id", buId)
        .maybeSingle();
      
      if (victorioData) {
        ceoData = victorioData as ProfileData;
      } else {
        // Fallback: buscar primeiro super_admin global
        const { data: adminData } = await db
          .from("user_roles")
          .select("user_id")
          .eq("role", "super_admin")
          .limit(1);

        const adminUsers = (adminData ?? []) as { user_id: string }[];

        if (adminUsers[0]?.user_id) {
          const { data } = await db
            .from("profiles")
            .select("id, display_name, photo_url, work_email")
            .eq("id", adminUsers[0].user_id)
            .maybeSingle();
          ceoData = data as ProfileData | null;
        }
      }

      // 2. Buscar áreas
      const { data: areasData } = await db
        .from("areas")
        .select("id, name, color, leader_user_id")
        .eq("bu_id", buId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name");

      const areas = (areasData ?? []) as AreaRow[];

      // 3. Buscar times
      const { data: teamsData } = await db
        .from("teams")
        .select("id, name, parent_team_id, area_id, leader_user_id")
        .eq("bu_id", buId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name");

      const teams = (teamsData ?? []) as TeamRow[];

      // 4. Buscar membros
      const { data: membersData } = await db
        .from("profiles")
        .select("id, display_name, photo_url, work_email, team_id")
        .eq("bu_id", buId)
        .is("deleted_at", null)
        .not("team_id", "is", null)
        .order("display_name");

      const members = (membersData ?? []) as MemberRow[];

      // 5. Buscar squads
      const { data: squadsData } = await db
        .from("squads")
        .select("id, name")
        .eq("bu_id", buId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name");

      const squads = (squadsData ?? []) as SquadRow[];

      // 6. Squad-team links
      const squadIds = squads.map(s => s.id);
      let squadTeams: SquadTeamRow[] = [];
      if (squadIds.length > 0) {
        const { data: stData } = await db
          .from("squad_teams")
          .select("squad_id, team_id")
          .in("squad_id", squadIds);
        squadTeams = (stData ?? []) as SquadTeamRow[];
      }

      // 7. Buscar líderes de times
      const leaderIds = [...new Set(teams.map(t => t.leader_user_id).filter(Boolean))] as string[];
      const leadersMap = new Map<string, ProfileData>();
      if (leaderIds.length > 0) {
        const { data: leadersData } = await db
          .from("profiles")
          .select("id, display_name, photo_url, work_email")
          .in("id", leaderIds);
        ((leadersData ?? []) as ProfileData[]).forEach(l => leadersMap.set(l.id, l));
      }

      // Group members by team
      const membersByTeam = new Map<string, MemberRow[]>();
      members.forEach(m => {
        if (m.team_id) {
          const arr = membersByTeam.get(m.team_id) || [];
          arr.push(m);
          membersByTeam.set(m.team_id, arr);
        }
      });

      // Group squads by team
      const squadsByTeam = new Map<string, SquadRow[]>();
      squadTeams.forEach(st => {
        const squad = squads.find(s => s.id === st.squad_id);
        if (squad) {
          const arr = squadsByTeam.get(st.team_id) || [];
          arr.push(squad);
          squadsByTeam.set(st.team_id, arr);
        }
      });

      // Build team nodes
      const buildTeamNode = (team: TeamRow, isSubteam: boolean): OrganogramNode => {
        const teamMembers = membersByTeam.get(team.id) || [];
        const teamSquads = squadsByTeam.get(team.id) || [];
        const subteams = teams.filter(t => t.parent_team_id === team.id);
        const leader = team.leader_user_id ? leadersMap.get(team.leader_user_id) : null;
        
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

        // Sempre mostrar membros do time (mesmo que tenha subtimes)
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

        return {
          id: team.id,
          type: isSubteam ? 'subteam' : 'team',
          name: team.name,
          path: `/teams/${team.id}`,
          children,
          // Leader info
          leaderName: leader?.display_name,
          leaderPhotoUrl: leader?.photo_url,
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
    enabled: !!buId,
    staleTime: 2 * 60 * 1000,
  });
}
