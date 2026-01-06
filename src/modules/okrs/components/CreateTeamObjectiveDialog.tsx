import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBu } from '@/contexts/BuContext';
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
import { toast } from 'sonner';
import { Loader2, Users } from 'lucide-react';
import { VicActionButton } from '@/modules/vic';
import { TeamSelect, SimpleSelect, MultiTeamSelect, CycleSelect } from '@/components/selects';
import { FlatTeamItem } from '@/modules/teams/hooks/useTeams';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCycles } from '../hooks/useCycleData';

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

const RESPONSIBILITY_MODEL_OPTIONS = [
  { value: 'collaborative', label: 'Colaborativo (todos co-responsáveis)' },
  { value: 'primary_led', label: 'Líder primário + contribuidores' },
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
  const [cycleId, setCycleId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<'draft' | 'active'>('draft');
  
  // Shared OKR fields
  const [isShared, setIsShared] = useState(false);
  const [contributingTeamIds, setContributingTeamIds] = useState<string[]>([]);
  const [responsibilityModel, setResponsibilityModel] = useState<'collaborative' | 'primary_led'>('collaborative');

  // Fetch cycles
  const { data: cycles = [] } = useCycles();

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
      if (!cycleId) throw new Error("Ciclo não selecionado");
      
      // Create the objective
      const { data: objective, error } = await supabase
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
        })
        .select()
        .single();

      if (error) throw error;

      // If shared, create contributor records
      if (isShared && contributingTeamIds.length > 0) {
        const contributors = contributingTeamIds.map(contribTeamId => ({
          objective_id: objective.id,
          team_id: contribTeamId,
        }));

        const { error: contribError } = await supabase
          .from('okr_team_objective_contributors')
          .insert(contributors);

        if (contribError) {
          console.error('Error creating contributors:', contribError);
          // Don't fail the whole operation, just log it
        }
      }

      return objective;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives'] });
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives-with-krs'] });
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives-with-shared'] });
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
    setCycleId(undefined);
    setStatus('draft');
    setIsShared(false);
    setContributingTeamIds([]);
    setResponsibilityModel('collaborative');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }
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
    if (isShared && contributingTeamIds.length === 0) {
      toast.error('Selecione pelo menos um time contribuidor');
      return;
    }
    createMutation.mutate();
  };

  const selectedPrimaryTeamName = teams.find(t => t.id === teamId)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Objetivo de Time</DialogTitle>
          <DialogDescription>
            Crie um objetivo vinculado a um OKR organizacional. O prazo será definido pelo ciclo selecionado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team">Time Primário *</Label>
              <TeamSelect
                value={teamId}
                onValueChange={(value) => {
                  setTeamId(value);
                  // Remove primary team from contributors if it was selected
                  if (value) {
                    setContributingTeamIds(prev => prev.filter(id => id !== value));
                  }
                }}
                teams={hierarchicalTeams}
                placeholder="Selecione o time responsável"
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

            {/* Cycle Selection - Required */}
            <div className="space-y-2">
              <Label htmlFor="cycle">Ciclo *</Label>
              <CycleSelect
                value={cycleId}
                onValueChange={setCycleId}
                cycles={cycles}
                placeholder="Selecione o ciclo do objetivo"
                disabled={createMutation.isPending}
                required
                showPeriodPreview
              />
            </div>

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
                disabled={createMutation.isPending}
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
                    excludeTeamIds={teamId ? [teamId] : []}
                    teams={hierarchicalTeams}
                    placeholder="Selecione os times contribuidores"
                    disabled={createMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Modelo de Responsabilidade</Label>
                  <SimpleSelect
                    value={responsibilityModel}
                    onValueChange={(v) => setResponsibilityModel(v as 'collaborative' | 'primary_led')}
                    options={RESPONSIBILITY_MODEL_OPTIONS}
                    disabled={createMutation.isPending}
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
