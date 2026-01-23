import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { useIdentity } from '@/hooks/useIdentity';
import { useBu } from '@/contexts/BuContext';
import { queryKeys } from '@/lib/queryKeys';
import { useCanManageOrgOkr, useCancelOrgObjective } from '@/modules/okrs/hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Ban } from 'lucide-react';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import type { OkrStatus } from '../types';

interface OrgObjectiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Objective to edit. If null/undefined, dialog is in create mode */
  objective?: {
    id: string;
    title: string;
    description?: string | null;
    year: number;
    status: OkrStatus;
  } | null;
  /** Year for new objectives (required for create mode) */
  year?: number;
}

export function OrgObjectiveFormDialog({
  open,
  onOpenChange,
  objective,
  year: defaultYear,
}: OrgObjectiveFormDialogProps) {
  const isEditing = !!objective;
  const year = objective?.year ?? defaultYear ?? new Date().getFullYear();
  
  // Defense in depth: check if user can manage org OKRs
  const { canManage: canManageOrgOkr, isLoading: isLoadingPermission } = useCanManageOrgOkr();
  
  // Don't render if user doesn't have permission
  if (!isLoadingPermission && !canManageOrgOkr) {
    return null;
  }
  
  const queryClient = useQueryClient();
  const { client: supabase, buId } = useOptionalBuClient();
  const { profileId } = useIdentity();
  const { currentBuId } = useBu();
  const { toast: hookToast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<OkrStatus>('draft');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const cancelMutation = useCancelOrgObjective();

  // Reset form when dialog opens
  useDialogFormReset(open, useCallback(() => {
    if (objective) {
      setTitle(objective.title);
      setDescription(objective.description || '');
      setStatus(objective.status);
    } else {
      setTitle('');
      setDescription('');
      setStatus('draft');
    }
  }, [objective]));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!supabase || !buId) throw new Error('Nenhuma BU selecionada');
      if (!profileId) throw new Error('Perfil não encontrado');
      if (!currentBuId) throw new Error('Nenhuma BU selecionada');
      
      const { data, error } = await supabase
        .from('okr_org_objectives')
        .insert({
          title,
          description: description || null,
          year,
          status,
          owner_user_id: profileId,
          bu_id: currentBuId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Use prefix helpers for broad invalidation with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      toast.success('Objetivo organizacional criado com sucesso!');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error('Error creating objective:', error);
      if (error.message?.includes('row-level security')) {
        toast.error('Apenas administradores podem criar objetivos organizacionais.');
      } else {
        toast.error('Erro ao criar objetivo. Tente novamente.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!supabase || !buId || !objective) throw new Error('Nenhuma BU selecionada');

      const { error } = await supabase
        .from('okr_org_objectives')
        .update({
          title,
          description: description || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', objective.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Use prefix helpers for broad invalidation with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      hookToast({
        title: 'Objetivo atualizado',
        description: 'O objetivo organizacional foi atualizado com sucesso.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating objective:', error);
      hookToast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o objetivo.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }
    
    if (!isEditing) {
      const currentYear = new Date().getFullYear();
      if (year < currentYear) {
        toast.error('Não é permitido criar OKRs para anos anteriores.');
        return;
      }
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const handleCancelOkr = () => {
    if (!objective) return;
    cancelMutation.mutate(objective.id, {
      onSuccess: () => {
        setShowCancelConfirm(false);
        onOpenChange(false);
      },
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Objetivo Organizacional' : 'Novo Objetivo Organizacional'}
            </DialogTitle>
            {!isEditing && (
              <DialogDescription>
                Defina um objetivo estratégico para a organização em {year}.
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Aumentar a satisfação dos clientes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o objetivo e seu contexto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status {isEditing ? '' : 'inicial'}</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as OkrStatus)}
                  disabled={isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    {isEditing && (
                      <>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className={isEditing ? "flex-col-reverse sm:flex-row sm:justify-between gap-2" : ""}>
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Cancelar OKR
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isPending} disabled={!title.trim()}>
                  {isEditing ? 'Salvar' : 'Criar Objetivo'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEditing && (
        <DeleteConfirmDialog
          open={showCancelConfirm}
          onOpenChange={setShowCancelConfirm}
          onConfirm={handleCancelOkr}
          title="Cancelar Objetivo Organizacional"
          description="Tem certeza que deseja cancelar este objetivo? O histórico e check-ins serão preservados, mas o objetivo ficará com status 'Cancelado'."
          isLoading={cancelMutation.isPending}
        />
      )}
    </>
  );
}
