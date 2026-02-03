/**
 * Teams & Squads Query Keys
 */
export const teamsKeys = {
  all: (buId: string | null) => ['teams', buId] as const,
  list: (buId: string | null, includeInactive = false) => ['teams', 'list', buId, includeInactive] as const,
  detail: (teamId: string | undefined) => ['team', teamId] as const,
  members: (teamId: string) => ['teams', 'members', teamId] as const,
  availableLeaders: (buId: string | null) => ['available-leaders', buId] as const,
  // v2.82.0: Team area for auto-inference
  area: (teamId: string | undefined) => ['teams', 'area', teamId] as const,
} as const;

export const squadsKeys = {
  all: (buId: string | null) => ['squads', buId] as const,
  byTeam: (teamId: string) => ['squads', 'byTeam', teamId] as const,
  detail: (squadId: string) => ['squads', 'detail', squadId] as const,
} as const;

export const managersKeys = {
  select: (buId: string | null) => ['managers-select', buId] as const,
} as const;

export const teamManagementKeys = {
  manageableTeams: (buId: string | null, userId: string | null) => 
    ['manageable-teams', buId, userId] as const,
} as const;
