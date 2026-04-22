import { useState } from 'react';
import type { Json } from '@/integrations/supabase/types';
import {
  useNotificationChannels,
  useBuNotificationChannels,
  useBuNotificationChannelMutations,
  useNotificationEvents,
  useSendTestNotification,
  useBuEventSettings,
  useBuEventSettingMutation,
  useNotificationOutbox,
  useInAppNotifications,
  useRetryOutboxItem,
  useBuProfiles,
} from '@/hooks/notifications';
import { useBu } from '@/contexts/BuContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState } from '@/shared/url/useUrlState';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell,
  Settings2,
  Inbox,
  ListChecks,
  TestTube,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { TemplatesList } from '@/components/notifications/templates';
import { toast } from 'sonner';

import {
  ACTIVE_CHANNELS,
  isChannelConfiguredFromConfig,
  type TabValue,
} from './notifications/constants';
import { ChannelsTab } from './notifications/ChannelsTab';
import { EventsTab } from './notifications/EventsTab';
import { OutboxTab } from './notifications/OutboxTab';
import { InAppTab } from './notifications/InAppTab';
import {
  TestNotificationTab,
  type TestResultEntry,
} from './notifications/TestNotificationTab';
import { ChannelConfigDialog } from './notifications/ChannelConfigDialog';

