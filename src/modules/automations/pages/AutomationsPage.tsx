import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ScrollText,
  Search,
  RefreshCw,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useBu } from '@/contexts/BuContext';
import {
  useEventCatalog,
  useActionCatalog,
  useAutomationLogs,
} from '../hooks/useAutomationData';
import { EventCategorySection } from '../components/EventCatalogCard';
import { ActionCategorySection } from '../components/ActionCatalogCard';
import { AutomationLogsTable } from '../components/AutomationLogsTable';
import type { AutomationEventCatalog, AutomationActionCatalog } from '../types';

export default function AutomationsPage() {
  usePageTitle('Automações');

  const { currentBu } = useBu();
  const [activeTab, setActiveTab] = useState('events');
  const [searchTerm, setSearchTerm] = useState('');
  const [logFilter, setLogFilter] = useState<string>('all');

  const { data: events, isLoading: eventsLoading } = useEventCatalog();
  const { data: actions, isLoading: actionsLoading } = useActionCatalog();
  const {
    data: logs,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useAutomationLogs({
    buId: currentBu?.id,
    status: logFilter !== 'all' ? logFilter : undefined,
    limit: 100,
  });

  // Group events by category
  const eventsByCategory = useMemo(() => {
    if (!events) return {};
    const filtered = searchTerm
      ? events.filter(
          (e) =>
            e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.event_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : events;

    return filtered.reduce(
      (acc, event) => {
        if (!acc[event.category]) acc[event.category] = [];
        acc[event.category].push(event);
        return acc;
      },
      {} as Record<string, AutomationEventCatalog[]>
    );
  }, [events, searchTerm]);

  // Group actions by category
  const actionsByCategory = useMemo(() => {
    if (!actions) return {};
    const filtered = searchTerm
      ? actions.filter(
          (a) =>
            a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.action_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : actions;

    return filtered.reduce(
      (acc, action) => {
        if (!acc[action.category]) acc[action.category] = [];
        acc[action.category].push(action);
        return acc;
      },
      {} as Record<string, AutomationActionCatalog[]>
    );
  }, [actions, searchTerm]);

  return (
    <div className="container max-w-6xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automações</h1>
        <p className="text-muted-foreground">
          Catálogo de eventos e ações disponíveis para automações do Hub.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events" className="gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Ações
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <ScrollText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4 mt-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar eventos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {eventsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(eventsByCategory).map(([category, categoryEvents]) => (
                <EventCategorySection
                  key={category}
                  category={category}
                  events={categoryEvents}
                />
              ))}
              {Object.keys(eventsByCategory).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum evento encontrado.
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4 mt-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar ações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {actionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(actionsByCategory).map(([category, categoryActions]) => (
                <ActionCategorySection
                  key={category}
                  category={category}
                  actions={categoryActions}
                />
              ))}
              {Object.keys(actionsByCategory).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma ação encontrada.
                </p>
              )}
            </div>
          )}
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4 mt-6">
          <div className="flex items-center justify-between gap-4">
            <Select value={logFilter} onValueChange={setLogFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="retrying">Tentando novamente</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetchLogs()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <AutomationLogsTable logs={logs || []} isLoading={logsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
