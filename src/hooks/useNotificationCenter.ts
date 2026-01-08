import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useAuth } from './useAuth';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';

// Types
export interface NotificationEvent {
  id: string;
  slug: string;
  module: string;
  name: string;
  description: string | null;
  audience: 'internal' | 'external' | 'both';
  severity: 'info' | 'warning' | 'critical';
  is_mandatory: boolean;
  default_channels: string[];
  icon: string | null;
}

export interface NotificationChannel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  requires_configuration: boolean;
  status: string;
  display_order: number;
}

export interface BuNotificationChannel {
  id: string;
  bu_id: string;
  channel_slug: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
}

export interface UserNotificationSetting {
  event_slug: string;
  event_name: string;
  event_description: string | null;
  event_module: string;
  event_severity: 'info' | 'warning' | 'critical';
  is_mandatory: boolean;
  channel_slug: string;
  channel_name: string;
  enabled: boolean;
}

// Hook for notification events catalog
export function useNotificationEvents() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.events(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_events')
        .select('*')
        .order('module', { ascending: true })
        .order('slug', { ascending: true });
      
      if (error) throw error;
      return data as NotificationEvent[];
    },
  });
}

// Hook for notification channels catalog
export function useNotificationChannels() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.channels(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_channels')
        .select('*')
        .eq('status', 'active')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as NotificationChannel[];
    },
  });
}

// Hook for BU notification channels configuration
export function useBuNotificationChannels(buId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.buChannels(buId ?? null),
    queryFn: async () => {
      if (!buId) return [];
      
      const { data, error } = await supabase
        .from('bu_notification_channels')
        .select('*')
        .eq('bu_id', buId);
      
      if (error) throw error;
      return data as BuNotificationChannel[];
    },
    enabled: !!buId,
  });
}

// Hook for managing BU notification channels
export function useBuNotificationChannelMutations() {
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  const upsertChannel = useMutation({
    mutationFn: async ({ 
      buId, 
      channelSlug, 
      isEnabled, 
      config 
    }: { 
      buId: string; 
      channelSlug: string; 
      isEnabled: boolean; 
      config?: Record<string, string>;
    }) => {
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
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['bu-notification-channels', variables.buId] 
      });
    },
  });
  
  return { upsertChannel };
}

// Hook for user notification settings
export function useUserNotificationSettings() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.settings(user?.id ?? '', currentBu?.id ?? ''),
    queryFn: async () => {
      if (!user?.id || !currentBu?.id) return [];
      
      const { data, error } = await supabase.rpc('get_user_notification_settings', {
        p_user_id: user.id,
        p_bu_id: currentBu.id,
      });
      
      if (error) throw error;
      return data as UserNotificationSetting[];
    },
    enabled: !!user?.id && !!currentBu?.id,
  });
}

// Hook for updating user notification preferences
export function useUserNotificationPreferenceMutation() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  
  return useMutation({
    mutationFn: async ({ 
      eventSlug, 
      channelSlug, 
      enabled 
    }: { 
      eventSlug: string; 
      channelSlug: string; 
      enabled: boolean;
    }) => {
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

// Hook for emitting notification events (used by modules)
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
    }: {
      eventSlug: string;
      recipientUserIds: string[];
      title?: string;
      message?: string;
      contextType?: string;
      contextId?: string;
      contextUrl?: string;
      metadata?: Record<string, string | number | boolean>;
    }) => {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    },
  });
}

// Helper to group settings by module
export function groupSettingsByModule(settings: UserNotificationSetting[]) {
  const grouped: Record<string, {
    events: Record<string, {
      name: string;
      description: string | null;
      severity: string;
      is_mandatory: boolean;
      channels: Record<string, boolean>;
    }>;
  }> = {};
  
  for (const setting of settings) {
    if (!grouped[setting.event_module]) {
      grouped[setting.event_module] = { events: {} };
    }
    
    if (!grouped[setting.event_module].events[setting.event_slug]) {
      grouped[setting.event_module].events[setting.event_slug] = {
        name: setting.event_name,
        description: setting.event_description,
        severity: setting.event_severity as string,
        is_mandatory: setting.is_mandatory,
        channels: {},
      };
    }
    
    grouped[setting.event_module].events[setting.event_slug].channels[setting.channel_slug] = setting.enabled;
  }
  
  return grouped;
}

// Module name mapping
export const moduleNames: Record<string, string> = {
  core: 'Geral',
  okrs: 'OKRs',
  tickets: 'Tickets',
  assets: 'Ativos',
  teams: 'Times',
  kpis: 'KPIs',
};
