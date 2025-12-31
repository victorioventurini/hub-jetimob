import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import type { OkrStatus } from '../types';

interface EditTeamObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: {
    id: string;
    title: string;
    description?: string | null;
    team_id: string;
    status: OkrStatus;
  };
}

export function EditTeamObjectiveDialog({
  open,
  onOpenChange,
  objective,
}: EditTeamObjectiveDialogProps) {
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description || '');
  const [status, setStatus] = useState<OkrStatus>(objective.status);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setTitle(objective.title);
      setDescription(objective.description || '');
      setStatus(objective.status);
    }
  }, [open, objective]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('okr_team_objectives')
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
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives'] });
      toast({
        title: 'Objetivo atualizado',
        description: 'O objetivo do time foi atualizado com sucesso.',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Objetivo do Time</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Melhorar retenção de clientes"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !title.trim()}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
