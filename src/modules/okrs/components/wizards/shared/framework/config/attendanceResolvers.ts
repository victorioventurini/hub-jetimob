/**
 * Attendance Resolvers — tipos e contratos
 *
 * A resolução real (busca de participantes esperados) acontece no hook
 * `useExpectedAttendanceParticipants`, que escolhe a fonte de dados conforme
 * `ParticipantsResolverId` declarado em `attendanceConfig.ts`.
 *
 * Mantemos APENAS contratos puros aqui — sem dependência de Supabase ou React.
 */

import type { ParticipantsResolverId } from './attendanceConfig';

/** Participante esperado (output do resolver) */
export interface ExpectedParticipant {
  /** profile.id (IDENTITY_CONVENTION v2.2) */
  profileId: string;
  /** Snapshot textual no momento da resolução */
  name: string;
  role: string | null;
  teamId: string | null;
  teamName: string | null;
}

/** Contexto necessário para resolver participantes */
export interface AttendanceResolverContext {
  buId: string;
  /** Para resolver `team-members` (Check-in do Time) */
  teamId?: string | null;
  /** Para resolver `teams-with-active-okrs` e `qbr-participants` */
  cycleId?: string | null;
  /** Para resolver `qbr-participants` (sessão anterior do QBR) */
  previousQbrSessionId?: string | null;
}

export type ResolverFn = (
  ctx: AttendanceResolverContext,
) => Promise<ExpectedParticipant[]>;

/** Mapa estável dos resolvers conhecidos (preenchido no hook) */
export type ResolverRegistry = Record<ParticipantsResolverId, ResolverFn>;
