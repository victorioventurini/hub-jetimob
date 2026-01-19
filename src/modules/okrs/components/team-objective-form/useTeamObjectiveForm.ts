import { useState, useCallback, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptionalBuClient } from '@/integrations/supabase/getOptionalBuClient';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { useHierarchicalTeamList, type FlatTeamItem } from '@/modules/teams/hooks';
import { useManageableTeamsFlat } from '../../hooks/useManageableTeams';
import { useObjectiveContributors, useManageContributors, useOrgObjectives } from '../../hooks';
import { useCycles } from '../../hooks/useCycleData';
import { useCancelTeamObjective } from '../../hooks/useOkrMutations';
import { useCanManageTeamOkr } from '../../hooks/useCanManageTeamOkr';
import type { OkrStatus } from '../../types';
import type { TeamObjectiveFormData } from './teamObjectiveFormTypes';

interface UseTeamObjectiveFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective?: TeamObjectiveFormData | null;
  propsTeams?: Array<{ id: string; name: string; parent_team_id?: string | null }>;
  orgObjectives?: Array<{ id: string; title: string }>;
}

export function useTeamObjectiveForm({
  open,
  onOpenChange,
  objective,
  propsTeams,
  orgObjectives,
}: UseTeamObjectiveFormProps) {
  const isEditing = !!objective;
  
  const queryClient = useQueryClient();
  const { client: supabase, buId } = useOptionalBuClient();
  const { toast: hookToast } = useToast();
  const { teams: hookTeams } = useHierarchicalTeamList();
  const manageContributors = useManageContributors();
  const cancelMutation = useCancelTeamObjective();
  
  const { canManage: canManageThisTeam, isLoading: isLoadingPermission } = useCanManageTeamOkr(
    isEditing ? objective?.team_id : null
  );
  
  const { 
    teams: manageableTeams, 
    isLoading: isLoadingManageable, 
    hasManageableTeams,
    userTeamId 
  } = useManageableTeamsFlat();
  
  const teams = isEditing ? hookTeams : (propsTeams || []);
  
  const allowedTeamsForCreate = useMemo(() => manageableTeams, [manageableTeams]);
  const isTeamSelectReadOnly = !isEditing && allowedTeamsForCreate.length === 1;
  
  // Form state
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
  const { data: fetchedOrgObjectives = [] } = useOrgObjectives({ buId: buId ?? undefined });

  // Load existing contributors for edit mode
  useEffect(() => {
    if (existingContributors) {
      setContributingTeamIds(existingContributors.map(c => c.team_id));
    }
  }, [existingContributors]);

  // Pre-select user's team when dialog opens in create mode
  useEffect(() => {
    if (open && !isEditing && !teamId) {
      if (allowedTeamsForCreate.length === 1) {
        setTeamId(allowedTeamsForCreate[0].id);
      } else if (userTeamId && allowedTeamsForCreate.some(t => t.id === userTeamId)) {
        setTeamId(userTeamId);
      }
    }
  }, [open, isEditing, teamId, allowedTeamsForCreate, userTeamId]);

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
      setOrgObjectiveId(objective.org_objective_id || '');
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

  const availableOrgObjectives = isEditing ? fetchedOrgObjectives : (orgObjectives || []);
  const orgObjectiveOptions = availableOrgObjectives.map(obj => ({
    value: obj.id,
    label: obj.title,
  }));

  // Mutations
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

        if (contribError) console.error('Error creating contributors:', contribError);
      }

      return createdObjective;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
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
          org_objective_id: orgObjectiveId || null,
          status,
          is_shared: isShared,
          responsibility_model: isShared ? responsibilityModel : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', objective.id);

      if (error) throw error;

      if (isShared) {
        await manageContributors.mutateAsync({
          objectiveId: objective.id!,
          teamIds: contributingTeamIds,
        });
      } else {
        await manageContributors.mutateAsync({
          objectiveId: objective.id!,
          teamIds: [],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
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
      
      const isTeamAllowed = allowedTeamsForCreate.some(t => t.id === teamId);
      if (!isTeamAllowed) {
        toast.error('Você não tem permissão para criar OKRs para este time');
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
    cancelMutation.mutate(objective.id!, {
      onSuccess: () => {
        setShowCancelConfirm(false);
        onOpenChange(false);
      },
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const selectedPrimaryTeamName = allowedTeamsForCreate.find(t => t.id === teamId)?.name 
    || teams.find(t => t.id === (isEditing ? objective?.team_id : teamId))?.name;

  return {
    // State
    isEditing,
    canManageThisTeam,
    isLoadingPermission,
    isLoadingManageable,
    hasManageableTeams,
    isPending,
    showCancelConfirm,
    setShowCancelConfirm,
    
    // Form fields
    title, setTitle,
    description, setDescription,
    teamId, setTeamId,
    orgObjectiveId, setOrgObjectiveId,
    cycleId, setCycleId,
    status, setStatus,
    isShared, setIsShared,
    contributingTeamIds, setContributingTeamIds,
    responsibilityModel, setResponsibilityModel,
    
    // Data
    cycles,
    allowedTeamsForCreate,
    isTeamSelectReadOnly,
    hierarchicalTeams,
    orgObjectiveOptions,
    selectedPrimaryTeamName,
    cancelMutation,
    
    // Actions
    handleSubmit,
    handleCancelOkr,
  };
}
