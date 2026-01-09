/**
 * Branded Types for Profile ID vs Auth User ID
 * 
 * This module provides type-safe wrappers to prevent mixing up
 * profiles.id (ProfileId) with auth.users.id (AuthUserId).
 * 
 * CONVENTION:
 * - ProfileId: Used in UI, user directories, selects, etc.
 * - AuthUserId: Used in auth contexts, notifications.user_id, RLS checks
 * 
 * The backend (RPCs) should accept ProfileId and resolve AuthUserId internally.
 */

// Branded types using TypeScript's structural typing trick
declare const ProfileIdBrand: unique symbol;
declare const AuthUserIdBrand: unique symbol;

/**
 * ProfileId represents profiles.id
 * Used in UI for identifying people in the business context
 */
export type ProfileId = string & { readonly [ProfileIdBrand]: never };

/**
 * AuthUserId represents auth.users.id
 * Used in authentication contexts and notifications FK
 */
export type AuthUserId = string & { readonly [AuthUserIdBrand]: never };

/**
 * Cast a string to ProfileId (profiles.id)
 * Use when you know the value comes from profiles.id
 */
export function asProfileId(id: string): ProfileId {
  return id as ProfileId;
}

/**
 * Cast a string to AuthUserId (auth.users.id)
 * Use when you know the value comes from auth.users.id or profiles.user_id
 */
export function asAuthUserId(id: string): AuthUserId {
  return id as AuthUserId;
}

/**
 * Type guard to check if a value is a non-null ProfileId
 */
export function isValidProfileId(id: string | null | undefined): id is ProfileId {
  return typeof id === 'string' && id.length > 0;
}

/**
 * Type guard to check if a value is a non-null AuthUserId
 */
export function isValidAuthUserId(id: string | null | undefined): id is AuthUserId {
  return typeof id === 'string' && id.length > 0;
}

/**
 * Profile with typed IDs
 * Standard interface for profile data from v_bu_active_profiles
 */
export interface TypedProfile {
  id: ProfileId;
  user_id: AuthUserId | null; // null if user never logged in
  display_name: string | null;
  work_email: string | null;
  photo_url: string | null;
}

/**
 * Convert a raw profile object to TypedProfile
 */
export function toTypedProfile(raw: {
  id: string;
  user_id: string | null;
  display_name: string | null;
  work_email: string | null;
  photo_url: string | null;
}): TypedProfile {
  return {
    id: asProfileId(raw.id),
    user_id: raw.user_id ? asAuthUserId(raw.user_id) : null,
    display_name: raw.display_name,
    work_email: raw.work_email,
    photo_url: raw.photo_url,
  };
}

/**
 * Check if a profile can receive notifications
 * A profile needs a valid auth user ID to receive notifications
 */
export function canReceiveNotifications(profile: TypedProfile): boolean {
  return profile.user_id !== null;
}

/**
 * Get a human-readable reason why a profile cannot receive notifications
 */
export function getNotificationBlockReason(profile: TypedProfile): string | null {
  if (profile.user_id === null) {
    return 'Usuário ainda não fez login. Não é possível enviar notificações.';
  }
  return null;
}
