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
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { KrUnitSelect } from './KrUnitSelect';
import type { OkrRagStatus, OkrDirection, OkrKrType } from '../types';

interface EditTeamKrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: {
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
  };
}

export function EditTeamKrDialog({
  open,
  onOpenChange,
  kr,
}: EditTeamKrDialogProps) {
  const [title, setTitle] = useState(kr.title);
  const [type, setType] = useState<OkrKrType>(kr.type);
  const [baseline, setBaseline] = useState(kr.baseline.toString());
  const [target, setTarget] = useState(kr.target.toString());
  const [direction, setDirection] = useState<OkrDirection>(kr.direction);
  const [unit, setUnit] = useState(kr.unit);
  const [status, setStatus] = useState<OkrRagStatus>(kr.status);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Só reseta o form quando o dialog abre, não quando os dados mudam
  useDialogFormReset(open, useCallback(() => {
    setTitle(kr.title);
    setType(kr.type);
    setBaseline(kr.baseline.toString());
    setTarget(kr.target.toString());
    setDirection(kr.direction);
    setUnit(kr.unit);
    setStatus(kr.status);
  }, [kr.title, kr.type, kr.baseline, kr.target, kr.direction, kr.unit, kr.status]));

  const updateMutation = useMutation({
    mutationFn: async () => {
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', kr.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-team-key-results', kr.team_id] });
      toast({
        title: 'KR atualizado',
        description: 'O Key Result foi atualizado com sucesso.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Error updating KR:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o Key Result.',
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
          <DialogTitle>Editar Key Result</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reduzir churn para 2%"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as OkrKrType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contribution">Contribuição</SelectItem>
                <SelectItem value="enabler">Habilitador</SelectItem>
                <SelectItem value="foundational">Fundacional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline">Baseline</Label>
              <Input
                id="baseline"
                type="number"
                step="any"
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target">Meta *</Label>
              <Input
                id="target"
                type="number"
                step="any"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <KrUnitSelect value={unit} onChange={setUnit} />
            <div className="space-y-2">
              <Label htmlFor="direction">Direção</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as OkrDirection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="up">Crescente ↑</SelectItem>
                  <SelectItem value="down">Decrescente ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

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
