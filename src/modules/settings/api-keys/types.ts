export interface BuApiKey {
  id: string;
  bu_id: string;
  name: string;
  description: string | null;
  consumer_system: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  status: 'active' | 'revoked';
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BuApiKeyUsageLog {
  id: string;
  api_key_id: string | null;
  method: string;
  route: string;
  status_code: number;
  latency_ms: number | null;
  ip_address: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CreateBuApiKeyInput {
  name: string;
  description?: string;
  consumer_system: string;
  scopes: string[];
  rate_limit_per_minute: number;
  expires_at?: string | null;
}

export interface CreatedBuApiKey extends BuApiKey {
  /** Chave em texto puro — exibida apenas uma vez, no momento da criação. */
  api_key: string;
}
