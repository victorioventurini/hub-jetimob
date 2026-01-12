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
}

export interface InAppFilters {
  isRead?: boolean | null;
  type?: string;
  q?: string;
}

const DEFAULT_LIMIT = 1000;

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
// Note: notification_outbox.user_id references auth.users.id, NOT profiles.id
// We fetch profiles separately via user_id match
export function useNotificationOutbox(buId?: string, filters?: OutboxFilters) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.outbox(buId ?? null, filters),
    queryFn: async () => {
      if (!buId) return { data: [], count: 0 };
      
      // Step 1: Fetch outbox items (without join since FK goes to auth.users, not profiles)
      let query = supabase
        .from('notification_outbox')
        .select(`
          id, bu_id, user_id, event_slug, channel_slug, 
          status, retries, max_retries, last_error, 
          processed_at, created_at, dedupe_key
        `)
        .eq('bu_id', buId)
        .order('created_at', { ascending: false })
        .limit(DEFAULT_LIMIT);
      
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
      
      const { data: outboxItems, error } = await query;
      
      if (error) throw error;
      if (!outboxItems || outboxItems.length === 0) {
        return { data: [], count: 0 };
      }
      
      // Step 2: Get unique auth user_ids and fetch profiles
      const userIds = [...new Set(outboxItems.map(item => item.user_id).filter(Boolean))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, work_email')
        .in('user_id', userIds);
      
      // Create lookup map: auth.users.id -> profile info
      const profileMap = new Map<string, { display_name: string | null; work_email: string | null }>();
      for (const p of profiles ?? []) {
        if (p.user_id) {
          profileMap.set(p.user_id, { display_name: p.display_name, work_email: p.work_email });
        }
      }
      
      // Step 3: Enrich outbox items with recipient info
      const mappedData = outboxItems.map(item => {
        const profile = item.user_id ? profileMap.get(item.user_id) : null;
        return {
          ...item,
          recipient: profile 
            ? { display_name: profile.display_name, email: profile.work_email }
            : undefined,
        };
      }) as OutboxItem[];
      
      return { 
        data: mappedData, 
        count: mappedData.length,
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
// Note: notifications.user_id and actor_id reference auth.users.id, NOT profiles.id
// We fetch profiles separately via user_id match
export function useInAppNotifications(buId?: string, filters?: InAppFilters) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.inAppLogs(buId ?? null, { read: filters?.isRead ?? undefined }),
    queryFn: async () => {
      if (!buId) return { data: [], count: 0 };
      
      // Step 1: Fetch notifications (without join since FKs go to auth.users, not profiles)
      let query = supabase
        .from('notifications')
        .select(`
          id, user_id, bu_id, type, title, message,
          context_type, context_url, actor_id,
          is_read, read_at, created_at, event_slug
        `)
        .eq('bu_id', buId)
        .order('created_at', { ascending: false })
        .limit(DEFAULT_LIMIT);
      
      // Apply filters
      if (filters?.isRead !== null && filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }
      
      const { data: notifications, error } = await query;
      
      if (error) throw error;
      if (!notifications || notifications.length === 0) {
        return { data: [], count: 0 };
      }
      
      // Step 2: Get unique auth user_ids (both recipients and actors) and fetch profiles
      const allUserIds = new Set<string>();
      for (const n of notifications) {
        if (n.user_id) allUserIds.add(n.user_id);
        if (n.actor_id) allUserIds.add(n.actor_id);
      }
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', [...allUserIds]);
      
      // Create lookup map: auth.users.id -> display_name
      const profileMap = new Map<string, string | null>();
      for (const p of profiles ?? []) {
        if (p.user_id) {
          profileMap.set(p.user_id, p.display_name);
        }
      }
      
      // Step 3: Enrich notifications with recipient/actor info
      const mappedData = notifications.map(item => ({
        ...item,
        recipient: item.user_id 
          ? { display_name: profileMap.get(item.user_id) ?? null }
          : undefined,
        actor: item.actor_id 
          ? { display_name: profileMap.get(item.actor_id) ?? null }
          : undefined,
      })) as InAppNotification[];
      
      return { 
        data: mappedData, 
        count: mappedData.length,
      };
    },
    enabled: !!buId,
  });
}

// Hook for global outbox stats (diagnostics)
export function useOutboxStats() {
  return useQuery({
    queryKey: queryKeys.notificationAdmin.outboxStats(),
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
      // Include user_id for notifications FK (auth.users.id)
      const { data: profiles, error } = await supabase
        .from('v_bu_active_profiles')
        .select('id, user_id, display_name, work_email, photo_url')
        .eq('bu_id', buId)
        .order('display_name');
      
      if (error) throw error;
      
      return (profiles ?? []) as Array<{
        id: string;
        user_id: string | null;
        display_name: string | null;
        work_email: string | null;
        photo_url: string | null;
      }>;
    },
    enabled: !!buId,
  });
}
