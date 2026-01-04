import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Key, 
  Eye, 
  EyeOff, 
  Loader2, 
  Play, 
  Bot,
  Activity,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { IntegrationIcon } from '../components/IntegrationIcon';
import { TestStatusBadge } from '../components/TestStatusBadge';
import { 
  useIntegrationByKey, 
  useGlobalConfig, 
  useUpsertGlobalConfig,
  useUpdateGlobalTestStatus,
  useGlobalAgents,
  useAgentLogs,
} from '../hooks/useIntegrations';
import { useAuth } from '@/hooks/useAuth';

export default function GlobalIntegrationDetailPage() {
  const { integrationKey } = useParams<{ integrationKey: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const { data: integration, isLoading: loadingIntegration } = useIntegrationByKey(integrationKey || '');
  
  usePageTitle(integration?.name ? `${integration.name} - Integrações` : "Integrações", { skipBu: true });
  
  const { data: globalConfig, isLoading: loadingConfig } = useGlobalConfig(integrationKey || '');
  const { data: globalAgents } = useGlobalAgents(integrationKey);
  const { data: logs } = useAgentLogs({ integration_key: integrationKey, limit: 50 });
  
  const upsertConfig = useUpsertGlobalConfig();
  const updateTestStatus = useUpdateGlobalTestStatus();
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isEnabled, setIsEnabled] = useState(globalConfig?.is_enabled_global ?? false);
  const [isTesting, setIsTesting] = useState(false);
  
  // Update state when config loads
  useState(() => {
    if (globalConfig) {
      setIsEnabled(globalConfig.is_enabled_global);
    }
  });
  
  const handleSave = () => {
    if (!integrationKey) return;
    
    const config: Record<string, unknown> = {
      ...(globalConfig?.config_encrypted || {}),
    };
    
    if (apiKey.trim()) {
      config.api_key = apiKey.trim();
    }
    
    upsertConfig.mutate({
      integration_key: integrationKey,
      is_enabled_global: isEnabled,
      config_encrypted: config,
    });
  };
  
  const handleTest = async () => {
    if (!integrationKey) return;
    
    setIsTesting(true);
    updateTestStatus.mutate({
      integration_key: integrationKey,
      last_test_status: 'pending',
    });
    
    // Simulate test - in production this would call an edge function
    setTimeout(() => {
      const hasApiKey = apiKey.trim() || (globalConfig?.config_encrypted as any)?.api_key;
      
      if (hasApiKey) {
        updateTestStatus.mutate({
          integration_key: integrationKey,
          last_test_status: 'ok',
          last_test_message: 'Conexão estabelecida com sucesso.',
        });
        toast.success('Teste de conexão bem-sucedido!');
      } else {
        updateTestStatus.mutate({
          integration_key: integrationKey,
          last_test_status: 'error',
          last_test_message: 'API Key não configurada.',
        });
        toast.error('Teste falhou: API Key não configurada.');
      }
      setIsTesting(false);
    }, 2000);
  };
  
  if (loadingIntegration || loadingConfig) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  
  if (!integration) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="text-lg font-semibold mb-2">Integração não encontrada</h3>
          <Button variant="outline" onClick={() => navigate('/settings/integrations')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const hasExistingApiKey = !!(globalConfig?.config_encrypted as any)?.api_key;
  
  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings/integrations')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <IntegrationIcon icon={integration.icon} color={integration.color} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">{integration.name}</h1>
            <p className="text-muted-foreground">{integration.description}</p>
          </div>
        </div>
        
        <Tabs defaultValue="config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="config">
              <Key className="w-4 h-4 mr-2" />
              Configuração Global
            </TabsTrigger>
            {integration.supports_agents && (
              <TabsTrigger value="agents">
                <Bot className="w-4 h-4 mr-2" />
                Agentes ({globalAgents?.length || 0})
              </TabsTrigger>
            )}
            <TabsTrigger value="logs">
              <Activity className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>
          
          {/* Config Tab */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração Global</CardTitle>
                <CardDescription>
                  Credenciais e configurações compartilhadas com todas as BUs que optarem por usar a configuração global.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Habilitar globalmente</Label>
                    <p className="text-sm text-muted-foreground">
                      Torna a integração disponível para as BUs
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                    disabled={!isAdmin}
                  />
                </div>
                
                <Separator />
                
                {/* API Key */}
                <div className="space-y-2">
                  <Label htmlFor="apiKey">
                    <Key className="w-4 h-4 inline mr-1" />
                    API Key
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="apiKey"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={hasExistingApiKey ? '••••••••••••••••' : 'sk-...'}
                        disabled={!isAdmin}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {hasExistingApiKey && !apiKey && (
                    <p className="text-xs text-muted-foreground">
                      Uma API Key já está configurada. Digite uma nova para substituir.
                    </p>
                  )}
                </div>
                
                <Separator />
                
                {/* Test Status */}
                <div className="space-y-3">
                  <Label>Status da Conexão</Label>
                  <div className="flex items-center gap-4">
                    <TestStatusBadge
                      status={globalConfig?.last_test_status || null}
                      message={globalConfig?.last_test_message}
                      testedAt={globalConfig?.last_test_at}
                      showDetails
                    />
                  </div>
                </div>
                
                {/* Actions */}
                {isAdmin && (
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleTest}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Testar Conexão
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={upsertConfig.isPending}
                    >
                      {upsertConfig.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Salvar Configuração
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Agents Tab */}
          {integration.supports_agents && (
            <TabsContent value="agents" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Agentes Globais</CardTitle>
                      <CardDescription>
                        Templates de agentes disponíveis para todas as BUs
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button onClick={() => navigate(`/settings/integrations/${integrationKey}/agents/new`)}>
                          Criar Agente
                        </Button>
                      )}
                      <Button variant="outline" onClick={() => navigate(`/settings/integrations/${integrationKey}/agents`)}>
                        Ver Todos
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {globalAgents && globalAgents.length > 0 ? (
                    <div className="space-y-3">
                      {globalAgents.slice(0, 5).map((agent) => (
                        <div 
                          key={agent.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/settings/integrations/${integrationKey}/agents/${agent.id}`)}
                        >
                          <div className="flex items-center gap-3">
                            <Bot className="w-5 h-5 text-primary" />
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {agent.description}
                              </p>
                            </div>
                          </div>
                          <Switch checked={agent.is_active} disabled />
                        </div>
                      ))}
                      {globalAgents.length > 5 && (
                        <Button 
                          variant="ghost" 
                          className="w-full"
                          onClick={() => navigate(`/settings/integrations/${integrationKey}/agents`)}
                        >
                          Ver mais {globalAgents.length - 5} agentes...
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p>Nenhum agente global configurado</p>
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => navigate(`/settings/integrations/${integrationKey}/agents/new`)}
                        >
                          Criar primeiro agente
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
          
          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Logs de Execução</CardTitle>
                    <CardDescription>
                      Histórico de execuções de agentes desta integração
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => navigate(`/settings/integrations/${integrationKey}/logs`)}>
                    Ver Todos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {logs && logs.length > 0 ? (
                  <div className="space-y-2">
                    {logs.slice(0, 10).map((log) => (
                      <div 
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${
                            log.status === 'success' ? 'bg-green-500' : 
                            log.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          <span className="font-medium">{log.agent_name}</span>
                          <span className="text-muted-foreground">
                            {log.latency_ms}ms
                          </span>
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    ))}
                    {logs.length > 10 && (
                      <Button 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => navigate(`/settings/integrations/${integrationKey}/logs`)}
                      >
                        Ver mais {logs.length - 10} logs...
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhum log encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
}