export default function SettingsNotifications() {
  const { currentBu } = useBu();
  usePageTitle('Notificações', {
    customDescription: 'Configure canais, eventos e templates de notificação da BU.',
  });
  const { has: hasPermission } = usePermissions();

  const canManageBuNotifications = hasPermission('notifications.bu.manage:bu');

  // URL State
  const tabState = useUrlState<TabValue>({ key: 'tab', defaultValue: 'channels' });
  const statusState = useUrlState<string>({ key: 'status', defaultValue: 'all' });
  const channelState = useUrlState<string>({ key: 'channel', defaultValue: 'all' });

  // Queries
  const { data: channels = [], isLoading: channelsLoading } = useNotificationChannels();
  const { data: buChannels = [], isLoading: buChannelsLoading } = useBuNotificationChannels(
    currentBu?.id,
  );
  const { data: events = [], isLoading: eventsLoading } = useNotificationEvents();
  const { data: buEventSettings = [] } = useBuEventSettings(currentBu?.id);
  const { data: profiles = [] } = useBuProfiles(currentBu?.id);

  const outboxFilters = { status: statusState.value, channel: channelState.value };
  const { data: outboxData, isLoading: outboxLoading } = useNotificationOutbox(
    currentBu?.id,
    outboxFilters,
  );
  const { data: inappData, isLoading: inappLoading } = useInAppNotifications(currentBu?.id);

  // Mutations
  const { upsertChannel } = useBuNotificationChannelMutations();
  const eventSettingMutation = useBuEventSettingMutation();
  const retryOutbox = useRetryOutboxItem();
  const sendTest = useSendTestNotification();

  // Local state
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [testRecipient, setTestRecipient] = useState<string>('');
  const [testChannels, setTestChannels] = useState<string[]>(['in_app', 'email']);
  const [testResult, setTestResult] = useState<TestResultEntry[] | null>(null);
  const [testingChannel, setTestingChannel] = useState(false);

  const isLoading = channelsLoading || buChannelsLoading || eventsLoading;

  const getBuChannelConfig = (channelSlug: string) =>
    buChannels.find((bc) => bc.channel_slug === channelSlug);

  const getEventSetting = (eventSlug: string, channel: string) =>
    buEventSettings.find((s) => s.event_slug === eventSlug && s.channel === channel);

  const isChannelConfigured = (channelSlug: string): boolean => {
    const buChannel = getBuChannelConfig(channelSlug);
    const config = buChannel?.config as Record<string, unknown> | null;
    return isChannelConfiguredFromConfig(channelSlug, config);
  };

  const handleToggleChannel = (channelSlug: string, isEnabled: boolean) => {
    if (!currentBu?.id) return;

    if (isEnabled && !isChannelConfigured(channelSlug)) {
      toast.error('Configure o canal primeiro antes de ativá-lo');
      return;
    }

    upsertChannel.mutate(
      { buId: currentBu.id, channelSlug, isEnabled },
      {
        onSuccess: () => {
          toast.success(`Canal ${isEnabled ? 'ativado' : 'desativado'}`);
        },
        onError: (error) => {
          toast.error('Erro ao atualizar canal', { description: error.message });
        },
      },
    );
  };

  const handleToggleEventSetting = (eventSlug: string, channel: string, isEnabled: boolean) => {
    eventSettingMutation.mutate(
      { eventSlug, channel, isEnabled },
      {
        onSuccess: () => {
          toast.success('Configuração atualizada');
        },
        onError: (error) => {
          toast.error('Erro ao atualizar', { description: error.message });
        },
      },
    );
  };

  const handleOpenConfig = (channelSlug: string) => {
    const buChannel = getBuChannelConfig(channelSlug);
    setSelectedChannel(channelSlug);
    const existingConfig = (buChannel?.config as Record<string, string>) || {};
    const safeConfig = { ...existingConfig };
    if (channelSlug === 'slack') delete safeConfig.bot_token;
    if (channelSlug === 'webhook') delete safeConfig.secret_header_value;
    setConfigForm(safeConfig);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = () => {
    if (!currentBu?.id || !selectedChannel) return;

    const buChannel = getBuChannelConfig(selectedChannel);
    const existingConfig = (buChannel?.config as Record<string, string>) || {};
    const mergedConfig: { [key: string]: Json | undefined } = {
      ...existingConfig,
      ...configForm,
      configured: true,
    };

    Object.keys(mergedConfig).forEach((key) => {
      if (mergedConfig[key] === '' || mergedConfig[key] === undefined) {
        delete mergedConfig[key];
      }
    });

    upsertChannel.mutate(
      {
        buId: currentBu.id,
        channelSlug: selectedChannel,
        isEnabled: buChannel?.is_enabled ?? false,
        config: mergedConfig as Json,
      },
      {
        onSuccess: () => {
          toast.success('Configuração salva');
          setConfigDialogOpen(false);
        },
        onError: (error) => {
          toast.error('Erro ao salvar configuração', { description: error.message });
        },
      },
    );
  };

  const handleTestChannel = (channelSlug: string) => {
    if (!currentBu?.id) return;

    const currentUser = profiles.find((p) => p.user_id) || profiles[0];
    if (!currentUser) {
      toast.error('Nenhum usuário disponível para teste');
      return;
    }
    if (!currentUser.user_id) {
      toast.error('Usuário ainda não fez login. Não é possível enviar teste.');
      return;
    }

    setTestingChannel(true);
    sendTest.mutate(
      { targetProfileId: currentUser.id, channels: [channelSlug] },
      {
        onSuccess: (data) => {
          const result = data[0];
          if (result?.status === 'sent' || result?.status === 'queued') {
            toast.success(`Teste ${channelSlug} enviado! Verifique o Outbox.`);
          } else if (result?.status === 'error') {
            toast.error(`Erro no teste ${channelSlug}`, {
              description: result.error_message || 'Erro desconhecido',
            });
          } else {
            toast.info(`Teste ${channelSlug}: ${result?.status || 'enviado'}`);
          }
          setTestingChannel(false);
        },
        onError: (error) => {
          toast.error(`Erro no teste ${channelSlug}`, { description: error.message });
          setTestingChannel(false);
        },
      },
    );
  };

  const handleRetryOutbox = (outboxId: string) => {
    retryOutbox.mutate(outboxId, {
      onSuccess: () => {
        toast.success('Item reenfileirado para reprocessamento');
      },
      onError: (error) => {
        toast.error('Erro ao reprocessar', { description: error.message });
      },
    });
  };

  const handleSendTest = () => {
    if (!testRecipient) {
      toast.error('Selecione um destinatário');
      return;
    }
    if (testChannels.length === 0) {
      toast.error('Selecione pelo menos um canal');
      return;
    }

    for (const ch of testChannels) {
      if (ch !== 'in_app' && !isChannelConfigured(ch)) {
        toast.error(`Canal ${ch} não está configurado`);
        return;
      }
    }

    sendTest.mutate(
      { targetProfileId: testRecipient, channels: testChannels },
      {
        onSuccess: (data) => {
          const errors = data.filter((d) => d.status === 'error');
          const successes = data.filter((d) => d.status !== 'error');

          if (successes.length > 0) {
            toast.success('Notificação de teste enviada!');
          }
          if (errors.length > 0) {
            errors.forEach((e) => {
              toast.error(`Erro no canal ${e.channel}`, {
                description: e.error_message || 'Erro desconhecido',
              });
            });
          }

          setTestResult(
            data.map((d) => ({
              channel: d.channel,
              status: d.status,
              id: d.notification_id || d.outbox_id,
              error: d.error_message ?? undefined,
            })),
          );
        },
        onError: (error) => {
          toast.error('Erro ao enviar teste', { description: error.message });
        },
      },
    );
  };

  // Active channels (exclude WhatsApp) + group events by module
  const activeChannels = channels.filter((c) => ACTIVE_CHANNELS.includes(c.slug));
  const eventsByModule = events.reduce(
    (acc, event) => {
      if (!acc[event.module]) acc[event.module] = [];
      acc[event.module].push(event);
      return acc;
    },
    {} as Record<string, typeof events>,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Configurações de Notificações"
          description="Configure os canais de notificação para esta BU"
          backTo="/settings"
          backLabel="Voltar para Configurações"
        />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações de Notificações"
        description="Configure os canais de notificação para esta BU"
        backTo="/settings"
        backLabel="Voltar para Configurações"
      />

      <Tabs value={tabState.value} onValueChange={(v) => tabState.set(v as TabValue)}>
        <TabsList className="flex w-full">
          <TabsTrigger value="channels" className="gap-2 flex-1">
            <Settings2 className="h-4 w-4" />
            Canais
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2 flex-1">
            <ListChecks className="h-4 w-4" />
            Eventos
          </TabsTrigger>
          <PermissionGuard permission="notifications.templates.read:bu" fallback={null}>
            <TabsTrigger value="templates" className="gap-2 flex-1">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </PermissionGuard>
          <PermissionGuard permission="notifications.outbox.view:bu" fallback={null}>
            <TabsTrigger value="outbox" className="gap-2 flex-1">
              <Inbox className="h-4 w-4" />
              Outbox
            </TabsTrigger>
          </PermissionGuard>
          <PermissionGuard permission="notifications.bu.view:bu" fallback={null}>
            <TabsTrigger value="inapp" className="gap-2 flex-1">
              <Bell className="h-4 w-4" />
              In-App
            </TabsTrigger>
          </PermissionGuard>
          <PermissionGuard permission="notifications.test.send:bu" fallback={null}>
            <TabsTrigger value="test" className="gap-2 flex-1">
              <TestTube className="h-4 w-4" />
              Teste
            </TabsTrigger>
          </PermissionGuard>
        </TabsList>

        <TabsContent value="channels">
          <ChannelsTab
            channels={activeChannels}
            getBuChannelConfig={getBuChannelConfig}
            isChannelConfigured={isChannelConfigured}
            canManageBuNotifications={canManageBuNotifications}
            testingChannel={testingChannel}
            onToggleChannel={handleToggleChannel}
            onOpenConfig={handleOpenConfig}
            onTestChannel={handleTestChannel}
          />
        </TabsContent>

        <TabsContent value="templates">
          <PermissionGuard permission="notifications.templates.read:bu">
            <TemplatesList />
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="events">
          <EventsTab
            eventsByModule={eventsByModule}
            getEventSetting={getEventSetting}
            isChannelConfigured={isChannelConfigured}
            canManageBuNotifications={canManageBuNotifications}
            onToggleEventSetting={handleToggleEventSetting}
          />
        </TabsContent>

        <TabsContent value="outbox">
          <OutboxTab
            statusValue={statusState.value}
            channelValue={channelState.value}
            onStatusChange={statusState.set}
            onChannelChange={channelState.set}
            outboxData={outboxData}
            outboxLoading={outboxLoading}
            isRetrying={retryOutbox.isPending}
            onRetry={handleRetryOutbox}
          />
        </TabsContent>

        <TabsContent value="inapp">
          <InAppTab inappData={inappData} inappLoading={inappLoading} />
        </TabsContent>

        <TabsContent value="test">
          <TestNotificationTab
            testRecipient={testRecipient}
            testChannels={testChannels}
            testResult={testResult}
            isSending={sendTest.isPending}
            isChannelConfigured={isChannelConfigured}
            onTestRecipientChange={setTestRecipient}
            onTestChannelsChange={setTestChannels}
            onSendTest={handleSendTest}
          />
        </TabsContent>
      </Tabs>

      <ChannelConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        channels={channels}
        selectedChannel={selectedChannel}
        configForm={configForm}
        onConfigFormChange={setConfigForm}
        onSave={handleSaveConfig}
        isSaving={upsertChannel.isPending}
      />
    </div>
  );
}
