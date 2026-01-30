import { useState } from 'react';
import { 
  useUserNotificationSettings, 
  useUserNotificationPreferenceMutation,
  groupSettingsByModule,
  moduleNames,
  useNotificationChannels,
} from '@/hooks/notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Bell, Mail, Slack, MessageCircle, Globe, Lock, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  slack: Slack,
  whatsapp: MessageCircle,
  webhook: Globe,
};

const severityConfig = {
  info: { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted' },
  warning: { icon: AlertTriangle, color: 'text-status-yellow', bg: 'bg-status-yellow-muted' },
  critical: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export default function NotificationPreferences() {
  const { data: settings = [], isLoading } = useUserNotificationSettings();
  const { data: channels = [] } = useNotificationChannels();
  const { mutate: updatePreference, isPending } = useUserNotificationPreferenceMutation();
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
      <div className="container max-w-4xl py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Preferências de Notificação</h1>
          <p className="text-muted-foreground">Configure como você deseja receber notificações</p>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Preferências de Notificação</h1>
        <p className="text-muted-foreground">Configure como você deseja receber notificações</p>
      </div>
      
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
            <AccordionItem 
              key={module} 
              value={module}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{moduleNames[module] || module}</span>
                  <Badge variant="secondary" className="text-xs">
                    {Object.keys(events).length} eventos
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4">
                  {Object.entries(events).map(([eventSlug, event]) => {
                    const SeverityIcon = severityConfig[event.severity as keyof typeof severityConfig]?.icon || Info;
                    const severityColor = severityConfig[event.severity as keyof typeof severityConfig]?.color || 'text-muted-foreground';
                    
                    return (
                      <div 
                        key={eventSlug}
                        className="flex items-start justify-between gap-4 p-4 bg-muted/30 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <SeverityIcon className={cn("w-4 h-4", severityColor)} />
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
                            
                            // Skip channels that are not in the event's available channels
                            if (!(channel.slug in event.channels)) return null;
                            
                            return (
                              <Tooltip key={channel.slug}>
                                <TooltipTrigger asChild>
                                  <div className="flex flex-col items-center gap-1">
                                    <Icon className={cn(
                                      "w-4 h-4",
                                      isEnabled ? "text-primary" : "text-muted-foreground"
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
                                  {event.is_mandatory && ' (obrigatório)'}
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
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nenhuma configuração de notificação disponível
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
