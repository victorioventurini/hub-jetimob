import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
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
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Ban } from 'lucide-react';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { VicActionButton } from '@/modules/vic';
import { TeamSelect, SimpleSelect, MultiTeamSelect, CycleSelect } from '@/components/selects';
import { FlatTeamItem, useHierarchicalTeamList } from '@/modules/teams/hooks/useTeams';
import { useObjectiveContributors, useManageContributors } from '../hooks/useSharedOkrData';
import { useCycles } from '../hooks/useCycleData';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useCancelTeamObjective } from '../hooks/useOkrMutations';
import type { OkrStatus } from '../types';

interface TeamObjectiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Objective to edit. If null/undefined, dialog is in create mode */
  objective?: {
    id: string;
    title: string;
    description?: string | null;
    team_id: string;
    status: OkrStatus;
    is_shared?: boolean;
    responsibility_model?: string | null;
  } | null;
  /** Available teams for selection (required for create mode) */
  teams?: Array<{ id: string; name: string; parent_team_id?: string | null }>;
  /** Available org objectives for linking (required for create mode) */
  orgObjectives?: Array<{ id: string; title: string }>;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'active', label: 'Ativo' },
];

const RESPONSIBILITY_MODEL_OPTIONS = [
  { value: 'collaborative', label: 'Colaborativo (todos co-responsáveis)' },
  { value: 'primary_led', label: 'Líder primário + contribuidores' },
];

