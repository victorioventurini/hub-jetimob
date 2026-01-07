import { useState } from 'react';
import { 
  useNotificationChannels,
  useBuNotificationChannels,
  useBuNotificationChannelMutations,
  useNotificationEvents,
} from '@/hooks/useNotificationCenter';
import { useBu } from '@/contexts/BuContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Bell, 
  Mail, 
  Slack, 
  MessageCircle, 
  Globe, 
  Settings2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  slack: Slack,
  whatsapp: MessageCircle,
  webhook: Globe,
};

export default function SettingsNotifications() {
  const { currentBu } = useBu();
  const { data: channels = [], isLoading: channelsLoading } = useNotificationChannels();
  const { data: buChannels = [], isLoading: buChannelsLoading } = useBuNotificationChannels(currentBu?.id);
  const { data: events = [] } = useNotificationEvents();
  const { upsertChannel } = useBuNotificationChannelMutations();
  
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  
  const isLoading = channelsLoading || buChannelsLoading;
  
  const getBuChannelConfig = (channelSlug: string) => {
    return buChannels.find(bc => bc.channel_slug === channelSlug);
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
  
  // Group events by module for display
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
      
      {/* Channels Configuration */}
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
            const isEnabled = buChannel?.is_enabled ?? (channel.slug === 'in_app' || channel.slug === 'email');
            const hasConfig = Object.keys(buChannel?.config || {}).length > 0;
            
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
                      {channel.requires_configuration && (
                        <Badge variant="outline" className="text-xs">
                          Requer configuração
                        </Badge>
                      )}
                      {hasConfig && (
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
                  {channel.requires_configuration && (
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
                    disabled={channel.slug === 'in_app'} // in_app is always enabled
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      {/* Events Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos de Notificação</CardTitle>
          <CardDescription>
            Lista de eventos disponíveis no sistema. Usuários podem configurar suas preferências individualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(eventsByModule).map(([module, moduleEvents]) => (
            <div key={module}>
              <h4 className="font-medium text-sm text-muted-foreground uppercase mb-3">
                {module}
              </h4>
              <div className="space-y-2">
                {moduleEvents.map(event => (
                  <div 
                    key={event.slug}
                    className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{event.name}</span>
                      {event.is_mandatory && (
                        <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                      )}
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", {
                          'bg-muted': event.audience === 'internal',
                          'bg-blue-100 dark:bg-blue-900/20': event.audience === 'external',
                          'bg-green-100 dark:bg-green-900/20': event.audience === 'both',
                        })}
                      >
                        {event.audience === 'internal' && 'Interno'}
                        {event.audience === 'external' && 'Externo'}
                        {event.audience === 'both' && 'Ambos'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      {event.default_channels.map(ch => {
                        const ChIcon = channelIcons[ch] || Bell;
                        return <ChIcon key={ch} className="w-4 h-4 text-muted-foreground" />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      
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
                <div className="space-y-2">
                  <Label htmlFor="default_channel">Canal Padrão</Label>
                  <Input
                    id="default_channel"
                    placeholder="#geral"
                    value={configForm.default_channel || ''}
                    onChange={(e) => setConfigForm({ ...configForm, default_channel: e.target.value })}
                  />
                </div>
              </>
            )}
            
            {selectedChannel === 'whatsapp' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    placeholder="Sua API Key"
                    value={configForm.api_key || ''}
                    onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone_number_id">Phone Number ID</Label>
                  <Input
                    id="phone_number_id"
                    placeholder="ID do número"
                    value={configForm.phone_number_id || ''}
                    onChange={(e) => setConfigForm({ ...configForm, phone_number_id: e.target.value })}
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
                    placeholder="https://seu-servico.com/webhook"
                    value={configForm.url || ''}
                    onChange={(e) => setConfigForm({ ...configForm, url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secret">Secret (opcional)</Label>
                  <Input
                    id="secret"
                    type="password"
                    placeholder="Secret para validação"
                    value={configForm.secret || ''}
                    onChange={(e) => setConfigForm({ ...configForm, secret: e.target.value })}
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
