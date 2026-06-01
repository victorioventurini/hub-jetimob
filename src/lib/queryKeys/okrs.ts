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
  orgObjectiveView: (objectiveId: string, buId: string | null, cycleId?: string | null) => 
    ['org-objective-view', objectiveId, buId, cycleId ?? null] as const,
  orgKeyResults: (buId: string | null, objectiveId?: string) => 
    ['okr-org-key-results', buId, objectiveId] as const,
  orgKeyResultsAllBu: (buId: string | null) => 
    ['okr-all-org-key-results', buId] as const,
  allOrgObjectivesView: (year: number, buId: string | null, cycleId?: string | null) => 
    ['all-org-objectives-view', year, buId, cycleId ?? null] as const,
  
  // Team level
  teamObjectives: (buId: string | null, teamId?: string, cycleId?: string) => 
    ['okr-team-objectives', buId, teamId, cycleId] as const,
  teamObjectivesWithKrs: (buId: string | null, teamId?: string) => 
    ['okr-team-objectives-with-krs', buId, teamId] as const,
  teamObjectivesWithShared: (buId: string | null, teamId?: string) => 
    ['okr-team-objectives-with-shared', buId, teamId] as const,
  teamKeyResults: (buId: string | null, teamId?: string, cycleId?: string) => 
    ['okr-team-key-results', buId, teamId, cycleId] as const,
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
  /**
   * Shared OKRs summary com escopo opcional.
   * IMPORTANTE: numerador (`sharedOkrsCount`) e denominador (`totalOkrsCount`)
   * em SharedOkrInsights DEVEM usar o mesmo escopo (teamId + year).
   * `buId` é OBRIGATÓRIO na chave para evitar vazamento de cache entre BUs.
   * Ver mem://features/okrs/shared-okrs-insights-scope-standard
   *  e Core "BU Isolation".
   */
  sharedSummary: (buId: string | null, teamId?: string | null, year?: number | null) =>
    ['shared-okrs-summary', buId, teamId ?? null, year ?? null] as const,
  /** Prefix para invalidação. Sem buId → invalida todas as BUs. */
  sharedSummaryPrefix: (buId?: string | null) =>
    (buId ? (['shared-okrs-summary', buId] as const) : (['shared-okrs-summary'] as const)),
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

  /** v3.4.0: KPI primário (fonte única) para KR — query dedicada (evita colisão de cache) */
  krPrimaryKpi: (krId: string, krType: string) =>
    ['okr-kr-primary-kpi', krId, krType] as const,

  /** v3.4.2: Valores efetivos da KR (considerando KPI primária) */
  krEffectiveValues: (krId: string, krType: string) =>
    ['okr-kr-effective-values', krId, krType] as const,

  /** v3.4.2: Batch de KPIs primárias para listagem de KRs */
  krPrimaryKpiBatch: (krIds: string[], krType: string) =>
    ['okr-kr-primary-kpi-batch', krIds.sort().join(','), krType] as const,
  
  // Initiatives
  initiatives: (krId: string) => ['okr-initiatives', krId] as const,
  initiativeDetail: (id: string) => ['okr-initiative', id] as const,
  initiativesCount: (krId: string) => ['okr-initiatives', 'count', krId] as const,
  initiativesByUser: (profileId: string | null, cycleId?: string | null) => ['okr-initiatives', 'user', profileId, cycleId ?? null] as const,
  initiativesByStatus: (buId: string | null, status?: string) => ['okr-initiatives', 'status', buId, status] as const,
  initiativesAll: () => ['okr-initiatives'] as const,
  initiativesByKrs: (krIds: string[]) => ['wizard-initiatives', krIds] as const,
  /**
   * Iniciativas do step do colaborador (collaborator check-in).
   * Centrada no usuário (owner OR contributor) no ciclo ativo.
   * Ver TCR §4.8 — Collaborator Check-in / Filtro de Iniciativas do Step.
   */
  initiativesForCollaborator: (
    buId: string | null,
    cycleId: string | null,
    profileId: string | null,
  ) => ['okr-initiatives', 'collaborator', buId, cycleId, profileId] as const,
  
  // Cycles & Settings
  settingsCycles: (buId: string | null) => ['okr-settings-cycles', buId] as const,
  cyclesList: (buId: string | null) => ['cycles-list', buId] as const,
  headerCycles: (buId: string | null, year: number) => ['okr-header-cycles', buId, year] as const,
  cycleDetail: (cycleId: string | null) => ['okr-cycle', cycleId] as const,
  activeCycle: (buId: string | null) => ['okr-active-cycle', buId] as const,
  
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
  // BU-scoped: incluímos buId para evitar reuso de cache (`null`/stale) entre BUs
  // ao alternar contexto sem recarregar a página.
  teamObjectiveDetail: (objectiveId: string, buId?: string | null) =>
    ['okr-team-objective', objectiveId, buId ?? null] as const,
  /** Prefix para invalidar todos os caches de detalhe de um objetivo (todas as BUs) */
  teamObjectiveDetailPrefix: (objectiveId: string) =>
    ['okr-team-objective', objectiveId] as const,
    
  // Team KR detail (for deep-linking)
  teamKeyResultDetail: (krId: string | null) =>
    ['okr-team-kr-detail', krId] as const,
  
  // Org KRs for linking
  orgKeyResultsForLinking: (orgObjectiveId: string | null) =>
    ['okr-org-key-results', orgObjectiveId] as const,
  
  // Wizard sessions
  wizardSession: (userId: string | null) =>
    ['okr-wizard-session', userId] as const,

  /** Última sessão completada por wizard_type (e opcionalmente team_id) */
  lastCompletedSession: (wizardType: string, teamId?: string | null) =>
    ['okr-wizard-last-completed', wizardType, teamId] as const,

  /** Sessão completada para ciclo específico (detecção de rito já submetido).
   *  `referenceMonth` é necessário para rituais mensais dentro de ciclo trimestral (MBR, MBR-pre)
   *  para evitar que a sessão de M1 do quarter seja interpretada como completada em M2. */
  completedSessionForCycle: (
    wizardType: string,
    teamId?: string | null,
    cycleId?: string | null,
    userId?: string | null,
    referenceMonth?: string | null,
  ) =>
    ['okr-completed-session-cycle', wizardType, teamId ?? 'none', cycleId ?? 'none', userId, referenceMonth ?? 'none'] as const,

  // Draft objectives from QBR-pre (for wizard hydration)
  draftObjectives: (teamId: string, cycleId: string) =>
    ['okr-draft-objectives', teamId, cycleId] as const,

  // Wizard drafts (global per user for team OKR creation)
  wizardDraft: (userId: string) =>
    ['okr-wizard-draft', userId] as const,

  // Generic wizard drafts (global per user per wizard type)
  wizardDraftGeneric: (userId: string, wizardType: string, teamId?: string | null) =>
    ['okr-wizard-draft-generic', userId, wizardType, teamId ?? 'global'] as const,

  // Ritual history (completed wizard sessions)
  ritualHistory: (buId: string | null, filters?: Record<string, unknown>) =>
    ['okr-ritual-history', buId, filters] as const,
  ritualHistoryListPrefix: (buId: string | null) =>
    ['okr-ritual-history', buId] as const,
  ritualDetail: (sessionId: string | null) =>
    ['okr-ritual-detail', sessionId] as const,

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
    
  // Company OKRs (C-Level Wizard)
  companyOkrs: (buId: string | null, year: number) =>
    ['company-okrs', buId, year] as const,
    
  // Org Construction Review (avaliação de qualidade de OKRs organizacionais)
  orgConstructionReview: (buId: string | null, year: number | null) =>
    ['okr-org-construction-review', buId, year] as const,

  // Full Construction Review (all teams in a cycle)
  fullConstructionReview: (buId: string | null, cycleId: string | null) =>
    ['okr-full-construction-review', buId, cycleId] as const,

  // Ritual Calendar
  ritualCadences: (buId: string | null) =>
    ['ritual-cadences', buId] as const,
  ritualOccurrencesPrefix: (buId: string | null) =>
    ['ritual-occurrences', buId] as const,
  ritualAdherencePrefix: (buId: string | null) =>
    ['ritual-adherence', buId] as const,
  ritualWindowOverrides: (buId: string | null, cycleId: string | null) =>
    ['ritual-window-overrides', buId, cycleId] as const,
  ritualOccurrences: (buId: string | null, filters?: Record<string, unknown>) =>
    ['ritual-occurrences', buId, filters] as const,
  ritualOccurrenceBySession: (sessionId: string | null) =>
    ['ritual-occurrence-by-session', sessionId] as const,
  ritualOccurrencesEligibleForBulk: (
    buId: string | null,
    wizardType: string | null,
    plannedDate: string | null,
  ) => ['ritual-occurrences', buId, 'eligible-bulk', wizardType, plannedDate] as const,
  ritualAdherence: (buId: string | null, filters?: Record<string, unknown>) =>
    ['ritual-adherence', buId, filters] as const,
  collaboratorCheckinExpected: (buId: string | null, teamId: string | null, cycleId: string | null) =>
    ['collaborator-checkin-expected', buId, teamId, cycleId] as const,
  collaboratorSessionsByDate: (buId: string | null, teamId: string | null, startDate: string, endDate: string) =>
    ['collaborator-sessions-by-date', buId, teamId, startDate, endDate] as const,

  // QBR Executive Report (AI-generated)
  qbrExecutiveReport: (buId: string | null, cycleId: string | null) =>
    ['qbr-executive-report', buId, cycleId] as const,

  // MBR Executive Report (AI-generated, por mês de referência)
  mbrExecutiveReport: (
    buId: string | null,
    cycleId: string | null,
    monthRef: string | null,
  ) => ['mbr-executive-report', buId, cycleId, monthRef ?? null] as const,

  // Weekly v2 — agregação a partir de Pré-Weekly concluídos
  weeklyAggregationListPrefix: (buId: string | null) =>
    ['weekly', 'pre-weekly-aggregation', buId] as const,
  weeklyAggregation: (buId: string | null, referenceWeek: string) =>
    ['weekly', 'pre-weekly-aggregation', buId, referenceWeek] as const,
  weeklyExpectedLeaders: (buId: string | null) =>
    ['weekly', 'expected-leaders', buId] as const,

  // Team Collaborator Agenda Suggestions (leader-prep aggregation)
  // Lê snapshots de okr_wizard_sessions (wizard_type='collaborator', status='completed')
  // do time `teamId`, dentro da janela do `cycleId`, e extrai
  // `data.teamCheckinAgendaSuggestions[]` para o líder priorizar.
  teamCollaboratorAgendaSuggestions: (
    buId: string | null,
    teamId: string | null,
    cycleId: string | null,
  ) => ['team-collaborator-agenda-suggestions', buId, teamId, cycleId] as const,

  // ── Auto cycle transition (settings) ──
  autoCycleTransition: (buId: string | null) =>
    ['okr-auto-cycle-transition', buId] as const,

  // ── KR primary KPI / effective values broad invalidation ──
  krPrimaryKpiPrefix: () => ['okr-kr-primary-kpi'] as const,
  krPrimaryKpiBatchPrefix: () => ['okr-kr-primary-kpi-batch'] as const,
  krEffectiveValuesPrefix: () => ['okr-kr-effective-values'] as const,

  // ── Completed wizard sessions broad invalidation (addendums) ──
  completedSessionForCyclePrefix: () => ['okr-completed-session-cycle'] as const,

  // ── Decision permissions ──
  canResolveDecision: (profileId: string | null, ownerProfileId: string | null) =>
    ['can-resolve-decision', profileId, ownerProfileId] as const,

  // ── Cycle metadata (year extraction) ──
  cycleYear: (cycleId: string | null) => ['cycle-year', cycleId] as const,

  // ── Cross-team dependencies (Managers Panorama) ──
  crossDependenciesPrefix: () => ['cross-dependencies'] as const,
  crossDependencies: (buId: string | null, cycleId: string | null) =>
    ['cross-dependencies', buId, cycleId] as const,
  managersPanorama: (buId: string | null, cycleId: string | null) =>
    ['managers-panorama', buId, cycleId] as const,

  // ── KR with full history (audit) ──
  krWithHistory: (buId: string | null, krId: string | null) =>
    ['kr-with-history', buId, krId] as const,

  // ── Ritual Report — KR titles batch (legacy, prefer entityLookup) ──
  krTitlesForReport: (krIds: string[]) =>
    ['kr-titles-for-report', ...krIds] as const,

  // ── Entity Lookup (Onda 4 Fase 2) — batch id→name resolution for ritual readers ──
  entityLookupPrefix: () => ['entity-lookup'] as const,
  entityLookup: (
    kind: 'teams' | 'team_krs' | 'org_krs' | 'team_objectives' | 'org_objectives' | 'profiles' | 'kpis',
    buId: string | null,
    ids: string[],
  ) => ['entity-lookup', kind, buId, ...ids] as const,

  // ── Calendar — user sessions filter ──
  calendarUserSessions: (userFilter: string | null, sessionIds: string[]) =>
    ['calendar-user-sessions', userFilter, sessionIds] as const,

  // ── Decisions Inbox (gestão de decisões/notas) ──
  decisionsInboxPrefix: (buId: string | null) =>
    ['okr-decisions-inbox', buId] as const,
  decisionsInbox: (
    buId: string | null,
    profileId: string | null,
    scope: string,
    filters?: Record<string, unknown> | null,
    page?: number,
    overrideTeamIds?: string[] | null,
    scopeTeamIds?: string[] | null,
    scopeAreaIds?: string[] | null,
  ) => ['okr-decisions-inbox', buId, profileId, scope, filters ?? null, page ?? 1, overrideTeamIds ?? null, scopeTeamIds ?? null, scopeAreaIds ?? null] as const,
  decisionsScopeContext: (buId: string | null, profileId: string | null, isWildcard?: boolean | null) =>
    ['okr-decisions-scope-context', buId, profileId, isWildcard ?? false] as const,
  carryOverDecisions: (
    buId: string | null,
    wizardType: string,
    teamId: string | null,
    profileId: string | null,
  ) => ['okr-carry-over-decisions', buId, wizardType, teamId ?? 'none', profileId ?? 'none'] as const,

  // ── Collaborator "Sua semana até aqui" — Step 1 do Check-in Individual ──
  weekActivityKpis: (buId: string | null, userId: string | null, weekStartIso: string | null) =>
    ['okr-week-activity-kpis', buId, userId, weekStartIso] as const,
  weekActivityCheckins: (buId: string | null, userId: string | null, weekStartIso: string | null) =>
    ['okr-week-activity-checkins', buId, userId, weekStartIso] as const,
  weekActivityMilestones: (buId: string | null, userId: string | null, weekStartIso: string | null) =>
    ['okr-week-activity-milestones', buId, userId, weekStartIso] as const,
  weekActivityInitiatives: (buId: string | null, cycleId: string | null, userId: string | null, weekStartIso: string | null) =>
    ['okr-week-activity-initiatives', buId, cycleId, userId, weekStartIso] as const,
} as const;

