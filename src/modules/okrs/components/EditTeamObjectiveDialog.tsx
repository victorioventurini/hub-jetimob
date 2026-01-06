import { useState, useCallback, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Loader2, Users, Ban } from 'lucide-react';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { useObjectiveContributors, useManageContributors } from '../hooks/useSharedOkrData';
import { MultiTeamSelect, SimpleSelect } from '@/components/selects';
import { useHierarchicalTeamList } from '@/modules/teams/hooks/useTeams';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useCancelTeamObjective } from '../hooks/useOkrMutations';
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
    is_shared?: boolean;
    responsibility_model?: string | null;
  };
}

const RESPONSIBILITY_MODEL_OPTIONS = [
  { value: 'collaborative', label: 'Colaborativo (todos co-responsáveis)' },
  { value: 'primary_led', label: 'Líder primário + contribuidores' },
];

export function EditTeamObjectiveDialog({
  open,
  onOpenChange,
  objective,
}: EditTeamObjectiveDialogProps) {
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description || '');
  const [status, setStatus] = useState<OkrStatus>(objective.status);
  const [isShared, setIsShared] = useState(objective.is_shared || false);
  const [responsibilityModel, setResponsibilityModel] = useState<'collaborative' | 'primary_led'>(
    (objective.responsibility_model as 'collaborative' | 'primary_led') || 'collaborative'
  );
  const [contributingTeamIds, setContributingTeamIds] = useState<string[]>([]);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { teams } = useHierarchicalTeamList();
  const { data: existingContributors } = useObjectiveContributors(objective.id);
  const manageContributors = useManageContributors();
  const cancelMutation = useCancelTeamObjective();

  useEffect(() => {
    if (existingContributors) {
      setContributingTeamIds(existingContributors.map(c => c.team_id));
    }
  }, [existingContributors]);

  useDialogFormReset(open, useCallback(() => {
    setTitle(objective.title);
    setDescription(objective.description || '');
    setStatus(objective.status);
    setIsShared(objective.is_shared || false);
    setResponsibilityModel(
      (objective.responsibility_model as 'collaborative' | 'primary_led') || 'collaborative'
    );
  }, [objective.title, objective.description, objective.status, objective.is_shared, objective.responsibility_model]));

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('okr_team_objectives')
        .update({
          title,
          description: description || null,
          status,
          is_shared: isShared,
          responsibility_model: isShared ? responsibilityModel : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', objective.id);

      if (error) throw error;

      if (isShared) {
        await manageContributors.mutateAsync({
          objectiveId: objective.id,
          teamIds: contributingTeamIds,
        });
      } else {
        await manageContributors.mutateAsync({
          objectiveId: objective.id,
          teamIds: [],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives-with-shared'] });
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
    if (isShared && contributingTeamIds.length === 0) {
      toast({
        title: 'Times contribuidores obrigatórios',
        description: 'Selecione pelo menos um time contribuidor para OKRs compartilhadas.',
        variant: 'destructive',
      });
      return;
    }
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

  const primaryTeamName = teams.find(t => t.id === objective.team_id)?.name;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
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

            <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <Label htmlFor="is-shared" className="text-sm font-medium cursor-pointer">
                    OKR Compartilhada
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envolve múltiplos times trabalhando juntos
                  </p>
                </div>
              </div>
              <Switch
                id="is-shared"
                checked={isShared}
                onCheckedChange={setIsShared}
                disabled={updateMutation.isPending}
              />
            </div>

            {isShared && (
              <div className="space-y-4 p-4 rounded-lg border border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30">
                <Alert className="border-purple-200 bg-purple-100/50 dark:border-purple-800 dark:bg-purple-900/30">
                  <Users className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-800 dark:text-purple-200">
                    Time primário: <strong>{primaryTeamName || 'Não definido'}</strong>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Times Contribuidores *</Label>
                  <MultiTeamSelect
                    value={contributingTeamIds}
                    onValueChange={setContributingTeamIds}
                    excludeTeamIds={[objective.team_id]}
                    teams={teams}
                    placeholder="Selecione os times contribuidores"
                    disabled={updateMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Modelo de Responsabilidade</Label>
                  <SimpleSelect
                    value={responsibilityModel}
                    onValueChange={(v) => setResponsibilityModel(v as 'collaborative' | 'primary_led')}
                    options={RESPONSIBILITY_MODEL_OPTIONS}
                    disabled={updateMutation.isPending}
                    triggerClassName="w-full"
                  />
                </div>
              </div>
            )}

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
        title="Cancelar Objetivo do Time"
        description="Tem certeza que deseja cancelar este objetivo? O histórico e check-ins serão preservados, mas o objetivo ficará com status 'Cancelado'."
        isLoading={cancelMutation.isPending}
      />
    </>
  );
}
