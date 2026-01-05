// Automation Types

export type AutomationScope = 'global' | 'bu';
export type AutomationLogStatus = 'success' | 'error' | 'pending' | 'retrying';
export type AutomationLogType = 'event' | 'action';
export type AuthType = 'none' | 'bearer' | 'api_key' | 'basic';

export interface AutomationEventCatalog {
  id: string;
  event_key: string;
  category: string;
  name: string;
  description: string;
  event_version: string;
  payload_schema: Record<string, unknown>;
  payload_example: Record<string, unknown>;
  scope: AutomationScope;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationActionCatalog {
  id: string;
  action_key: string;
  category: string;
  name: string;
  description: string;
  action_version: string;
  payload_schema: Record<string, unknown>;
  payload_example: Record<string, unknown>;
  required_fields: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationConnection {
  id: string;
  name: string;
  description: string | null;
  bu_id: string | null;
  scope: AutomationScope;
  webhook_url: string;
  http_method: string;
  headers_encrypted: Record<string, unknown>;
  auth_type: AuthType;
  auth_config_encrypted: Record<string, unknown>;
  is_active: boolean;
  retry_count: number;
  timeout_ms: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  events?: AutomationConnectionEvent[];
  bu?: { name: string } | null;
}

export interface AutomationConnectionEvent {
  id: string;
  connection_id: string;
  event_key: string;
  is_active: boolean;
  created_at: string;
  // Joined data
  event?: AutomationEventCatalog;
}

export interface AutomationIncomingToken {
  id: string;
  name: string;
  description: string | null;
  token_hash: string;
  bu_id: string | null;
  scope: AutomationScope;
  allowed_actions: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  bu?: { name: string } | null;
}

export interface AutomationLog {
  id: string;
  type: AutomationLogType;
  event_key: string | null;
  action_key: string | null;
  connection_id: string | null;
  token_id: string | null;
  bu_id: string | null;
  user_id: string | null;
  status: AutomationLogStatus;
  status_code: number | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  error_message: string | null;
  latency_ms: number | null;
  retry_attempt: number;
  created_at: string;
  // Joined data
  connection?: { name: string } | null;
  bu?: { name: string } | null;
}

// Category labels for display
export const eventCategoryLabels: Record<string, string> = {
  users: 'Usuários',
  bu: 'Business Units',
  teams: 'Times',
  okrs: 'OKRs',
  krs: 'Key Results',
  kpis: 'KPIs',
  automation: 'Automação',
};

export const actionCategoryLabels: Record<string, string> = {
  kpis: 'KPIs',
  krs: 'Key Results',
  okrs: 'OKRs',
  system: 'Sistema',
};

// Status colors
export const logStatusColors: Record<AutomationLogStatus, string> = {
  success: 'text-green-600 bg-green-50',
  error: 'text-red-600 bg-red-50',
  pending: 'text-yellow-600 bg-yellow-50',
  retrying: 'text-orange-600 bg-orange-50',
};

export const logStatusLabels: Record<AutomationLogStatus, string> = {
  success: 'Sucesso',
  error: 'Erro',
  pending: 'Pendente',
  retrying: 'Tentando novamente',
};
