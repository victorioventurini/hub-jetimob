import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { IntegrationIcon } from '../components/IntegrationIcon';
import { 
  useIntegrationByKey, 
  useAgentLogs,
  useGlobalAgents,
} from '../hooks/useIntegrations';
import { useAuth } from '@/hooks/useAuth';

export default function AgentLogsPage() {
  const { integrationKey } = useParams<{ integrationKey: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const { data: integration, isLoading: loadingIntegration } = useIntegrationByKey(integrationKey || '');
  
  usePageTitle(integration?.name ? `Logs - ${integration.name}` : "Logs", { skipBu: true });
  
  const { data: agents } = useGlobalAgents(integrationKey);
  
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: logs, isLoading: loadingLogs, refetch } = useAgentLogs({
    integration_key: integrationKey,
    agent_id: selectedAgent !== 'all' ? selectedAgent : undefined,
    limit: 200,
  });
  
  // Filter logs client-side for status and search
  const filteredLogs = logs?.filter(log => {
    if (selectedStatus !== 'all' && log.status !== selectedStatus) return false;
    if (searchQuery && !log.agent_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  
  // Calculate stats
  const stats = logs ? {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    error: logs.filter(l => l.status === 'error').length,
    avgLatency: Math.round(
      logs.reduce((acc, l) => acc + (l.latency_ms || 0), 0) / logs.length
    ) || 0,
    totalTokens: logs.reduce((acc, l) => acc + (l.total_tokens || 0), 0),
  } : null;
  
  if (loadingIntegration) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </HubLayout>
    );
  }
  
  if (!integration) {
    return (
      <HubLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Integração não encontrada</h3>
            <Button variant="outline" onClick={() => navigate('/integrations')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </HubLayout>
    );
  }
  
  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/integrations/${integrationKey}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <IntegrationIcon icon={integration.icon} color={integration.color} size="lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Logs - {integration.name}</h1>
            <p className="text-muted-foreground">Histórico de execuções de agentes</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Execuções</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sucesso</p>
                    <p className="text-2xl font-bold">{stats.success}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Erros</p>
                    <p className="text-2xl font-bold">{stats.error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Latência Média</p>
                    <p className="text-2xl font-bold">{stats.avgLatency}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tokens Total</p>
                    <p className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <CardTitle className="text-base">Filtros</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por agente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os agentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os agentes</SelectItem>
                  {agents?.map(agent => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="timeout">Timeout</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Execuções</CardTitle>
            <CardDescription>
              Últimas {filteredLogs?.length || 0} execuções registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Latência</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge 
                          variant={
                            log.status === 'success' ? 'default' :
                            log.status === 'error' ? 'destructive' : 'secondary'
                          }
                          className="gap-1"
                        >
                          {log.status === 'success' && <CheckCircle className="w-3 h-3" />}
                          {log.status === 'error' && <XCircle className="w-3 h-3" />}
                          {log.status === 'timeout' && <Clock className="w-3 h-3" />}
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.agent_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.scope === 'global' ? 'Global' : 'BU'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.latency_ms ? `${log.latency_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>
                        {log.total_tokens?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.model_used || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">Nenhum log encontrado</h3>
                <p className="text-sm">
                  Os logs aparecerão aqui quando agentes forem executados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </HubLayout>
  );
}
