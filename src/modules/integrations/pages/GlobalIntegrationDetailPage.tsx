import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { InfoNotice } from '@/components/ui/info-notice';
import { 
  ArrowLeft, 
  Key, 
  Eye, 
  EyeOff, 
  Loader2, 
  Play, 
  Bot,
  Activity,
  Sparkles,
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
} from '@/modules/integrations/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useUrlTab } from '@/shared/url';

// ============================================================================
// LLM Config Sub-component (chatgpt integration only)
// ============================================================================
type LlmKeySource = 'gateway' | 'own_key';

interface LlmProviderConfig {
  label: string;
  placeholder: string;
  configField: string;
  description: string;
}

const LLM_PROVIDERS: Record<string, LlmProviderConfig> = {
  openai: {
    label: 'OpenAI (GPT)',
    placeholder: 'sk-...',
    configField: 'api_key',
    description: 'Modelos legacy gpt-* usarão esta chave diretamente. Modelos openai/* podem usar Gateway ou chave própria.',
  },
  google: {
    label: 'Google (Gemini)',
    placeholder: 'AIza...',
    configField: 'google_api_key',
    description: 'Modelos google/* podem usar Gateway (automático) ou chave própria do Google AI Studio.',
  },
};

function LlmKeyField({
  provider,
  config,
  existingConfig,
  isAdmin,
  onChange,
}: {
  provider: LlmProviderConfig;
  config: { source: LlmKeySource; apiKey: string };
  existingConfig: Record<string, unknown> | null;
  isAdmin: boolean;
  onChange: (source: LlmKeySource, apiKey: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const hasExistingKey = !!(existingConfig?.[provider.configField]);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <Label className="text-base font-semibold">{provider.label}</Label>
      </div>
      <p className="text-xs text-muted-foreground">{provider.description}</p>
      
      <RadioGroup
        value={config.source}
        onValueChange={(v) => onChange(v as LlmKeySource, config.apiKey)}
        className="gap-3"
        disabled={!isAdmin}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="gateway" id={`${provider.configField}-gateway`} />
          <Label htmlFor={`${provider.configField}-gateway`} className="font-normal cursor-pointer">
            Usar Lovable AI Gateway <span className="text-xs text-muted-foreground">(automático, sem chave)</span>
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="own_key" id={`${provider.configField}-own`} />
          <Label htmlFor={`${provider.configField}-own`} className="font-normal cursor-pointer">
            Usar chave própria
          </Label>
        </div>
      </RadioGroup>

      {config.source === 'own_key' && (
        <div className="space-y-2 pl-6">
          <Label htmlFor={provider.configField}>
            <Key className="w-3 h-3 inline mr-1" />
            API Key
          </Label>
          <div className="relative">
            <Input
              id={provider.configField}
              type={showKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => onChange('own_key', e.target.value)}
              placeholder={hasExistingKey ? '••••••••••••••••' : provider.placeholder}
              disabled={!isAdmin}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          {hasExistingKey && !config.apiKey && (
            <p className="text-xs text-muted-foreground">
              Uma API Key já está configurada. Digite uma nova para substituir.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================
export default function GlobalIntegrationDetailPage() {
  const { integrationKey } = useParams<{ integrationKey: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const { data: integration, isLoading: loadingIntegration } = useIntegrationByKey(integrationKey || '');
  
  usePageTitle(integration?.name ? `${integration.name} - Integrações` : "Integrações", { 
    skipBu: true, 
    customDescription: "Configure credenciais e parâmetros desta integração." 
  });
  
  const { data: globalConfig, isLoading: loadingConfig } = useGlobalConfig(integrationKey || '');
  const { data: globalAgents } = useGlobalAgents(integrationKey);
  const { data: logs } = useAgentLogs({ integration_key: integrationKey, limit: 50 });
  
  const upsertConfig = useUpsertGlobalConfig();
  const updateTestStatus = useUpdateGlobalTestStatus();
  
  // URL State for tab
  const [activeTab, setActiveTab] = useUrlTab<string>('config');
  
  const [isEnabled, setIsEnabled] = useState(globalConfig?.is_enabled_global ?? false);
  const [isTesting, setIsTesting] = useState(false);
  
  // ----------- LLM-specific state -----------
  const isLlmIntegration = integrationKey === 'chatgpt';
  
  const [openaiConfig, setOpenaiConfig] = useState<{ source: LlmKeySource; apiKey: string }>({ source: 'gateway', apiKey: '' });
  const [googleConfig, setGoogleConfig] = useState<{ source: LlmKeySource; apiKey: string }>({ source: 'gateway', apiKey: '' });
  
  // ----------- Generic (non-LLM) state -----------
  const isGtmIntegration = integrationKey === 'google-tag-manager';
  const fieldLabel = isGtmIntegration ? 'Container ID' : 'API Key';
  const fieldPlaceholder = isGtmIntegration ? 'GTM-XXXXXXX' : 'sk-...';
  const fieldKey = isGtmIntegration ? 'container_id' : 'api_key';
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  
  // Sync config on load
  useEffect(() => {
    if (globalConfig) {
      setIsEnabled(globalConfig.is_enabled_global);
      
      if (isLlmIntegration) {
        const enc = globalConfig.config_encrypted as Record<string, unknown> | null;
        const hasOpenAIKey = !!(enc?.api_key);
        const hasGoogleKey = !!(enc?.google_api_key);
        setOpenaiConfig({ source: hasOpenAIKey ? 'own_key' : 'gateway', apiKey: '' });
        setGoogleConfig({ source: hasGoogleKey ? 'own_key' : 'gateway', apiKey: '' });
      }
    }
  }, [globalConfig, isLlmIntegration]);
  
  const handleSave = () => {
    if (!integrationKey) return;
    
    const config: Record<string, unknown> = {
      ...(globalConfig?.config_encrypted || {}),
    };
    
    if (isLlmIntegration) {
      // OpenAI key
      if (openaiConfig.source === 'gateway') {
        delete config.api_key;
      } else if (openaiConfig.apiKey.trim()) {
        config.api_key = openaiConfig.apiKey.trim();
      }
      
      // Google key
      if (googleConfig.source === 'gateway') {
        delete config.google_api_key;
      } else if (googleConfig.apiKey.trim()) {
        config.google_api_key = googleConfig.apiKey.trim();
      }
      
      // Store source preferences
      config.openai_source = openaiConfig.source;
      config.google_source = googleConfig.source;
    } else {
      if (apiKey.trim()) {
        config[fieldKey] = apiKey.trim();
      }
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
    
    setTimeout(() => {
      const enc = globalConfig?.config_encrypted as Record<string, unknown> | null;
      const hasAnyKey = apiKey.trim() || enc?.api_key || enc?.google_api_key || openaiConfig.apiKey.trim() || googleConfig.apiKey.trim();
      const isGatewayOnly = isLlmIntegration && openaiConfig.source === 'gateway' && googleConfig.source === 'gateway';
      
      if (hasAnyKey || isGatewayOnly) {
        updateTestStatus.mutate({
          integration_key: integrationKey,
          last_test_status: 'ok',
          last_test_message: isGatewayOnly 
            ? 'Usando Lovable AI Gateway (automático).'
            : 'Conexão estabelecida com sucesso.',
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
          <Button variant="outline" asChild>
            <Link to="/hub/integrations">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const existingConfig = globalConfig?.config_encrypted as Record<string, unknown> | null;
  const hasExistingValue = !!(existingConfig?.[fieldKey]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/hub/integrations">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <IntegrationIcon icon={integration.icon} color={integration.color} size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{integration.name}</h1>
          <p className="text-muted-foreground">{integration.description}</p>
        </div>
      </div>
        
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                {isLlmIntegration 
                  ? 'Configure como os modelos de IA são acessados: via Gateway automático ou com chaves próprias.'
                  : 'Credenciais e configurações compartilhadas com todas as BUs que optarem por usar a configuração global.'
                }
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
                
                {/* LLM-specific: dual provider config */}
                {isLlmIntegration ? (
                  <div className="space-y-4">
                    <InfoNotice variant="info">
                      O <strong>Lovable AI Gateway</strong> provê acesso a modelos Google Gemini e OpenAI sem 
                      necessidade de chave — ideal para volume baixo/médio. Para <strong>volume alto ou controle 
                      de custos</strong>, configure suas próprias chaves abaixo.
                    </InfoNotice>
                    
                    <LlmKeyField
                      provider={LLM_PROVIDERS.openai}
                      config={openaiConfig}
                      existingConfig={existingConfig}
                      isAdmin={isAdmin}
                      onChange={(source, apiKey) => setOpenaiConfig({ source, apiKey })}
                    />
                    
                    <LlmKeyField
                      provider={LLM_PROVIDERS.google}
                      config={googleConfig}
                      existingConfig={existingConfig}
                      isAdmin={isAdmin}
                      onChange={(source, apiKey) => setGoogleConfig({ source, apiKey })}
                    />
                  </div>
                ) : (
                  /* Generic single-key field */
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">
                      <Key className="w-4 h-4 inline mr-1" />
                      {fieldLabel}
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="apiKey"
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={hasExistingValue ? '••••••••••••••••' : fieldPlaceholder}
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
                    {hasExistingValue && !apiKey && (
                      <p className="text-xs text-muted-foreground">
                        {isGtmIntegration 
                          ? 'Um Container ID já está configurado. Digite um novo para substituir.'
                          : 'Uma API Key já está configurada. Digite uma nova para substituir.'
                        }
                      </p>
                    )}
                  </div>
                )}
                
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
                      isLoading={isTesting}
                      loadingText="Testando..."
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Testar Conexão
                    </Button>
                    <Button
                      onClick={handleSave}
                      isLoading={upsertConfig.isPending}
                      loadingText="Salvando..."
                    >
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Agentes Globais</CardTitle>
                    <CardDescription>
                      Templates de agentes disponíveis para todas as BUs
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <Button asChild>
                        <Link to={`/hub/integrations/${integrationKey}/agents/new`}>
                          Criar Agente
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" asChild>
                      <Link to={`/hub/integrations/${integrationKey}/agents`}>
                        Ver Todos
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
                <CardContent>
                  {globalAgents && globalAgents.length > 0 ? (
                    <div className="space-y-3">
                      {globalAgents.slice(0, 5).map((agent) => (
                        <Link 
                          key={agent.id}
                          to={`/hub/integrations/${integrationKey}/agents/${agent.id}`}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
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
                        </Link>
                      ))}
                      {globalAgents.length > 5 && (
                        <Button 
                          variant="ghost" 
                          className="w-full"
                          asChild
                        >
                          <Link to={`/hub/integrations/${integrationKey}/agents`}>
                            Ver mais {globalAgents.length - 5} agentes...
                          </Link>
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
                          asChild
                        >
                          <Link to={`/hub/integrations/${integrationKey}/agents/new`}>
                            Criar primeiro agente
                          </Link>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>Logs de Execução</CardTitle>
                  <CardDescription>
                    Histórico de execuções de agentes desta integração
                  </CardDescription>
                </div>
                <Button variant="outline" asChild>
                  <Link to={`/hub/integrations/${integrationKey}/logs`}>
                    Ver Todos
                  </Link>
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
                            log.status === 'success' ? 'bg-status-green' : 
                            log.status === 'error' ? 'bg-status-red' : 'bg-status-yellow'
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
                        asChild
                      >
                        <Link to={`/hub/integrations/${integrationKey}/logs`}>
                          Ver mais {logs.length - 10} logs...
                        </Link>
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
