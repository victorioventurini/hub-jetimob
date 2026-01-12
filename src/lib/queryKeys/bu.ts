/**
 * BU & Settings Query Keys
 */
export const buKeys = {
  all: () => ['bu'] as const,
  allBus: () => ['all-bus'] as const,
  userBus: (userId: string | null) => ['user-bus', userId] as const,
  unit: (buId: string | null) => ['bu-unit', buId] as const,
  detail: (buId: string) => ['bu', 'detail', buId] as const,
  locations: (buId: string | null) => ['bu', 'locations', buId] as const,
  location: (locationId: string) => ['bu', 'location', locationId] as const,
  memberships: (userId: string) => ['bu', 'memberships', userId] as const,
  modules: (buId: string | null) => ['bu', 'modules', buId] as const,
  allModules: (buId: string | null) => ['bu', 'all-modules', buId] as const,
  allList: () => ['bu', 'all-list'] as const,
} as const;

export const settingsKeys = {
  modulesList: () => ['settings-modules-list'] as const,
  busList: () => ['settings-bus-list'] as const,
  moduleConfigs: () => ['settings-module-configs'] as const,
  profilesCount: (buId: string | null) => ['settings', 'profiles-count', buId] as const,
  teamsCount: (buId: string | null) => ['settings-teams-count', buId] as const,
  busCount: () => ['settings-bus-count'] as const,
  modulesCount: () => ['settings-modules-count'] as const,
  integrationsCount: () => ['settings-integrations-count'] as const,
  integrationsCatalog: () => ['settings', 'integrations-catalog'] as const,
  jobTitles: (buId: string | null) => ['job-titles', buId] as const,
  jobTitlesActive: (buId: string | null) => ['job-titles', buId, 'active'] as const,
  jobTitlesPrefix: () => ['job-titles'] as const,
  businessUnits: () => ['settings-business-units'] as const,
  buMemberCounts: () => ['settings-bu-member-counts'] as const,
  teamsList: (buId: string | null) => ['teams-list', buId] as const,
  profilesList: (buId: string | null) => ['profiles-list', buId] as const,
  kpiValuesBatch: (kpiIds?: string[]) => ['kpi-values-batch', kpiIds] as const,
  kpiValuesBatchPrefix: () => ['kpi-values-batch'] as const,
} as const;

export const modulesPageKeys = {
  all: (buId: string | null) => ['all-modules', buId] as const,
  allPrefix: () => ['all-modules'] as const,
  buModulesPrefix: () => ['bu-modules'] as const,
} as const;
