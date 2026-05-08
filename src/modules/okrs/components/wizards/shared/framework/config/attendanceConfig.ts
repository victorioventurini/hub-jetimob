/**
 * Attendance Config — SSOT declarativa por persona
 *
 * Define, para cada `WizardPersona`, se o rito tem registro de presença
 * (Step 1 do framework) e como ele deve se comportar.
 *
 * Componentes NÃO leem `wizardType` — apenas consomem essa configuração.
 *
 * Mapeamento markerRole → permission key (PERMISSIONS_AND_RBAC_MODEL):
 * - 'conductor'   → 'okrs.attendance.mark:bu'    (Weekly/MBR/QBR/Pós-QBR)
 * - 'team-leader' → 'okrs.attendance.mark:team'  (Check-in do Time)
 *
 * Admins de BU e plataforma sempre podem marcar (RLS).
 */

import type { WizardPersona } from '@/modules/okrs/types/wizard';

export type ParticipantsResolverId =
  | 'team-members'
  | 'bu-leaders'
  | 'teams-with-active-okrs'
  | 'leaders-plus-c-level'
  | 'qbr-participants';

export type AttendanceMarkerRole = 'conductor' | 'team-leader';

export interface AttendanceConfig {
  /** Quando false, o rito NÃO exibe componente de presença (ritos individuais) */
  enabled: boolean;
  /** Resolver de participantes esperados (somente quando enabled) */
  resolver?: ParticipantsResolverId;
  /** Papel funcional do marcador → traduzido para permission key */
  markerRole?: AttendanceMarkerRole;
  /** 'all' = checkboxes começam marcadas; 'none' = começam desmarcadas */
  defaultPresence?: 'none' | 'all';
  /** Se true, exige clique em "Confirmar presença" antes de avançar */
  requireConfirmation?: boolean;
  /** Se true, permite editar presença depois de confirmada (sessão in_progress) */
  editableAfterConfirmation?: boolean;
}

/** Permission key correspondente a cada marker role */
export const PERMISSION_BY_MARKER_ROLE: Record<AttendanceMarkerRole, string> = {
  conductor: 'okrs.attendance.mark:bu',
  'team-leader': 'okrs.attendance.mark:team',
};

/**
 * Configuração canônica por persona.
 * Adicionar novo rito coletivo = adicionar entrada aqui (sem mexer em componente).
 */
export const ATTENDANCE_CONFIG: Record<WizardPersona, AttendanceConfig> = {
  // ── Coletivos (com presença) ──
  'team-checkin': {
    enabled: true,
    resolver: 'team-members',
    markerRole: 'team-leader',
    defaultPresence: 'all',
    requireConfirmation: false,
    editableAfterConfirmation: true,
  },
  weekly: {
    enabled: true,
    resolver: 'bu-leaders',
    markerRole: 'conductor',
    defaultPresence: 'none',
    requireConfirmation: true,
    editableAfterConfirmation: true,
  },
  mbr: {
    enabled: true,
    resolver: 'teams-with-active-okrs',
    markerRole: 'conductor',
    defaultPresence: 'none',
    requireConfirmation: true,
    editableAfterConfirmation: true,
  },
  'mbr-first': {
    enabled: true,
    resolver: 'teams-with-active-okrs',
    markerRole: 'conductor',
    defaultPresence: 'none',
    requireConfirmation: true,
    editableAfterConfirmation: true,
  },
  'qbr-meeting': {
    enabled: true,
    resolver: 'leaders-plus-c-level',
    markerRole: 'conductor',
    defaultPresence: 'none',
    requireConfirmation: true,
    editableAfterConfirmation: true,
  },
  'qbr-post': {
    enabled: true,
    resolver: 'qbr-participants',
    markerRole: 'conductor',
    defaultPresence: 'none',
    requireConfirmation: true,
    editableAfterConfirmation: true,
  },
  'managers-checkin': {
    enabled: true,
    resolver: 'bu-leaders',
    markerRole: 'conductor',
    defaultPresence: 'none',
    requireConfirmation: true,
    editableAfterConfirmation: true,
  },
  'all-hands': {
    enabled: true,
    resolver: 'bu-leaders',
    markerRole: 'conductor',
    defaultPresence: 'none',
    requireConfirmation: true,
    editableAfterConfirmation: true,
  },

  // ── Individuais (sem presença) ──
  collaborator: { enabled: false },
  'leader-prep': { enabled: false },
  'clevel-checkin': { enabled: false },
  'pre-weekly': { enabled: false },
  'mbr-pre': { enabled: false },
  'mbr-pre-first': { enabled: false },
  'qbr-pre': { enabled: false },
  'qbr-pre-clevel': { enabled: false },
  'team-okr-creation': { enabled: false },
  'team-kr-creation': { enabled: false },
};

export function getAttendanceConfig(persona: WizardPersona): AttendanceConfig {
  return ATTENDANCE_CONFIG[persona] ?? { enabled: false };
}

export function isAttendanceEnabled(persona: WizardPersona): boolean {
  return getAttendanceConfig(persona).enabled;
}

export function permissionKeyForMarkerRole(
  role: AttendanceMarkerRole,
): string {
  return PERMISSION_BY_MARKER_ROLE[role];
}