// ═══════════════════════════════════════════════════════════════
// QBR / MBR / Pre-Weekly / Quarter Review keys
// ═══════════════════════════════════════════════════════════════

/** All QBR-related query keys (pre, meeting, post, executive cards) */
export const qbrKeys = {
  prefix: () => ['qbr'] as const,

  // Cycle status (used by QbrWizardCard, QbrPreCLevelPage, QbrPrePage, QbrPostPage, Wizards)
  cycleStatus: (cycleId: string | null | undefined) =>
    ['qbr', 'cycle-status', cycleId] as const,
  cycleStatusCard: (cycleId: string | null | undefined) =>
    ['qbr', 'cycle-status-card', cycleId] as const,
  cycleStatusPost: (cycleId: string | null | undefined) =>
    ['qbr', 'cycle-status-post', cycleId] as const,
  cycleStatusWizards: (cycleId: string | null | undefined) =>
    ['qbr', 'cycle-status-wizards', cycleId] as const,

  // Pre C-Level
  leaderSessions: (cycleId: string | null | undefined) =>
    ['qbr', 'leader-sessions', cycleId] as const,
  teams: (buId: string | null) => ['qbr', 'teams', buId] as const,
  orgKpis: (buId: string | null) => ['qbr', 'org-kpis', buId] as const,

  // Post
  cLevelSessionPost: (cycleId: string | null | undefined) =>
    ['qbr', 'clevel-session-post', cycleId] as const,
  leaderSessionsPost: (cycleId: string | null | undefined) =>
    ['qbr', 'leader-sessions-post', cycleId] as const,
  teamsPost: (buId: string | null) => ['qbr', 'teams-post', buId] as const,
  orgObjectivesPost: (cycleId: string | null | undefined) =>
    ['qbr', 'org-objectives-post', cycleId] as const,
  planningCyclesPost: (buId: string | null) =>
    ['qbr', 'planning-cycles-post', buId] as const,
  meetingSession: (cycleId: string | null | undefined) =>
    ['qbr', 'meeting-session', cycleId] as const,

  // Pre (team)
  preTeamKrs: (
    buId: string | null,
    teamId: string | null | undefined,
    cycleId: string | null | undefined
  ) => ['qbr-pre', 'team-krs', buId, teamId, cycleId] as const,
  preTeamKpis: (teamId: string | null | undefined, buId: string | null) =>
    ['qbr-pre', 'team-kpis', teamId, buId] as const,
  preDraftOkrs: (
    teamId: string | null | undefined,
    planningCycleId: string | null | undefined
  ) => ['qbr-pre', 'draft-okrs', teamId, planningCycleId] as const,

  // Meeting
  meetingCLevelSession: (
    buId: string | null,
    cycleId: string | null | undefined
  ) => ['qbr-meeting', 'clevel-session', buId, cycleId] as const,
  meetingPreSessions: (
    buId: string | null,
    cycleId: string | null | undefined
  ) => ['qbr-meeting', 'pre-sessions', buId, cycleId] as const,
  meetingTeams: (buId: string | null) =>
    ['qbr-meeting', 'teams', buId] as const,
  meetingAddendums: (preQbrSessionIds: string[]) =>
    ['qbr-meeting', 'addendums', preQbrSessionIds] as const,

  // QBR C-Level (balance)
  cLevelBalanceTeams: (buId: string | null) =>
    ['qbr-clevel', 'balance-teams', buId] as const,
  cLevelAllTeamKrs: (cycleId: string | null | undefined) =>
    ['qbr-clevel', 'all-team-krs', cycleId] as const,

  // QBR report (pages)
  reportKpiEvolution: (buId: string | null) =>
    ['qbr-report', 'kpi-evolution', buId] as const,
  criticalKpiComparison: (buId: string | null, cycleId: string | null) =>
    ['qbr-critical-kpi-comparison', buId, cycleId] as const,
} as const;

