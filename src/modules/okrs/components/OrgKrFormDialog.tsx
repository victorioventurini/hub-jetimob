import { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
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
import { Loader2, HelpCircle, AlertTriangle, TrendingUp, TrendingDown, Ban } from 'lucide-react';
import { KrUnitSelect } from './KrUnitSelect';
import { KrProgressPreview } from './KrProgressPreview';
import { validateOrgKr, getRandomPlaceholder } from '../utils/krValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { useCancelOrgKeyResult } from '../hooks/useOkrMutations';
import type { OkrRagStatus, OkrDirection } from '../types';

interface OrgKrFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
  kr?: {
    id: string;
    org_objective_id: string;
    title: string;
    baseline: number;
    current_value: number;
    target: number;
    direction: OkrDirection;
    unit: string;
    status: OkrRagStatus;
  };
}

export function OrgKrFormDialog({
  open,
  onOpenChange,
  objectiveId,
  kr,
}: OrgKrFormDialogProps) {
  const isEditing = !!kr;
  const queryClient = useQueryClient();
  const supabase = useBuScopedSupabase();
  const { currentBuId } = useBu();
  const cancelMutation = useCancelOrgKeyResult();

  const [title, setTitle] = useState(kr?.title || '');
  const [description, setDescription] = useState('');
  const [baseline, setBaseline] = useState(kr?.baseline?.toString() || '0');
  const [target, setTarget] = useState(kr?.target?.toString() || '');
  const [unit, setUnit] = useState(kr?.unit || '%');
  const [direction, setDirection] = useState<OkrDirection>(kr?.direction || 'up');
  const [status, setStatus] = useState<OkrRagStatus>(kr?.status || 'not_started');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [placeholder] = useState(() => getRandomPlaceholder(true));

  useDialogFormReset(open, useCallback(() => {
    setTitle(kr?.title || '');
    setDescription('');
    setBaseline(kr?.baseline?.toString() || '0');
    setTarget(kr?.target?.toString() || '');
    setUnit(kr?.unit || '%');
    setDirection(kr?.direction || 'up');
    setStatus(kr?.status || 'not_started');
  }, [kr]));

  const validation = useMemo(() => {
    if (!title.trim() || !target) {
      return { isValid: true, errors: [], warnings: [] };
    }
    return validateOrgKr(
      title,
      parseFloat(baseline) || 0,
      parseFloat(target) || 0,
      direction
    );
  }, [title, baseline, target, direction]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEditing) {
        const { error } = await supabase
          .from('okr_org_key_results')
          .update({
            title,
            baseline: parseFloat(baseline),
            target: parseFloat(target),
            direction,
            unit,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', kr.id);
        if (error) throw error;
      } else {
        if (!currentBuId) throw new Error('Nenhuma BU selecionada');
        const { error } = await supabase
          .from('okr_org_key_results')
          .insert({
            org_objective_id: objectiveId,
            title,
            baseline: parseFloat(baseline) || 0,
            current_value: parseFloat(baseline) || 0,
            target: parseFloat(target) || 0,
            unit,
            direction,
            status: 'not_started',
            bu_id: currentBuId,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgKeyResults(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectives(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectivesWithKrs(null) });
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgKeyResultsAll(null) });
      toast.success(isEditing ? 'KR atualizado com sucesso!' : 'Key Result criado com sucesso!');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error('Error saving KR:', error);
      if (error.message.includes('Limite atingido') || error.message.includes('more than 3') || error.message.includes('máximo 3')) {
        toast.error('Limite atingido: um Objetivo Organizacional pode ter no máximo 3 KRs ativos.');
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>
                {isEditing ? 'Editar Key Result' : 'Novo Key Result Organizacional'}
              </DialogTitle>
              {!isEditing && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        <strong>KR Organizacional</strong> define metas de alto nível para toda a empresa.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {!isEditing && (
              <DialogDescription>
                Defina um resultado-chave mensurável para este objetivo organizacional.
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseline">Valor inicial</Label>
                  <Input
                    id="baseline"
                    type="number"
                    step="any"
                    value={baseline}
                    onChange={(e) => setBaseline(e.target.value)}
                    disabled={mutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target">Meta *</Label>
                  <Input
                    id="target"
                    type="number"
                    step="any"
                    placeholder="75"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    disabled={mutation.isPending}
                  />
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

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

              {!isEditing && title.trim() && target && (
                <KrProgressPreview
                  title={title}
                  baseline={parseFloat(baseline) || 0}
                  currentValue={parseFloat(baseline) || 0}
                  target={parseFloat(target) || 0}
                  unit={unit}
                  direction={direction}
                />
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
                <Button type="submit" disabled={mutation.isPending || !validation.isValid}>
                  {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
