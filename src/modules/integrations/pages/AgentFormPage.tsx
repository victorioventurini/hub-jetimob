import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Bot, 
  Save,
  Loader2,
  Wand2,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { IntegrationIcon } from '../components/IntegrationIcon';
import { 
  useIntegrationByKey, 
  useGlobalAgents,
  useCreateAgent,
  useUpdateAgent,
} from '../hooks/useIntegrations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { AiAgent } from '../types';
import type { Json } from '@/integrations/supabase/types';
import { AgentDocumentUpload } from '../components/AgentDocumentUpload';
import { InstructionSourcesManager } from '../components/InstructionSourcesManager';

const AVAILABLE_TOOLS = [
  { key: 'query_okrs', label: 'Consultar OKRs', description: 'Acesso aos objetivos e key results' },
  { key: 'query_kpis', label: 'Consultar KPIs', description: 'Acesso às métricas e indicadores' },
  { key: 'query_teams', label: 'Consultar Times', description: 'Acesso à estrutura de times' },
  { key: 'query_users', label: 'Consultar Usuários', description: 'Acesso restrito a dados de usuários' },
  { key: 'query_culture', label: 'Consultar Cultura', description: 'Acesso às mensagens e valores' },
];

const OUTPUT_FORMATS = [
  { value: 'text', label: 'Texto livre', description: 'Resposta em texto natural' },
  { value: 'json', label: 'JSON estruturado', description: 'Resposta em formato JSON com schema definido' },
];

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Mais capaz e versátil' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Rápido e econômico' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Contexto estendido' },
];

