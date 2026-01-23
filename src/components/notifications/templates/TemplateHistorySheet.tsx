/**
 * Template History Sheet
 * Phase 5: Histórico de versões com rollback
 */

import { useState } from 'react';
import { 
  NotificationTemplate, 
  TemplateVersion,
  useNotificationTemplateVersions,
  useActivateTemplateVersion,
} from '@/hooks/useNotificationTemplates';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  History, 
  RotateCcw,
  CheckCircle,
  Eye,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface TemplateHistorySheetProps {
  template: NotificationTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateHistorySheet({ 
  template, 
  open, 
  onOpenChange 
}: TemplateHistorySheetProps) {
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');
  const [rollbackVersion, setRollbackVersion] = useState<TemplateVersion | null>(null);
  
  // Permissions
  const { has } = usePermissions();
  const canRollback = has('notifications.templates.rollback:bu');
  
  // Queries
  const { data: versions = [], isLoading } = useNotificationTemplateVersions(template?.id);
  const activateVersion = useActivateTemplateVersion();
  
  // Rollback handler
  const handleRollback = async () => {
    if (!template || !rollbackVersion) return;
    
    if (rollbackReason.length < 10) {
      toast.error('Informe um motivo com pelo menos 10 caracteres');
      return;
    }
    
    try {
      await activateVersion.mutateAsync({
        templateId: template.id,
        versionId: rollbackVersion.id,
        reason: rollbackReason,
      });
      toast.success(`Versão v${rollbackVersion.version} ativada com sucesso!`);
      setRollbackDialogOpen(false);
      setRollbackReason('');
      setRollbackVersion(null);
    } catch (error: any) {
      toast.error('Erro ao ativar versão', { description: error.message });
    }
  };
  
  const openRollbackDialog = (version: TemplateVersion) => {
    setRollbackVersion(version);
    setRollbackReason('');
    setRollbackDialogOpen(true);
  };
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Versões
            </SheetTitle>
            <SheetDescription>
              {template?.event_slug} • {template?.channel}
            </SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 flex gap-4 min-h-0 mt-4">
            {/* Versions List */}
            <ScrollArea className="w-48 border rounded-md">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Carregando...
                  </div>
                ) : versions.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhuma versão
                  </div>
                ) : (
                  versions.map((version) => {
                    const isActive = version.id === template?.current_version_id;
                    const isSelected = selectedVersion?.id === version.id;
                    
                    return (
                      <div
                        key={version.id}
                        className={cn(
                          "p-2 rounded cursor-pointer transition-colors",
                          isSelected ? "bg-primary/10" : "hover:bg-muted",
                          isActive && "ring-1 ring-success"
                        )}
                        onClick={() => setSelectedVersion(version)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-medium">v{version.version}</span>
                        {isActive && (
                          <CheckCircle className="h-4 w-4 text-success" />
                        )}
                      </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(version.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            
            {/* Version Detail */}
            <div className="flex-1 flex flex-col min-h-0">
              {selectedVersion ? (
                <Card className="flex-1 flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        Versão {selectedVersion.version}
                        {selectedVersion.id === template?.current_version_id && (
                          <Badge className="bg-success">Ativa</Badge>
                        )}
                      </span>
                      {canRollback && selectedVersion.id !== template?.current_version_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRollbackDialog(selectedVersion)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Ativar esta versão
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(selectedVersion.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    
                    {selectedVersion.subject && (
                      <>
                        <div>
                          <Label className="text-xs text-muted-foreground">Assunto</Label>
                          <div className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                            {selectedVersion.subject}
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}
                    
                    <div>
                      <Label className="text-xs text-muted-foreground">Corpo</Label>
                      <div className="mt-1 p-2 bg-muted rounded text-sm font-mono whitespace-pre-wrap max-h-[300px] overflow-auto">
                        {selectedVersion.body}
                      </div>
                    </div>
                    
                    {selectedVersion.variables_used.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Variáveis utilizadas</Label>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedVersion.variables_used.map((v) => (
                            <Badge key={v} variant="secondary" className="font-mono text-xs">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Selecione uma versão para visualizar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ativar Versão</DialogTitle>
            <DialogDescription>
              Você está prestes a ativar a versão v{rollbackVersion?.version}.
              Esta ação será registrada no log de auditoria.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rollback-reason">
                Motivo (mín. 10 caracteres)
              </Label>
              <Input
                id="rollback-reason"
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="Ex: Revertendo alteração problemática..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRollback}
              disabled={rollbackReason.length < 10 || activateVersion.isPending}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {activateVersion.isPending ? 'Ativando...' : 'Confirmar Ativação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
