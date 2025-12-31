import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Loader2 } from 'lucide-react';

interface CreateTeamObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Array<{ id: string; name: string }>;
  orgObjectives: Array<{ id: string; title: string }>;
}

export function CreateTeamObjectiveDialog({
  open,
  onOpenChange,
  teams,
  orgObjectives,
}: CreateTeamObjectiveDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState('');
  const [orgObjectiveId, setOrgObjectiveId] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('okr_team_objectives')
        .insert({
          title,
          description: description || null,
          team_id: teamId,
          org_objective_id: orgObjectiveId,
          status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives'] });
      toast.success('Objetivo de time criado com sucesso!');
      handleClose();
    },
    onError: (error: Error) => {
      console.error('Error creating objective:', error);
      if (error.message.includes('more than 3')) {
        toast.error('Este time já possui 3 objetivos ativos. Remova ou conclua um antes de criar outro.');
      } else {
        toast.error('Erro ao criar objetivo. Tente novamente.');
      }
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setTeamId('');
    setOrgObjectiveId('');
    setStatus('draft');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }
    if (!teamId) {
      toast.error('Selecione um time');
      return;
    }
    if (!orgObjectiveId) {
      toast.error('Selecione um objetivo organizacional');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Objetivo de Time</DialogTitle>
          <DialogDescription>
            Crie um objetivo vinculado a um OKR organizacional. Cada time pode ter no máximo 3 objetivos ativos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team">Time *</Label>
              <Select
                value={teamId}
                onValueChange={setTeamId}
                disabled={createMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um time" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-objective">Objetivo Organizacional *</Label>
              <Select
                value={orgObjectiveId}
                onValueChange={setOrgObjectiveId}
                disabled={createMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vincule a um objetivo organizacional" />
                </SelectTrigger>
                <SelectContent>
                  {orgObjectives.map((obj) => (
                    <SelectItem key={obj.id} value={obj.id}>
                      {obj.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Melhorar o NPS do time de suporte"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo e seu contexto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createMutation.isPending}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status inicial</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as 'draft' | 'active')}
                disabled={createMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Criar Objetivo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
