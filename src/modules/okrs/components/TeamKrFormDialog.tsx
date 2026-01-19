import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Loader2, HelpCircle, AlertTriangle, TrendingUp, TrendingDown, Equal, Link2, Ban } from 'lucide-react';
import { KrUnitSelect } from './KrUnitSelect';
import { KrProgressPreview } from './KrProgressPreview';
import { validateTeamKr, getRandomPlaceholder } from '../utils/krValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useCancelTeamKeyResult, useCanManageTeamOkr } from '../hooks';
import { BuUserSelect } from '@/components/selects/BuUserSelect';
import type { OkrRagStatus, OkrDirection, OkrKrType } from '../types';

const NONE_LINKED_ORG_KR = '__none__';

interface TeamKrFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
  teamId: string;
  buId?: string;
  kr?: {
    id: string;
    team_id: string;
    team_objective_id?: string | null;
    title: string;
    type: OkrKrType;
    baseline: number;
    current_value: number;
    target: number;
    direction: OkrDirection;
    unit: string;
    status: OkrRagStatus;
    owner_user_id?: string | null;
    linked_org_kr_id?: string | null;
  };
}

export function TeamKrFormDialog({
  open,
  onOpenChange,
  objectiveId,
  teamId,
  buId,
  kr,
}: TeamKrFormDialogProps) {
  const isEditing = !!kr;
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const cancelMutation = useCancelTeamKeyResult();
  
  // Defense in depth: check if user can manage this team's OKRs
  const { canManage: canManageThisTeam, isLoading: isLoadingPermission } = useCanManageTeamOkr(teamId);

  const [title, setTitle] = useState(kr?.title || '');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<OkrKrType>(kr?.type || 'contribution');
  const [baseline, setBaseline] = useState(kr?.baseline?.toString() || '0');
  const [noBaseline, setNoBaseline] = useState(false);
  const [target, setTarget] = useState(kr?.target?.toString() || '');
  const [unit, setUnit] = useState(kr?.unit || '%');
  const [direction, setDirection] = useState<OkrDirection>(kr?.direction || 'up');
  const [status, setStatus] = useState<OkrRagStatus>(kr?.status || 'not_started');
  const [linkedOrgKrId, setLinkedOrgKrId] = useState<string>(kr?.linked_org_kr_id || NONE_LINKED_ORG_KR);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(kr?.owner_user_id || null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [placeholder] = useState(() => getRandomPlaceholder(false));
  
  // If user can't manage this team, don't render
  if (!isLoadingPermission && !canManageThisTeam) {
    return null;
  }

  // Auto-fill target when direction is "maintain"
  useEffect(() => {
    if (direction === 'maintain') {
      setTarget(baseline);
    }
  }, [direction, baseline]);

  useDialogFormReset(open, useCallback(() => {
    setTitle(kr?.title || '');
    setDescription('');
    setType(kr?.type || 'contribution');
    setBaseline(kr?.baseline?.toString() || '0');
    setNoBaseline(false);
    setTarget(kr?.target?.toString() || '');
    setUnit(kr?.unit || '%');
    setDirection(kr?.direction || 'up');
    setStatus(kr?.status || 'not_started');
    setLinkedOrgKrId(kr?.linked_org_kr_id || NONE_LINKED_ORG_KR);
    setOwnerUserId(kr?.owner_user_id || null);
  }, [kr]));

  const { data: teamObjective } = useQuery({
    queryKey: queryKeys.okrs.teamObjectiveDetail(objectiveId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_team_objectives')
        .select('org_objective_id, bu_id')
        .eq('id', objectiveId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const effectiveBuId = buId || teamObjective?.bu_id;

  const { data: orgKrs } = useQuery({
    queryKey: queryKeys.okrs.orgKeyResultsForLinking(teamObjective?.org_objective_id ?? null),
    queryFn: async () => {
      if (!teamObjective?.org_objective_id) return [];
      const { data, error } = await supabase
        .from('okr_org_key_results')
        .select('id, title')
        .eq('org_objective_id', teamObjective.org_objective_id)
        .is('deleted_at', null)
        .is('cancelled_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!teamObjective?.org_objective_id && open,
  });

  const validation = useMemo(() => {
    if (!title.trim() || !target) {
      return { isValid: true, errors: [], warnings: [] };
    }
    return validateTeamKr(
      title,
      parseFloat(baseline) || 0,
      parseFloat(target) || 0,
      direction,
      true
    );
  }, [title, baseline, target, direction]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        const { error } = await supabase
          .from('okr_team_key_results')
          .update({
            title,
            type,
            baseline: parseFloat(baseline),
            target: parseFloat(target),
            direction,
            unit,
            status,
            owner_user_id: ownerUserId,
            linked_org_kr_id: linkedOrgKrId === NONE_LINKED_ORG_KR ? null : linkedOrgKrId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', kr.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('okr_team_key_results')
          .insert({
            team_objective_id: objectiveId,
            team_id: teamId,
            bu_id: effectiveBuId,
            title,
            type,
            baseline: parseFloat(baseline) || 0,
            current_value: parseFloat(baseline) || 0,
            target: parseFloat(target) || 0,
            unit,
            direction,
            linked_org_kr_id: linkedOrgKrId === NONE_LINKED_ORG_KR ? null : linkedOrgKrId,
            status: 'not_started',
            co_responsibles: [],
            owner_user_id: ownerUserId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Use prefix helpers for broad invalidation with immediate refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamKeyResultsPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.teamObjectivesPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.dashboardDataPrefix(), refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.pendingCheckins(null), refetchType: 'active' });
      toast.success(isEditing ? 'KR atualizado com sucesso!' : 'Key Result criado com sucesso!');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error('Error saving KR:', error);
      if (error.message.includes('Limite atingido') || error.message.includes('more than 3') || error.message.includes('máximo 3')) {
        toast.error('Limite atingido: um Objetivo de Time pode ter no máximo 3 KRs ativos.');
      } else {
        toast.error(isEditing ? 'Erro ao atualizar KR.' : 'Erro ao criar Key Result.');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('O título é obrigatório');
      return;
    }
    if (!target) {
      toast.error('A meta é obrigatória');
      return;
    }
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }
    mutation.mutate();
  };

  const handleCancel = () => {
    if (!kr) return;
    cancelMutation.mutate(kr.id, {
      onSuccess: () => {
        setShowCancelConfirm(false);
        onOpenChange(false);
      },
    });
  };

  const getTypeDescription = (krType: string) => {
    switch (krType) {
      case 'contribution':
        return 'Contribui diretamente para o objetivo organizacional.';
      case 'enabler':
        return 'Habilita outros KRs ou remove bloqueios.';
      case 'foundational':
        return 'Base essencial. Não tem barra de progresso automática.';
      default:
        return '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                {isEditing ? 'Editar Key Result' : 'Novo Key Result de Time'}
              </DialogTitle>
              {!isEditing && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        <strong>KR de Time</strong> contribui para um objetivo organizacional.
                        Cada objetivo pode ter no máximo 3 KRs.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {!isEditing && (
              <DialogDescription>
                Defina um resultado-chave mensurável. Cada objetivo pode ter no máximo 3 KRs.
              </DialogDescription>
            )}
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder={placeholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={mutation.isPending}
                />
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Descrição / Critério de sucesso
                    <span className="text-muted-foreground ml-1 font-normal">(opcional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva como esse resultado será medido"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={mutation.isPending}
                    rows={2}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de KR</Label>
                <Select value={type} onValueChange={(v) => setType(v as OkrKrType)} disabled={mutation.isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contribution">Contribuição</SelectItem>
                    <SelectItem value="enabler">Habilitador</SelectItem>
                    <SelectItem value="foundational">Fundacional</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{getTypeDescription(type)}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kr-owner">
                  Responsável
                  <span className="text-muted-foreground ml-1 font-normal">(opcional)</span>
                </Label>
                <BuUserSelect
                  value={ownerUserId || undefined}
                  onValueChange={(id) => setOwnerUserId(id || null)}
                  placeholder="Selecione o responsável"
                  teamId={teamId}
                  allowNone={true}
                  noneLabel="Nenhum"
                />
              </div>

              {!isEditing && <Separator />}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="baseline">
                      Valor inicial {!noBaseline && <span className="text-destructive">*</span>}
                    </Label>
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="no-baseline"
                        checked={noBaseline}
                        onCheckedChange={(checked) => {
                          setNoBaseline(!!checked);
                          if (checked) {
                            setBaseline('0');
                          }
                        }}
                        disabled={mutation.isPending}
                      />
                      <label 
                        htmlFor="no-baseline" 
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        Sem baseline
                      </label>
                    </div>
                  </div>
                  <Input
                    id="baseline"
                    type="number"
                    step="any"
                    value={noBaseline ? '' : baseline}
                    placeholder={noBaseline ? '—' : '0'}
                    onChange={(e) => setBaseline(e.target.value)}
                    disabled={mutation.isPending || noBaseline}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">Meta *</Label>
                  <Input
                    id="target"
                    type="number"
                    step="any"
                    placeholder="100"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    disabled={mutation.isPending || direction === 'maintain'}
                  />
                  {direction === 'maintain' && (
                    <p className="text-xs text-muted-foreground">
                      Meta é igual ao baseline para KRs de manutenção
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <KrUnitSelect value={unit} onChange={setUnit} disabled={mutation.isPending} />
                <div className="space-y-2">
                  <Label htmlFor="direction">Direção *</Label>
                  <Select value={direction} onValueChange={(v) => setDirection(v as OkrDirection)} disabled={mutation.isPending}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="up">
                        <span className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          Crescente (↑)
                        </span>
                      </SelectItem>
                      <SelectItem value="down">
                        <span className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-blue-500" />
                          Decrescente (↓)
                        </span>
                      </SelectItem>
                      <SelectItem value="maintain">
                        <span className="flex items-center gap-2">
                          <Equal className="h-4 w-4 text-purple-500" />
                          Manter (=)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {orgKrs && orgKrs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="linkedOrgKr">
                      KR Organizacional impactado
                      <span className="text-muted-foreground ml-1 font-normal">(opcional)</span>
                    </Label>
                  </div>
                  <Select value={linkedOrgKrId} onValueChange={setLinkedOrgKrId} disabled={mutation.isPending}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um KR organizacional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_LINKED_ORG_KR}>Nenhum</SelectItem>
                      {orgKrs.map((orgKr) => (
                        <SelectItem key={orgKr.id} value={orgKr.id}>
                          {orgKr.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground">
                      Alterar o vínculo não afeta o histórico de progresso já registrado.
                    </p>
                  )}
                </div>
              )}

              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as OkrRagStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Não iniciado</SelectItem>
                      <SelectItem value="green">Verde (no caminho)</SelectItem>
                      <SelectItem value="yellow">Amarelo (atenção)</SelectItem>
                      <SelectItem value="red">Vermelho (em risco)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {validation.warnings.length > 0 && (
                <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-sm text-yellow-700">
                    {validation.warnings.map((warning, i) => (
                      <p key={i}>{warning}</p>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {validation.errors.map((error, i) => (
                      <p key={i}>{error}</p>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              {!isEditing && title.trim() && target && type !== 'foundational' && (
                <KrProgressPreview
                  title={title}
                  baseline={parseFloat(baseline) || 0}
                  currentValue={parseFloat(baseline) || 0}
                  target={parseFloat(target) || 0}
                  unit={unit}
                  direction={direction}
                />
              )}

              {!isEditing && type === 'foundational' && title.trim() && target && (
                <Alert>
                  <AlertDescription className="text-sm">
                    KRs Fundacionais não exibem barra de progresso automática.
                    O avanço será validado por meio de evidências.
                  </AlertDescription>
                </Alert>
              )}
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
                  Cancelar KR
                </Button>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={mutation.isPending} disabled={!validation.isValid}>
                  {isEditing ? 'Salvar' : 'Criar Key Result'}
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
          onConfirm={handleCancel}
          title="Cancelar Key Result"
          description="Tem certeza que deseja cancelar este KR? O histórico de check-ins será preservado."
          isLoading={cancelMutation.isPending}
        />
      )}
    </>
  );
}
