import { useState } from 'react';
import { 
  useNotificationEvents,
  useNotificationChannels,
} from '@/hooks/useNotificationCenter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  DialogTrigger,
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
  Plus,
  Pencil,
  Trash2,
  Lock,
  AlertTriangle,
  AlertCircle,
  Info,
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

const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const moduleNames: Record<string, string> = {
  core: 'Geral',
  okrs: 'OKRs',
  tickets: 'Tickets',
  assets: 'Ativos',
  teams: 'Times',
  kpis: 'KPIs',
};

interface EventFormData {
  slug: string;
  module: string;
  name: string;
  description: string;
  audience: 'internal' | 'external' | 'both';
  severity: 'info' | 'warning' | 'critical';
  is_mandatory: boolean;
  default_channels: string[];
  icon: string;
}

const defaultEventForm: EventFormData = {
  slug: '',
  module: 'core',
  name: '',
  description: '',
  audience: 'internal',
  severity: 'info',
  is_mandatory: false,
  default_channels: ['in_app'],
  icon: 'Bell',
};

export default function HubNotifications() {
  const queryClient = useQueryClient();
  const { data: events = [], isLoading: eventsLoading } = useNotificationEvents();
  const { data: channels = [], isLoading: channelsLoading } = useNotificationChannels();
  
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormData>(defaultEventForm);
  
  const isLoading = eventsLoading || channelsLoading;
  
  // Mutation for creating/updating events
  const upsertEvent = useMutation({
    mutationFn: async (data: EventFormData) => {
      const { error } = await supabase
        .from('notification_events')
        .upsert({
          slug: data.slug,
          module: data.module,
          name: data.name,
          description: data.description,
          audience: data.audience,
          severity: data.severity,
          is_mandatory: data.is_mandatory,
          default_channels: data.default_channels,
          icon: data.icon,
        }, { onConflict: 'slug' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-events'] });
      setEventDialogOpen(false);
      setEditingEvent(null);
      setEventForm(defaultEventForm);
      toast.success(editingEvent ? 'Evento atualizado' : 'Evento criado');
    },
    onError: (error) => {
      toast.error('Erro ao salvar evento', { description: error.message });
    },
  });
  
  // Mutation for deleting events
  const deleteEvent = useMutation({
    mutationFn: async (slug: string) => {
      const { error } = await supabase
        .from('notification_events')
        .delete()
        .eq('slug', slug);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-events'] });
      toast.success('Evento removido');
    },
    onError: (error) => {
      toast.error('Erro ao remover evento', { description: error.message });
    },
  });
  
  // Mutation for updating channel status
  const updateChannelStatus = useMutation({
    mutationFn: async ({ slug, status }: { slug: string; status: string }) => {
      const { error } = await supabase
        .from('notification_channels')
        .update({ status })
        .eq('slug', slug);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      toast.success('Canal atualizado');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar canal', { description: error.message });
    },
  });
  
  const handleEditEvent = (event: typeof events[0]) => {
    setEditingEvent(event.slug);
    setEventForm({
      slug: event.slug,
      module: event.module,
      name: event.name,
      description: event.description || '',
      audience: event.audience,
      severity: event.severity,
      is_mandatory: event.is_mandatory,
      default_channels: event.default_channels,
      icon: event.icon || 'Bell',
    });
    setEventDialogOpen(true);
  };
  
  const handleNewEvent = () => {
    setEditingEvent(null);
    setEventForm(defaultEventForm);
    setEventDialogOpen(true);
  };
  
  const handleToggleChannel = (channel: string, channelSlug: string) => {
    const newStatus = channel === 'active' ? 'inactive' : 'active';
    updateChannelStatus.mutate({ slug: channelSlug, status: newStatus });
  };
  
  // Group events by module
  const eventsByModule = events.reduce((acc, event) => {
    if (!acc[event.module]) acc[event.module] = [];
    acc[event.module].push(event);
    return acc;
  }, {} as Record<string, typeof events>);
  
  if (isLoading) {
    return (
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Central de Notificações</h1>
          <p className="text-muted-foreground">Gerencie canais e eventos de notificação</p>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Central de Notificações</h1>
        <p className="text-muted-foreground">Gerencie canais e eventos de notificação do Hub</p>
      </div>
      
      <Tabs defaultValue="events">
        <TabsList>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
        </TabsList>
        
        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Catálogo de Eventos</h2>
              <p className="text-sm text-muted-foreground">
                {events.length} eventos configurados
              </p>
            </div>
            <Button onClick={handleNewEvent}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </div>
          
          {Object.entries(eventsByModule).map(([module, moduleEvents]) => (
            <Card key={module}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {moduleNames[module] || module}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Audiência</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Canais Padrão</TableHead>
                      <TableHead>Obrigatório</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moduleEvents.map(event => {
                      const SeverityIcon = severityIcons[event.severity];
                      return (
                        <TableRow key={event.slug}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{event.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {event.slug}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {event.audience === 'internal' && 'Interno'}
                              {event.audience === 'external' && 'Externo'}
                              {event.audience === 'both' && 'Ambos'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <SeverityIcon className={cn("w-4 h-4", {
                                'text-muted-foreground': event.severity === 'info',
                                'text-yellow-500': event.severity === 'warning',
                                'text-destructive': event.severity === 'critical',
                              })} />
                              <span className="text-sm capitalize">{event.severity}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {event.default_channels.map(ch => {
                                const ChIcon = channelIcons[ch] || Bell;
                                return <ChIcon key={ch} className="w-4 h-4 text-muted-foreground" />;
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {event.is_mandatory ? (
                              <Lock className="w-4 h-4 text-primary" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditEvent(event)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteEvent.mutate(event.slug)}
                                disabled={deleteEvent.isPending}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Canais Globais</h2>
            <p className="text-sm text-muted-foreground">
              Canais disponíveis para todas as BUs
            </p>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Requer Configuração</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map(channel => {
                    const Icon = channelIcons[channel.slug] || Bell;
                    return (
                      <TableRow key={channel.slug}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-medium">{channel.name}</div>
                              {channel.description && (
                                <div className="text-xs text-muted-foreground">
                                  {channel.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {channel.slug}
                          </code>
                        </TableCell>
                        <TableCell>
                          {channel.requires_configuration ? (
                            <Badge variant="secondary">Sim</Badge>
                          ) : (
                            <span className="text-muted-foreground">Não</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={channel.status === 'active'}
                            onCheckedChange={() => handleToggleChannel(channel.status, channel.slug)}
                            disabled={channel.slug === 'in_app'}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Editar Evento' : 'Novo Evento'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do evento de notificação
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  placeholder="module.action.type"
                  value={eventForm.slug}
                  onChange={(e) => setEventForm({ ...eventForm, slug: e.target.value })}
                  disabled={!!editingEvent}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module">Módulo</Label>
                <Select
                  value={eventForm.module}
                  onValueChange={(v) => setEventForm({ ...eventForm, module: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(moduleNames).map(([key, name]) => (
                      <SelectItem key={key} value={key}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Nome do evento"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição do evento"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Audiência</Label>
                <Select
                  value={eventForm.audience}
                  onValueChange={(v: 'internal' | 'external' | 'both') => setEventForm({ ...eventForm, audience: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Interno</SelectItem>
                    <SelectItem value="external">Externo</SelectItem>
                    <SelectItem value="both">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severidade</Label>
                <Select
                  value={eventForm.severity}
                  onValueChange={(v: 'info' | 'warning' | 'critical') => setEventForm({ ...eventForm, severity: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Canais Padrão</Label>
              <div className="flex flex-wrap gap-2">
                {channels.map(channel => {
                  const Icon = channelIcons[channel.slug] || Bell;
                  const isSelected = eventForm.default_channels.includes(channel.slug);
                  return (
                    <Button
                      key={channel.slug}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newChannels = isSelected
                          ? eventForm.default_channels.filter(c => c !== channel.slug)
                          : [...eventForm.default_channels, channel.slug];
                        setEventForm({ ...eventForm, default_channels: newChannels });
                      }}
                    >
                      <Icon className="w-4 h-4 mr-1" />
                      {channel.name}
                    </Button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="is_mandatory"
                checked={eventForm.is_mandatory}
                onCheckedChange={(c) => setEventForm({ ...eventForm, is_mandatory: c })}
              />
              <Label htmlFor="is_mandatory">Evento Obrigatório (não pode ser desativado pelo usuário)</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEventDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => upsertEvent.mutate(eventForm)}
              disabled={upsertEvent.isPending || !eventForm.slug || !eventForm.name}
            >
              {editingEvent ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
