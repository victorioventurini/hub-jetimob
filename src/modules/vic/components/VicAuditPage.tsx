import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart3, Bot, Clock, User, Building2, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useUrlState } from "@/hooks/useUrlState";
import { queryKeys } from "@/lib/queryKeys";

interface AgentLog {
  id: string;
  agent_name: string;
  scope: string;
  bu_id: string | null;
  user_id: string | null;
  action_context: string | null;
  status: string;
  error_message: string | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  model_used: string | null;
  created_at: string;
}

export function VicAuditPage() {
  const { isAdmin } = useAuth();
  
  // URL State
  const [timeRange, setTimeRange] = useUrlState<"7d" | "30d" | "90d">({ 
    key: 'range', 
    defaultValue: '7d',
    parse: (v) => v as "7d" | "30d" | "90d",
  });
  const [selectedBu, setSelectedBu] = useUrlState<string>({ key: 'bu_id', defaultValue: 'all' });
  const [activeTab, setActiveTab] = useUrlState<string>({ key: 'tab', defaultValue: 'by-agent' });

  // Fetch BUs for filter
  const { data: bus } = useQuery({
    queryKey: queryKeys.vic.buUnitsForAudit(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bu_units")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch logs
  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: queryKeys.vic.logs(timeRange, selectedBu === 'all' ? null : selectedBu),
    queryFn: async () => {
      const daysMap = { "7d": 7, "30d": 30, "90d": 90 };
      const fromDate = subDays(new Date(), daysMap[timeRange]);

      let query = supabase
        .from("ai_agent_logs")
        .select("*")
        .gte("created_at", fromDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);

      if (selectedBu !== "all") {
        query = query.eq("bu_id", selectedBu);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AgentLog[];
    },
    enabled: isAdmin,
  });

  // Calculate stats
  const stats = logs
    ? {
        totalCalls: logs.length,
        successRate: logs.length > 0
          ? (logs.filter((l) => l.status === "success").length / logs.length) * 100
          : 0,
        avgLatency: logs.length > 0
          ? logs.reduce((acc, l) => acc + (l.latency_ms || 0), 0) / logs.length
          : 0,
        totalTokens: logs.reduce((acc, l) => acc + (l.total_tokens || 0), 0),
        byAgent: Object.entries(
          logs.reduce((acc, l) => {
            acc[l.agent_name] = (acc[l.agent_name] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1]),
        byContext: Object.entries(
          logs.reduce((acc, l) => {
            const ctx = l.action_context || "unknown";
            acc[ctx] = (acc[ctx] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1]),
      }
    : null;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso restrito a administradores</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedBu} onValueChange={setSelectedBu}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as BUs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as BUs</SelectItem>
            {bus?.map((bu) => (
              <SelectItem key={bu.id} value={bu.id}>
                {bu.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      {isLoadingLogs ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de chamadas</CardDescription>
              <CardTitle className="text-2xl">{stats.totalCalls}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Taxa de sucesso</CardDescription>
              <CardTitle className="text-2xl">{stats.successRate.toFixed(1)}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Latência média</CardDescription>
              <CardTitle className="text-2xl">{stats.avgLatency.toFixed(0)}ms</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tokens consumidos</CardDescription>
              <CardTitle className="text-2xl">
                {stats.totalTokens.toLocaleString("pt-BR")}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="by-agent" className="gap-1.5">
            <Bot className="h-4 w-4" />
            Por Agente
          </TabsTrigger>
          <TabsTrigger value="by-context" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Por Contexto
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-agent">
          <Card>
            <CardHeader>
              <CardTitle>Consumo por Agente</CardTitle>
              <CardDescription>Quantidade de chamadas por agente</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.byAgent.length ? (
                <div className="space-y-3">
                  {stats.byAgent.map(([agent, count]) => (
                    <div key={agent} className="flex items-center justify-between">
                      <span className="font-medium">{agent}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum dado disponível
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-context">
          <Card>
            <CardHeader>
              <CardTitle>Consumo por Contexto</CardTitle>
              <CardDescription>De onde as chamadas estão sendo feitas</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.byContext.length ? (
                <div className="space-y-3">
                  {stats.byContext.map(([ctx, count]) => (
                    <div key={ctx} className="flex items-center justify-between">
                      <span className="font-medium">{ctx}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum dado disponível
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs recentes</CardTitle>
              <CardDescription>Últimas 500 execuções</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {isLoadingLogs ? (
                  <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : logs?.length ? (
                  <div className="space-y-2">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                      >
                        {log.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : log.status === "error" ? (
                          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium truncate">{log.agent_name}</span>
                            {log.action_context && (
                              <Badge variant="outline" className="text-xs">
                                {log.action_context}
                              </Badge>
                            )}
                          </div>
                          {log.error_message && (
                            <p className="text-xs text-red-500 truncate mt-0.5">
                              {log.error_message}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                          <div>{log.latency_ms}ms</div>
                          <div>{format(parseISO(log.created_at), "dd/MM HH:mm", { locale: ptBR })}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum log disponível
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
