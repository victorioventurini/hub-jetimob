import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { queryKeys } from '@/lib/queryKeys';
import type {
  AutomationEventCatalog,
  AutomationActionCatalog,
  AutomationConnection,
  AutomationIncomingToken,
  AutomationLog,
} from '../types';

// Campos explícitos para evitar select('*')
const EVENT_CATALOG_FIELDS = 'id, event_key, name, description, category, payload_schema, payload_example, scope, is_active, event_version, created_at, updated_at';
const ACTION_CATALOG_FIELDS = 'id, action_key, name, description, category, payload_schema, payload_example, required_fields, is_active, action_version, created_at, updated_at';
const CONNECTION_FIELDS = 'id, bu_id, name, description, webhook_url, http_method, auth_type, auth_config_encrypted, headers_encrypted, timeout_ms, retry_count, scope, is_active, created_by, created_at, updated_at';
const TOKEN_FIELDS = 'id, bu_id, name, description, token_hash, scope, is_active, allowed_actions, rate_limit_per_minute, expires_at, last_used_at, created_by, created_at, updated_at';
const LOG_FIELDS = 'id, bu_id, connection_id, token_id, type, event_key, action_key, status, status_code, latency_ms, request_payload, response_payload, error_message, retry_attempt, user_id, created_at';

export function useEventCatalog() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.automations.events(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_event_catalog')
        .select(EVENT_CATALOG_FIELDS)
        .eq('is_active', true)
        .order('category')
        .order('event_key');

      if (error) throw error;
      return data as AutomationEventCatalog[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - catalog rarely changes
  });
}

export function useActionCatalog() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.automations.actions(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_action_catalog')
        .select(ACTION_CATALOG_FIELDS)
        .eq('is_active', true)
        .order('category')
        .order('action_key');

      if (error) throw error;
      return data as AutomationActionCatalog[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - catalog rarely changes
  });
}

export function useAutomationConnections(buId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.automations.connections(buId ?? null),
    queryFn: async () => {
      let query = supabase
        .from('automation_connections')
        .select(`
          ${CONNECTION_FIELDS},
          bu:bu_units(name),
          events:automation_connection_events(
            id,
            event_key,
            is_active,
            event:automation_event_catalog(name, category)
          )
        `)
        .order('created_at', { ascending: false });

      if (buId) {
        query = query.or(`scope.eq.global,bu_id.eq.${buId}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AutomationConnection[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAutomationTokens(buId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.automations.tokens(buId ?? null),
    queryFn: async () => {
      let query = supabase
        .from('automation_incoming_tokens')
        .select(`
          ${TOKEN_FIELDS},
          bu:bu_units(name)
        `)
        .order('created_at', { ascending: false });

      if (buId) {
        query = query.or(`scope.eq.global,bu_id.eq.${buId}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AutomationIncomingToken[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAutomationLogs(filters?: {
  buId?: string;
  type?: 'event' | 'action';
  status?: string;
  eventKey?: string;
  limit?: number;
}) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.automations.logs(filters?.buId ?? null),
    queryFn: async () => {
      let query = supabase
        .from('automation_logs')
        .select(`
          ${LOG_FIELDS},
          connection:automation_connections(name),
          bu:bu_units(name)
        `)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.buId) {
        query = query.eq('bu_id', filters.buId);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.eventKey) {
        query = query.eq('event_key', filters.eventKey);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AutomationLog[];
    },
    staleTime: 30 * 1000, // 30 seconds - logs update frequently
  });
}
