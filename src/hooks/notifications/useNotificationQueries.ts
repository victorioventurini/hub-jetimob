import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useAuth } from '../useAuth';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import type { 
  NotificationEvent, 
  NotificationChannel, 
  BuNotificationChannel,
  UserNotificationSetting 
} from './types';

/**
 * Hook for notification events catalog
 * Returns all available notification event types
 */
export function useNotificationEvents() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.events(),
    staleTime: 10 * 60 * 1000, // 10 minutes - catalog rarely changes
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_events')
        .select('id, slug, module, name, description, audience, severity, is_mandatory, default_channels, icon')
        .order('module', { ascending: true })
        .order('slug', { ascending: true });
      
      if (error) throw error;
      return data as NotificationEvent[];
    },
  });
}

/**
 * Hook for notification channels catalog
 * Returns all active notification delivery channels
 */
export function useNotificationChannels() {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.channels(),
    staleTime: 10 * 60 * 1000, // 10 minutes - catalog rarely changes
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_channels')
        .select('id, slug, name, description, icon, requires_configuration, status, display_order')
        .eq('status', 'active')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as NotificationChannel[];
    },
  });
}

/**
 * Hook for BU notification channels configuration
 * Returns BU-specific channel settings
 */
export function useBuNotificationChannels(buId?: string) {
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.buChannels(buId ?? null),
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (!buId) return [];
      
      const { data, error } = await supabase
        .from('bu_notification_channels')
        .select('id, bu_id, channel_slug, is_enabled, config, created_at, updated_at')
        .eq('bu_id', buId);
      
      if (error) throw error;
      return data as BuNotificationChannel[];
    },
    enabled: !!buId,
  });
}

/**
 * Hook for user notification settings
 * Returns user's preferences for all notification events
 */
export function useUserNotificationSettings() {
  const { user } = useAuth();
  const { currentBu } = useBu();
  const supabase = useBuScopedSupabase();
  
  return useQuery({
    queryKey: queryKeys.notifications.settings(user?.id ?? '', currentBu?.id ?? ''),
    staleTime: 2 * 60 * 1000, // 2 minutes
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