export default function AgentFormPage() {
  const { integrationKey, agentId } = useParams<{ integrationKey: string; agentId?: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const isEditing = !!agentId;
  
  const { data: integration, isLoading: loadingIntegration } = useIntegrationByKey(integrationKey || '');
  
  usePageTitle(
    isEditing 
      ? `Editar Agent - ${integration?.name || 'Integrações'}` 
      : `Novo Agent - ${integration?.name || 'Integrações'}`, 
    { 
      skipBu: true, 
      customDescription: "Configure o prompt, ferramentas e parâmetros do agente de IA." 
    }
  );
  
  const { data: existingAgents } = useGlobalAgents(integrationKey);
  
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [scope, setScope] = useState<'global' | 'bu'>('global');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [outputFormat, setOutputFormat] = useState<'text' | 'json'>('text');
  const [outputSchema, setOutputSchema] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [maxTokens, setMaxTokens] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('0.7');
  
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [existingAgent, setExistingAgent] = useState<AiAgent | null>(null);
  
  // Load existing agent if editing
  useEffect(() => {
    if (isEditing && agentId) {
      setLoadingAgent(true);
      supabase
        .from('ai_agents')
        .select('*')
        .eq('id', agentId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            toast.error('Erro ao carregar agente');
            navigate(`/hub/integrations/${integrationKey}/agents`);
            return;
          }
          
          if (data) {
            const agent = data as AiAgent;
            setExistingAgent(agent);
            setName(agent.name);
            setDescription(agent.description || '');
            setIsActive(agent.is_active);
            setScope(agent.scope);
            setSystemPrompt(agent.system_prompt);
            setOutputFormat(agent.output_format);
            setOutputSchema(agent.output_schema ? JSON.stringify(agent.output_schema, null, 2) : '');
            setSelectedTools(agent.allowed_tools as string[] || []);
            setModelName(agent.model_name || 'gpt-4o-mini');
            setMaxTokens(agent.max_tokens?.toString() || '');
            setTemperature(agent.temperature?.toString() || '0.7');
          }
          
          setLoadingAgent(false);
        });
    }
  }, [isEditing, agentId, integrationKey, navigate]);
  
  const handleToolToggle = (toolKey: string) => {
    setSelectedTools(prev => 
      prev.includes(toolKey)
        ? prev.filter(t => t !== toolKey)
        : [...prev, toolKey]
    );
  };
  
  const handleSave = (activate?: boolean) => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    if (!systemPrompt.trim()) {
      toast.error('Prompt do sistema é obrigatório');
      return;
    }
    
    let parsedSchema: Record<string, unknown> | null = null;
    if (outputFormat === 'json' && outputSchema.trim()) {
      try {
        parsedSchema = JSON.parse(outputSchema);
      } catch {
        toast.error('Schema JSON inválido');
        return;
      }
    }
    
    const agentData = {
      scope,
      integration_key: integrationKey || '',
      name: name.trim(),
      description: description.trim() || null,
      is_active: activate !== undefined ? activate : isActive,
      system_prompt: systemPrompt.trim(),
      output_format: outputFormat,
      output_schema: parsedSchema,
      allowed_tools: selectedTools as Json,
      model_name: modelName || null,
      max_tokens: maxTokens ? parseInt(maxTokens) : null,
      temperature: temperature ? parseFloat(temperature) : 0.7,
    };
    
    if (isEditing && agentId) {
      updateAgent.mutate({
        id: agentId,
        ...agentData,
      }, {
        onSuccess: () => {
          navigate(`/hub/integrations/${integrationKey}/agents`);
        },
      });
    } else {
      createAgent.mutate(agentData, {
        onSuccess: () => {
          navigate(`/hub/integrations/${integrationKey}/agents`);
        },
      });
    }
  };
  
  if (loadingIntegration || loadingAgent) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px]" />
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
  
  const isSaving = createAgent.isPending || updateAgent.isPending;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/hub/integrations/${integrationKey}/agents`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <IntegrationIcon icon={integration.icon} color={integration.color} size="lg" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar Agente' : 'Criar Agente'}
          </h1>
          <p className="text-muted-foreground">{integration.name}</p>
        </div>
      </div>
        
      <div className="grid gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Informações Básicas
            </CardTitle>
            <CardDescription>
              Defina o nome e a descrição do agente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Agente *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Coach de OKRs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scope">Escopo</Label>
                <Select value={scope} onValueChange={(v) => setScope(v as 'global' | 'bu')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (todas as BUs)</SelectItem>
                    <SelectItem value="bu">Por BU (selecionar BUs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva brevemente o que este agente faz..."
                rows={2}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Status</Label>
                <p className="text-sm text-muted-foreground">
                  Agentes inativos não podem ser usados
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardContent>
        </Card>
          
        {/* System Prompt */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Prompt do Sistema
            </CardTitle>
            <CardDescription>
              Instruções que definem o comportamento do agente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">Prompt do Sistema *</Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Você é um assistente especializado em..."
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Seja específico sobre o papel, regras e formato de resposta esperado.
              </p>
            </div>
          </CardContent>
        </Card>
          
        {/* Output Format */}
        <Card>
          <CardHeader>
            <CardTitle>Formato de Saída</CardTitle>
            <CardDescription>
              Defina como o agente deve estruturar as respostas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as 'text' | 'json')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      <div>
                        <span className="font-medium">{format.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          - {format.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {outputFormat === 'json' && (
              <div className="space-y-2">
                <Label htmlFor="outputSchema">Schema JSON</Label>
                <Textarea
                  id="outputSchema"
                  value={outputSchema}
                  onChange={(e) => setOutputSchema(e.target.value)}
                  placeholder='{"type": "object", "properties": {...}}'
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Defina a estrutura esperada do JSON de resposta.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
          
        {/* Tools / Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Ferramentas Permitidas</CardTitle>
            <CardDescription>
              Selecione quais dados o agente pode consultar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {AVAILABLE_TOOLS.map((tool) => (
                <div 
                  key={tool.key}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={tool.key}
                    checked={selectedTools.includes(tool.key)}
                    onCheckedChange={() => handleToolToggle(tool.key)}
                  />
                  <div>
                    <Label 
                      htmlFor={tool.key} 
                      className="cursor-pointer font-medium"
                    >
                      {tool.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
          
        {/* Model Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Modelo</CardTitle>
            <CardDescription>
              Ajuste parâmetros avançados (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Select value={modelName} onValueChange={setModelName}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                  placeholder="Auto"
                  min={1}
                  max={128000}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="0.7"
                  min={0}
                  max={2}
                  step={0.1}
                />
              </div>
            </div>
          </CardContent>
        </Card>
          
        {/* Instruction Sources - Only show when editing */}
        {isEditing && agentId && (
          <InstructionSourcesManager agentId={agentId} />
        )}
          
        {/* Knowledge Base - Only show when editing */}
        {isEditing && agentId && (
          <AgentDocumentUpload agentId={agentId} />
        )}
          
        <Separator />
          
        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-end pb-6">
          <Button 
            variant="outline" 
            asChild
          >
            <Link to={`/hub/integrations/${integrationKey}/agents`}>
              Cancelar
            </Link>
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isSaving}
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar e Ativar
          </Button>
        </div>
      </div>
    </div>
  );
}
