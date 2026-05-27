/**
 * useExpectedAttendanceParticipants
 *
 * Resolve a lista de "participantes esperados" para um rito coletivo,
 * conforme `ParticipantsResolverId` declarado em `attendanceConfig.ts`.
 *
 * Estratégia: cada resolver mapeia para uma fonte de dados existente no Next
 * (useBuUsersDirectory, useHierarchicalTeamList, useCompanyOkrs etc.) — não
 * duplicamos queries. A composição final é feita no hook.
 *
 * Use APENAS dentro do framework. Componentes consomem via
 * `useSessionAttendance` (que já chama isto internamente).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOptionalBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { useBuUsersDirectory } from '@/hooks/useBuUsersDirectory';
import { useTeams } from '@/modules/teams/hooks';
import type {
  ExpectedParticipant,
  AttendanceResolverContext,
} from '../config/attendanceResolvers';
import type { ParticipantsResolverId } from '../config/attendanceConfig';

interface UseExpectedAttendanceParticipantsArgs {
  resolver: ParticipantsResolverId | undefined;
  ctx: AttendanceResolverContext;
  enabled?: boolean;
}

interface UseExpectedAttendanceParticipantsReturn {
  participants: ExpectedParticipant[];
  isLoading: boolean;
  error: unknown;
}

/**
 * Resolve participantes esperados para um rito coletivo.
 * Quando `resolver` é undefined ou desabilitado, retorna lista vazia.
 */
export function useExpectedAttendanceParticipants({
  resolver,
  ctx,
  enabled = true,
}: UseExpectedAttendanceParticipantsArgs): UseExpectedAttendanceParticipantsReturn {
  const supabase = useOptionalBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? ctx.buId;

  // ── Fonte: membros do time (Check-in do Time) ──
  const teamMembers = useBuUsersDirectory({
    teamId: ctx.teamId ?? undefined,
    includeSubteams: true,
    enabled: enabled && resolver === 'team-members' && !!ctx.teamId,
    pageSize: 200,
  });

  // ── Fonte: líderes da BU (Weekly / Managers Check-in / MBR / QBR) ──
  // useTeams traz cada time com `leader: { id, display_name }` (profile_id)
  const teamList = useTeams(false);
  const buLeadersEnabled =
    enabled &&
    (resolver === 'bu-leaders' ||
      resolver === 'leaders-plus-c-level' ||
      resolver === 'teams-with-active-okrs');

  // ── Fonte: participantes da última sessão de QBR (Pós-QBR) ──
  const previousQbrParticipants = useQuery({
    queryKey: [
      'attendance',
      'previous-qbr-participants',
      buId,
      ctx.previousQbrSessionId ?? null,
    ],
    queryFn: async () => {
      if (!supabase || !ctx.previousQbrSessionId) return [];
      const { data, error } = await supabase
        .from('ritual_session_attendance')
        .select(
          'participant_profile_id, participant_name, participant_role, participant_team_id, participant_team_name',
        )
        .eq('session_id', ctx.previousQbrSessionId)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []).map<ExpectedParticipant>((r) => ({
        profileId: r.participant_profile_id,
        name: r.participant_name,
        role: r.participant_role ?? null,
        teamId: r.participant_team_id ?? null,
        teamName: r.participant_team_name ?? null,
      }));
    },
    enabled:
      enabled && resolver === 'qbr-participants' && !!ctx.previousQbrSessionId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Composição ──
  const participants = useMemo<ExpectedParticipant[]>(() => {
    if (!resolver) return [];

    switch (resolver) {
      case 'team-members': {
        return (teamMembers.data ?? [])
          .filter((p) => p.employment_status !== 'terminated')
          .map<ExpectedParticipant>((p) => ({
            profileId: p.id,
            name: p.display_name || `${p.first_name} ${p.last_name}`.trim(),
            role: p.job_title_name,
            teamId: p.team_id,
            teamName: p.team_name,
          }));
      }

      case 'bu-leaders':
      case 'teams-with-active-okrs': {
        // Líderes únicos da BU (filtra times sem líder)
        const seen = new Set<string>();
        return (teamList.data ?? [])
          .filter((t) => !!t.leader_user_id && !seen.has(t.leader_user_id) && (seen.add(t.leader_user_id), true))
          .map<ExpectedParticipant>((t) => ({
            profileId: t.leader_user_id as string,
            name: t.leader?.display_name ?? 'Líder',
            role: 'Líder de Time',
            teamId: t.id,
            teamName: t.name,
          }));
      }

      case 'leaders-plus-c-level': {
        // Por ora: líderes únicos. C-Level pode ser somado em uma evolução
        // posterior via permission key dedicada (cycles.clevel:participate).
        const seen = new Set<string>();
        return (teamList.data ?? [])
          .filter((t) => !!t.leader_user_id && !seen.has(t.leader_user_id) && (seen.add(t.leader_user_id), true))
          .map<ExpectedParticipant>((t) => ({
            profileId: t.leader_user_id as string,
            name: t.leader?.display_name ?? 'Líder',
            role: 'Líder de Time',
            teamId: t.id,
            teamName: t.name,
          }));
      }

      case 'qbr-participants':
        return previousQbrParticipants.data ?? [];

      default:
        return [];
    }
  }, [resolver, teamMembers.data, teamList.data, previousQbrParticipants.data]);

  const isLoading =
    (resolver === 'team-members' && teamMembers.isLoading) ||
    (buLeadersEnabled && teamList.isLoading) ||
    (resolver === 'qbr-participants' && previousQbrParticipants.isLoading);

  const error =
    teamMembers.error ?? teamList.error ?? previousQbrParticipants.error ?? null;

  return { participants, isLoading: !!isLoading, error };
}
