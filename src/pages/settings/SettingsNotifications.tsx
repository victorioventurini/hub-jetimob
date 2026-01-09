import { useState } from 'react';
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
import { useUrlState } from '@/shared/url/useUrlState';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UrlSearchInput } from '@/shared/filters/UrlSearchInput';
import { UrlSelect } from '@/shared/filters/UrlSelect';
import { UrlPagination } from '@/shared/filters/UrlPagination';

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

type TabValue = 'channels' | 'events' | 'outbox' | 'inapp' | 'test';

export default function SettingsNotifications() {
  const { currentBu } = useBu();
  
  // URL State
  const tabState = useUrlState<TabValue>({ key: 'tab', defaultValue: 'channels' });
  const searchState = useUrlState<string>({ key: 'q', defaultValue: '' });
  const statusState = useUrlState<string>({ key: 'status', defaultValue: 'all' });
  const channelState = useUrlState<string>({ key: 'channel', defaultValue: 'all' });
  const pageState = useUrlState<number>({ key: 'page', defaultValue: 1, parse: (v) => parseInt(v) || 1 });
  const pageSizeState = useUrlState<number>({ key: 'pageSize', defaultValue: 25, parse: (v) => parseInt(v) || 25 });
  
  // Queries
  const { data: channels = [], isLoading: channelsLoading } = useNotificationChannels();
  const { data: buChannels = [], isLoading: buChannelsLoading } = useBuNotificationChannels(currentBu?.id);
  const { data: events = [], isLoading: eventsLoading } = useNotificationEvents();
  const { data: buEventSettings = [] } = useBuEventSettings(currentBu?.id);
  const { data: profiles = [] } = useBuProfiles(currentBu?.id);
  
  const outboxFilters = {
    status: statusState.value,
    channel: channelState.value,
    page: pageState.value,
    pageSize: pageSizeState.value,
  };
  const { data: outboxData, isLoading: outboxLoading } = useNotificationOutbox(currentBu?.id, outboxFilters);
  
  const inappFilters = {
    page: pageState.value,
    pageSize: pageSizeState.value,
  };
  const { data: inappData, isLoading: inappLoading } = useInAppNotifications(currentBu?.id, inappFilters);
  
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
  const [testResult, setTestResult] = useState<Array<{ channel: string; status: string; id: string | null }> | null>(null);
  
  const isLoading = channelsLoading || buChannelsLoading || eventsLoading;
  
  const getBuChannelConfig = (channelSlug: string) => {
    return buChannels.find(bc => bc.channel_slug === channelSlug);
  };
  
  const getEventSetting = (eventSlug: string, channel: string) => {
    return buEventSettings.find(s => s.event_slug === eventSlug && s.channel === channel);
  };
  
  const handleToggleChannel = (channelSlug: string, isEnabled: boolean) => {
    if (!currentBu?.id) return;
    
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
    setConfigForm((buChannel?.config as Record<string, string>) || {});
    setConfigDialogOpen(true);
  };
  
  const handleSaveConfig = () => {
    if (!currentBu?.id || !selectedChannel) return;
    
    const buChannel = getBuChannelConfig(selectedChannel);
    
    upsertChannel.mutate(
      { 
        buId: currentBu.id, 
        channelSlug: selectedChannel, 
        isEnabled: buChannel?.is_enabled ?? true,
        config: configForm,
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
    
    sendTest.mutate(
      { targetUserId: testRecipient, channels: testChannels },
      {
        onSuccess: (data) => {
          toast.success('Notificação de teste enviada!');
          setTestResult(data.map(d => ({
            channel: d.channel,
            status: d.status,
            id: d.notification_id || d.outbox_id,
          })));
        },
        onError: (error) => {
          toast.error('Erro ao enviar teste', { description: error.message });
        },
      }
    );
  };
  
  // Group events by module
  const eventsByModule = events.reduce((acc, event) => {
    if (!acc[event.module]) acc[event.module] = [];
    acc[event.module].push(event);
    return acc;
  }, {} as Record<string, typeof events>);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações de Notificações</h1>
          <p className="text-muted-foreground">Configure os canais de notificação para esta BU</p>
        </div>
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
      <div>
        <h1 className="text-2xl font-bold">Configurações de Notificações</h1>
        <p className="text-muted-foreground">Configure os canais de notificação para esta BU</p>
      </div>
      
      <Tabs value={tabState.value} onValueChange={(v) => tabState.set(v as TabValue)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="channels" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Canais
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Eventos
          </TabsTrigger>
          <PermissionGuard permission="notifications.outbox.view:bu" fallback={null}>
            <TabsTrigger value="outbox" className="gap-2">
              <Inbox className="h-4 w-4" />
              Outbox
            </TabsTrigger>
          </PermissionGuard>
          <PermissionGuard permission="notifications.bu.view:bu" fallback={null}>
            <TabsTrigger value="inapp" className="gap-2">
              <Bell className="h-4 w-4" />
              In-App
            </TabsTrigger>
          </PermissionGuard>
          <PermissionGuard permission="notifications.test.send:bu" fallback={null}>
            <TabsTrigger value="test" className="gap-2">
              <TestTube className="h-4 w-4" />
              Teste
            </TabsTrigger>
          </PermissionGuard>
        </TabsList>
        
        {/* Tab: Channels */}
        <TabsContent value="channels">
          <PermissionGuard permission="notifications.bu.manage:bu">
            <Card>
              <CardHeader>
                <CardTitle>Canais de Notificação</CardTitle>
                <CardDescription>
                  Ative ou desative canais de notificação para todos os usuários desta BU
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {channels.map(channel => {
                  const Icon = channelIcons[channel.slug] || Bell;
                  const buChannel = getBuChannelConfig(channel.slug);
                  const isEnabled = buChannel?.is_enabled ?? (channel.slug === 'in_app');
                  const hasConfig = Object.keys(buChannel?.config || {}).length > 0;
                  const isPlaceholder = ['slack', 'whatsapp', 'webhook'].includes(channel.slug);
                  
                  return (
                    <div 
                      key={channel.slug}
                      className={cn(
                        "flex items-center justify-between p-4 border rounded-lg",
                        isPlaceholder && "opacity-60"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          isEnabled && !isPlaceholder ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Icon className={cn(
                            "w-5 h-5",
                            isEnabled && !isPlaceholder ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{channel.name}</span>
                            {isPlaceholder && (
                              <Badge variant="outline" className="text-xs">TODO</Badge>
                            )}
                            {channel.requires_configuration && !isPlaceholder && (
                              <Badge variant="outline" className="text-xs">
                                Requer configuração
                              </Badge>
                            )}
                            {hasConfig && !isPlaceholder && (
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
                        {channel.requires_configuration && !isPlaceholder && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenConfig(channel.slug)}
                          >
                            <Settings2 className="w-4 h-4 mr-1" />
                            Configurar
                          </Button>
                        )}
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) => handleToggleChannel(channel.slug, checked)}
                          disabled={channel.slug === 'in_app' || isPlaceholder}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </PermissionGuard>
        </TabsContent>
        
        {/* Tab: Event Settings */}
        <TabsContent value="events">
          <PermissionGuard permission="notifications.bu.manage:bu">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Eventos por Canal</CardTitle>
                <CardDescription>
                  Ative ou desative eventos específicos por canal. Eventos obrigatórios não podem ser desativados.
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
                          <TableHead className="w-24 text-center">In-App</TableHead>
                          <TableHead className="w-24 text-center">Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {moduleEvents.map(event => {
                          const inAppSetting = getEventSetting(event.slug, 'in_app');
                          const emailSetting = getEventSetting(event.slug, 'email');
                          const inAppEnabled = inAppSetting?.is_enabled ?? event.default_channels.includes('in_app');
                          const emailEnabled = emailSetting?.is_enabled ?? event.default_channels.includes('email');
                          
                          return (
                            <TableRow key={event.slug}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{event.name}</span>
                                  {event.is_mandatory && (
                                    <Lock className="w-3 h-3 text-muted-foreground" />
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
                                    disabled={event.is_mandatory}
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
                                    disabled={event.is_mandatory}
                                  />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
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
                  Monitore o status de envio das notificações externas
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
                    options={channels.map(c => ({ value: c.slug, label: c.name }))}
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
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
                            
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="text-sm">
                                  {format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{item.channel_slug}</Badge>
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
                    
                    {(outboxData?.count ?? 0) > 0 && (
                      <UrlPagination
                        page={pageState.value}
                        pageSize={pageSizeState.value}
                        totalItems={outboxData?.count ?? 0}
                        onPageChange={pageState.set}
                        onPageSizeChange={pageSizeState.set}
                      />
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
                          <TableHead>Título</TableHead>
                          <TableHead>Evento</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Lida</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inappData?.data.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              Nenhuma notificação in-app
                            </TableCell>
                          </TableRow>
                        ) : (
                          inappData?.data.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">
                                {format(new Date(item.created_at), 'dd/MM HH:mm', { locale: ptBR })}
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
                    
                    {(inappData?.count ?? 0) > 0 && (
                      <UrlPagination
                        page={pageState.value}
                        pageSize={pageSizeState.value}
                        totalItems={inappData?.count ?? 0}
                        onPageChange={pageState.set}
                        onPageSizeChange={pageSizeState.set}
                      />
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
                  Envie uma notificação de teste para validar a configuração do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 max-w-md">
                  <div className="space-y-2">
                    <Label>Destinatário</Label>
                    <Select value={testRecipient} onValueChange={setTestRecipient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um usuário" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarImage src={profile.photo_url ?? undefined} />
                                <AvatarFallback className="text-xs">
                                  {profile.display_name?.slice(0, 2).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              {profile.display_name || profile.work_email || 'Usuário'}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Canais</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={testChannels.includes('in_app')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTestChannels([...testChannels, 'in_app']);
                            } else {
                              setTestChannels(testChannels.filter(c => c !== 'in_app'));
                            }
                          }}
                          className="rounded"
                        />
                        <Bell className="w-4 h-4" />
                        In-App
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={testChannels.includes('email')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTestChannels([...testChannels, 'email']);
                            } else {
                              setTestChannels(testChannels.filter(c => c !== 'email'));
                            }
                          }}
                          className="rounded"
                        />
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                    </div>
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
                        {testResult.map((r, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <Badge variant="outline">{r.channel}</Badge>
                            <span>Status: {r.status}</span>
                            {r.id && (
                              <code className="text-xs bg-muted px-2 py-0.5 rounded">
                                {r.id.slice(0, 8)}...
                              </code>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Veja a aba Outbox para acompanhar o status de envio do email.
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configurar {channels.find(c => c.slug === selectedChannel)?.name}
            </DialogTitle>
            <DialogDescription>
              Configure as credenciais e opções para este canal de notificação
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
                </div>
              </>
            )}
            
            {selectedChannel === 'slack' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">Webhook URL</Label>
                  <Input
                    id="webhook_url"
                    placeholder="https://hooks.slack.com/services/..."
                    value={configForm.webhook_url || ''}
                    onChange={(e) => setConfigForm({ ...configForm, webhook_url: e.target.value })}
                  />
                </div>
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
