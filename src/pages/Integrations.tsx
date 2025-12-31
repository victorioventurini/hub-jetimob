import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HubLayout } from '@/components/layout/HubLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Plug, 
  Plus, 
  Pencil, 
  MessageSquare, 
  Mail, 
  MapPin, 
  Bot, 
  Zap, 
  Database,
  Cloud,
  Loader2,
  ExternalLink,
  Check,
  X,
  Settings,
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  slug: string;
  status: boolean;
  scope: string | null;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// Predefined integrations with icons and descriptions
const integrationTemplates = [
  { 
    slug: 'chatgpt', 
    name: 'ChatGPT / OpenAI', 
    icon: Bot, 
    description: 'Integração com modelos de IA para chat e automações',
    color: 'bg-emerald-500'
  },
  { 
    slug: 'sendgrid', 
    name: 'SendGrid', 
    icon: Mail, 
    description: 'Envio de e-mails transacionais e marketing',
    color: 'bg-blue-500'
  },
  { 
    slug: 'google-maps', 
    name: 'Google Maps', 
    icon: MapPin, 
    description: 'Mapas, geocodificação e rotas',
    color: 'bg-red-500'
  },
  { 
    slug: 'slack', 
    name: 'Slack', 
    icon: MessageSquare, 
    description: 'Notificações e comunicação em tempo real',
    color: 'bg-purple-500'
  },
  { 
    slug: 'zapier', 
    name: 'Zapier', 
    icon: Zap, 
    description: 'Automações e integrações com milhares de apps',
    color: 'bg-orange-500'
  },
  { 
    slug: 'supabase', 
    name: 'Supabase', 
    icon: Database, 
    description: 'Backend, banco de dados e autenticação',
    color: 'bg-green-600'
  },
  { 
    slug: 'aws', 
    name: 'AWS', 
    icon: Cloud, 
    description: 'Serviços de cloud computing',
    color: 'bg-yellow-500'
  },
];

const getIntegrationTemplate = (slug: string) => {
  return integrationTemplates.find(t => t.slug === slug) || {
    slug,
    name: slug,
    icon: Plug,
    description: 'Integração personalizada',
    color: 'bg-gray-500'
  };
};

export default function Integrations() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    scope: '',
  });

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Integration[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; scope: string }) => {
      const { error } = await supabase
        .from('integrations')
        .insert({
          name: data.name,
          slug: data.slug,
          scope: data.scope || null,
          status: false,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integração criada com sucesso!');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error creating integration:', error);
      toast.error('Erro ao criar integração.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; slug?: string; scope?: string; status?: boolean }) => {
      const { error } = await supabase
        .from('integrations')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integração atualizada!');
      handleCloseDialog();
    },
    onError: (error) => {
      console.error('Error updating integration:', error);
      toast.error('Erro ao atualizar integração.');
    },
  });

  const handleOpenCreate = () => {
    setEditingIntegration(null);
    setFormData({ name: '', slug: '', scope: '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      slug: integration.slug,
      scope: integration.scope || '',
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingIntegration(null);
    setFormData({ name: '', slug: '', scope: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Nome e slug são obrigatórios.');
      return;
    }

    if (editingIntegration) {
      updateMutation.mutate({
        id: editingIntegration.id,
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        scope: formData.scope.trim() || null,
      });
    } else {
      createMutation.mutate({
        name: formData.name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        scope: formData.scope.trim(),
      });
    }
  };

  const handleToggleStatus = (integration: Integration) => {
    updateMutation.mutate({
      id: integration.id,
      status: !integration.status,
    });
  };

  const handleTemplateSelect = (slug: string) => {
    const template = getIntegrationTemplate(slug);
    setFormData({
      ...formData,
      name: template.name,
      slug: template.slug,
    });
  };

  if (isLoading) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </HubLayout>
    );
  }

  return (
    <HubLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Integrações</h1>
            <p className="text-muted-foreground">
              Gerencie as integrações do Hub com serviços externos
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Integração
            </Button>
          )}
        </div>

        {/* Integrations Grid */}
        {integrations && integrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => {
              const template = getIntegrationTemplate(integration.slug);
              const Icon = template.icon;

              return (
                <Card key={integration.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${template.color}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <code className="text-xs text-muted-foreground">{integration.slug}</code>
                        </div>
                      </div>
                      <Badge variant={integration.status ? 'default' : 'secondary'}>
                        {integration.status ? (
                          <><Check className="w-3 h-3 mr-1" /> Ativa</>
                        ) : (
                          <><X className="w-3 h-3 mr-1" /> Inativa</>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                    
                    {integration.scope && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Escopo:</span> {integration.scope}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/integrations/${integration.id}`)}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Configurar
                      </Button>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={integration.status}
                            onCheckedChange={() => handleToggleStatus(integration)}
                            disabled={updateMutation.isPending}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(integration)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plug className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma integração configurada</h3>
              <p className="text-muted-foreground text-center mb-4">
                Adicione integrações para conectar o Hub com serviços externos.
              </p>
              {isAdmin && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Integração
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Available Templates (when no integrations) */}
        {(!integrations || integrations.length === 0) && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Integrações Disponíveis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {integrationTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <Card 
                    key={template.slug} 
                    className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                    onClick={() => {
                      if (isAdmin) {
                        handleTemplateSelect(template.slug);
                        setIsDialogOpen(true);
                      }
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${template.color}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold">{template.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingIntegration ? 'Editar Integração' : 'Nova Integração'}
              </DialogTitle>
              <DialogDescription>
                {editingIntegration 
                  ? 'Atualize as informações da integração.' 
                  : 'Configure uma nova integração para o Hub.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingIntegration && (
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select
                    value={formData.slug}
                    onValueChange={handleTemplateSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template ou crie personalizado" />
                    </SelectTrigger>
                    <SelectContent>
                      {integrationTemplates.map((template) => (
                        <SelectItem key={template.slug} value={template.slug}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: ChatGPT / OpenAI"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="Ex: chatgpt"
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único da integração (letras minúsculas e hífens)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope">Escopo</Label>
                <Input
                  id="scope"
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  placeholder="Ex: read, write, admin"
                />
                <p className="text-xs text-muted-foreground">
                  Permissões ou escopo da integração (opcional)
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingIntegration ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </HubLayout>
  );
}
