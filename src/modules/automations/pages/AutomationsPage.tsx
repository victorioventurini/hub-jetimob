import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Zap,
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

  const totalEvents = events?.length || 0;
  const totalActions = actions?.length || 0;
  const successLogs = logs?.filter((l) => l.status === 'success').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Automações</h1>
        <p className="text-muted-foreground">
          Catálogo de eventos e ações disponíveis para automações do Hub
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ArrowUpRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEvents}</p>
                <p className="text-sm text-muted-foreground">Eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ArrowDownLeft className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActions}</p>
                <p className="text-sm text-muted-foreground">Ações</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successLogs}</p>
                <p className="text-sm text-muted-foreground">Execuções OK</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Content */}
      <Card>
        <CardHeader className="pb-3">
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
          </Tabs>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Events Tab */}
            <TabsContent value="events" className="space-y-4 mt-0">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
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
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ArrowUpRight className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Nenhum evento encontrado.</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-4 mt-0">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar ações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
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
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ArrowDownLeft className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Nenhuma ação encontrada.</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-4 mt-0">
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
        </CardContent>
      </Card>
    </div>
  );
}
