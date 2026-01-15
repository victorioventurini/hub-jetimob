/**
 * Areas Query Keys
 * Query keys for strategic areas that group teams
 */
export const areasKeys = {
  all: (buId: string | null) => ['areas', buId] as const,
  list: (buId: string | null, includeInactive = false) => ['areas', 'list', buId, includeInactive] as const,
  detail: (areaId: string | undefined) => ['areas', 'detail', areaId] as const,
  teams: (areaId: string) => ['areas', 'teams', areaId] as const,
} as const;
