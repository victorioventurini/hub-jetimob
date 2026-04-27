/**
 * Teams & Squads Query Keys
 */
export const teamsKeys = {
  all: (buId: string | null) => ['teams', buId] as const,
  list: (buId: string | null, includeInactive = false) => ['teams', 'list', buId, includeInactive] as const,
  /**
   * BU-scoped detail key — inclui buId para evitar reuso de cache cross-BU.
   * Use detailPrefix(teamId) para invalidar todas as variantes.
   */
  detail: (teamId: string | undefined, buId?: string | null) => ['team', teamId, buId ?? null] as const,
  detailPrefix: (teamId: string | undefined) => ['team', teamId] as const,
  members: (teamId: string) => ['teams', 'members', teamId] as const,
  availableLeaders: (buId: string | null) => ['available-leaders', buId] as const,
  // v2.82.0: Team area for auto-inference
  area: (teamId: string | undefined) => ['teams', 'area', teamId] as const,
  // v2.94.0: Teams by area filter
  byArea: (buId: string | null, areaId: string | null) => ['teams', 'by-area', buId, areaId] as const,
  // v3.x: Contribution tab analytics aggregator
  contributionAnalytics: (
    teamId: string | null,
    buId: string | null,
    includeSubteams: boolean,
    cycleId?: string | null
  ) => ['teams', 'contribution-analytics', teamId, buId, includeSubteams, cycleId ?? null] as const,
  contributionSubteamIds: (teamId: string | null, includeSubteams: boolean) =>
    ['teams', 'contribution-subteam-ids', teamId, includeSubteams] as const,
  // Contribution tab — KPIs grouped (team responsibility vs members responsibility)
  contributionKpis: (
    teamId: string | null,
    buId: string | null,
    includeSubteams: boolean
  ) => ['teams', 'contribution-kpis', teamId, buId, includeSubteams] as const,
  // Contribution tab — Initiatives linked to KRs of a cycle
  contributionInitiatives: (
    teamId: string | null,
    buId: string | null,
    includeSubteams: boolean,
    cycleId: string | null
  ) =>
    ['teams', 'contribution-initiatives', teamId, buId, includeSubteams, cycleId] as const,
} as const;

export const squadsKeys = {
  all: (buId: string | null) => ['squads', buId] as const,
  byTeam: (teamId: string) => ['squads', 'byTeam', teamId] as const,
  /**
   * BU-scoped detail key — inclui buId para evitar reuso de cache cross-BU.
   * Use detailPrefix(squadId) para invalidar todas as variantes.
   */
  detail: (squadId: string, buId?: string | null) => ['squads', 'detail', squadId, buId ?? null] as const,
  detailPrefix: (squadId: string) => ['squads', 'detail', squadId] as const,
} as const;

export const managersKeys = {
  select: (buId: string | null) => ['managers-select', buId] as const,
} as const;

export const teamManagementKeys = {
  manageableTeams: (buId: string | null, userId: string | null) => 
    ['manageable-teams', buId, userId] as const,
} as const;
