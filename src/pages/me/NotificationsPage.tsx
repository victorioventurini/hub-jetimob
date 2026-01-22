import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createBuScopedClient } from '@/integrations/supabase/useBuScopedSupabase';
import { useAuth } from '@/hooks/useAuth';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useUrlState } from '@/shared/url';
import {
  useUserNotificationSettings,
  useUserNotificationPreferenceMutation,
  groupSettingsByModule,
  moduleNames,
  useNotificationChannels,
} from '@/hooks/useNotificationCenter';
import { HubLayout } from '@/components/layout/HubLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bell,
  Mail,
  Slack,
  MessageCircle,
  Globe,
  Lock,
  AlertTriangle,
  AlertCircle,
  Info,
  AtSign,
  TrendingUp,
  Clock,
  Users,
  ChevronRight,
  CheckCheck,
  Inbox,
  Settings2,
  Search,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDebouncedValue } from '@/hooks/useDebounce';

// Types
interface Notification {
  id: string;
  type: 'mention' | 'checkin_created' | 'checkin_overdue' | 'kr_status_changed' | 'shared_okr_update' | 'info';
  title: string;
  message: string;
  context_type: string | null;
  context_id: string | null;
  context_url: string | null;
  actor_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  actor?: {
    display_name: string;
    photo_url: string | null;
  } | null;
}

// Icons
const notificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  mention: AtSign,
  checkin_created: TrendingUp,
  checkin_overdue: Clock,
  kr_status_changed: AlertTriangle,
  shared_okr_update: Users,
  info: Bell,
};

const notificationColors: Record<string, string> = {
  mention: 'text-status-blue',
  checkin_created: 'text-status-green',
  checkin_overdue: 'text-status-orange',
  kr_status_changed: 'text-status-yellow',
  shared_okr_update: 'text-status-purple',
  info: 'text-muted-foreground',
};

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  slack: Slack,
  whatsapp: MessageCircle,
  webhook: Globe,
};

const severityConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  info: { icon: Info, color: 'text-muted-foreground' },
  warning: { icon: AlertTriangle, color: 'text-status-yellow' },
  critical: { icon: AlertCircle, color: 'text-destructive' },
};

// Notification List Component
const PAGE_SIZE = 20;

