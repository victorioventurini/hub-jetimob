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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateTeamKrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
  teamId: string;
}

export function CreateTeamKrDialog({
  open,
  onOpenChange,
  objectiveId,
  teamId,
}: CreateTeamKrDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'contribution' | 'enabler' | 'foundational'>('contribution');
  const [baseline, setBaseline] = useState('0');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('%');
  const [direction, setDirection] = useState<'up' | 'down'>('up');

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('okr_team_key_results')
        .insert({
          team_objective_id: objectiveId,
          team_id: teamId,
          title,
          type,
          baseline: parseFloat(baseline) || 0,
          current_value: parseFloat(baseline) || 0,
          target: parseFloat(target) || 0,
          unit,
          direction,
          status: 'not_started',
          co_responsibles: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-team-key-results'] });
      queryClient.invalidateQueries({ queryKey: ['okr-team-objectives'] });
      toast.success('Key Result criado com sucesso!');
      handleClose();
    },
    onError: (error: Error) => {
      console.error('Error creating KR:', error);
      if (error.message.includes('more than 3')) {
        toast.error('Este objetivo já possui 3 Key Results. Remova um antes de criar outro.');
      } else {
        toast.error('Erro ao criar Key Result. Tente novamente.');
      }
    },
  });

  const handleClose = () => {
    setTitle('');
    setType('contribution');
    setBaseline('0');
    setTarget('');
    setUnit('%');
    setDirection('up');
    onOpenChange(false);
  };

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
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Key Result</DialogTitle>
          <DialogDescription>
            Defina um resultado-chave mensurável. Cada objetivo pode ter no máximo 3 KRs.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Reduzir tempo médio de resposta para 2h"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de KR</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'contribution' | 'enabler' | 'foundational')}
                disabled={createMutation.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contribution">Contribuição</SelectItem>
                  <SelectItem value="enabler">Habilitador</SelectItem>
                  <SelectItem value="foundational">Fundacional</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {type === 'contribution' && 'Contribui diretamente para o objetivo.'}
                {type === 'enabler' && 'Habilita outros KRs ou objetivos.'}
                {type === 'foundational' && 'Base essencial, sem barra de progresso automática.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseline">Valor inicial</Label>
                <Input
                  id="baseline"
                  type="number"
                  step="any"
                  value={baseline}
                  onChange={(e) => setBaseline(e.target.value)}
                  disabled={createMutation.isPending}
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
                  disabled={createMutation.isPending}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <Input
                  id="unit"
                  placeholder="%"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Direção</Label>
                <Select
                  value={direction}
                  onValueChange={(v) => setDirection(v as 'up' | 'down')}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Crescente (↑)</SelectItem>
                    <SelectItem value="down">Decrescente (↓)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              Criar Key Result
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
