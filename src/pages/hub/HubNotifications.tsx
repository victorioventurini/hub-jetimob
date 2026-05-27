import { useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useNotificationEvents, useNotificationChannels } from '@/hooks/notifications';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useUrlTab, useUrlSearch, useUrlState } from '@/shared/url';
import {
  defaultEventForm,
  type EventFormData,
  type HubTabValue,
  type NotificationEventLite,
} from './notifications/constants';
import { useHubNotificationsData } from './notifications/useHubNotificationsData';
import { EventsTab } from './notifications/EventsTab';
import { ChannelsTab } from './notifications/ChannelsTab';
import { DiagnosticsTab } from './notifications/DiagnosticsTab';
import { OutboxTab } from './notifications/OutboxTab';
import { EventFormDialog } from './notifications/EventFormDialog';

export default function HubNotifications() {
  usePageTitle('Central de Notificações', {
    skipBu: true,
    customDescription: 'Gerencie canais, eventos e diagnóstico de notificações do Next.',
  });

  const { data: events = [], isLoading: eventsLoading } = useNotificationEvents();
  const { data: channels = [], isLoading: channelsLoading } = useNotificationChannels();

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormData>(defaultEventForm);

  // URL State
  const [tab, setTab] = useUrlTab<HubTabValue>('events');
  const { value: searchQuery, set: setSearchQuery } = useUrlSearch('q', 300);
  const { value: moduleFilter, set: setModuleFilter } = useUrlState<string>({
    key: 'module',
    defaultValue: 'all',
  });
  const { value: severityFilter, set: setSeverityFilter } = useUrlState<string>({
    key: 'severity',
    defaultValue: 'all',
  });

  const {
    outboxStats,
    statsLoading,
    outboxItems,
    outboxLoading,
    upsertEvent,
    deleteEvent,
    updateChannelStatus,
  } = useHubNotificationsData(tab);

  const isLoading = eventsLoading || channelsLoading;

  const handleEditEvent = (event: NotificationEventLite) => {
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

  const handleSubmitEvent = () => {
    upsertEvent.mutate(eventForm, {
      onSuccess: () => {
        setEventDialogOpen(false);
        setEditingEvent(null);
        setEventForm(defaultEventForm);
        toast.success(editingEvent ? 'Evento atualizado' : 'Evento criado');
      },
    });
  };

  const handleToggleChannel = (currentStatus: string, channelSlug: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    updateChannelStatus.mutate({ slug: channelSlug, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="container py-8 space-y-6">
        <PageHeader
          title="Central de Notificações"
          description="Gerencie canais e eventos de notificação"
        />
        <Card>
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <PageHeader
        title="Central de Notificações"
        description="Gerencie canais e eventos de notificação do Next"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as HubTabValue)}>
        <TabsList>
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="diagnostics">
            <Activity className="w-4 h-4 mr-2" />
            Diagnóstico
          </TabsTrigger>
          <TabsTrigger value="outbox">
            <Mail className="w-4 h-4 mr-2" />
            Outbox
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <EventsTab
            events={events as NotificationEventLite[]}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            moduleFilter={moduleFilter}
            setModuleFilter={setModuleFilter}
            severityFilter={severityFilter}
            setSeverityFilter={setSeverityFilter}
            onNewEvent={handleNewEvent}
            onEditEvent={handleEditEvent}
            onDeleteEvent={(slug) => deleteEvent.mutate(slug)}
            isDeleting={deleteEvent.isPending}
          />
        </TabsContent>

        <TabsContent value="channels">
          <ChannelsTab channels={channels} onToggleChannel={handleToggleChannel} />
        </TabsContent>

        <TabsContent value="diagnostics">
          <DiagnosticsTab
            outboxStats={outboxStats}
            statsLoading={statsLoading}
            channels={channels}
            events={events as NotificationEventLite[]}
          />
        </TabsContent>

        <TabsContent value="outbox">
          <OutboxTab
            outboxItems={outboxItems}
            outboxLoading={outboxLoading}
            outboxStats={outboxStats}
          />
        </TabsContent>
      </Tabs>

      <EventFormDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        editingEvent={editingEvent}
        eventForm={eventForm}
        setEventForm={setEventForm}
        channels={channels}
        onSubmit={handleSubmitEvent}
        isSubmitting={upsertEvent.isPending}
      />
    </div>
  );
}