/** All MBR-related query keys */
export const mbrKeys = {
  prefix: () => ['mbr'] as const,

  buKpis: (buId: string | null) => ['mbr', 'bu-kpis', buId] as const,
  teamObjectives: (buId: string | null, cycleId: string | null | undefined) =>
    ['mbr', 'team-objectives', buId, cycleId] as const,
  qbrFollowup: (buId: string | null) =>
    ['mbr', 'qbr-followup', buId] as const,
  /** Itens pendentes do MBR anterior (decisões next_step / focus_adjustment). */
  previousPendingItems: (buId: string | null | undefined, currentSessionId: string | null) =>
    ['mbr', 'previous-pending-items', buId ?? null, currentSessionId] as const,

  preTeamKrs: (
    buId: string | null,
    teamId: string | null | undefined,
    cycleId: string | null | undefined,
    referenceMonth?: string | null,
  ) => ['mbr-pre', 'team-krs', buId, teamId, cycleId, referenceMonth ?? null] as const,
  preTeamKpis: (teamId: string | null | undefined, buId: string | null) =>
    ['mbr-pre', 'team-kpis', teamId, buId] as const,
  /** Projetos do time consumidos pelo Step 3 (Projetos) do Pré-MBR.
   *  `referenceMonth` (YYYY-MM) ancora o cut-off de atrasos.
   *  v2: filtrado por responsabilidade do time + subtimes. */
  preTeamProjects: (
    buId: string | null,
    teamId: string | null | undefined,
    referenceMonth?: string | null,
  ) => ['mbr-pre', 'team-projects', 'v2', buId, teamId, referenceMonth ?? null] as const,
  /** Snapshot mensal de KPIs do time para a Abertura do Pré-MBR (current vs previous month). */
  preTeamKpisMonthly: (
    buId: string | null,
    teamId: string | null | undefined,
    referenceMonth: string,
  ) => ['mbr-pre', 'team-kpis-monthly', buId, teamId, referenceMonth] as const,
  /**
   * Submissões `mbr-pre` agregadas no mês de referência (BU-scoped).
   * Consumido pelo MBR para alimentar Panorama / KPI Gate / Detail / Decisions.
   */
  preSubmissions: (buId: string | null, referenceMonth: string) =>
    ['mbr-pre', 'submissions-by-team', buId, referenceMonth] as const,
  /** Snapshot mensal de KPIs por escopo (org/área) — overview do MBR Executivo. */
  monthlyKpisByScope: (
    buId: string | null,
    referenceMonth: string,
    scopesKey: string,
  ) => ['mbr', 'monthly-kpis-by-scope', buId, referenceMonth, scopesKey] as const,
} as const;

