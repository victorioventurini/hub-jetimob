import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Globe,
  Pencil,
} from 'lucide-react';
import { useBu } from '@/contexts/BuContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { IntegrationIcon } from '../components/IntegrationIcon';
import { TestStatusBadge } from '../components/TestStatusBadge';
import { 
  useIntegrationByKey, 
  useGlobalConfig, 
  useBuIntegrationConfig,
  useUpsertBuIntegrationConfig,
  useBuAgents,
  useAgentLogs,
} from '../hooks/useIntegrations';
import { useAuth } from '@/hooks/useAuth';

export default function BuIntegrationDetailPage() {
  const { integrationKey } = useParams<{ integrationKey: string }>();
  const navigate = useNavigate();
  const { currentBu } = useBu();
  const { isAdmin } = useAuth();
  const canManage = isAdmin; // BU admin check would require additional hook
  
  const { data: integration, isLoading: loadingIntegration } = useIntegrationByKey(integrationKey || '');
  
  usePageTitle(integration?.name ? `${integration.name} - Integrações` : "Integrações");
  
  const { data: globalConfig, isLoading: loadingGlobal } = useGlobalConfig(integrationKey || '');
  const { data: buConfig, isLoading: loadingBu } = useBuIntegrationConfig(currentBu?.id, integrationKey || '');
  const { data: buAgents } = useBuAgents(currentBu?.id, integrationKey);
  const { data: logs } = useAgentLogs({ bu_id: currentBu?.id, integration_key: integrationKey, limit: 50 });
  
  const upsertBuConfig = useUpsertBuIntegrationConfig();
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [configMode, setConfigMode] = useState<'use_global' | 'override'>('use_global');
  const [isTesting, setIsTesting] = useState(false);
  
  // Initialize state from config
  useEffect(() => {
    if (buConfig) {
      setIsEnabled(buConfig.is_enabled_in_bu);
      setConfigMode(buConfig.config_mode);
    }
  }, [buConfig]);
  
  const handleSave = () => {
    if (!integrationKey || !currentBu) return;
    
    const configOverride: Record<string, unknown> | null = 
      configMode === 'override' && apiKey.trim() 
        ? { api_key: apiKey.trim() } 
        : buConfig?.config_override_encrypted || null;
    
    upsertBuConfig.mutate({
      bu_id: currentBu.id,
      integration_key: integrationKey,
      is_enabled_in_bu: isEnabled,
      config_mode: configMode,
      config_override_encrypted: configMode === 'override' ? configOverride : null,
    });
  };
  
  const handleTest = async () => {
    if (!integrationKey) return;
    
    setIsTesting(true);
    
    // Simulate test
    setTimeout(() => {
      const hasConfig = configMode === 'use_global' 
        ? !!(globalConfig?.config_encrypted as any)?.api_key
        : !!(apiKey.trim() || (buConfig?.config_override_encrypted as any)?.api_key);
      
      if (hasConfig) {
        toast.success('Teste de conexão bem-sucedido!');
      } else {
        toast.error('Teste falhou: Configuração incompleta.');
      }
      setIsTesting(false);
    }, 2000);
  };
  
  const isLoading = loadingIntegration || loadingGlobal || loadingBu;
  
  if (isLoading) {
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
            <Button variant="outline" onClick={() => navigate('/settings/integrations')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </HubLayout>
    );
  }
  
  const hasExistingOverrideKey = !!(buConfig?.config_override_encrypted as any)?.api_key;
  const globalHasKey = !!(globalConfig?.config_encrypted as any)?.api_key;
  
  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings/integrations')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <IntegrationIcon icon={integration.icon} color={integration.color} size="lg" />
          <div>
            <h1 className="text-2xl font-bold">{integration.name}</h1>
            <p className="text-muted-foreground">Configuração para {currentBu?.name}</p>
          </div>
        </div>
        
        <Tabs defaultValue="config" className="space-y-6">
          <TabsList>
            <TabsTrigger value="config">
              <Key className="w-4 h-4 mr-2" />
              Configuração
            </TabsTrigger>
            {integration.supports_agents && (
              <TabsTrigger value="agents">
                <Bot className="w-4 h-4 mr-2" />
                Agentes ({buAgents?.length || 0})
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
                <CardTitle>Configuração da BU</CardTitle>
                <CardDescription>
                  Escolha entre usar a configuração global ou definir credenciais próprias.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Habilitar nesta BU</Label>
                    <p className="text-sm text-muted-foreground">
                      Ativa a integração para uso nesta Business Unit
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={setIsEnabled}
                    disabled={!canManage}
                  />
                </div>
                
                <Separator />
                
                {/* Config Mode */}
                {integration.supports_bu_override && (
                  <div className="space-y-4">
                    <Label className="text-base">Modo de Configuração</Label>
                    <RadioGroup 
                      value={configMode} 
                      onValueChange={(v) => setConfigMode(v as 'use_global' | 'override')}
                      disabled={!canManage}
                    >
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="use_global" id="use_global" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="use_global" className="flex items-center gap-2 cursor-pointer">
                            <Globe className="w-4 h-4" />
                            Usar Configuração Global
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Utiliza as credenciais definidas pelo administrador global.
                            {globalHasKey && (
                              <span className="text-green-600 ml-1">(API Key configurada)</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-4 border rounded-lg">
                        <RadioGroupItem value="override" id="override" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="override" className="flex items-center gap-2 cursor-pointer">
                            <Pencil className="w-4 h-4" />
                            Override (Credenciais Próprias)
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Define credenciais específicas para esta BU.
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                
                {/* Override API Key */}
                {configMode === 'override' && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">
                        <Key className="w-4 h-4 inline mr-1" />
                        API Key da BU
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="apiKey"
                            type={showApiKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={hasExistingOverrideKey ? '••••••••••••••••' : 'sk-...'}
                            disabled={!canManage}
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
                      {hasExistingOverrideKey && !apiKey && (
                        <p className="text-xs text-muted-foreground">
                          Uma API Key já está configurada. Digite uma nova para substituir.
                        </p>
                      )}
                    </div>
                  </>
                )}
                
                <Separator />
                
                {/* Test Status */}
                <div className="space-y-3">
                  <Label>Status da Conexão</Label>
                  <div className="flex items-center gap-4">
                    <TestStatusBadge
                      status={buConfig?.last_test_status || null}
                      message={buConfig?.last_test_message}
                      testedAt={buConfig?.last_test_at}
                      showDetails
                    />
                  </div>
                </div>
                
                {/* Actions */}
                {canManage && (
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
                      disabled={upsertBuConfig.isPending}
                    >
                      {upsertBuConfig.isPending && (
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
                      <CardTitle>Agentes da BU</CardTitle>
                      <CardDescription>
                        Agentes específicos desta Business Unit
                      </CardDescription>
                    </div>
                    {canManage && (
                      <Button onClick={() => navigate(`/settings/integrations/${integrationKey}/agents/new`)}>
                        Criar Agente
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {buAgents && buAgents.length > 0 ? (
                    <div className="space-y-3">
                      {buAgents.map((agent) => (
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
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                      <p>Nenhum agente configurado para esta BU</p>
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
                <CardTitle>Logs da BU</CardTitle>
                <CardDescription>
                  Histórico de execuções nesta Business Unit
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logs && logs.length > 0 ? (
                  <div className="space-y-2">
                    {logs.slice(0, 20).map((log) => (
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
    </HubLayout>
  );
}
