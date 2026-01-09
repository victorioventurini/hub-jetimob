/**
 * Notification Admin Hooks
 * Hooks for admin-level notification management (outbox, logs, event settings)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { supabase as globalSupabase } from '@/integrations/supabase/client';

// Types
export interface OutboxItem {
  id: string;
  bu_id: string;
  user_id: string;
  event_slug: string;
  channel_slug: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'sent' | 'failed';
  retries: number;
  max_retries: number;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
  dedupe_key: string | null;
  // Joined
  recipient?: { display_name: string | null; email: string | null };
}

export interface InAppNotification {
  id: string;
  user_id: string;
  bu_id: string;
  type: string;
  title: string;
  message: string | null;
  context_type: string | null;
  context_id: string | null;
  context_url: string | null;
  actor_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  event_slug: string | null;
  // Joined
  recipient?: { display_name: string | null };
  actor?: { display_name: string | null };
}

export interface BuEventSetting {
  id: string;
  bu_id: string;
  event_slug: string;
  channel: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutboxFilters {
  status?: string;
  channel?: string;
  eventSlug?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface InAppFilters {
  isRead?: boolean | null;
  type?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

// Hook for BU event settings
export function useBuEventSettings(buId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.buEventSettings(buId ?? null),
    queryFn: async () => {
      if (!buId) return [];
      
      const { data, error } = await supabase
        .from('bu_notification_event_settings')
        .select('id, bu_id, event_slug, channel, is_enabled, created_at, updated_at')
        .eq('bu_id', buId)
        .order('event_slug')
        .order('channel');
      
      if (error) throw error;
      return data as BuEventSetting[];
    },
    enabled: !!buId,
  });
}

// Hook for updating BU event settings
export function useBuEventSettingMutation() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async ({
      eventSlug,
      channel,
      isEnabled,
    }: {
      eventSlug: string;
      channel: string;
      isEnabled: boolean;
    }) => {
      if (!currentBu?.id) throw new Error('BU not available');
      
      const { data, error } = await supabase
        .from('bu_notification_event_settings')
        .upsert({
          bu_id: currentBu.id,
          event_slug: eventSlug,
          channel: channel,
          is_enabled: isEnabled,
        }, {
          onConflict: 'bu_id,event_slug,channel',
        })
        .select('id, bu_id, event_slug, channel, is_enabled')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.buEventSettings(currentBu?.id ?? null) 
      });
    },
  });
}

// Hook for notification outbox (admin view)
export function useNotificationOutbox(buId?: string, filters?: OutboxFilters) {
  const supabase = useBuScopedSupabase();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 25;
  
  return useQuery({
    queryKey: queryKeys.notifications.outbox(buId ?? null, filters),
    queryFn: async () => {
      if (!buId) return { data: [], count: 0 };
      
      let query = supabase
        .from('notification_outbox')
        .select(`
          id, bu_id, user_id, event_slug, channel_slug, 
          status, retries, max_retries, last_error, 
          processed_at, created_at, dedupe_key
        `, { count: 'exact' })
        .eq('bu_id', buId)
        .order('created_at', { ascending: false });
      
      // Apply filters - cast to enum values
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'pending' | 'sent' | 'failed');
      }
      if (filters?.channel && filters.channel !== 'all') {
        query = query.eq('channel_slug', filters.channel);
      }
      if (filters?.eventSlug && filters.eventSlug !== 'all') {
        query = query.eq('event_slug', filters.eventSlug);
      }
      
      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      return { 
        data: (data ?? []) as OutboxItem[], 
        count: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
    },
    enabled: !!buId,
  });
}

// Hook for retrying failed outbox items
export function useRetryOutboxItem() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async (outboxId: string) => {
      const { error } = await supabase
        .from('notification_outbox')
        .update({ 
          status: 'pending', 
          retries: 0,
          last_error: null,
          next_retry_at: null,
        })
        .eq('id', outboxId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.outbox(currentBu?.id ?? null, undefined) 
      });
    },
  });
}

// Hook for in-app notifications (admin view)
export function useInAppNotifications(buId?: string, filters?: InAppFilters) {
  const supabase = useBuScopedSupabase();
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 25;
  
  return useQuery({
    queryKey: queryKeys.notifications.inAppLogs(buId ?? null, { read: filters?.isRead ?? undefined }),
    queryFn: async () => {
      if (!buId) return { data: [], count: 0 };
      
      let query = supabase
        .from('notifications')
        .select(`
          id, user_id, bu_id, type, title, message,
          context_type, context_url, actor_id,
          is_read, read_at, created_at, event_slug
        `, { count: 'exact' })
        .eq('bu_id', buId)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filters?.isRead !== null && filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }
      // Type filter removed - too many enum values to cast safely
      
      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      return { 
        data: (data ?? []) as InAppNotification[], 
        count: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
    },
    enabled: !!buId,
  });
}

// Hook for global outbox stats (diagnostics)
export function useOutboxStats() {
  return useQuery({
    queryKey: ['notifications', 'outbox-stats'],
    queryFn: async () => {
      const { data, error } = await globalSupabase
        .from('notification_outbox')
        .select('status, channel_slug');
      
      if (error) throw error;
      
      // Aggregate stats
      const stats = {
        total: data.length,
        pending: 0,
        sent: 0,
        failed: 0,
        byChannel: {} as Record<string, { pending: number; sent: number; failed: number }>,
      };
      
      for (const item of data) {
        if (item.status === 'pending') stats.pending++;
        else if (item.status === 'sent') stats.sent++;
        else if (item.status === 'failed') stats.failed++;
        
        if (!stats.byChannel[item.channel_slug]) {
          stats.byChannel[item.channel_slug] = { pending: 0, sent: 0, failed: 0 };
        }
        stats.byChannel[item.channel_slug][item.status as 'pending' | 'sent' | 'failed']++;
      }
      
      return stats;
    },
  });
}

// Hook for BU profiles (for recipient selector) - uses canonical view
export function useBuProfiles(buId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.profiles.buProfiles(buId ?? null),
    queryFn: async () => {
      if (!buId) return [];
      
      // Use canonical view - shows ALL registered users (even without first login)
      const { data: profiles, error } = await supabase
        .from('v_bu_active_profiles')
        .select('id, display_name, work_email, photo_url')
        .eq('bu_id', buId)
        .order('display_name');
      
      if (error) throw error;
      
      return (profiles ?? []) as Array<{
        id: string;
        display_name: string | null;
        work_email: string | null;
        photo_url: string | null;
      }>;
    },
    enabled: !!buId,
  });
}
