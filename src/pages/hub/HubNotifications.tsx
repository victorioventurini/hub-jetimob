import { useState, useMemo } from 'react';
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
  Search,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUrlTab, useUrlSearch, useUrlState } from '@/shared/url';
import { queryKeys } from '@/lib/queryKeys';
import { DiagnosticsSloCard } from '@/components/hub/notifications/DiagnosticsSloCard';
import { DiagnosticsHealthAlertsCard } from '@/components/hub/notifications/DiagnosticsHealthAlertsCard';

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
  
  // URL State
  const [tab, setTab] = useUrlTab<'events' | 'channels' | 'diagnostics'>('events');
  const { value: searchQuery, set: setSearchQuery } = useUrlSearch('q', 300);
  const { value: moduleFilter, set: setModuleFilter } = useUrlState<string>({ key: 'module', defaultValue: 'all' });
  const { value: severityFilter, set: setSeverityFilter } = useUrlState<string>({ key: 'severity', defaultValue: 'all' });
  
  // Global outbox stats with per-channel breakdown
  const { data: outboxStats, isLoading: statsLoading } = useQuery({
    queryKey: ['notification-outbox-stats-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_outbox')
        .select('status, channel_slug, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      
      const pending = data?.filter(r => r.status === 'pending').length || 0;
      const sent = data?.filter(r => r.status === 'sent').length || 0;
      const failed = data?.filter(r => r.status === 'failed').length || 0;
      const lastProcessed = data?.find(r => r.status === 'sent')?.created_at || null;
      
      // Per-channel stats
      const byChannel: Record<string, { pending: number; sent: number; failed: number }> = {
        email: { pending: 0, sent: 0, failed: 0 },
        slack: { pending: 0, sent: 0, failed: 0 },
        webhook: { pending: 0, sent: 0, failed: 0 },
      };
      
      data?.forEach(r => {
        const ch = r.channel_slug as string;
        if (byChannel[ch]) {
          if (r.status === 'pending') byChannel[ch].pending++;
          else if (r.status === 'sent') byChannel[ch].sent++;
          else if (r.status === 'failed') byChannel[ch].failed++;
        }
      });
      
      return { pending, sent, failed, total: data?.length || 0, lastProcessed, byChannel };
    },
  });

  // Health alerts query (using any type since table was just created)
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

  const { data: healthAlerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['notification-health-alerts-global'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_health_alerts' as any)
        .select('id, bu_id, alert_type, severity, detected_at, resolved_at, metadata, is_active')
        .order('detected_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data as unknown as HealthAlert[]) || [];
    },
  });

  const activeAlerts = healthAlerts.filter(a => a.is_active);
  const recentResolvedAlerts = healthAlerts.filter(a => !a.is_active && 
    new Date(a.resolved_at || 0) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  
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
  
  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (searchQuery && !event.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !event.slug.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (moduleFilter !== 'all' && event.module !== moduleFilter) {
        return false;
      }
      if (severityFilter !== 'all' && event.severity !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [events, searchQuery, moduleFilter, severityFilter]);

  // Group events by module
  const eventsByModule = filteredEvents.reduce((acc, event) => {
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
      
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="diagnostics">
            <Activity className="w-4 h-4 mr-2" />
            Diagnóstico
          </TabsTrigger>
        </TabsList>
        
        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Catálogo de Eventos</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredEvents.length} de {events.length} eventos
                </p>
              </div>
              <Button onClick={handleNewEvent}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Evento
              </Button>
            </div>
            
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos módulos</SelectItem>
                  {Object.entries(moduleNames).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
        
        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Diagnóstico Global</h2>
            <p className="text-sm text-muted-foreground">
              SLO/SLA, Health Alerts e métricas do sistema de notificações
            </p>
          </div>

          {/* Phase 4: SLO/SLA Card */}
          <DiagnosticsSloCard />

          {/* Phase 4: Health Alerts Card with Cooldown/Escalation/Runbooks */}
          <DiagnosticsHealthAlertsCard />

          {/* Legacy Global Stats (keeping for backward compatibility) */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Outbox</CardDescription>
                <CardTitle className="text-2xl">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : outboxStats?.total || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Notificações processadas
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pendentes
                </CardDescription>
                <CardTitle className="text-2xl text-yellow-500">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : outboxStats?.pending || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Aguardando processamento
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Enviadas
                </CardDescription>
                <CardTitle className="text-2xl text-green-500">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : outboxStats?.sent || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Entregues com sucesso
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Falhas
                </CardDescription>
                <CardTitle className="text-2xl text-destructive">
                  {statsLoading ? <Skeleton className="h-8 w-16" /> : outboxStats?.failed || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Erros de entrega
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Canais ativos</span>
                <Badge variant="secondary">
                  {channels.filter(c => c.status === 'active').length}/{channels.length}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Eventos cadastrados</span>
                <Badge variant="secondary">{events.length}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Última notificação enviada</span>
                <span className="text-sm text-muted-foreground">
                  {outboxStats?.lastProcessed 
                    ? new Date(outboxStats.lastProcessed).toLocaleString('pt-BR')
                    : 'Nenhuma'}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Taxa de sucesso</span>
                <span className="text-sm font-medium">
                  {outboxStats && outboxStats.total > 0
                    ? `${Math.round((outboxStats.sent / outboxStats.total) * 100)}%`
                    : 'N/A'}
                </span>
              </div>
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