/** Pre-Weekly wizard keys */
export const preWeeklyKeys = {
  prefix: () => ['pre-weekly'] as const,
  /**
   * Fontes da semana — escopadas por time quando `?team=` está presente,
   * ou pelo usuário logado em fluxos sem contexto de time.
   * `scopeKey` deve ser o `teamId` (modo time) ou o `profileId` (modo pessoal).
   */
  sources: (
    buId: string | null,
    scope: 'team' | 'user',
    scopeKey: string | null | undefined,
    referenceWeek: string
  ) => ['pre-weekly', 'sources', buId, scope, scopeKey, referenceWeek] as const,
} as const;

/** Quarter Review (executive page) keys */
export const quarterReviewKeys = {
  prefix: () => ['quarter-review'] as const,
  cycles: (buId: string | null) =>
    ['quarter-review', 'cycles', buId] as const,
  teamObjectives: (buId: string | null, cycleId: string | null | undefined) =>
    ['quarter-review', 'team-objectives', buId, cycleId] as const,
  ritualSessions: (buId: string | null, cycleId: string | null | undefined) =>
    ['quarter-review', 'ritual-sessions', buId, cycleId] as const,
  linkedProjectIds: (teamId: string | null | undefined, krIds: string[]) =>
    ['quarter-review', 'linked-project-ids', teamId, krIds] as const,
} as const;

