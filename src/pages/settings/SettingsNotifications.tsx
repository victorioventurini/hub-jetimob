import { useState } from 'react';
import type { Json } from '@/integrations/supabase/types';
import { 
  useNotificationChannels,
  useBuNotificationChannels,
  useBuNotificationChannelMutations,
  useNotificationEvents,
  useSendTestNotification,
} from '@/hooks/useNotificationCenter';
import {
  useBuEventSettings,
  useBuEventSettingMutation,
  useNotificationOutbox,
  useInAppNotifications,
  useRetryOutboxItem,
  useBuProfiles,
} from '@/hooks/useNotificationAdmin';
import { useBu } from '@/contexts/BuContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState } from '@/shared/url/useUrlState';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Mail, 
  Slack, 
  MessageCircle, 
  Globe, 
  Settings2,
  Check,
  Lock,
  RefreshCw,
  Send,
  Inbox,
  ListChecks,
  TestTube,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { TemplatesList } from '@/components/notifications/templates';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UrlSelect } from '@/shared/filters/UrlSelect';

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  slack: Slack,
  whatsapp: MessageCircle,
  webhook: Globe,
};

const moduleNames: Record<string, string> = {
  core: 'Geral',
  okrs: 'OKRs',
  tickets: 'Tickets',
  assets: 'Ativos',
  teams: 'Times',
  kpis: 'KPIs',
};

type TabValue = 'channels' | 'events' | 'templates' | 'outbox' | 'inapp' | 'test';

// Channels that are configurable in Phase 3
const CONFIGURABLE_CHANNELS = ['email', 'slack', 'webhook'];
const ACTIVE_CHANNELS = ['in_app', 'email', 'slack', 'webhook']; // WhatsApp out of scope

