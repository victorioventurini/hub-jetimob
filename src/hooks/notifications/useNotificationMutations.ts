import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useAuth } from '../useAuth';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import type { 
  UpsertChannelParams,
  UpdatePreferenceParams,
  EmitNotificationParams,
  SendTestNotificationParams,
  TestNotificationResult
} from './types';

/**
 * Hook for managing BU notification channels
 * Provides mutations for upserting channel configurations
 */
export function useBuNotificationChannelMutations() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  const upsertChannel = useMutation({
    mutationFn: async ({ buId, channelSlug, isEnabled, config }: UpsertChannelParams) => {
      const { data, error } = await supabase
        .from('bu_notification_channels')
        .upsert([{
          bu_id: buId,
          channel_slug: channelSlug,
          is_enabled: isEnabled,
          config: config || {},
        }], {
          onConflict: 'bu_id,channel_slug',
        })
        .select('id, bu_id, channel_slug, is_enabled, config, created_at, updated_at')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.buChannels(variables.buId) 
      });
    },
  });
  
  return { upsertChannel };
}

/**
 * Hook for updating user notification preferences
 */
export function useUserNotificationPreferenceMutation() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async ({ eventSlug, channelSlug, enabled }: UpdatePreferenceParams) => {
      if (!user?.id || !currentBu?.id) {
        throw new Error('User or BU not available');
      }
      
      const { data, error } = await supabase.rpc('set_user_notification_preference', {
        p_user_id: user.id,
        p_bu_id: currentBu.id,
        p_event_slug: eventSlug,
        p_channel_slug: channelSlug,
        p_enabled: enabled,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.notifications.settings(user?.id ?? '', currentBu?.id ?? '') 
      });
    },
  });
}

/**
 * Hook for emitting notification events (used by modules)
 */
export function useEmitNotificationEvent() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async ({
      eventSlug,
      recipientUserIds,
      title,
      message,
      contextType,
      contextId,
      contextUrl,
      metadata,
    }: EmitNotificationParams) => {
      if (!currentBu?.id) {
        throw new Error('BU not available');
      }
      
      const { data, error } = await supabase.rpc('emit_notification_event', {
        p_event_slug: eventSlug,
        p_bu_id: currentBu.id,
        p_recipient_user_ids: recipientUserIds,
        p_actor_id: user?.id ?? null,
        p_title: title ?? null,
        p_message: message ?? null,
        p_context_type: contextType ?? null,
        p_context_id: contextId ?? null,
        p_context_url: contextUrl ?? null,
        p_metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : {},
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(), refetchType: 'active' });
    },
  });
}

/**
 * Hook for sending test notifications (admin)
 * Uses v2 RPC that accepts profile_id and resolves auth_user_id internally
 */
export function useSendTestNotification() {
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async ({ targetProfileId, channels = ['in_app', 'email'] }: SendTestNotificationParams) => {
      if (!currentBu?.id) {
        throw new Error('BU not available');
      }
      
      const { data, error } = await supabase.rpc('send_test_notification_v2', {
        p_bu_id: currentBu.id,
        p_target_profile_id: targetProfileId,
        p_channels: channels,
      });
      
      if (error) throw error;
      
      const results = data as TestNotificationResult[];
      
      // Check for errors in results
      const errors = results.filter(r => r.status === 'error');
      if (errors.length > 0 && errors.length === results.length) {
        throw new Error(errors[0].error_message || 'Failed to send notification');
      }
      
      // If email or other outbox channels were included, trigger the outbox processor
      const hasOutboxChannels = channels.some(ch => ['email', 'slack', 'webhook'].includes(ch));
      const hasSuccessfulOutbox = results.some(r => r.status === 'queued');
      if (hasOutboxChannels && hasSuccessfulOutbox) {
        supabase.functions.invoke('process-notification-outbox').catch((err: unknown) => {
          console.warn('[useSendTestNotification] Failed to trigger outbox processor:', err);
        });
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(), refetchType: 'active' });
    },
  });
}