function NotificationList() {
  const { user } = useAuth();
  const { currentBuId } = useBu();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchState = useUrlState<string>({ key: 'q', defaultValue: '' });
  const debouncedSearch = useDebouncedValue(searchState.value, 300);

  const supabaseBu = useMemo(() => {
    return currentBuId ? createBuScopedClient(currentBuId) : null;
  }, [currentBuId]);

  // Fetch notifications with infinite scroll pagination
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: [...queryKeys.notifications.all(user?.id ?? ''), 'paginated', debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.id || !supabaseBu) return { notifications: [], nextPage: null };

      let query = supabaseBu
        .from('notifications')
        .select('id, type, title, message, context_type, context_id, context_url, actor_id, is_read, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      // Apply search filter if present
      if (debouncedSearch.trim()) {
        query = query.or(`title.ilike.%${debouncedSearch}%,message.ilike.%${debouncedSearch}%`);
      }

      const { data: rawData, error } = await query;

      if (error) throw error;

      // Fetch actor info
      const actorIds = [...new Set((rawData || []).map(n => n.actor_id).filter(Boolean))];
      let actorMap: Record<string, { display_name: string; photo_url: string | null }> = {};

      if (actorIds.length > 0) {
        const { data: actors } = await supabaseBu
          .from('profiles')
          .select('user_id, display_name, photo_url')
          .in('user_id', actorIds);

        if (actors) {
          actorMap = actors.reduce((acc, actor) => {
            if (actor.user_id) {
              acc[actor.user_id] = {
                display_name: actor.display_name,
                photo_url: actor.photo_url,
              };
            }
            return acc;
          }, {} as Record<string, { display_name: string; photo_url: string | null }>);
        }
      }

      const notifications = (rawData || []).map(n => ({
        ...n,
        actor: n.actor_id ? actorMap[n.actor_id] || null : null,
      })) as Notification[];

      return {
        notifications,
        nextPage: notifications.length === PAGE_SIZE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!user?.id && !!currentBuId,
  });

  const notifications = data?.pages.flatMap(page => page.notifications) ?? [];

  // Mark single notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!supabaseBu) throw new Error('No BU context');
      const { error } = await supabaseBu
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(), refetchType: 'active' });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!supabaseBu || !user?.id) throw new Error('No context');
      const { error } = await supabaseBu
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(), refetchType: 'active' });
      toast.success('Todas as notificações foram marcadas como lidas');
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.context_url) {
      navigate(notification.context_url);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Inbox className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <p className="text-lg font-medium">Nenhuma notificação</p>
          <p className="text-sm text-muted-foreground">
            Você receberá notificações de menções, check-ins e atualizações aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar notificações..."
          value={searchState.value}
          onChange={(e) => searchState.set(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Actions header */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {unreadCount} {unreadCount === 1 ? 'notificação não lida' : 'notificações não lidas'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Marcar todas como lidas
          </Button>
        </div>
      )}

      {/* Notifications list */}
      <Card>
        <CardContent className="p-0 divide-y">
          {notifications.map((notification) => {
            const Icon = notificationIcons[notification.type] || Bell;
            const iconColor = notificationColors[notification.type] || 'text-muted-foreground';

            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "w-full flex items-start gap-4 p-4 text-left transition-colors",
                  "hover:bg-primary/10",
                  !notification.is_read && "bg-primary/5",
                  notification.context_url && "cursor-pointer",
                  !notification.context_url && "cursor-default"
                )}
              >
                {/* Avatar or Icon */}
                {notification.actor ? (
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={notification.actor.photo_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(notification.actor.display_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className={cn("p-2.5 rounded-full bg-muted shrink-0", iconColor)}>
                    <Icon className="w-5 h-5" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className={cn(
                    "text-sm",
                    !notification.is_read && "font-medium"
                  )}>
                    {notification.title}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>

                {/* Indicators */}
                <div className="flex items-center gap-2 shrink-0">
                  {!notification.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  )}
                  {notification.context_url && (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              'Carregar mais'
            )}
          </Button>
        </div>
      )}

      {/* Empty search result */}
      {notifications.length === 0 && debouncedSearch && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="w-10 h-10 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação encontrada para "{debouncedSearch}"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Notification Settings Component
function NotificationSettings() {
  const { data: settings = [], isLoading } = useUserNotificationSettings();
  const { data: channels = [] } = useNotificationChannels();
  const { mutate: updatePreference } = useUserNotificationPreferenceMutation();
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  const groupedSettings = groupSettingsByModule(settings);

  const handleToggle = (eventSlug: string, channelSlug: string, newValue: boolean) => {
    const key = `${eventSlug}-${channelSlug}`;
    setPendingUpdates(prev => new Set(prev).add(key));

    updatePreference(
      { eventSlug, channelSlug, enabled: newValue },
      {
        onSuccess: () => {
          setPendingUpdates(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        },
        onError: (error) => {
          setPendingUpdates(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
          toast.error('Erro ao atualizar preferência', {
            description: error.message,
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Channel Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Canais Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {channels.map(channel => {
              const Icon = channelIcons[channel.slug] || Bell;
              return (
                <div key={channel.slug} className="flex items-center gap-2 text-sm">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span>{channel.name}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Settings by Module */}
      <TooltipProvider>
        <Accordion type="multiple" defaultValue={Object.keys(groupedSettings)} className="space-y-4">
          {Object.entries(groupedSettings).map(([module, { events }]) => (
            <AccordionItem key={module} value={module} className="border rounded-lg px-4">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{moduleNames[module] || module}</span>
                  <Badge variant="secondary" className="text-xs">
                    {Object.keys(events).length} {Object.keys(events).length === 1 ? 'evento' : 'eventos'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  {Object.entries(events).map(([eventSlug, event]) => {
                    const SeverityIcon = severityConfig[event.severity]?.icon || Info;
                    const severityColor = severityConfig[event.severity]?.color || 'text-muted-foreground';

                    return (
                      <div
                        key={eventSlug}
                        className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <SeverityIcon className={cn('w-4 h-4', severityColor)} />
                            <span className="font-medium">{event.name}</span>
                            {event.is_mandatory && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="gap-1 text-xs">
                                    <Lock className="w-3 h-3" />
                                    Obrigatório
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Esta notificação não pode ser desativada
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {channels.map(channel => {
                            const Icon = channelIcons[channel.slug] || Bell;
                            const isEnabled = event.channels[channel.slug] ?? false;
                            const key = `${eventSlug}-${channel.slug}`;
                            const isUpdating = pendingUpdates.has(key);

                            // Skip channels not in event's available channels
                            if (!(channel.slug in event.channels)) return null;

                            return (
                              <Tooltip key={channel.slug}>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center gap-1">
                                    <Icon className={cn(
                                      'w-4 h-4',
                                      isEnabled ? 'text-primary' : 'text-muted-foreground'
                                    )} />
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={(checked) => handleToggle(eventSlug, channel.slug, checked)}
                                      disabled={event.is_mandatory || isUpdating}
                                      className="scale-75"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {channel.name}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </TooltipProvider>

      {Object.keys(groupedSettings).length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Settings2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">Nenhuma configuração disponível</p>
            <p className="text-sm text-muted-foreground">
              Os eventos de notificação serão exibidos aqui quando disponíveis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main Page Component
export default function NotificationsPage() {
  usePageTitle("Notificações", {
    customDescription: "Visualize suas notificações e configure como deseja recebê-las no Hub.",
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <HubLayout>
      <div className="container max-w-4xl py-8 space-y-6">
        <PageHeader
          title="Notificações"
          description="Veja suas notificações e configure como deseja recebê-las"
        />

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="all" className="gap-2">
              <Inbox className="w-4 h-4" />
              Todas
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="w-4 h-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <NotificationList />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </HubLayout>
  );
}
