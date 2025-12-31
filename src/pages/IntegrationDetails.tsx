import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeft,
  Key,
  Webhook,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  Copy,
  ExternalLink,
  Bot,
  Mail,
  MapPin,
  MessageSquare,
  Zap,
  Database,
  Cloud,
  Plug,
  Settings,
  Clock,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  slug: string;
  status: boolean;
  scope: string | null;
  created_at: string;
  updated_at: string;
}

interface IntegrationConfig {
  id: string;
  integration_id: string;
  config_key: string;
  config_value: string | null;
  is_secret: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface IntegrationWebhook {
  id: string;
  integration_id: string;
  name: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

const integrationIcons: Record<string, typeof Bot> = {
  'chatgpt': Bot,
  'sendgrid': Mail,
  'google-maps': MapPin,
  'slack': MessageSquare,
  'zapier': Zap,
  'supabase': Database,
  'aws': Cloud,
};

const integrationColors: Record<string, string> = {
  'chatgpt': 'bg-emerald-500',
  'sendgrid': 'bg-blue-500',
  'google-maps': 'bg-red-500',
  'slack': 'bg-purple-500',
  'zapier': 'bg-orange-500',
  'supabase': 'bg-green-600',
  'aws': 'bg-yellow-500',
};

export default function IntegrationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Dialog states
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'config' | 'webhook'; id: string } | null>(null);

  // Edit states
  const [editingConfig, setEditingConfig] = useState<IntegrationConfig | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<IntegrationWebhook | null>(null);

