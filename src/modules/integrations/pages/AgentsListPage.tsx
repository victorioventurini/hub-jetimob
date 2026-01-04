import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Bot, 
  Plus, 
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Globe,
  Building2,
  Sparkles,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { IntegrationIcon } from '../components/IntegrationIcon';
import { 
  useIntegrationByKey, 
  useGlobalAgents,
  useUpdateAgent,
  useDeleteAgent,
  useCreateAgent,
} from '../hooks/useIntegrations';
import { useAuth } from '@/hooks/useAuth';
import type { AiAgent } from '../types';
import type { Json } from '@/integrations/supabase/types';

const AGENT_TEMPLATES = [
  {
    name: 'Coach de OKRs',
    description: 'Ajuda a escrever objetivos e key results de forma clara e mensurável',
    system_prompt: `Você é um coach especialista em OKRs (Objectives and Key Results).

Sua missão é ajudar líderes e times a:
- Escrever objetivos inspiradores e alcançáveis
- Definir key results específicos, mensuráveis e desafiadores
- Validar se os OKRs seguem boas práticas

Regras:
- Seja direto e prático
- Use exemplos quando possível
- Sempre pergunte sobre o contexto antes de sugerir
- Limite respostas a 3-4 parágrafos no máximo`,
    output_format: 'text' as const,
    allowed_tools: ['query_okrs', 'query_teams'],
  },
  {
    name: 'Analista de KPIs',
    description: 'Sugere métricas, interpreta variações e gera alertas on/off track',
    system_prompt: `Você é um analista de dados especializado em KPIs e métricas de negócio.

Sua missão é:
- Sugerir métricas relevantes para objetivos específicos
- Interpretar variações e tendências nos dados
- Identificar alertas de performance (on-track / off-track)
- Recomendar ações baseadas nos dados

Regras:
- Use linguagem simples e acessível
- Sempre contextualize os números
- Indique se uma métrica está saudável ou precisa de atenção
- Seja conciso: máximo 3 insights por resposta`,
    output_format: 'text' as const,
    allowed_tools: ['query_kpis', 'query_teams'],
  },
  {
    name: 'Curador de Cultura',
    description: 'Cria mensagens inspiradoras alinhadas ao manual de cultura',
    system_prompt: `Você é o curador de cultura da empresa.

Sua missão é:
- Criar mensagens curtas e inspiradoras alinhadas aos valores
- Reforçar comportamentos esperados de forma positiva
- Gerar conteúdo para o card "Cultura do Dia"

Formato de saída:
Retorne 5 opções de mensagens, cada uma com:
- Texto da mensagem (90-160 caracteres)
- Valor associado (propósito, ou um dos valores da empresa)
- Tom (inspirador, prático, direto)

Regras:
- Evite clichês genéricos
- Use linguagem humana e direta
- Cada mensagem deve ter um call-to-action sutil`,
    output_format: 'json' as const,
    output_schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          value: { type: 'string' },
          tone: { type: 'string' },
        },
      },
    },
    allowed_tools: [],
  },
];

export default function AgentsListPage() {
  const { integrationKey } = useParams<{ integrationKey: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const { data: integration, isLoading: loadingIntegration } = useIntegrationByKey(integrationKey || '');
  
  usePageTitle(integration?.name ? `Agents - ${integration.name}` : "Agents", { skipBu: true });
  
  const { data: agents, isLoading: loadingAgents } = useGlobalAgents(integrationKey);
  
  const updateAgent = useUpdateAgent();
  const deleteAgent = useDeleteAgent();
  const createAgent = useCreateAgent();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AiAgent | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  
  const handleToggleActive = (agent: AiAgent) => {
    updateAgent.mutate({
      id: agent.id,
      is_active: !agent.is_active,
    });
  };
  
  const handleDuplicate = (agent: AiAgent) => {
    createAgent.mutate({
      scope: 'global',
      integration_key: integrationKey || '',
      name: `${agent.name} (cópia)`,
      description: agent.description,
      is_active: false,
      system_prompt: agent.system_prompt,
      output_format: agent.output_format,
      output_schema: agent.output_schema as Record<string, unknown> | null,
      allowed_tools: agent.allowed_tools as Json,
      model_name: agent.model_name,
      max_tokens: agent.max_tokens,
      temperature: agent.temperature,
    });
  };
  
  const handleDeleteConfirm = () => {
    if (agentToDelete) {
      deleteAgent.mutate(agentToDelete.id);
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    }
  };
  
  const handleCreateFromTemplate = (template: typeof AGENT_TEMPLATES[0]) => {
    createAgent.mutate({
      scope: 'global',
      integration_key: integrationKey || '',
      name: template.name,
      description: template.description,
      is_active: true,
      system_prompt: template.system_prompt,
      output_format: template.output_format,
      output_schema: template.output_format === 'json' && 'output_schema' in template 
        ? template.output_schema as Record<string, unknown>
        : null,
      allowed_tools: template.allowed_tools as Json,
    });
    setTemplateDialogOpen(false);
    toast.success(`Agente "${template.name}" criado!`);
  };
  
  if (loadingIntegration || loadingAgents) {
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
  return (
    <div className="space-y-6">
      {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/settings/integrations/${integrationKey}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <IntegrationIcon icon={integration.icon} color={integration.color} size="lg" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Agentes - {integration.name}</h1>
            <p className="text-muted-foreground">Gerencie os agentes de IA disponíveis</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Criar de Template
              </Button>
              <Button onClick={() => navigate(`/settings/integrations/${integrationKey}/agents/new`)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Agente
              </Button>
            </div>
          )}
        </div>
        
        {/* Agents Table */}
        <Card>
          <CardHeader>
            <CardTitle>Agentes Globais</CardTitle>
            <CardDescription>
              Templates de agentes disponíveis para todas as BUs que habilitarem esta integração
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agents && agents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Escopo</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-primary" />
                          <span className="font-medium">{agent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {agent.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {agent.scope === 'global' ? (
                            <>
                              <Globe className="w-3 h-3" />
                              Global
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3 h-3" />
                              Por BU
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {agent.output_format === 'json' ? 'JSON' : 'Texto'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={agent.is_active}
                          onCheckedChange={() => handleToggleActive(agent)}
                          disabled={!isAdmin}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => navigate(`/settings/integrations/${integrationKey}/agents/${agent.id}`)}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(agent)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setAgentToDelete(agent);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">Nenhum agente configurado</h3>
                <p className="text-sm mb-4">
                  Crie agentes para automatizar tarefas com IA
                </p>
                {isAdmin && (
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Usar Template
                    </Button>
                    <Button onClick={() => navigate(`/settings/integrations/${integrationKey}/agents/new`)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Manualmente
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Template Dialog */}
        <AlertDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Criar Agente a partir de Template</AlertDialogTitle>
              <AlertDialogDescription>
                Escolha um template pré-configurado para começar rapidamente
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3 py-4">
              {AGENT_TEMPLATES.map((template, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleCreateFromTemplate(template)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {template.output_format === 'json' ? 'JSON' : 'Texto'}
                      </Badge>
                      {template.allowed_tools.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {template.allowed_tools.length} ferramenta(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Agente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o agente "{agentToDelete?.name}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
