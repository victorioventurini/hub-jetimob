import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AutomationEventCatalog,
  AutomationActionCatalog,
  AutomationConnection,
  AutomationIncomingToken,
  AutomationLog,
} from '../types';

export function useEventCatalog() {
  return useQuery({
    queryKey: ['automation-event-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_event_catalog')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('event_key');

      if (error) throw error;
      return data as AutomationEventCatalog[];
    },
  });
}

export function useActionCatalog() {
  return useQuery({
    queryKey: ['automation-action-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_action_catalog')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('action_key');

      if (error) throw error;
      return data as AutomationActionCatalog[];
    },
  });
}

export function useAutomationConnections(buId?: string) {
  return useQuery({
    queryKey: ['automation-connections', buId],
    queryFn: async () => {
      let query = supabase
        .from('automation_connections')
        .select(`
          *,
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
  });
}

export function useAutomationTokens(buId?: string) {
  return useQuery({
    queryKey: ['automation-tokens', buId],
    queryFn: async () => {
      let query = supabase
        .from('automation_incoming_tokens')
        .select(`
          *,
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
  });
}

export function useAutomationLogs(filters?: {
  buId?: string;
  type?: 'event' | 'action';
  status?: string;
  eventKey?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['automation-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('automation_logs')
        .select(`
          *,
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
  });
}
