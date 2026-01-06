/**
 * Centralized TanStack Query Keys
 * 
 * Pattern: ['module', 'entity', buId, ...filters]
 * Always include buId when the data is scoped by BU
 */

export const queryKeys = {
  // ============= Auth & Profiles =============
  profiles: {
    all: (buId: string | null) => ['profiles', buId] as const,
    list: (buId: string | null, filters?: Record<string, unknown>) => 
      ['profiles', 'list', buId, filters] as const,
    detail: (userId: string) => ['profiles', 'detail', userId] as const,
    me: () => ['profiles', 'me'] as const,
  },

  // ============= Notifications =============
  notifications: {
    all: (userId: string) => ['notifications', userId] as const,
    unread: (userId: string) => ['notifications', 'unread', userId] as const,
    count: (userId: string) => ['notifications', 'count', userId] as const,
  },

  // ============= Teams =============
  teams: {
    all: (buId: string | null) => ['teams', buId] as const,
    list: (buId: string | null) => ['teams', 'list', buId] as const,
    detail: (teamId: string) => ['teams', 'detail', teamId] as const,
    members: (teamId: string) => ['teams', 'members', teamId] as const,
  },

  squads: {
    all: (buId: string | null) => ['squads', buId] as const,
    byTeam: (teamId: string) => ['squads', 'byTeam', teamId] as const,
    detail: (squadId: string) => ['squads', 'detail', squadId] as const,
  },

  // ============= OKRs =============
  okrs: {
    // Org level
    orgObjectives: (buId: string | null, year?: number) => 
      ['okr-org-objectives', buId, year] as const,
    orgObjectivesWithKrs: (buId: string | null, year?: number) => 
      ['okr-org-objectives-with-krs', buId, year] as const,
    orgObjective: (id: string) => ['okr-org-objective', id] as const,
    orgKeyResults: (buId: string | null, objectiveId?: string) => 
      ['okr-org-key-results', buId, objectiveId] as const,
    orgKeyResultsAll: (buId: string | null) => 
      ['okr-org-key-results-all', buId] as const,
    
    // Team level
    teamObjectives: (buId: string | null, teamId?: string) => 
      ['okr-team-objectives', buId, teamId] as const,
    teamObjectivesWithKrs: (buId: string | null, teamId?: string) => 
      ['okr-team-objectives-with-krs', buId, teamId] as const,
    teamKeyResults: (buId: string | null, teamId?: string) => 
      ['okr-team-key-results', buId, teamId] as const,
    myTeamKeyResults: (buId: string | null, userId?: string) => 
      ['okr-my-team-key-results', buId, userId] as const,
    
    // Check-ins
    checkins: (krId: string) => ['okr-checkins', krId] as const,
    latestCheckin: () => ['okr-latest-checkin'] as const,
    pendingCheckins: (buId: string | null, teamId?: string) => 
      ['okr-pending-checkins', buId, teamId] as const,
    
    // Contributions
    contributions: (buId: string | null) => 
      ['okr-contributions', buId] as const,
    teamContributions: (teamId: string) => 
      ['okr-team-contributions', teamId] as const,
    
    // Initiatives
    initiatives: (krId: string) => ['okr-initiatives', krId] as const,
    initiativeDetail: (id: string) => ['okr-initiative', id] as const,
    
    // Dashboard
    dashboard: (buId: string | null, teamId?: string) => 
      ['okr-dashboard', buId, teamId] as const,
  },

  // ============= KPIs =============
  kpis: {
    all: (buId: string | null) => ['kpis', buId] as const,
    list: (buId: string | null, filters?: Record<string, unknown>) => 
      ['kpis', 'list', buId, filters] as const,
    detail: (kpiId: string) => ['kpis', 'detail', kpiId] as const,
    values: (kpiId: string) => ['kpis', 'values', kpiId] as const,
    sources: (buId: string | null) => ['kpis', 'sources', buId] as const,
    categories: (buId: string | null) => ['kpis', 'categories', buId] as const,
  },

  // ============= Assets =============
  assets: {
    // Inventory
    inventory: {
      all: (buId: string | null) => ['assets', 'inventory', buId] as const,
      list: (buId: string | null, filters?: Record<string, unknown>) => 
        ['assets', 'inventory', 'list', buId, filters] as const,
      detail: (assetId: string) => ['assets', 'inventory', 'detail', assetId] as const,
      movements: (assetId: string) => ['assets', 'inventory', 'movements', assetId] as const,
    },
    
    // Groups/Kits
    groups: {
      all: (buId: string | null) => ['assets', 'groups', buId] as const,
      detail: (groupId: string) => ['assets', 'groups', 'detail', groupId] as const,
      items: (groupId: string) => ['assets', 'groups', 'items', groupId] as const,
      byAsset: (assetId: string) => ['assets', 'groups', 'byAsset', assetId] as const,
    },
    
    // Keys
    keys: {
      all: (buId: string | null) => ['assets', 'keys', buId] as const,
      keyrings: (buId: string | null) => ['assets', 'keys', 'keyrings', buId] as const,
      clavicularies: (buId: string | null) => ['assets', 'keys', 'clavicularies', buId] as const,
      movements: (keyringId: string) => ['assets', 'keys', 'movements', keyringId] as const,
    },
    
    // Gifts
    gifts: {
      all: (buId: string | null) => ['assets', 'gifts', buId] as const,
      items: (buId: string | null) => ['assets', 'gifts', 'items', buId] as const,
      batches: (itemId: string) => ['assets', 'gifts', 'batches', itemId] as const,
      movements: (itemId: string) => ['assets', 'gifts', 'movements', itemId] as const,
    },
    
    // Shared
    categories: (buId: string | null) => ['assets', 'categories', buId] as const,
    locations: (buId: string | null) => ['assets', 'locations', buId] as const,
    permissions: (buId: string | null) => ['assets', 'permissions', buId] as const,
  },

  // ============= Tickets =============
  tickets: {
    all: (buId: string | null) => ['tickets', buId] as const,
    list: (buId: string | null, filters?: Record<string, unknown>) => 
      ['tickets', 'list', buId, filters] as const,
    detail: (ticketId: string) => ['tickets', 'detail', ticketId] as const,
    messages: (ticketId: string) => ['tickets', 'messages', ticketId] as const,
    categories: (buId: string | null) => ['tickets', 'categories', buId] as const,
    subcategories: (categoryId: string) => ['tickets', 'subcategories', categoryId] as const,
    partners: (buId: string | null) => ['tickets', 'partners', buId] as const,
    routingRules: (buId: string | null) => ['tickets', 'routing-rules', buId] as const,
  },

  // ============= Integrations =============
  integrations: {
    all: () => ['integrations'] as const,
    catalog: () => ['integrations', 'catalog'] as const,
    global: () => ['integrations', 'global'] as const,
    bu: (buId: string | null) => ['integrations', 'bu', buId] as const,
    agents: (buId: string | null) => ['integrations', 'agents', buId] as const,
    agentDetail: (agentId: string) => ['integrations', 'agent', agentId] as const,
    agentLogs: (agentId: string) => ['integrations', 'agent-logs', agentId] as const,
    agentDocuments: (agentId: string) => ['integrations', 'agent-documents', agentId] as const,
  },

  // ============= Automations =============
  automations: {
    connections: (buId: string | null) => ['automations', 'connections', buId] as const,
    logs: (buId: string | null) => ['automations', 'logs', buId] as const,
    events: () => ['automations', 'events'] as const,
    actions: () => ['automations', 'actions'] as const,
  },

  // ============= BU =============
  bu: {
    all: () => ['bu'] as const,
    detail: (buId: string) => ['bu', 'detail', buId] as const,
    locations: (buId: string | null) => ['bu', 'locations', buId] as const,
    memberships: (userId: string) => ['bu', 'memberships', userId] as const,
    modules: (buId: string | null) => ['bu', 'modules', buId] as const,
  },

  // ============= Home Dashboard =============
  home: {
    dashboard: (buId: string | null, userId: string) => 
      ['home', 'dashboard', buId, userId] as const,
    birthdays: (buId: string | null) => ['home', 'birthdays', buId] as const,
    anniversaries: (buId: string | null) => ['home', 'anniversaries', buId] as const,
    newJetimobers: (buId: string | null) => ['home', 'new-jetimobers', buId] as const,
    cultureMessage: () => ['home', 'culture-message'] as const,
  },

  // ============= Global Search =============
  search: {
    global: (buId: string | null, query: string) => 
      ['search', 'global', buId, query] as const,
  },
} as const;

// Helper type for extracting query key types
export type QueryKeys = typeof queryKeys;