export const kpisKeys = {
  // ── Prefix helpers for broad invalidation ──
  /** Invalidate all KPI queries */
  prefix: () => ['kpis'] as const,
  /** Invalidate all KPI list queries */
  listPrefix: () => ['kpis', 'list'] as const,
  /** Invalidate all KPI evolution list queries */
  evolutionListPrefix: () => ['kpis', 'evolution-list'] as const,
  /** Invalidate all KPI detail queries */
  detailPrefix: () => ['kpis', 'detail'] as const,
  /** Invalidate all KPI values queries */
  valuesPrefix: () => ['kpis', 'values'] as const,

  // ── Standard keys ──
  all: (buId: string | null) => ['kpis', buId] as const,
  list: (buId: string | null, filters?: Record<string, unknown>) => 
    ['kpis', 'list', buId, filters] as const,
  /**
   * BU-scoped detail key. Inclui buId para evitar reuso de cache cross-BU
   * quando admins multi-BU alternam contexto sem recarregar a página.
   * Use detailPrefixById(kpiId) para invalidar todas as variantes.
   */
  detail: (kpiId: string, buId?: string | null) => ['kpis', 'detail', kpiId, buId ?? null] as const,
  /** Prefix para invalidar todas as variantes de detalhe de uma KPI (todas as BUs) */
  detailPrefixById: (kpiId: string) => ['kpis', 'detail', kpiId] as const,
  values: (kpiId: string) => ['kpis', 'values', kpiId] as const,
  sources: (buId: string | null) => ['kpis', 'sources', buId] as const,
  categories: (buId: string | null) => ['kpis', 'categories', buId] as const,
  // v2.1: Wizard integration
  forWizard: (options: { ownerId?: string; teamId?: string }) => 
    ['kpis', 'wizard', options] as const,
  byRagStatus: (buId: string | null, statuses: string[]) =>
    ['kpis', 'rag-status', buId, statuses] as const,
  // v2.83.0: Contributors management
  contributors: (kpiId: string | null) => 
    ['kpis', 'contributors', kpiId] as const,
  /** Contribuidor primário (data_entry) — shape diferente de `contributors` (array de IDs). */
  primaryDataEntry: (kpiId: string | null) =>
    ['kpis', 'primary-data-entry', kpiId] as const,
  userContributions: (userId: string, teamId?: string) =>
    ['kpis', 'user-contributions', userId, teamId] as const,
  // v2.83.0: Wizard V2 with role classification
  // v3.30.0: aceita lifecycleStatuses + responsibleTeamId (Pré-MBR canônico).
  forWizardV2: (options: {
    userId: string;
    teamId?: string;
    areaId?: string;
    scope?: string;
    lifecycleStatuses?: readonly string[];
    responsibleTeamId?: string | null;
  }) => ['kpis', 'wizard-v2', options] as const,
  // v2.86.0: Target/Benchmark history
  targetHistory: (kpiId: string | null) => ['kpis', 'target-history', kpiId] as const,
  // v2.86.0: KPI with full history for charts
  kpiWithHistory: (kpiId: string | null) => ['kpis', 'with-history', kpiId] as const,
  // v2.86.0: KPI evolution page list
  evolutionList: (buId: string | null, filters?: Record<string, unknown>) => 
    ['kpis', 'evolution-list', buId, filters] as const,
  // v2.89.0: All KPI-KR links for filtering (maps kpi_id -> role[])
  allKrLinks: (buId: string | null) => ['kpis', 'all-kr-links', buId] as const,
} as const;