  // Visibility states for secrets
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  // Form states
  const [configForm, setConfigForm] = useState({
    config_key: '',
    config_value: '',
    is_secret: false,
    description: '',
  });

  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    method: 'POST',
    headers: '',
    is_active: true,
  });

  // Fetch integration
  const { data: integration, isLoading: loadingIntegration } = useQuery({
    queryKey: ['integration', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Integration;
    },
    enabled: !!id,
  });

  // Fetch configs
  const { data: configs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['integration-configs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .eq('integration_id', id)
        .order('config_key');
      
      if (error) throw error;
      return data as IntegrationConfig[];
    },
    enabled: !!id && isAdmin,
  });

  // Fetch webhooks
  const { data: webhooks, isLoading: loadingWebhooks } = useQuery({
    queryKey: ['integration-webhooks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_webhooks')
        .select('*')
        .eq('integration_id', id)
        .order('name');
      
      if (error) throw error;
      return data as IntegrationWebhook[];
    },
    enabled: !!id,
  });

  // Config mutations
  const createConfigMutation = useMutation({
    mutationFn: async (data: typeof configForm) => {
      const { error } = await supabase
        .from('integration_configs')
        .insert({
          integration_id: id,
          config_key: data.config_key.trim(),
          config_value: data.config_value || null,
          is_secret: data.is_secret,
          description: data.description.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-configs', id] });
      toast.success('Configuração adicionada!');
      handleCloseConfigDialog();
    },
    onError: (error: Error) => {
      console.error('Error creating config:', error);
      toast.error('Erro ao adicionar configuração.');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async ({ configId, ...data }: { configId: string } & Partial<typeof configForm>) => {
      const { error } = await supabase
        .from('integration_configs')
        .update({
          config_key: data.config_key?.trim(),
          config_value: data.config_value || null,
          is_secret: data.is_secret,
          description: data.description?.trim() || null,
        })
        .eq('id', configId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-configs', id] });
      toast.success('Configuração atualizada!');
      handleCloseConfigDialog();
    },
    onError: (error: Error) => {
      console.error('Error updating config:', error);
      toast.error('Erro ao atualizar configuração.');
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('integration_configs')
        .delete()
        .eq('id', configId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-configs', id] });
      toast.success('Configuração removida!');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      console.error('Error deleting config:', error);
      toast.error('Erro ao remover configuração.');
    },
  });

  // Webhook mutations
  const createWebhookMutation = useMutation({
    mutationFn: async (data: typeof webhookForm) => {
      let parsedHeaders = {};
      if (data.headers.trim()) {
        try {
          parsedHeaders = JSON.parse(data.headers);
        } catch {
          throw new Error('Headers inválidos. Use formato JSON.');
        }
      }
      
      const { error } = await supabase
        .from('integration_webhooks')
        .insert({
          integration_id: id,
          name: data.name.trim(),
          url: data.url.trim(),
          method: data.method,
          headers: parsedHeaders,
          is_active: data.is_active,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-webhooks', id] });
      toast.success('Webhook adicionado!');
      handleCloseWebhookDialog();
    },
    onError: (error: Error) => {
      console.error('Error creating webhook:', error);
      toast.error(error.message || 'Erro ao adicionar webhook.');
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: async ({ webhookId, ...data }: { webhookId: string } & Partial<typeof webhookForm>) => {
      let parsedHeaders = {};
      if (data.headers?.trim()) {
        try {
          parsedHeaders = JSON.parse(data.headers);
        } catch {
          throw new Error('Headers inválidos. Use formato JSON.');
        }
      }

      const { error } = await supabase
        .from('integration_webhooks')
        .update({
          name: data.name?.trim(),
          url: data.url?.trim(),
          method: data.method,
          headers: parsedHeaders,
          is_active: data.is_active,
        })
        .eq('id', webhookId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-webhooks', id] });
      toast.success('Webhook atualizado!');
      handleCloseWebhookDialog();
    },
    onError: (error: Error) => {
      console.error('Error updating webhook:', error);
      toast.error(error.message || 'Erro ao atualizar webhook.');
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const { error } = await supabase
        .from('integration_webhooks')
        .delete()
        .eq('id', webhookId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-webhooks', id] });
      toast.success('Webhook removido!');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      console.error('Error deleting webhook:', error);
      toast.error('Erro ao remover webhook.');
    },
  });

  // Handlers
  const handleOpenConfigDialog = (config?: IntegrationConfig) => {
    if (config) {
      setEditingConfig(config);
      setConfigForm({
        config_key: config.config_key,
        config_value: config.config_value || '',
        is_secret: config.is_secret,
        description: config.description || '',
      });
    } else {
      setEditingConfig(null);
      setConfigForm({ config_key: '', config_value: '', is_secret: false, description: '' });
    }
    setConfigDialogOpen(true);
  };

  const handleCloseConfigDialog = () => {
    setConfigDialogOpen(false);
    setEditingConfig(null);
    setConfigForm({ config_key: '', config_value: '', is_secret: false, description: '' });
  };

  const handleOpenWebhookDialog = (webhook?: IntegrationWebhook) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setWebhookForm({
        name: webhook.name,
        url: webhook.url,
        method: webhook.method,
        headers: JSON.stringify(webhook.headers, null, 2),
        is_active: webhook.is_active,
      });
    } else {
      setEditingWebhook(null);
      setWebhookForm({ name: '', url: '', method: 'POST', headers: '', is_active: true });
    }
    setWebhookDialogOpen(true);
  };

  const handleCloseWebhookDialog = () => {
    setWebhookDialogOpen(false);
    setEditingWebhook(null);
    setWebhookForm({ name: '', url: '', method: 'POST', headers: '', is_active: true });
  };

  const handleSubmitConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configForm.config_key.trim()) {
      toast.error('Chave é obrigatória.');
      return;
    }

    if (editingConfig) {
      updateConfigMutation.mutate({ configId: editingConfig.id, ...configForm });
    } else {
      createConfigMutation.mutate(configForm);
    }
  };

  const handleSubmitWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookForm.name.trim() || !webhookForm.url.trim()) {
      toast.error('Nome e URL são obrigatórios.');
      return;
    }

    if (editingWebhook) {
      updateWebhookMutation.mutate({ webhookId: editingWebhook.id, ...webhookForm });
    } else {
      createWebhookMutation.mutate(webhookForm);
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'config') {
      deleteConfigMutation.mutate(deleteTarget.id);
    } else {
      deleteWebhookMutation.mutate(deleteTarget.id);
    }
  };

  const toggleSecretVisibility = (configId: string) => {
    setVisibleSecrets(prev => {
      const next = new Set(prev);
      if (next.has(configId)) {
        next.delete(configId);
      } else {
        next.add(configId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const Icon = integration ? (integrationIcons[integration.slug] || Plug) : Plug;
  const iconColor = integration ? (integrationColors[integration.slug] || 'bg-gray-500') : 'bg-gray-500';

  if (loadingIntegration) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48" />
        </div>
      </HubLayout>
    );
  }

  if (!integration) {
    return (
      <HubLayout>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plug className="w-12 h-12 text-muted-foreground mb-4" />
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/integrations')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className={`p-3 rounded-lg ${iconColor}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{integration.name}</h1>
              <Badge variant={integration.status ? 'default' : 'secondary'}>
                {integration.status ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              <code className="text-sm">{integration.slug}</code>
              {integration.scope && <span className="ml-2">• Escopo: {integration.scope}</span>}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="configs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="configs" className="gap-2">
              <Key className="w-4 h-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="info" className="gap-2">
              <Settings className="w-4 h-4" />
              Informações
            </TabsTrigger>
          </TabsList>

          {/* Configs Tab */}
          <TabsContent value="configs" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Chaves de API e Configurações</CardTitle>
                  <CardDescription>
                    Gerencie as credenciais e configurações desta integração
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => handleOpenConfigDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loadingConfigs ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : configs && configs.length > 0 ? (
                  <div className="space-y-3">
                    {configs.map((config) => (
                      <div
                        key={config.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="font-semibold text-sm">{config.config_key}</code>
                            {config.is_secret && (
                              <Badge variant="outline" className="text-xs">
                                <Key className="w-3 h-3 mr-1" />
                                Secret
                              </Badge>
                            )}
                          </div>
                          {config.description && (
                            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-sm bg-background px-2 py-1 rounded border max-w-md truncate">
                              {config.is_secret && !visibleSecrets.has(config.id)
                                ? '••••••••••••••••'
                                : config.config_value || '(vazio)'}
                            </code>
                            {config.is_secret && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleSecretVisibility(config.id)}
                              >
                                {visibleSecrets.has(config.id) ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {config.config_value && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => copyToClipboard(config.config_value || '')}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenConfigDialog(config)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                setDeleteTarget({ type: 'config', id: config.id });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma configuração adicionada</p>
                    {isAdmin && (
                      <Button variant="link" onClick={() => handleOpenConfigDialog()}>
                        Adicionar primeira configuração
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Webhooks</CardTitle>
                  <CardDescription>
                    Configure webhooks para receber notificações e eventos
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={() => handleOpenWebhookDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loadingWebhooks ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => <Skeleton key={i} className="h-20" />)}
                  </div>
                ) : webhooks && webhooks.length > 0 ? (
                  <div className="space-y-3">
                    {webhooks.map((webhook) => (
                      <div
                        key={webhook.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{webhook.name}</span>
                            <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                              {webhook.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Badge variant="outline">{webhook.method}</Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-sm bg-background px-2 py-1 rounded border max-w-lg truncate">
                              {webhook.url}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(webhook.url)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <a href={webhook.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                          </div>
                          {webhook.last_triggered_at && (
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Último disparo: {new Date(webhook.last_triggered_at).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenWebhookDialog(webhook)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                setDeleteTarget({ type: 'webhook', id: webhook.id });
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>Nenhum webhook configurado</p>
                    {isAdmin && (
                      <Button variant="link" onClick={() => handleOpenWebhookDialog()}>
                        Adicionar primeiro webhook
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações da Integração</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">ID</Label>
                    <p className="font-mono text-sm">{integration.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Slug</Label>
                    <p className="font-mono text-sm">{integration.slug}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Criado em</Label>
                    <p>{new Date(integration.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Atualizado em</Label>
                    <p>{new Date(integration.updated_at).toLocaleString('pt-BR')}</p>
                  </div>
                  {integration.scope && (
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Escopo</Label>
                      <p>{integration.scope}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Config Dialog */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Editar Configuração' : 'Nova Configuração'}
              </DialogTitle>
              <DialogDescription>
                Adicione chaves de API, tokens ou outras configurações
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitConfig} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="config_key">Chave *</Label>
                <Input
                  id="config_key"
                  value={configForm.config_key}
                  onChange={(e) => setConfigForm({ ...configForm, config_key: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  placeholder="Ex: API_KEY"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config_value">Valor</Label>
                <Input
                  id="config_value"
                  type={configForm.is_secret ? 'password' : 'text'}
                  value={configForm.config_value}
                  onChange={(e) => setConfigForm({ ...configForm, config_value: e.target.value })}
                  placeholder="Valor da configuração"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_secret"
                  checked={configForm.is_secret}
                  onCheckedChange={(checked) => setConfigForm({ ...configForm, is_secret: checked })}
                />
                <Label htmlFor="is_secret">Valor sensível (será ocultado)</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={configForm.description}
                  onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                  placeholder="Descrição opcional"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseConfigDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createConfigMutation.isPending || updateConfigMutation.isPending}>
                  {(createConfigMutation.isPending || updateConfigMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingConfig ? 'Salvar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Webhook Dialog */}
        <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? 'Editar Webhook' : 'Novo Webhook'}
              </DialogTitle>
              <DialogDescription>
                Configure um endpoint para receber eventos
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmitWebhook} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook_name">Nome *</Label>
                <Input
                  id="webhook_name"
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                  placeholder="Ex: Notificação de novo pedido"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook_url">URL *</Label>
                <Input
                  id="webhook_url"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                  placeholder="https://api.exemplo.com/webhook"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook_method">Método HTTP</Label>
                <Select
                  value={webhookForm.method}
                  onValueChange={(v) => setWebhookForm({ ...webhookForm, method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook_headers">Headers (JSON)</Label>
                <Textarea
                  id="webhook_headers"
                  value={webhookForm.headers}
                  onChange={(e) => setWebhookForm({ ...webhookForm, headers: e.target.value })}
                  placeholder='{"Authorization": "Bearer token"}'
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="webhook_active"
                  checked={webhookForm.is_active}
                  onCheckedChange={(checked) => setWebhookForm({ ...webhookForm, is_active: checked })}
                />
                <Label htmlFor="webhook_active">Webhook ativo</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseWebhookDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createWebhookMutation.isPending || updateWebhookMutation.isPending}>
                  {(createWebhookMutation.isPending || updateWebhookMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingWebhook ? 'Salvar' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir {deleteTarget?.type === 'config' ? 'esta configuração' : 'este webhook'}? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {(deleteConfigMutation.isPending || deleteWebhookMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </HubLayout>
  );
}