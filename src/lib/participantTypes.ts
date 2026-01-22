// ============================================================
// UNIFIED PARTICIPANT TYPES - Hub da Jet
// ============================================================
// Types and utilities for handling internal users (profiles) and
// external users (partner_contacts) transparently.
// ============================================================

/**
 * Type of participant in the system
 */
export type ParticipantType = 'internal' | 'external';

/**
 * Unified participant interface that abstracts both internal profiles
 * and external partner contacts.
 */
export interface UnifiedParticipant {
  /** Type of user: 'internal' (profile) or 'external' (partner_contact) */
  userType: ParticipantType;
  
  /** Primary identifier (profile.id or partner_contact.id) */
  participantId: string;
  
  /** Auth user ID (may be null for contacts who haven't logged in) */
  authUserId: string | null;
  
  /** Display name */
  displayName: string;
  
  /** Email address */
  email: string;
  
  /** Photo URL (typically null for external) */
  photoUrl: string | null;
  
  /** BU ID this participant belongs to */
  buId: string | null;
  
  /** Partner company ID (only for external) */
  companyId: string | null;
  
  /** Partner company name (only for external) */
  companyName: string | null;
  
  /** Team name (only for internal) */
  teamName: string | null;
  
  /** Job title (only for internal) */
  jobTitle: string | null;
}

/**
 * Minimal participant info for display purposes
 */
export interface ParticipantDisplayInfo {
  participantId: string;
  userType: ParticipantType;
  displayName: string;
  photoUrl: string | null;
  companyName: string | null;
}

// ============================================================
// TYPE GUARDS
// ============================================================

/**
 * Check if participant is internal (profile)
 */
export function isInternalParticipant(participant: UnifiedParticipant | ParticipantDisplayInfo): boolean {
  return participant.userType === 'internal';
}

/**
 * Check if participant is external (partner_contact)
 */
export function isExternalParticipant(participant: UnifiedParticipant | ParticipantDisplayInfo): boolean {
  return participant.userType === 'external';
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Get initials from display name
 */
export function getParticipantInitials(displayName: string): string {
  if (!displayName) return '??';
  
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Get the profile link path for a participant
 */
export function getParticipantProfilePath(participant: UnifiedParticipant | ParticipantDisplayInfo): string {
  if (isInternalParticipant(participant)) {
    return `/users/${participant.participantId}`;
  }
  return `/contacts/${participant.participantId}`;
}

/**
 * Map raw database row to UnifiedParticipant
 */
export function mapToUnifiedParticipant(row: {
  user_type: string;
  participant_id: string;
  auth_user_id: string | null;
  display_name: string;
  email: string;
  photo_url: string | null;
  bu_id: string | null;
  company_id: string | null;
  company_name: string | null;
  team_name: string | null;
  job_title: string | null;
}): UnifiedParticipant {
  return {
    userType: row.user_type as ParticipantType,
    participantId: row.participant_id,
    authUserId: row.auth_user_id,
    displayName: row.display_name,
    email: row.email,
    photoUrl: row.photo_url,
    buId: row.bu_id,
    companyId: row.company_id,
    companyName: row.company_name,
    teamName: row.team_name,
    jobTitle: row.job_title,
  };
}

/**
 * Map UnifiedParticipant to ParticipantDisplayInfo
 */
export function toDisplayInfo(participant: UnifiedParticipant): ParticipantDisplayInfo {
  return {
    participantId: participant.participantId,
    userType: participant.userType,
    displayName: participant.displayName,
    photoUrl: participant.photoUrl,
    companyName: participant.companyName,
  };
}
