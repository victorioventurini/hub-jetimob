/**
 * Integrations & Automations Query Keys
 */
export const integrationsKeys = {
  all: () => ['integrations'] as const,
  catalog: () => ['integrations', 'catalog'] as const,
  catalogByKey: (integrationKey: string) => ['integrations', 'catalog', integrationKey] as const,
  global: () => ['integrations', 'global'] as const,
  globalByKey: (integrationKey: string) => ['integrations', 'global', integrationKey] as const,
  bu: (buId: string | null) => ['integrations', 'bu', buId] as const,
  buByKey: (buId: string | null, integrationKey: string) => ['integrations', 'bu', buId, integrationKey] as const,
  // Agents
  agents: (buId: string | null) => ['integrations', 'agents', buId] as const,
  globalAgents: (integrationKey?: string) => ['integrations', 'global-agents', integrationKey] as const,
  buAgents: (buId: string | null, integrationKey?: string) => ['integrations', 'bu-agents', buId, integrationKey] as const,
  agentDetail: (agentId: string) => ['integrations', 'agent', agentId] as const,
  agentLogs: (agentId: string) => ['integrations', 'agent-logs', agentId] as const,
  agentLogsFiltered: (filters?: { bu_id?: string; agent_id?: string; integration_key?: string; limit?: number }) => 
    ['integrations', 'agent-logs', filters] as const,
  agentDocuments: (agentId: string) => ['integrations', 'agent-documents', agentId] as const,
  instructionSources: (agentId: string) => ['integrations', 'instruction-sources', agentId] as const,
  instructionSourceDetail: (sourceId: string) => ['integrations', 'instruction-sources', 'detail', sourceId] as const,
} as const;

export const automationsKeys = {
  connections: (buId: string | null) => ['automations', 'connections', buId] as const,
  logs: (buId: string | null) => ['automations', 'logs', buId] as const,
  tokens: (buId: string | null) => ['automation-tokens', buId] as const,
  events: () => ['automations', 'events'] as const,
  actions: () => ['automations', 'actions'] as const,
} as const;

export const cronJobKeys = {
  globalConfig: () => ['integrations', 'global-config', 'cron-job'] as const,
  executionLogs: () => ['cron-execution-logs'] as const,
} as const;

export const vicKeys = {
  buConfig: (buId: string | null) => ['vic', 'bu-config', buId] as const,
  agentActivations: (buId: string | null) => ['vic', 'agent-activations', buId] as const,
  globalAgents: () => ['vic', 'global-agents'] as const,
  buUnitsForAudit: () => ['vic', 'bu-units-audit'] as const,
  logs: (timeRange: string, buId: string | null) => ['vic', 'logs', timeRange, buId] as const,
} as const;
