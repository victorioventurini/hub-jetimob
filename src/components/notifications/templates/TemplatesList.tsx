/**
 * Templates List Component
 * Phase 5: Lista de templates de notificação por BU
 */

import { useState } from 'react';
import { useNotificationTemplates, NotificationTemplate } from '@/hooks/useNotificationTemplates';
import { useBu } from '@/contexts/BuContext';
import { useUrlState } from '@/shared/url/useUrlState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { UrlSelect } from '@/shared/filters/UrlSelect';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Bell, 
  Mail, 
  Slack, 
  Globe, 
  Search,
  Edit,
  History,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TemplateEditorSheet } from './TemplateEditorSheet';
import { TemplateHistorySheet } from './TemplateHistorySheet';

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  slack: Slack,
  webhook: Globe,
};

const channelLabels: Record<string, string> = {
  in_app: 'In-App',
  email: 'Email',
  slack: 'Slack',
  webhook: 'Webhook',
};

// Group templates by module
function getModuleFromEvent(eventSlug: string): string {
  const parts = eventSlug.split('.');
  if (parts.length > 0) {
    const module = parts[0];
    return module === 'notifications' ? 'core' : module;
  }
  return 'core';
}

const moduleLabels: Record<string, string> = {
  core: 'Geral',
  tickets: 'Tickets',
  assets: 'Ativos',
  okrs: 'OKRs',
  kpis: 'KPIs',
  teams: 'Times',
};

export function TemplatesList() {
  const { currentBu } = useBu();
  
  // URL State
  const searchState = useUrlState<string>({ key: 'tq', defaultValue: '' });
  const channelState = useUrlState<string>({ key: 'tchannel', defaultValue: 'all' });
  
  // Local state
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [historyTemplate, setHistoryTemplate] = useState<NotificationTemplate | null>(null);
  
  // Query
  const { data: templates = [], isLoading } = useNotificationTemplates(
    currentBu?.id,
    { 
      channel: channelState.value !== 'all' ? channelState.value : undefined,
      q: searchState.value || undefined,
    }
  );
  
  // Group by module
  const templatesByModule = templates.reduce((acc, template) => {
    const module = getModuleFromEvent(template.event_slug);
    if (!acc[module]) acc[module] = [];
    acc[module].push(template);
    return acc;
  }, {} as Record<string, NotificationTemplate[]>);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Templates de Notificação</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates de Notificação
          </CardTitle>
          <CardDescription>
            Gerencie os templates de conteúdo das notificações. 
            Templates com BU específica sobrescrevem os globais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por evento ou conteúdo..."
                value={searchState.value}
                onChange={(e) => searchState.set(e.target.value)}
                className="pl-9"
              />
            </div>
            <UrlSelect
              value={channelState.value}
              onChange={channelState.set}
              options={[
                { value: 'email', label: 'Email' },
                { value: 'in_app', label: 'In-App' },
                { value: 'slack', label: 'Slack' },
                { value: 'webhook', label: 'Webhook' },
              ]}
              includeAllOption
              allOptionLabel="Todos os canais"
              triggerClassName="w-[180px]"
            />
          </div>
          
          {/* Templates by Module */}
          {Object.keys(templatesByModule).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum template encontrado</p>
              <p className="text-sm">Templates são criados automaticamente para cada evento.</p>
            </div>
          ) : (
            Object.entries(templatesByModule).map(([module, moduleTemplates]) => (
              <div key={module} className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  {moduleLabels[module] || module}
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead className="w-24">Canal</TableHead>
                      <TableHead className="w-20">Versão</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead className="w-32">Atualizado</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moduleTemplates.map((template) => {
                      const ChannelIcon = channelIcons[template.channel] || Globe;
                      const isGlobal = !template.bu_id;
                      
                      return (
                        <TableRow key={template.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono text-sm">
                                {template.event_slug}
                              </span>
                              {template.subject_template && (
                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                  {template.subject_template}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {channelLabels[template.channel] || template.channel}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              v{template.version}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {template.is_active ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-600">Ativo</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm text-yellow-600">Inativo</span>
                                </>
                              )}
                              {isGlobal && (
                                <Badge variant="secondary" className="ml-1 text-xs">
                                  Global
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(template.updated_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingTemplate(template)}
                                title="Editar template"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setHistoryTemplate(template)}
                                title="Ver histórico"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      
      {/* Editor Sheet */}
      <TemplateEditorSheet
        template={editingTemplate}
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
      />
      
      {/* History Sheet */}
      <TemplateHistorySheet
        template={historyTemplate}
        open={!!historyTemplate}
        onOpenChange={(open) => !open && setHistoryTemplate(null)}
      />
    </>
  );
}
