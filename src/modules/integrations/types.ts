// Integration Types

export type IntegrationTestStatus = 'ok' | 'error' | 'pending';
export type IntegrationConfigMode = 'use_global' | 'override';
export type AgentScope = 'global' | 'bu';
export type AgentOutputFormat = 'text' | 'json';

export interface IntegrationCatalogItem {
  id: string;
  integration_key: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  supports_global_config: boolean;
  supports_bu_override: boolean;
  supports_agents: boolean;
  status: string;
  display_order: number;
  documentation_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationGlobalConfig {
  id: string;
  integration_key: string;
  is_enabled_global: boolean;
  config_encrypted: Record<string, unknown>;
  last_test_status: IntegrationTestStatus | null;
  last_test_message: string | null;
  last_test_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuIntegrationConfig {
  id: string;
  bu_id: string;
  integration_key: string;
  is_enabled_in_bu: boolean;
  config_mode: IntegrationConfigMode;
  config_override_encrypted: Record<string, unknown> | null;
  last_test_status: IntegrationTestStatus | null;
  last_test_message: string | null;
  last_test_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiAgent {
  id: string;
  scope: AgentScope;
  bu_id: string | null;
  integration_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  system_prompt: string;
  output_format: AgentOutputFormat;
  output_schema: Record<string, unknown> | null;
  allowed_tools: unknown[];
  model_name: string | null;
  max_tokens: number | null;
  temperature: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiAgentLog {
  id: string;
  agent_id: string | null;
  agent_name: string;
  scope: AgentScope;
  bu_id: string | null;
  user_id: string | null;
  integration_key: string;
  status: 'success' | 'error' | 'timeout';
  error_message: string | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  model_used: string | null;
  created_at: string;
}

// Instruction Source Types
export type InstructionSourceType = 'api' | 'document' | 'hub_context' | 'template';

export interface InstructionSource {
  id: string;
  agent_id: string;
  source_type: InstructionSourceType;
  name: string;
  description: string | null;
  priority: number;
  is_enabled: boolean;
  config: ApiSourceConfig | DocumentSourceConfig | HubContextConfig | TemplateSourceConfig;
  last_fetch_at: string | null;
  last_fetch_status: 'success' | 'error' | 'pending' | null;
  last_fetch_error: string | null;
  cached_content: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiSourceConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body_template?: Record<string, unknown>;
  refresh_interval_seconds?: number;
  auth_type?: 'none' | 'bearer' | 'api_key';
}

export interface DocumentSourceConfig {
  document_ids: string[];
}

export interface HubContextConfig {
  tables: ('okrs' | 'kpis' | 'teams')[];
  filters?: {
    okrs?: { teamId?: string; status?: string[]; ragStatus?: string[] };
    kpis?: { category?: string; teamId?: string };
    teams?: { status?: string[] };
  };
  max_rows?: number;
}

export interface TemplateSourceConfig {
  template_content: string;
}

// Hub Tool Names (for allowed_tools field)
export const HUB_TOOLS = ['query_okrs', 'query_kpis', 'query_teams'] as const;
export type HubToolName = typeof HUB_TOOLS[number];

// Icon mapping
export const integrationIconMap: Record<string, string> = {
  bot: 'Bot',
  mail: 'Mail',
  'map-pin': 'MapPin',
  'message-square': 'MessageSquare',
  zap: 'Zap',
  phone: 'Phone',
  plug: 'Plug',
  database: 'Database',
  cloud: 'Cloud',
};
