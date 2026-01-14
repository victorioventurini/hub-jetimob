/**
 * OKRs Query Keys
 */
export const okrsKeys = {
  // ── Prefix helpers for broad invalidation ──
  /** Invalidate all org objectives queries (all years, all BUs) */
  orgObjectivesPrefix: () => ['okr-org-objectives'] as const,
  /** Invalidate all org KRs queries */
  orgKeyResultsPrefix: () => ['okr-org-key-results'] as const,
  /** Invalidate all team objectives queries (all teams, all BUs) */
  teamObjectivesPrefix: () => ['okr-team-objectives'] as const,
  /** Invalidate all team KRs queries */
  teamKeyResultsPrefix: () => ['okr-team-key-results'] as const,
  /** Invalidate all dashboard data queries */
  dashboardDataPrefix: () => ['okr-dashboard-data'] as const,
  
  // Org level
  orgObjectives: (buId: string | null, year?: number) => 
    ['okr-org-objectives', buId, year] as const,
  orgObjectivesWithKrs: (buId: string | null, year?: number) => 
    ['okr-org-objectives-with-krs', buId, year] as const,
  orgObjective: (id: string) => ['okr-org-objective', id] as const,
  orgObjectiveView: (objectiveId: string, buId: string | null) => 
    ['org-objective-view', objectiveId, buId] as const,
  orgKeyResults: (buId: string | null, objectiveId?: string) => 
    ['okr-org-key-results', buId, objectiveId] as const,
  orgKeyResultsAllBu: (buId: string | null) => 
    ['okr-all-org-key-results', buId] as const,
  allOrgObjectivesView: (year: number, buId: string | null) => 
    ['all-org-objectives-view', year, buId] as const,
  
  // Team level
  teamObjectives: (buId: string | null, teamId?: string) => 
    ['okr-team-objectives', buId, teamId] as const,
  teamObjectivesWithKrs: (buId: string | null, teamId?: string) => 
    ['okr-team-objectives-with-krs', buId, teamId] as const,
  teamObjectivesWithShared: (buId: string | null, teamId?: string) => 
    ['okr-team-objectives-with-shared', buId, teamId] as const,
  teamKeyResults: (buId: string | null, teamId?: string) => 
    ['okr-team-key-results', buId, teamId] as const,
  myTeamKeyResults: (buId: string | null, userId?: string) => 
    ['okr-my-team-key-results', buId, userId] as const,
  myTeamObjectives: (buId: string | null, userId?: string) => 
    ['okr-my-team-objectives', buId, userId] as const,
  
  // Check-ins
  checkins: (krId: string) => ['okr-checkins', krId] as const,
  latestCheckin: () => ['okr-latest-checkin'] as const,
  pendingCheckins: (buId: string | null, teamId?: string) => 
    ['pending-checkins', buId, teamId] as const,
  checkinSummary: (buId: string | null) => 
    ['checkin-summary', buId] as const,
  
  // Contributions
  contributions: (entityType?: string, entityId?: string) => 
    entityType && entityId 
      ? ['okr-contributions', entityType, entityId] as const
      : ['okr-contributions'] as const,
  teamContributions: (teamId: string) => 
    ['okr-team-contributions', teamId] as const,
  teamContributedOkrs: (teamId: string | null) => 
    ['team-contributed-okrs', teamId] as const,
  teamContributionView: (teamId: string | null, buId: string | null) => 
    ['team-contribution-view', teamId, buId] as const,
  sharedSummary: () => 
    ['shared-okrs-summary'] as const,
  objectiveContributors: (objectiveId: string | null) =>
    ['okr-objective-contributors', objectiveId] as const,
  teamContributedObjectives: (teamId: string | null) =>
    ['okr-team-contributed-objectives', teamId] as const,
  teamObjectivesAll: () =>
    ['okr-team-objectives'] as const,
  teamObjectivesWithKrsAll: () =>
    ['okr-team-objectives-with-krs'] as const,
  
  // KR Metrics
  krMetrics: (krId: string, krType: string) => 
    ['okr-kr-metrics', krId, krType] as const,
  krMetricsRole: (role: string, krId: string, krType: string) => 
    ['okr-kr-metrics', role, krId, krType] as const,
  
  // Initiatives
  initiatives: (krId: string) => ['okr-initiatives', krId] as const,
  initiativeDetail: (id: string) => ['okr-initiative', id] as const,
  initiativesCount: (krId: string) => ['okr-initiatives', 'count', krId] as const,
  initiativesByUser: (profileId: string | null) => ['okr-initiatives', 'user', profileId] as const,
  initiativesByStatus: (buId: string | null, status?: string) => ['okr-initiatives', 'status', buId, status] as const,
  initiativesAll: () => ['okr-initiatives'] as const,
  initiativesByKrs: (krIds: string[]) => ['wizard-initiatives', krIds] as const,
  
  // Cycles & Settings
  settingsCycles: (buId: string | null) => ['okr-settings-cycles', buId] as const,
  cyclesList: (buId: string | null) => ['cycles-list', buId] as const,
  cycleDetail: (cycleId: string | null) => ['okr-cycle', cycleId] as const,
  
  // Health & Insights
  health: (buId: string | null, objectiveType: string, objectiveId: string | null) =>
    ['okr-health', buId, objectiveType, objectiveId] as const,
  insights: (buId: string | null, scopeType?: string, scopeId?: string | null) =>
    scopeType && scopeId 
      ? ['okr-insights', buId, scopeType, scopeId] as const
      : ['okr-insights', buId] as const,
  riskObjectives: (buId: string | null, limit?: number) =>
    ['okr-risk-objectives', buId, limit] as const,
  dashboardInsights: (buId: string | null, limit?: number) =>
    ['okr-dashboard-insights', buId, limit] as const,
  
  // Dashboard
  dashboard: (buId: string | null, teamId?: string) => 
    ['okr-dashboard', buId, teamId] as const,
  dashboardData: (buId: string | null, year?: number, view?: string, teamId?: string) =>
    ['okr-dashboard-data', buId, year, view, teamId] as const,
  
  // Cycle Check-ins Page
  cycleCheckins: (buId: string | null, cycleId?: string, filters?: Record<string, unknown>) => 
    ['okr-cycle-checkins', buId, cycleId, filters] as const,
  
  // Timeline
  objectiveTimeline: (buId: string | null, objectiveId: string, objectiveType: string) =>
    ['objective-timeline', buId, objectiveId, objectiveType] as const,
  objectiveTimelineLast: (buId: string | null, objectiveId: string, objectiveType: string) =>
    ['objective-timeline-last', buId, objectiveId, objectiveType] as const,
  
  // Cancellation reasons
  cancellationReasons: (buId: string | null) =>
    ['okr-cancellation-reasons', buId] as const,
  
  // User profile for check-in
  userProfileForCheckin: (userId: string | null, buId: string | null) =>
    ['user-profile-for-checkin', userId, buId] as const,
  userProfileForWizard: (userId: string | null, buId: string | null) =>
    ['user-profile-for-wizard', userId, buId] as const,
  
  // Team objective detail
  teamObjectiveDetail: (objectiveId: string) =>
    ['okr-team-objective', objectiveId] as const,
  
  // Org KRs for linking
  orgKeyResultsForLinking: (orgObjectiveId: string | null) =>
    ['okr-org-key-results', orgObjectiveId] as const,
  
  // Wizard sessions
  wizardSession: (userId: string | null) =>
    ['okr-wizard-session', userId] as const,

  // Wizard drafts (global per user for team OKR creation)
  wizardDraft: (userId: string) =>
    ['okr-wizard-draft', userId] as const,

  // Generic wizard drafts (global per user per wizard type)
  wizardDraftGeneric: (userId: string, wizardType: string) =>
    ['okr-wizard-draft-generic', userId, wizardType] as const,

  // Wizard data
  wizardUserKrs: (
    buId: string | null,
    cycleId: string | null,
    userProfileId: string | null,
    filter: string
  ) => ['okr-wizard-user-krs', buId, cycleId, userProfileId, filter] as const,
  wizardTeamKrs: (
    buId: string | null, 
    cycleId: string | null, 
    teamIds: string[], 
    filter: string
  ) => ['okr-wizard-krs', buId, cycleId, teamIds, filter] as const,
  
  // Team Overview Metrics (Leader Wizard)
  teamOverviewMetrics: (
    buId: string | null, 
    cycleId: string | null, 
    teamIds: string[]
  ) => ['okr-team-overview-metrics', buId, cycleId, teamIds] as const,
  
  // KR History
  krCheckinHistory: (buId: string | null, krId: string | null) =>
    ['kr-checkin-history', buId, krId] as const,
  krLinkedKpis: (krId: string, krType: string) =>
    ['kr-linked-kpis', krId, krType] as const,
  krGuardrailHistories: (kpiIds: string[]) =>
    ['kr-guardrail-histories', kpiIds] as const,
  
  // Manageable Teams
  manageableTeams: (buId: string | null, userId: string | null) =>
    ['okr-manageable-teams', buId, userId] as const,
  myTeamId: (buId: string | null, userId: string | null) =>
    ['my-team-id', buId, userId] as const,
    
  // Org KRs
  orgKeyResultsAll: () => ['okr-org-key-results'] as const,
  
  // Team Quality
  teamQuality: (buId: string | null, teamId: string | null, cycleId: string | null) =>
    ['okr-team-quality', buId, teamId, cycleId] as const,
    
  // Org Analysis (Admin)
  orgAnalysis: (buId: string | null, year: number, cycleId: string | null) =>
    ['okr-org-analysis', buId, year, cycleId] as const,
    
  // Construction Review - Context Data
  orgObjectivesByCycle: (buId: string | null, cycleId: string | null) => 
    ['okr-org-objectives-by-cycle', buId, cycleId] as const,
  otherTeamsObjectives: (buId: string | null, cycleId: string | null, teamId: string | null) =>
    ['okr-other-teams-objectives', buId, cycleId, teamId] as const,
    
  // Org Health Review (execution analysis)
  orgHealthReview: (buId: string | null, year: number) =>
    ['okr-org-health-review', buId, year] as const,
  orgKrTeamLinks: (buId: string | null, krIds: string[]) =>
    ['okr-org-kr-team-links', buId, krIds] as const,
  orgHealthConsolidated: (buId: string | null, year: number) =>
    ['okr-org-health-consolidated', buId, year] as const,
} as const;

export const kpisKeys = {
  all: (buId: string | null) => ['kpis', buId] as const,
  list: (buId: string | null, filters?: Record<string, unknown>) => 
    ['kpis', 'list', buId, filters] as const,
  detail: (kpiId: string) => ['kpis', 'detail', kpiId] as const,
  values: (kpiId: string) => ['kpis', 'values', kpiId] as const,
  sources: (buId: string | null) => ['kpis', 'sources', buId] as const,
  categories: (buId: string | null) => ['kpis', 'categories', buId] as const,
} as const;