export default function SettingsNotifications() {
  const { currentBu } = useBu();
  usePageTitle("Notificações", {
    customDescription: "Configure canais, eventos e templates de notificação da BU."
  });
  const { has: hasPermission } = usePermissions();

  const canManageBuNotifications = hasPermission('notifications.bu.manage:bu');

  // URL State
  const tabState = useUrlState<TabValue>({ key: 'tab', defaultValue: 'channels' });
  const statusState = useUrlState<string>({ key: 'status', defaultValue: 'all' });
  const channelState = useUrlState<string>({ key: 'channel', defaultValue: 'all' });
  
  // Queries
  const { data: channels = [], isLoading: channelsLoading } = useNotificationChannels();
  const { data: buChannels = [], isLoading: buChannelsLoading } = useBuNotificationChannels(currentBu?.id);
  const { data: events = [], isLoading: eventsLoading } = useNotificationEvents();
  const { data: buEventSettings = [] } = useBuEventSettings(currentBu?.id);
  const { data: profiles = [] } = useBuProfiles(currentBu?.id);
  
  const outboxFilters = {
    status: statusState.value,
    channel: channelState.value,
  };
  const { data: outboxData, isLoading: outboxLoading } = useNotificationOutbox(currentBu?.id, outboxFilters);
  
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
  const [testResult, setTestResult] = useState<Array<{ channel: string; status: string; id: string | null; error?: string }> | null>(null);
  const [testChannelDialog, setTestChannelDialog] = useState<string | null>(null);
  const [testingChannel, setTestingChannel] = useState(false);
  
  const isLoading = channelsLoading || buChannelsLoading || eventsLoading;
  
  const getBuChannelConfig = (channelSlug: string) => {
    return buChannels.find(bc => bc.channel_slug === channelSlug);
  };
  
  const getEventSetting = (eventSlug: string, channel: string) => {
    return buEventSettings.find(s => s.event_slug === eventSlug && s.channel === channel);
  };
  
  const isChannelConfigured = (channelSlug: string): boolean => {
    const buChannel = getBuChannelConfig(channelSlug);
    const config = buChannel?.config as Record<string, unknown> | null;
    if (!config) return false;
    
    if (channelSlug === 'slack') {
      return Boolean(config.webhook_url || (config.bot_token && (config.default_channel_id || config.default_channel_name)));
    }
    if (channelSlug === 'webhook') {
      return Boolean(config.url);
    }
    if (channelSlug === 'email') {
      return true; // Email uses global config
    }
    return true;
  };
  
  const handleToggleChannel = (channelSlug: string, isEnabled: boolean) => {
    if (!currentBu?.id) return;
    
    // Prevent enabling unconfigured channels
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
      }
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
      }
    );
  };
  
  const handleOpenConfig = (channelSlug: string) => {
    const buChannel = getBuChannelConfig(channelSlug);
    setSelectedChannel(channelSlug);
    // Don't show secrets that were already saved - only show if present
    const existingConfig = (buChannel?.config as Record<string, string>) || {};
    // Clear secret fields for security
    const safeConfig = { ...existingConfig };
    if (channelSlug === 'slack') {
      delete safeConfig.bot_token; // Never show saved token
    }
    if (channelSlug === 'webhook') {
      delete safeConfig.secret_header_value; // Never show saved secret
    }
    setConfigForm(safeConfig);
    setConfigDialogOpen(true);
  };
  
  const handleSaveConfig = () => {
    if (!currentBu?.id || !selectedChannel) return;
    
    const buChannel = getBuChannelConfig(selectedChannel);
    const existingConfig = (buChannel?.config as Record<string, string>) || {};
    
    // Merge new config with existing (preserving secrets if not changed)
    const mergedConfig: { [key: string]: Json | undefined } = { ...existingConfig, ...configForm, configured: true };
    
    // Remove empty values
    Object.keys(mergedConfig).forEach(key => {
      if (mergedConfig[key] === '' || mergedConfig[key] === undefined) {
        delete mergedConfig[key];
      }
    });
    
    // Cast to Json for Supabase
    const finalConfig = mergedConfig as Json;
    
    upsertChannel.mutate(
      { 
        buId: currentBu.id, 
        channelSlug: selectedChannel, 
        isEnabled: buChannel?.is_enabled ?? false,
        config: finalConfig,
      },
      {
        onSuccess: () => {
          toast.success('Configuração salva');
          setConfigDialogOpen(false);
        },
        onError: (error) => {
          toast.error('Erro ao salvar configuração', { description: error.message });
        },
      }
    );
  };
  
  const handleTestChannel = (channelSlug: string) => {
    if (!currentBu?.id) return;
    
    // Get current user as recipient - use first profile with user_id
    const currentUser = profiles.find(p => p.user_id) || profiles[0];
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
            toast.error(`Erro no teste ${channelSlug}`, { description: result.error_message || 'Erro desconhecido' });
          } else {
            toast.info(`Teste ${channelSlug}: ${result?.status || 'enviado'}`);
          }
          setTestingChannel(false);
        },
        onError: (error) => {
          toast.error(`Erro no teste ${channelSlug}`, { description: error.message });
          setTestingChannel(false);
        },
      }
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
    
    // Validate that selected channels are configured
    for (const ch of testChannels) {
      if (ch !== 'in_app' && !isChannelConfigured(ch)) {
        toast.error(`Canal ${ch} não está configurado`);
        return;
      }
    }
    
    // testRecipient is now profile.id (v2 RPC accepts profile_id)
    sendTest.mutate(
      { targetProfileId: testRecipient, channels: testChannels },
      {
        onSuccess: (data) => {
          // Check for partial errors
          const errors = data.filter(d => d.status === 'error');
          const successes = data.filter(d => d.status !== 'error');
          
          if (successes.length > 0) {
            toast.success('Notificação de teste enviada!');
          }
          if (errors.length > 0) {
            errors.forEach(e => {
              toast.error(`Erro no canal ${e.channel}`, { description: e.error_message || 'Erro desconhecido' });
            });
          }
          
          setTestResult(data.map(d => ({
            channel: d.channel,
            status: d.status,
            id: d.notification_id || d.outbox_id,
            error: d.error_message ?? undefined,
          })));
        },
        onError: (error) => {
          toast.error('Erro ao enviar teste', { description: error.message });
        },
      }
    );
  };
  
  // Filter channels to show only active ones (exclude whatsapp)
  const activeChannels = channels.filter(c => ACTIVE_CHANNELS.includes(c.slug));
  
  // Group events by module
  const eventsByModule = events.reduce((acc, event) => {
    if (!acc[event.module]) acc[event.module] = [];
    acc[event.module].push(event);
    return acc;
  }, {} as Record<string, typeof events>);
  
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
            {[1, 2, 3].map(i => (
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
        
        {/* Tab: Channels */}
        <TabsContent value="channels">
          <PermissionGuard
            anyOf={['notifications.bu.manage:bu', 'notifications.bu.view:bu']}
            fallback={
              <EmptyState
                icon={AlertCircle}
                title="Sem acesso"
                description="Você não tem permissão para visualizar as configurações de notificações desta BU."
                compact
              />
            }
          >
            <Card>
              <CardHeader>
                <CardTitle>Canais de Notificação</CardTitle>
                <CardDescription>
                  Ative ou desative canais de notificação para todos os usuários desta BU
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeChannels.map(channel => {
                  const Icon = channelIcons[channel.slug] || Bell;
                  const buChannel = getBuChannelConfig(channel.slug);
                  const isEnabled = buChannel?.is_enabled ?? (channel.slug === 'in_app');
                  const isConfigured = isChannelConfigured(channel.slug);
                  const needsConfig = CONFIGURABLE_CHANNELS.includes(channel.slug);
                  const isInApp = channel.slug === 'in_app';
                  
                  return (
                    <div 
                      key={channel.slug}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isEnabled ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Icon className={cn(
                            "w-5 h-5",
                            isEnabled ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{channel.name}</span>
                            {needsConfig && !isConfigured && (
                              <Badge variant="outline" className="text-xs gap-1 text-yellow-600">
                                <AlertTriangle className="w-3 h-3" />
                                Não configurado
                              </Badge>
                            )}
                            {needsConfig && isConfigured && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Check className="w-3 h-3" />
                                Configurado
                              </Badge>
                            )}
                          </div>
                          {channel.description && (
                            <p className="text-sm text-muted-foreground">{channel.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {needsConfig && canManageBuNotifications && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenConfig(channel.slug)}
                          >
                            <Settings2 className="w-4 h-4 mr-1" />
                            Configurar
                          </Button>
                        )}
                        {needsConfig && isConfigured && (
                          <PermissionGuard permission="notifications.test.send:bu">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTestChannel(channel.slug)}
                              disabled={testingChannel || !canManageBuNotifications}
                            >
                              <TestTube className="w-4 h-4 mr-1" />
                              Testar
                            </Button>
                          </PermissionGuard>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => handleToggleChannel(channel.slug, checked)}
                                disabled={isInApp || (!isConfigured && needsConfig) || !canManageBuNotifications}
                              />
                            </span>
                          </TooltipTrigger>
                          {!isConfigured && needsConfig && (
                            <TooltipContent>
                              Configure o canal primeiro
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
                
                {/* WhatsApp placeholder */}
                <div className="flex items-center justify-between p-4 border rounded-lg opacity-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">WhatsApp</span>
                        <Badge variant="outline" className="text-xs">Em breve</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Notificações via WhatsApp</p>
                    </div>
                  </div>
                  <Switch disabled checked={false} />
                </div>
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>
        
        {/* Tab: Templates (Phase 5) */}
        <TabsContent value="templates">
          <PermissionGuard permission="notifications.templates.read:bu">
            <TemplatesList />
          </PermissionGuard>
        </TabsContent>
        
        {/* Tab: Event Settings */}
        <TabsContent value="events">
          <PermissionGuard
            anyOf={['notifications.bu.manage:bu', 'notifications.bu.view:bu']}
            fallback={
              <EmptyState
                icon={AlertCircle}
                title="Sem acesso"
                description="Você não tem permissão para visualizar as configurações de eventos desta BU."
                compact
              />
            }
          >
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Eventos por Canal</CardTitle>
                <CardDescription>
                  Ative ou desative eventos específicos por canal. Eventos obrigatórios não podem ser desativados.
                  Canais não configurados aparecem desabilitados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(eventsByModule).map(([module, moduleEvents]) => (
                  <div key={module}>
                    <h4 className="font-medium text-sm text-muted-foreground uppercase mb-3">
                      {moduleNames[module] || module}
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Evento</TableHead>
                          <TableHead className="w-20 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Bell className="w-4 h-4" />
                              <span className="sr-only">In-App</span>
                            </div>
                          </TableHead>
                          <TableHead className="w-20 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Mail className="w-4 h-4" />
                              <span className="sr-only">Email</span>
                            </div>
                          </TableHead>
                          <TableHead className="w-20 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center gap-1">
                                  <Slack className={cn("w-4 h-4", !isChannelConfigured('slack') && "text-muted-foreground")} />
                                  {!isChannelConfigured('slack') && <X className="w-3 h-3 text-muted-foreground" />}
                                </div>
                              </TooltipTrigger>
                              {!isChannelConfigured('slack') && (
                                <TooltipContent>Slack não configurado</TooltipContent>
                              )}
                            </Tooltip>
                          </TableHead>
                          <TableHead className="w-20 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center gap-1">
                                  <Globe className={cn("w-4 h-4", !isChannelConfigured('webhook') && "text-muted-foreground")} />
                                  {!isChannelConfigured('webhook') && <X className="w-3 h-3 text-muted-foreground" />}
                                </div>
                              </TooltipTrigger>
                              {!isChannelConfigured('webhook') && (
                                <TooltipContent>Webhook não configurado</TooltipContent>
                              )}
                            </Tooltip>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {moduleEvents.map(event => {
                          const inAppSetting = getEventSetting(event.slug, 'in_app');
                          const emailSetting = getEventSetting(event.slug, 'email');
                          const slackSetting = getEventSetting(event.slug, 'slack');
                          const webhookSetting = getEventSetting(event.slug, 'webhook');
                          
                          const inAppEnabled = inAppSetting?.is_enabled ?? event.default_channels.includes('in_app');
                          const emailEnabled = emailSetting?.is_enabled ?? event.default_channels.includes('email');
                          const slackEnabled = slackSetting?.is_enabled ?? false;
                          const webhookEnabled = webhookSetting?.is_enabled ?? false;
                          
                          const slackConfigured = isChannelConfigured('slack');
                          const webhookConfigured = isChannelConfigured('webhook');
                          
                          return (
                            <TableRow key={event.slug}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{event.name}</span>
                                  {event.is_mandatory && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Lock className="w-3 h-3 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>Evento obrigatório</TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {event.slug}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {event.default_channels.includes('in_app') ? (
                                  <Switch
                                    checked={inAppEnabled}
                                    onCheckedChange={(checked) => handleToggleEventSetting(event.slug, 'in_app', checked)}
                                    disabled={event.is_mandatory || !canManageBuNotifications}
                                  />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {event.default_channels.includes('email') ? (
                                  <Switch
                                    checked={emailEnabled}
                                    onCheckedChange={(checked) => handleToggleEventSetting(event.slug, 'email', checked)}
                                    disabled={event.is_mandatory || !canManageBuNotifications}
                                  />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Switch
                                        checked={slackEnabled}
                                        onCheckedChange={(checked) => handleToggleEventSetting(event.slug, 'slack', checked)}
                                        disabled={!slackConfigured || event.is_mandatory || !canManageBuNotifications}
                                      />
                                    </span>
                                  </TooltipTrigger>
                                  {!slackConfigured && (
                                    <TooltipContent>Configure Slack primeiro</TooltipContent>
                                  )}
                                </Tooltip>
                              </TableCell>
                              <TableCell className="text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span>
                                      <Switch
                                        checked={webhookEnabled}
                                        onCheckedChange={(checked) => handleToggleEventSetting(event.slug, 'webhook', checked)}
                                        disabled={!webhookConfigured || event.is_mandatory || !canManageBuNotifications}
                                      />
                                    </span>
                                  </TooltipTrigger>
                                  {!webhookConfigured && (
                                    <TooltipContent>Configure Webhook primeiro</TooltipContent>
                                  )}
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>
        
        {/* Tab: Outbox */}
        <TabsContent value="outbox">
          <PermissionGuard permission="notifications.outbox.view:bu">
            <Card>
              <CardHeader>
                <CardTitle>Fila de Envio (Outbox)</CardTitle>
                <CardDescription>
                  Monitore o status de envio das notificações externas (email, slack, webhook)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex gap-4 flex-wrap">
                  <UrlSelect
                    value={statusState.value}
                    onChange={statusState.set}
                    options={[
                      { value: 'pending', label: 'Pendente' },
                      { value: 'sent', label: 'Enviado' },
                      { value: 'failed', label: 'Falhou' },
                    ]}
                    includeAllOption
                    allOptionLabel="Todos os status"
                    triggerClassName="w-[180px]"
                  />
                  <UrlSelect
                    value={channelState.value}
                    onChange={channelState.set}
                    options={[
                      { value: 'email', label: 'Email' },
                      { value: 'slack', label: 'Slack' },
                      { value: 'webhook', label: 'Webhook' },
                    ]}
                    includeAllOption
                    allOptionLabel="Todos os canais"
                    triggerClassName="w-[180px]"
                  />
                </div>
                
                {/* Table */}
                {outboxLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Destinatário</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead>Evento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Retries</TableHead>
                          <TableHead>Erro</TableHead>
                          <TableHead className="w-20">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outboxData?.data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                              Nenhum item no outbox
                            </TableCell>
                          </TableRow>
                        ) : (
                          outboxData?.data.map(item => {
                            const StatusIcon = item.status === 'sent' ? CheckCircle 
                              : item.status === 'failed' ? AlertCircle 
                              : Clock;
                            const statusColor = item.status === 'sent' ? 'text-green-500'
                              : item.status === 'failed' ? 'text-destructive'
                              : 'text-yellow-500';
                            const ChannelIcon = channelIcons[item.channel_slug] || Globe;
                            
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="text-sm">
                                  {format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                                </TableCell>
                                <TableCell className="text-sm">
                                  <div className="flex flex-col">
                                    <span className="font-medium truncate max-w-[150px]">
                                      {item.recipient?.display_name || '-'}
                                    </span>
                                    {item.recipient?.email && (
                                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                        {item.recipient.email}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                                    <Badge variant="outline">{item.channel_slug}</Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {item.event_slug}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <StatusIcon className={cn("w-4 h-4", statusColor)} />
                                    <span className="text-sm capitalize">{item.status}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">{item.retries}</TableCell>
                                <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                  {item.last_error || '-'}
                                </TableCell>
                                <TableCell>
                                  <PermissionGuard permission="notifications.outbox.retry:bu">
                                    {(item.status === 'failed' || item.status === 'pending') && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRetryOutbox(item.id)}
                                        disabled={retryOutbox.isPending}
                                      >
                                        <RefreshCw className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </PermissionGuard>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                    
                    {outboxData?.count > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {outboxData.count} item{outboxData.count !== 1 ? 's' : ''} no outbox
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>
        
        {/* Tab: In-App Logs */}
        <TabsContent value="inapp">
          <PermissionGuard permission="notifications.bu.view:bu">
            <Card>
              <CardHeader>
                <CardTitle>Notificações In-App</CardTitle>
                <CardDescription>
                  Histórico de notificações in-app enviadas nesta BU
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {inappLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Destinatário</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Evento</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Lida</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inappData?.data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              Nenhuma notificação in-app
                            </TableCell>
                          </TableRow>
                        ) : (
                          inappData?.data.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">
                                {format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                              </TableCell>
                              <TableCell className="text-sm font-medium truncate max-w-[150px]">
                                {item.recipient?.display_name || '-'}
                              </TableCell>
                              <TableCell>{item.title}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.event_slug || '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.type}</Badge>
                              </TableCell>
                              <TableCell>
                                {item.is_read ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    
                    {inappData?.count > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {inappData.count} notificação{inappData.count !== 1 ? 'ões' : ''} in-app
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>
        
        {/* Tab: Test Notification */}
        <TabsContent value="test">
          <PermissionGuard permission="notifications.test.send:bu">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Enviar Notificação de Teste
                </CardTitle>
                <CardDescription>
                  Envie uma notificação de teste para validar a configuração do sistema.
                  Canais não configurados não aparecerão nas opções.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Destinatário</Label>
                    <BuUserSelect
                      value={testRecipient}
                      onValueChange={(val) => setTestRecipient(val ?? '')}
                      placeholder="Selecione um usuário"
                      showSearch={false}
                      showBadges={false}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Canais</Label>
                    <div className="flex flex-wrap gap-4">
                      {/* In-App - always available */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={testChannels.includes('in_app')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTestChannels([...testChannels, 'in_app']);
                            } else {
                              setTestChannels(testChannels.filter(c => c !== 'in_app'));
                            }
                          }}
                        />
                        <Bell className="w-4 h-4" />
                        In-App
                      </label>
                      
                      {/* Email */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={testChannels.includes('email')}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setTestChannels([...testChannels, 'email']);
                            } else {
                              setTestChannels(testChannels.filter(c => c !== 'email'));
                            }
                          }}
                        />
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      
                      {/* Slack - only if configured */}
                      {isChannelConfigured('slack') && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={testChannels.includes('slack')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setTestChannels([...testChannels, 'slack']);
                              } else {
                                setTestChannels(testChannels.filter(c => c !== 'slack'));
                              }
                            }}
                          />
                          <Slack className="w-4 h-4" />
                          Slack
                        </label>
                      )}
                      
                      {/* Webhook - only if configured */}
                      {isChannelConfigured('webhook') && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={testChannels.includes('webhook')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setTestChannels([...testChannels, 'webhook']);
                              } else {
                                setTestChannels(testChannels.filter(c => c !== 'webhook'));
                              }
                            }}
                          />
                          <Globe className="w-4 h-4" />
                          Webhook
                        </label>
                      )}
                    </div>
                    
                    {/* Info about unconfigured channels */}
                    {(!isChannelConfigured('slack') || !isChannelConfigured('webhook')) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {!isChannelConfigured('slack') && !isChannelConfigured('webhook') 
                          ? 'Slack e Webhook não estão configurados.'
                          : !isChannelConfigured('slack') 
                            ? 'Slack não está configurado.'
                            : 'Webhook não está configurado.'
                        }
                        {' '}Configure na aba Canais.
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    onClick={handleSendTest} 
                    disabled={sendTest.isPending || !testRecipient || testChannels.length === 0}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Teste
                  </Button>
                </div>
                
                {/* Test Result */}
                {testResult && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Resultado do Teste</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {testResult.map((r, i) => {
                          const ChannelIcon = channelIcons[r.channel] || Bell;
                          const hasError = r.error || r.status === 'error';
                          return (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              {hasError ? (
                                <AlertCircle className="w-4 h-4 text-destructive" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              <ChannelIcon className="w-4 h-4 text-muted-foreground" />
                              <Badge variant="outline">{r.channel}</Badge>
                              <span>Status: {r.status}</span>
                              {r.id && (
                                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {r.id.slice(0, 8)}...
                                </code>
                              )}
                              {r.error && (
                                <span className="text-xs text-destructive truncate max-w-[200px]">
                                  {r.error}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Veja a aba Outbox para acompanhar o status de envio.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>
      </Tabs>
      
      {/* Channel Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Configurar {channels.find(c => c.slug === selectedChannel)?.name}
            </DialogTitle>
            <DialogDescription>
              Configure as credenciais e opções para este canal de notificação.
              Dados sensíveis são armazenados de forma segura.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedChannel === 'email' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="from_name">Nome do Remetente</Label>
                  <Input
                    id="from_name"
                    placeholder="Hub Jet"
                    value={configForm.from_name || ''}
                    onChange={(e) => setConfigForm({ ...configForm, from_name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Email usa configuração global (SendGrid/Resend).
                  </p>
                </div>
              </>
            )}
            
            {selectedChannel === 'slack' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">Webhook URL (Incoming Webhook)</Label>
                  <Input
                    id="webhook_url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={configForm.webhook_url || ''}
                    onChange={(e) => setConfigForm({ ...configForm, webhook_url: e.target.value })}
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Crie em: Slack App → Incoming Webhooks
                  </p>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou use Bot Token</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bot_token">Bot Token (xoxb-...)</Label>
                  <Input
                    id="bot_token"
                    placeholder="xoxb-..."
                    value={configForm.bot_token || ''}
                    onChange={(e) => setConfigForm({ ...configForm, bot_token: e.target.value })}
                    type="password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="default_channel_id">Canal Padrão (ID ou #nome)</Label>
                  <Input
                    id="default_channel_id"
                    placeholder="#general ou C0123456789"
                    value={configForm.default_channel_id || configForm.default_channel_name || ''}
                    onChange={(e) => setConfigForm({ 
                      ...configForm, 
                      default_channel_id: e.target.value.startsWith('C') ? e.target.value : '',
                      default_channel_name: e.target.value.startsWith('#') ? e.target.value : '',
                    })}
                  />
                </div>
              </>
            )}
            
            {selectedChannel === 'webhook' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="url">URL do Webhook</Label>
                  <Input
                    id="url"
                    placeholder="https://seu-sistema.com/webhook/notifications"
                    value={configForm.url || ''}
                    onChange={(e) => setConfigForm({ ...configForm, url: e.target.value })}
                    type="url"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="http_method">Método HTTP</Label>
                  <Select 
                    value={configForm.http_method || 'POST'} 
                    onValueChange={(v) => setConfigForm({ ...configForm, http_method: v })}
                  >
                    <SelectTrigger id="http_method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secret_header_name">Header de Autenticação (opcional)</Label>
                  <Input
                    id="secret_header_name"
                    placeholder="X-Webhook-Secret"
                    value={configForm.secret_header_name || ''}
                    onChange={(e) => setConfigForm({ ...configForm, secret_header_name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="secret_header_value">Valor do Header</Label>
                  <Input
                    id="secret_header_value"
                    placeholder="seu-segredo-aqui"
                    value={configForm.secret_header_value || ''}
                    onChange={(e) => setConfigForm({ ...configForm, secret_header_value: e.target.value })}
                    type="password"
                  />
                </div>
                
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-xs">
                    <p className="font-medium mb-1">Payload enviado:</p>
                    <pre className="text-muted-foreground overflow-x-auto">
{`{
  "event_slug": "...",
  "bu_id": "...",
  "title": "...",
  "message": "...",
  "context_url": "...",
  "sent_at": "..."
}`}
                    </pre>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig} disabled={upsertChannel.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
