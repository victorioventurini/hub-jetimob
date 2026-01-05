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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { VicActionButton } from '@/modules/vic';
import { TeamSelect, SimpleSelect } from '@/components/selects';
import { FlatTeamItem } from '@/modules/teams/hooks/useTeams';

interface CreateTeamObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Array<{ id: string; name: string; parent_team_id?: string | null }>;
  orgObjectives: Array<{ id: string; title: string }>;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativo' },
];

export function CreateTeamObjectiveDialog({
  open,
  onOpenChange,
  teams,
  orgObjectives,
}: CreateTeamObjectiveDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState<string | undefined>(undefined);
  const [orgObjectiveId, setOrgObjectiveId] = useState('');
  const [status, setStatus] = useState<'draft' | 'active'>('draft');

  // Convert teams to hierarchical format
  const buildHierarchicalTeams = (): FlatTeamItem[] => {
    const parentTeams = teams.filter(t => !t.parent_team_id);
    const childTeamsMap = new Map<string, typeof teams>();
    
    teams.forEach(team => {
      if (team.parent_team_id) {
        const children = childTeamsMap.get(team.parent_team_id) || [];
        children.push(team);
        childTeamsMap.set(team.parent_team_id, children);
      }
    });

    const result: FlatTeamItem[] = [];
    
    parentTeams.forEach(parent => {
      result.push({ id: parent.id, name: parent.name, level: 0, parentId: null });
      const children = childTeamsMap.get(parent.id) || [];
      children.forEach(child => {
        result.push({ id: child.id, name: child.name, level: 1, parentId: parent.id });
      });
    });

    return result;
  };

  const hierarchicalTeams = buildHierarchicalTeams();

  const orgObjectiveOptions = orgObjectives.map(obj => ({
    value: obj.id,
    label: obj.title,
  }));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("Time não selecionado");
      
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
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives-with-krs'] });
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
    setTeamId(undefined);
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
              <TeamSelect
                value={teamId}
                onValueChange={setTeamId}
                teams={hierarchicalTeams}
                placeholder="Selecione um time"
                disabled={createMutation.isPending}
                triggerClassName="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-objective">Objetivo Organizacional *</Label>
              <SimpleSelect
                value={orgObjectiveId}
                onValueChange={setOrgObjectiveId}
                options={orgObjectiveOptions}
                placeholder="Vincule a um objetivo organizacional"
                disabled={createMutation.isPending}
                triggerClassName="w-full"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Título *</Label>
                {title.trim() && (
                  <VicActionButton
                    agentSlug="coach-okrs"
                    actionContext="okr-create-objective"
                    context={{
                      type: "Objetivo de Time",
                      title,
                      description: description || undefined,
                    }}
                    label="Melhorar objetivo"
                    compact
                    onApply={(response) => {
                      // Try to extract improved title from response
                      const lines = response.split('\n').filter(l => l.trim());
                      if (lines[0]) {
                        setTitle(lines[0].replace(/^[-*•]\s*/, '').trim());
                      }
                    }}
                  />
                )}
              </div>
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
              <SimpleSelect
                value={status}
                onValueChange={(v) => setStatus(v as 'draft' | 'active')}
                options={STATUS_OPTIONS}
                disabled={createMutation.isPending}
                triggerClassName="w-full"
              />
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
