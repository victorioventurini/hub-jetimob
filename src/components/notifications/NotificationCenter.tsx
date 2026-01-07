import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { supabase as supabaseGlobal } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/queryKeys';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Check, 
  CheckCheck,
  AtSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'mention' | 'checkin_created' | 'checkin_overdue' | 'kr_status_changed' | 'shared_okr_update';
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

const notificationIcons = {
  mention: AtSign,
  checkin_created: TrendingUp,
  checkin_overdue: Clock,
  kr_status_changed: AlertTriangle,
  shared_okr_update: Users,
};

const notificationColors = {
  mention: 'text-blue-500',
  checkin_created: 'text-green-500',
  checkin_overdue: 'text-orange-500',
  kr_status_changed: 'text-yellow-500',
  shared_okr_update: 'text-purple-500',
};

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const supabaseBu = useBuScopedSupabase();
  const [open, setOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: queryKeys.notifications.all(user?.id ?? ''),
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabaseBu
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch actor info for each notification
      const actorIds = [...new Set((data || []).map(n => n.actor_id).filter(Boolean))];
      
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

      return (data || []).map(n => ({
        ...n,
        actor: n.actor_id ? actorMap[n.actor_id] || null : null,
      })) as Notification[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to realtime notifications (uses global client for realtime)
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabaseGlobal
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabaseGlobal.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mark single notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabaseBu.rpc('mark_notification_read', {
        p_notification_id: notificationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabaseBu.rpc('mark_all_notifications_read');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate to context
    if (notification.context_url) {
      navigate(notification.context_url);
      setOpen(false);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="text-xs"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type];
                const iconColor = notificationColors[notification.type];

                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full flex items-start gap-3 p-4 text-left hover:bg-accent transition-colors",
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    {/* Avatar or Icon */}
                    {notification.actor ? (
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={notification.actor.photo_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(notification.actor.display_name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={cn("p-2 rounded-full bg-muted shrink-0", iconColor)}>
                        <Icon className="w-4 h-4" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={cn(
                        "text-sm line-clamp-2",
                        !notification.is_read && "font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
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
                    <div className="flex items-center gap-1 shrink-0">
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                      {notification.context_url && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
