/**
 * useSessionAttendance
 *
 * Hook principal do condutor para registrar presença em um rito coletivo.
 * - Lê config declarativa por persona (`attendanceConfig`)
 * - Resolve participantes esperados via `useExpectedAttendanceParticipants`
 * - Carrega registros existentes em `ritual_session_attendance`
 * - Expõe togglePresence / confirm / edit (mutations Tanstack)
 * - Computa `canMark` via permission keys (PERMISSIONS_AND_RBAC_MODEL)
 *
 * Componentes nunca leem role/persona para decidir comportamento — apenas
 * consomem este hook.
 */

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { usePermissions } from '@/hooks/usePermissions';
import { useIdentity } from '@/hooks/useIdentity';
import { attendanceKeys } from '@/lib/queryKeys/attendance';
import { logger } from '@/lib/logger';
import {
  getAttendanceConfig,
  permissionKeyForMarkerRole,
  type AttendanceConfig,
} from '../config/attendanceConfig';
import type { ExpectedParticipant } from '../config/attendanceResolvers';
import { useExpectedAttendanceParticipants } from './useExpectedAttendanceParticipants';
import type { WizardPersona } from '@/modules/okrs/types/wizard';

export interface AttendanceParticipantRow extends ExpectedParticipant {
  /** id da linha em ritual_session_attendance, se já marcado */
  attendanceId: string | null;
  isPresent: boolean;
  markedAt: string | null;
}

export interface UseSessionAttendanceArgs {
  sessionId: string | null;
  persona: WizardPersona;
  buId: string;
  /** Necessário para resolver `team-members` (Check-in do Time) */
  teamId?: string | null;
  /** Necessário para resolver `teams-with-active-okrs` */
  cycleId?: string | null;
  /** Necessário para resolver `qbr-participants` (Pós-QBR) */
  previousQbrSessionId?: string | null;
}

export interface UseSessionAttendanceReturn {
  enabled: boolean;
  config: AttendanceConfig;
  participants: AttendanceParticipantRow[];
  presentCount: number;
  totalCount: number;
  isConfirmed: boolean;
  canMark: boolean;
  isLoading: boolean;
  togglePresence: (profileId: string) => Promise<void>;
  confirm: () => void;
  edit: () => void;
}

interface AttendanceRow {
  id: string;
  participant_profile_id: string;
  participant_name: string;
  participant_role: string | null;
  participant_team_id: string | null;
  participant_team_name: string | null;
  is_present: boolean;
  marked_at: string;
}

export function useSessionAttendance(
  args: UseSessionAttendanceArgs,
): UseSessionAttendanceReturn {
  const { sessionId, persona, buId, teamId, cycleId, previousQbrSessionId } = args;
  const config = getAttendanceConfig(persona);
  const supabase = useBuScopedSupabase();
  const queryClient = useQueryClient();
  const { has, isWildcard } = usePermissions();
  const { profileId } = useIdentity();

  const [confirmedLocally, setConfirmedLocally] = useState(false);

  // ── Permissão: marker role → permission key ──
  const canMark = useMemo(() => {
    if (!config.enabled) return false;
    if (isWildcard) return true;
    if (!config.markerRole) return false;
    return has(permissionKeyForMarkerRole(config.markerRole));
  }, [config.enabled, config.markerRole, isWildcard, has]);

  // ── Esperados ──
  const expected = useExpectedAttendanceParticipants({
    resolver: config.resolver,
    ctx: { buId, teamId, cycleId, previousQbrSessionId },
    enabled: config.enabled && !!sessionId,
  });

  // ── Existentes (banco) ──
  const existing = useQuery({
    queryKey: attendanceKeys.session(sessionId),
    queryFn: async () => {
      if (!sessionId) return [] as AttendanceRow[];
      const { data, error } = await supabase
        .from('ritual_session_attendance')
        .select(
          'id, participant_profile_id, participant_name, participant_role, participant_team_id, participant_team_name, is_present, marked_at',
        )
        .eq('session_id', sessionId)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
    enabled: !!sessionId && config.enabled,
    staleTime: 30 * 1000,
  });

  // ── Composição ──
  const participants = useMemo<AttendanceParticipantRow[]>(() => {
    const byProfile = new Map<string, AttendanceRow>();
    (existing.data ?? []).forEach((r) => byProfile.set(r.participant_profile_id, r));

    return expected.participants.map<AttendanceParticipantRow>((p) => {
      const row = byProfile.get(p.profileId);
      const defaultPresent = config.defaultPresence === 'all';
      return {
        ...p,
        attendanceId: row?.id ?? null,
        isPresent: row ? row.is_present : defaultPresent,
        markedAt: row?.marked_at ?? null,
      };
    });
  }, [expected.participants, existing.data, config.defaultPresence]);

  const presentCount = participants.filter((p) => p.isPresent).length;
  const totalCount = participants.length;

  // ── Mutation: upsert presença ──
  const upsert = useMutation({
    mutationFn: async (input: {
      participant: ExpectedParticipant;
      isPresent: boolean;
      attendanceId: string | null;
    }) => {
      if (!sessionId) throw new Error('sessionId ausente');
      if (!profile?.id) throw new Error('profile ausente');

      const payload = {
        session_id: sessionId,
        bu_id: buId,
        participant_profile_id: input.participant.profileId,
        participant_name: input.participant.name,
        participant_role: input.participant.role,
        participant_team_id: input.participant.teamId,
        participant_team_name: input.participant.teamName,
        is_present: input.isPresent,
        marked_by_profile_id: profile.id,
      };

      if (input.attendanceId) {
        const { error } = await supabase
          .from('ritual_session_attendance')
          .update({ is_present: input.isPresent, marked_by_profile_id: profile.id })
          .eq('id', input.attendanceId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ritual_session_attendance')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.summary(sessionId) });
    },
    onError: (err) => {
      logger.error('useSessionAttendance.upsert failed', err as Error);
    },
  });

  const togglePresence = useCallback(
    async (profileId: string) => {
      if (!canMark) return;
      const row = participants.find((p) => p.profileId === profileId);
      if (!row) return;
      await upsert.mutateAsync({
        participant: row,
        isPresent: !row.isPresent,
        attendanceId: row.attendanceId,
      });
    },
    [canMark, participants, upsert],
  );

  const confirm = useCallback(() => setConfirmedLocally(true), []);
  const edit = useCallback(() => setConfirmedLocally(false), []);

  // Se já existe ao menos 1 registro, consideramos "confirmado" no servidor
  const isConfirmed =
    confirmedLocally || (existing.data?.length ?? 0) > 0;

  return {
    enabled: config.enabled,
    config,
    participants,
    presentCount,
    totalCount,
    isConfirmed,
    canMark,
    isLoading: existing.isLoading || expected.isLoading,
    togglePresence,
    confirm,
    edit,
  };
}
