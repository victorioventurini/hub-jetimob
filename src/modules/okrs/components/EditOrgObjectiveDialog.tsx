import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { Loader2, Ban } from 'lucide-react';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useCancelOrgObjective } from '../hooks/useOkrMutations';
import type { OkrStatus } from '../types';

interface EditOrgObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: {
    id: string;
    title: string;
    description?: string | null;
    year: number;
    status: OkrStatus;
  };
}

export function EditOrgObjectiveDialog({
  open,
  onOpenChange,
  objective,
}: EditOrgObjectiveDialogProps) {
  const { client: supabase, buId } = useOptionalBuClient();
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description || '');
  const [status, setStatus] = useState<OkrStatus>(objective.status);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cancelMutation = useCancelOrgObjective();

  useDialogFormReset(open, useCallback(() => {
    setTitle(objective.title);
    setDescription(objective.description || '');
    setStatus(objective.status);
  }, [objective.title, objective.description, objective.status]));

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!supabase || !buId) throw new Error('Nenhuma BU selecionada');

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
      queryClient.invalidateQueries({ queryKey: ['okr-org-objectives'] });
      toast({
        title: 'Objetivo atualizado',
        description: 'O objetivo organizacional foi atualizado com sucesso.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating objective:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o objetivo.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateMutation.mutate();
  };

  const handleCancel = () => {
    cancelMutation.mutate(objective.id, {
      onSuccess: () => {
        setShowCancelConfirm(false);
        onOpenChange(false);
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Objetivo Organizacional</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Aumentar receita recorrente"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OkrStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowCancelConfirm(true)}
              >
                <Ban className="w-4 h-4 mr-2" />
                Cancelar OKR
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending || !title.trim()}>
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        onConfirm={handleCancel}
        title="Cancelar Objetivo Organizacional"
        description="Tem certeza que deseja cancelar este objetivo? O histórico e check-ins serão preservados, mas o objetivo ficará com status 'Cancelado'."
        isLoading={cancelMutation.isPending}
      />
    </>
  );
}
