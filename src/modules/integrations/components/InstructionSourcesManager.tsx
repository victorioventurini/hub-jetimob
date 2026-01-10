import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Globe,
  FileText,
  Database,
  FileCode,
  Loader2,
  GripVertical,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useInstructionSources, useCreateInstructionSource, useUpdateInstructionSource, useDeleteInstructionSource, type InstructionSourceRow } from '../hooks/useInstructionSources';
import type { InstructionSourceType } from '../types';
import type { Json } from '@/integrations/supabase/types';

// Helper to safely access config properties
function getConfigValue<T>(config: Json, key: string, defaultValue: T): T {
  if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
    const value = (config as Record<string, Json>)[key];
    return value !== undefined ? (value as unknown as T) : defaultValue;
  }
  return defaultValue;
}

interface InstructionSourcesManagerProps {
  agentId: string;
}

const SOURCE_TYPE_CONFIG = {
  api: {
    icon: Globe,
    label: 'API Externa',
    description: 'Busca dados de uma URL externa',
    color: 'text-blue-500',
  },
  document: {
    icon: FileText,
    label: 'Documentos',
    description: 'Usa documentos já enviados',
    color: 'text-green-500',
  },
  hub_context: {
    icon: Database,
    label: 'Contexto HUB',
    description: 'Dados internos (OKRs, KPIs, Times)',
    color: 'text-purple-500',
  },
  template: {
    icon: FileCode,
    label: 'Template',
    description: 'Texto fixo de instruções',
    color: 'text-orange-500',
  },
};

const HUB_TABLES = [
  { key: 'okrs', label: 'OKRs', description: 'Objetivos e Key Results' },
  { key: 'kpis', label: 'KPIs', description: 'Indicadores de Performance' },
  { key: 'teams', label: 'Times', description: 'Estrutura organizacional' },
];

