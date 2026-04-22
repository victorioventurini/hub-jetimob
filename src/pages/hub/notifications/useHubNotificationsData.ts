import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/globalClient';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/queryKeys';
import type {
  EventFormData,
  OutboxStats,
  OutboxItem,
} from './constants';

interface HealthAlert {
  id: string;
  bu_id: string;
  alert_type: string;
  severity: string;
  detected_at: string;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
}

/**
 * Aggregated queries + mutations used by HubNotifications page.
 * Extraído de HubNotifications.tsx (refatoração P1.3).
 */
export function useHubNotificationsData(activeTab: string) {
  const queryClient = useQueryClient();

  const outboxStatsQuery = useQuery<OutboxStats>({
    queryKey: queryKeys.hubNotifications.outboxStatsGlobal(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_outbox')
        .select('status, channel_slug, created_at, provider')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const pending = data?.filter((r) => r.status === 'pending').length || 0;
      const sent = data?.filter((r) => r.status === 'sent').length || 0;
      const failed = data?.filter((r) => r.status === 'failed').length || 0;
      const lastProcessed = data?.find((r) => r.status === 'sent')?.created_at || null;

      const byChannel: Record<string, { pending: number; sent: number; failed: number }> = {
        email: { pending: 0, sent: 0, failed: 0 },
        slack: { pending: 0, sent: 0, failed: 0 },
        webhook: { pending: 0, sent: 0, failed: 0 },
      };

      const byProvider: Record<string, number> = {};

      data?.forEach((r) => {
        const ch = r.channel_slug as string;
        if (byChannel[ch]) {
          if (r.status === 'pending') byChannel[ch].pending++;
          else if (r.status === 'sent') byChannel[ch].sent++;
          else if (r.status === 'failed') byChannel[ch].failed++;
        }
        if (r.provider && r.status === 'sent') {
          byProvider[r.provider] = (byProvider[r.provider] || 0) + 1;
        }
      });

      return { pending, sent, failed, total: data?.length || 0, lastProcessed, byChannel, byProvider };
    },
  });

  const outboxItemsQuery = useQuery<OutboxItem[]>({
    queryKey: queryKeys.hubNotifications.outboxItems(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_outbox')
        .select(
          'id, event_slug, channel_slug, status, provider, created_at, sent_at, processed_at, retries, last_error, user_id',
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data as OutboxItem[]) || [];
    },
    enabled: activeTab === 'outbox',
  });

  const healthAlertsQuery = useQuery<HealthAlert[]>({
    queryKey: queryKeys.hubNotifications.healthAlertsGlobal(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_health_alerts' as never)
        .select('id, bu_id, alert_type, severity, detected_at, resolved_at, metadata, is_active')
        .order('detected_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data as unknown as HealthAlert[]) || [];
    },
  });

  const upsertEvent = useMutation({
    mutationFn: async (data: EventFormData) => {
      const { error } = await supabase.from('notification_events').upsert(
        {
          slug: data.slug,
          module: data.module,
          name: data.name,
          description: data.description,
          audience: data.audience,
          severity: data.severity,
          is_mandatory: data.is_mandatory,
          default_channels: data.default_channels,
          icon: data.icon,
        },
        { onConflict: 'slug' },
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hubNotifications.eventsPrefix() });
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar evento', { description: error.message });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (slug: string) => {
      const { error } = await supabase.from('notification_events').delete().eq('slug', slug);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hubNotifications.eventsPrefix() });
      toast.success('Evento removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover evento', { description: error.message });
    },
  });

  const updateChannelStatus = useMutation({
    mutationFn: async ({
      slug,
      status,
    }: {
      slug: string;
      status: 'active' | 'inactive' | 'deprecated';
    }) => {
      const { error } = await supabase
        .from('notification_channels')
        .update({ status })
        .eq('slug', slug);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hubNotifications.channelsPrefix() });
      toast.success('Canal atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar canal', { description: error.message });
    },
  });

  return {
    outboxStats: outboxStatsQuery.data,
    statsLoading: outboxStatsQuery.isLoading,
    outboxItems: outboxItemsQuery.data || [],
    outboxLoading: outboxItemsQuery.isLoading,
    healthAlerts: healthAlertsQuery.data || [],
    upsertEvent,
    deleteEvent,
    updateChannelStatus,
  };
}