export function TeamObjectiveFormDialog({
  open,
  onOpenChange,
  objective,
  teams: propsTeams,
  orgObjectives,
}: TeamObjectiveFormDialogProps) {
  const isEditing = !!objective;
  
  const queryClient = useQueryClient();
  const { client: supabase, buId } = useOptionalBuClient();
  const { toast: hookToast } = useToast();
  const { teams: hookTeams } = useHierarchicalTeamList();
  const manageContributors = useManageContributors();
  const cancelMutation = useCancelTeamObjective();
  
  // Use hook teams for editing, props teams for creating
  const teams = isEditing ? hookTeams : (propsTeams || []);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState<string | undefined>(undefined);
  const [orgObjectiveId, setOrgObjectiveId] = useState('');
  const [cycleId, setCycleId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<OkrStatus>('draft');
  const [isShared, setIsShared] = useState(false);
  const [contributingTeamIds, setContributingTeamIds] = useState<string[]>([]);
  const [responsibilityModel, setResponsibilityModel] = useState<'collaborative' | 'primary_led'>('collaborative');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: cycles = [] } = useCycles();
  const { data: existingContributors } = useObjectiveContributors(objective?.id || '');

  // Load existing contributors for edit mode
  useEffect(() => {
    if (existingContributors) {
      setContributingTeamIds(existingContributors.map(c => c.team_id));
    }
  }, [existingContributors]);

  // Build hierarchical teams for select
  const buildHierarchicalTeams = (): FlatTeamItem[] => {
    const parentTeams = teams.filter(t => !('parent_team_id' in t) || !t.parent_team_id);
    const childTeamsMap = new Map<string, typeof teams>();
    
    teams.forEach(team => {
      if ('parent_team_id' in team && team.parent_team_id) {
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

  const hierarchicalTeams = isEditing ? hookTeams : buildHierarchicalTeams();

  // Reset form when dialog opens
  useDialogFormReset(open, useCallback(() => {
    if (objective) {
      setTitle(objective.title);
      setDescription(objective.description || '');
      setTeamId(objective.team_id);
      setStatus(objective.status);
      setIsShared(objective.is_shared || false);
      setResponsibilityModel(
        (objective.responsibility_model as 'collaborative' | 'primary_led') || 'collaborative'
      );
    } else {
      setTitle('');
      setDescription('');
      setTeamId(undefined);
      setOrgObjectiveId('');
      setCycleId(undefined);
      setStatus('draft');
      setIsShared(false);
      setContributingTeamIds([]);
      setResponsibilityModel('collaborative');
    }
  }, [objective]));

  const orgObjectiveOptions = orgObjectives?.map(obj => ({
    value: obj.id,
    label: obj.title,
  })) || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!supabase || !buId) throw new Error('Nenhuma BU selecionada');
      if (!teamId) throw new Error("Time não selecionado");
      if (!cycleId) throw new Error("Ciclo não selecionado");
      
      const { data: createdObjective, error } = await supabase
        .from('okr_team_objectives')
        .insert({
          title,
          description: description || null,
          team_id: teamId,
          org_objective_id: orgObjectiveId,
          cycle_id: cycleId,
          status,
          is_shared: isShared,
          responsibility_model: isShared ? responsibilityModel : null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (isShared && contributingTeamIds.length > 0) {
        const contributors = contributingTeamIds.map(contribTeamId => ({
          objective_id: createdObjective.id,
          team_id: contribTeamId,
        }));

        const { error: contribError } = await supabase
          .from('okr_team_objective_contributors')
          .insert(contributors);

        if (contribError) {
          console.error('Error creating contributors:', contribError);
        }
      }

      return createdObjective;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectives(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesWithKrs(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesWithShared(null) });
      toast.success('Objetivo de time criado com sucesso!');
      onOpenChange(false);
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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!supabase || !buId || !objective) throw new Error('Nenhuma BU selecionada');

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
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectives(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesWithShared(null) });
      hookToast({
        title: 'Objetivo atualizado',
        description: 'O objetivo do time foi atualizado com sucesso.',
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
      if (!teamId) {
        toast.error('Selecione um time primário');
        return;
      }
      if (!orgObjectiveId) {
        toast.error('Selecione um objetivo organizacional');
        return;
      }
      if (!cycleId) {
        toast.error('Selecione um ciclo');
        return;
      }
    }
    
    if (isShared && contributingTeamIds.length === 0) {
      toast.error('Selecione pelo menos um time contribuidor');
      return;
    }
    
    if (isEditing) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
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
  const selectedPrimaryTeamName = teams.find(t => t.id === (isEditing ? objective?.team_id : teamId))?.name;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Objetivo do Time' : 'Novo Objetivo de Time'}
            </DialogTitle>
            {!isEditing && (
              <DialogDescription>
                Crie um objetivo vinculado a um OKR organizacional. O prazo será definido pelo ciclo selecionado.
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Team selection - only for create mode */}
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="team">Time Primário *</Label>
                  <TeamSelect
                    value={teamId}
                    onValueChange={(value) => {
                      setTeamId(value);
                      if (value) {
                        setContributingTeamIds(prev => prev.filter(id => id !== value));
                      }
                    }}
                    teams={hierarchicalTeams}
                    placeholder="Selecione o time responsável"
                    disabled={isPending}
                    triggerClassName="w-full"
                  />
                </div>
              )}

              {/* Org objective selection - only for create mode */}
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="org-objective">Objetivo Organizacional *</Label>
                  <SimpleSelect
                    value={orgObjectiveId}
                    onValueChange={setOrgObjectiveId}
                    options={orgObjectiveOptions}
                    placeholder="Vincule a um objetivo organizacional"
                    disabled={isPending}
                    triggerClassName="w-full"
                  />
                </div>
              )}

              {/* Cycle selection - only for create mode */}
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="cycle">Ciclo *</Label>
                  <CycleSelect
                    value={cycleId}
                    onValueChange={setCycleId}
                    cycles={cycles}
                    placeholder="Selecione o ciclo do objetivo"
                    disabled={isPending}
                    required
                    showPeriodPreview
                  />
                </div>
              )}

              {/* Shared OKR Toggle */}
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
                  disabled={isPending}
                />
              </div>

              {/* Shared OKR Fields */}
              {isShared && (
                <div className="space-y-4 p-4 rounded-lg border border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/30">
                  <Alert className="border-purple-200 bg-purple-100/50 dark:border-purple-800 dark:bg-purple-900/30">
                    <Users className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-800 dark:text-purple-200">
                      {selectedPrimaryTeamName 
                        ? `${selectedPrimaryTeamName} será o time primário responsável.`
                        : 'Selecione o time primário acima.'}
                      {' '}Adicione os times que irão contribuir para esta OKR.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Times Contribuidores *</Label>
                    <MultiTeamSelect
                      value={contributingTeamIds}
                      onValueChange={setContributingTeamIds}
                      excludeTeamIds={isEditing && objective ? [objective.team_id] : (teamId ? [teamId] : [])}
                      teams={hierarchicalTeams}
                      placeholder="Selecione os times contribuidores"
                      disabled={isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo de Responsabilidade</Label>
                    <SimpleSelect
                      value={responsibilityModel}
                      onValueChange={(v) => setResponsibilityModel(v as 'collaborative' | 'primary_led')}
                      options={RESPONSIBILITY_MODEL_OPTIONS}
                      disabled={isPending}
                      triggerClassName="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      {responsibilityModel === 'collaborative' 
                        ? 'Todos os times são igualmente responsáveis pelo sucesso da OKR.'
                        : 'O time primário lidera, os outros contribuem com suas entregas.'}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Título *</Label>
                  {!isEditing && title.trim() && (
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
                {isEditing ? (
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
                ) : (
                  <SimpleSelect
                    value={status}
                    onValueChange={(v) => setStatus(v as OkrStatus)}
                    options={STATUS_OPTIONS}
                    disabled={isPending}
                    triggerClassName="w-full"
                  />
                )}
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
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
          title="Cancelar Objetivo do Time"
          description="Tem certeza que deseja cancelar este objetivo? O histórico e check-ins serão preservados, mas o objetivo ficará com status 'Cancelado'."
          isLoading={cancelMutation.isPending}
        />
      )}
    </>
  );
}