export function InstructionSourcesManager({ agentId }: InstructionSourcesManagerProps) {
  const { data: sources, isLoading } = useInstructionSources(agentId);
  const createSource = useCreateInstructionSource();
  const updateSource = useUpdateInstructionSource();
  const deleteSource = useDeleteInstructionSource();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<InstructionSourceType>('api');
  
  // Form state for new source
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('100');
  
  // API config
  const [apiUrl, setApiUrl] = useState('');
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST'>('GET');
  const [apiRefreshInterval, setApiRefreshInterval] = useState('300');
  
  // Hub context config
  const [hubTables, setHubTables] = useState<string[]>([]);
  const [hubMaxRows, setHubMaxRows] = useState('50');
  
  // Template config
  const [templateContent, setTemplateContent] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setPriority('100');
    setApiUrl('');
    setApiMethod('GET');
    setApiRefreshInterval('300');
    setHubTables([]);
    setHubMaxRows('50');
    setTemplateContent('');
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    let config: Record<string, unknown> = {};

    switch (selectedType) {
      case 'api':
        if (!apiUrl.trim()) {
          toast.error('URL é obrigatória');
          return;
        }
        config = {
          url: apiUrl.trim(),
          method: apiMethod,
          refresh_interval_seconds: parseInt(apiRefreshInterval) || 300,
        };
        break;

      case 'hub_context':
        if (!hubTables.length) {
          toast.error('Selecione pelo menos uma tabela');
          return;
        }
        config = {
          tables: hubTables,
          max_rows: parseInt(hubMaxRows) || 50,
        };
        break;

      case 'template':
        if (!templateContent.trim()) {
          toast.error('Conteúdo do template é obrigatório');
          return;
        }
        config = {
          template_content: templateContent.trim(),
        };
        break;

      case 'document':
        config = { document_ids: [] };
        break;
    }

    createSource.mutate({
      agent_id: agentId,
      source_type: selectedType,
      name: name.trim(),
      description: description.trim() || null,
      priority: parseInt(priority) || 100,
      is_enabled: true,
      config: config as Json,
    }, {
      onSuccess: () => {
        toast.success('Fonte criada com sucesso');
        setIsDialogOpen(false);
        resetForm();
      },
    });
  };

  const handleToggleEnabled = (sourceId: string, isEnabled: boolean) => {
    updateSource.mutate({
      id: sourceId,
      is_enabled: isEnabled,
    });
  };

  const handleDelete = (sourceId: string, sourceName: string) => {
    if (confirm(`Tem certeza que deseja excluir a fonte "${sourceName}"?`)) {
      deleteSource.mutate(sourceId);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Fontes de Instrução
            </CardTitle>
            <CardDescription>
              Configure de onde o agente busca conhecimento adicional
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nova Fonte
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Adicionar Fonte de Instrução</DialogTitle>
                <DialogDescription>
                  Configure uma nova fonte de conhecimento para o agente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Source Type Selection */}
                <div className="space-y-2">
                  <Label>Tipo de Fonte</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SOURCE_TYPE_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedType(key as InstructionSourceType)}
                          className={`p-3 border rounded-lg text-left transition-colors ${
                            selectedType === key
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${config.color}`} />
                            <span className="font-medium text-sm">{config.label}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {config.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="source-name">Nome *</Label>
                    <Input
                      id="source-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: API de Vendas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source-priority">Prioridade</Label>
                    <Input
                      id="source-priority"
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      placeholder="100"
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Menor = mais prioritário
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="source-description">Descrição</Label>
                  <Input
                    id="source-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição opcional..."
                  />
                </div>

                {/* Type-specific config */}
                {selectedType === 'api' && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="api-url">URL *</Label>
                      <Input
                        id="api-url"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://api.example.com/data"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Método</Label>
                        <Select value={apiMethod} onValueChange={(v) => setApiMethod(v as 'GET' | 'POST')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="api-refresh">Refresh (seg)</Label>
                        <Input
                          id="api-refresh"
                          type="number"
                          value={apiRefreshInterval}
                          onChange={(e) => setApiRefreshInterval(e.target.value)}
                          min={60}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedType === 'hub_context' && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-2">
                      <Label>Tabelas do HUB *</Label>
                      <div className="space-y-2">
                        {HUB_TABLES.map((table) => (
                          <div
                            key={table.key}
                            className="flex items-center gap-3 p-2 border rounded-lg"
                          >
                            <Checkbox
                              id={`hub-${table.key}`}
                              checked={hubTables.includes(table.key)}
                              onCheckedChange={(checked) => {
                                setHubTables((prev) =>
                                  checked
                                    ? [...prev, table.key]
                                    : prev.filter((t) => t !== table.key)
                                );
                              }}
                            />
                            <div>
                              <Label htmlFor={`hub-${table.key}`} className="cursor-pointer">
                                {table.label}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {table.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hub-max-rows">Máximo de registros</Label>
                      <Input
                        id="hub-max-rows"
                        type="number"
                        value={hubMaxRows}
                        onChange={(e) => setHubMaxRows(e.target.value)}
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'template' && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="template-content">Conteúdo do Template *</Label>
                      <Textarea
                        id="template-content"
                        value={templateContent}
                        onChange={(e) => setTemplateContent(e.target.value)}
                        placeholder="Instruções fixas que o agente deve seguir..."
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'document' && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Após criar a fonte, você poderá vincular documentos existentes a ela.
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createSource.isPending}>
                  {createSource.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar Fonte
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {!sources?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma fonte de instrução configurada</p>
            <p className="text-sm">
              Adicione fontes para enriquecer o conhecimento do agente
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">
            {sources.map((source) => {
              const typeConfig = SOURCE_TYPE_CONFIG[source.source_type as keyof typeof SOURCE_TYPE_CONFIG];
              const Icon = typeConfig?.icon || Database;

              return (
                <AccordionItem
                  key={source.id}
                  value={source.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 flex-1">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <Icon className={`w-4 h-4 ${typeConfig?.color}`} />
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{source.name}</span>
                          <Badge variant="outline" className="text-xs">
                            P{source.priority}
                          </Badge>
                          {!source.is_enabled && (
                            <Badge variant="secondary" className="text-xs">
                              Desativado
                            </Badge>
                          )}
                        </div>
                        {source.description && (
                          <p className="text-sm text-muted-foreground">
                            {source.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(source.last_fetch_status)}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-4 pt-2">
                      {/* Source details based on type */}
                      {source.source_type === 'api' && (
                        <div className="text-sm space-y-1">
                          <p><strong>URL:</strong> {getConfigValue(source.config, 'url', '')}</p>
                          <p><strong>Método:</strong> {getConfigValue(source.config, 'method', 'GET')}</p>
                          <p><strong>Refresh:</strong> {getConfigValue(source.config, 'refresh_interval_seconds', 300)}s</p>
                        </div>
                      )}

                      {source.source_type === 'hub_context' && (
                        <div className="text-sm space-y-1">
                          <p><strong>Tabelas:</strong> {getConfigValue<string[]>(source.config, 'tables', []).join(', ')}</p>
                          <p><strong>Max registros:</strong> {getConfigValue(source.config, 'max_rows', 50)}</p>
                        </div>
                      )}

                      {source.source_type === 'template' && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">
                            {getConfigValue(source.config, 'template_content', '').substring(0, 200)}
                            {getConfigValue(source.config, 'template_content', '').length > 200 && '...'}
                          </p>
                        </div>
                      )}

                      {source.source_type === 'document' && (
                        <div className="text-sm">
                          <p className="text-muted-foreground">
                            {getConfigValue<string[]>(source.config, 'document_ids', []).length} documento(s) vinculado(s)
                          </p>
                        </div>
                      )}

                      {/* Last fetch info */}
                      {source.last_fetch_at && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <RefreshCw className="w-3 h-3" />
                          Última atualização: {new Date(source.last_fetch_at).toLocaleString('pt-BR')}
                          {source.last_fetch_error && (
                            <span className="text-red-500">({source.last_fetch_error})</span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={source.is_enabled}
                            onCheckedChange={(checked) => handleToggleEnabled(source.id, checked)}
                          />
                          <span className="text-sm">
                            {source.is_enabled ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(source.id, source.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
