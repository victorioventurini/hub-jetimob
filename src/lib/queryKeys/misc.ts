/**
 * Miscellaneous Query Keys
 */
export const homeKeys = {
  dashboard: (buId: string | null, userId: string) => 
    ['home', 'dashboard', buId, userId] as const,
  birthdays: (buId: string | null, period?: number | string) => ['birthdays', buId, period] as const,
  anniversaries: (buId: string | null, period?: number | string) => ['work-anniversaries', buId, period] as const,
  newJetimobers: (buId: string | null, limit?: number) => ['new-jetimobers', buId, limit] as const,
  cultureMessage: () => ['home', 'culture-message'] as const,
  leaderSummary: (buId: string | null, teamId: string | null) => 
    ['home', 'leader-summary', buId, teamId] as const,
  leaderFocus: (buId: string | null, teamId: string | null) => 
    ['home', 'leader-focus', buId, teamId] as const,
  leaderTeams: (buId: string | null, userId: string | null) => 
    ['home', 'leader-teams', buId, userId] as const,
} as const;

export const searchKeys = {
  global: (buId: string | null, query: string) =>
    ['search', 'global', buId, query] as const,
  page: (buId: string | null, query: string, type: string) =>
    ['search', 'page', buId, query, type] as const,
} as const;

export const externalKeys = {
  tickets: (contactId: string | null) => ['external', 'tickets', contactId] as const,
  stats: (contactId: string | null) => ['external', 'stats', contactId] as const,
  companyContext: (companyId: string | null) => ['external', 'company-context', companyId] as const,
  userInfo: (userId: string | null) => ['external', 'user-info', userId] as const,
} as const;

export const usersKeys = {
  all: () => ['users'] as const,
  directory: (buId: string | null, filters?: { q?: string; areaId?: string; teamId?: string; status?: string; includeTerminated?: boolean; excludeExternal?: boolean; page?: number; pageSize?: number }) => 
    ['users', 'directory', buId, filters] as const,
  selectOptions: (buId: string | null) => 
    ['users', 'select-options', buId] as const,
  mentionCandidates: (buId: string | null, q: string) =>
    ['users', 'mention-candidates', buId, { q }] as const,
  ticketMentionCandidates: (buId: string | null, partnerCompanyId: string | null, q: string) =>
    ['users', 'ticket-mention-candidates', buId, partnerCompanyId, { q }] as const,
  globalList: (filters?: { q?: string; buId?: string; onboardingStatus?: string; userType?: string }) =>
    ['users', 'global-list', filters] as const,
  globalDetail: (profileId: string) =>
    ['users', 'global-detail', profileId] as const,
} as const;

export const mentionsKeys = {
  /** Candidates for internal+external context */
  candidates: (buId: string | null, context: string, partnerCompanyId: string | null, q: string) =>
    ['mentions', 'candidates', buId, context, partnerCompanyId, { q }] as const,
  /** Candidates for internal-only context */
  internalCandidates: (buId: string | null, q: string) =>
    ['mentions', 'internal-candidates', buId, { q }] as const,
  /** Mentions by entity (for fetching mentions of a specific message/checkin/etc) */
  byEntity: (entityType: string, entityId: string) =>
    ['mentions', 'by-entity', entityType, entityId] as const,
} as const;

export const cyclesKeys = {
  list: () => ['cycles-list'] as const,
} as const;
