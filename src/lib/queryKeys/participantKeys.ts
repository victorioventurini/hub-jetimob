// ============================================================
// PARTICIPANT QUERY KEYS - Hub da Jet
// ============================================================
// Centralized query keys for the Unified Participant Layer.
// ============================================================

export interface ParticipantFilters {
  /** Search by name or email */
  q?: string;
  /** Include external participants */
  includeExternal?: boolean;
  /** Filter by company ID (external only) */
  companyId?: string;
  /** Filter by team ID (internal only) */
  teamId?: string;
}

export const participantKeys = {
  /**
   * Root key for all participant queries
   */
  all: (buId: string | null) => ['participants', buId] as const,

  /**
   * Prefix for list queries (useful for invalidation)
   */
  listPrefix: (buId: string | null) => ['participants', 'list', buId] as const,

  /**
   * List of participants with optional filters
   */
  list: (buId: string | null, filters?: ParticipantFilters) => 
    [...participantKeys.listPrefix(buId), filters] as const,

  /**
   * Single participant by ID
   */
  detail: (participantId: string | null) => 
    ['participant', participantId] as const,

  /**
   * Resolve participant identity
   */
  resolve: (participantId: string | null, buId: string | null) =>
    ['participant', 'resolve', participantId, buId] as const,

  /**
   * Contact hover card data
   */
  contactHoverCard: (contactId: string | null) =>
    ['participant', 'contact-hover', contactId] as const,
} as const;
