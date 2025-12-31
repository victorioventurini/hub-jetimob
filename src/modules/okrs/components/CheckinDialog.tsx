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
import { useToast } from '@/hooks/use-toast';
import { OkrProgressBar } from './OkrProgressBar';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kr: {
    id: string;
    title: string;
    baseline: number;
    current_value: number;
    target: number;
    direction: 'up' | 'down';
    unit: string;
    status: 'green' | 'yellow' | 'red' | 'not_started';
    team_id: string;
  };
}

type Confidence = 'high' | 'medium' | 'low';

export function CheckinDialog({ open, onOpenChange, kr }: CheckinDialogProps) {
  const [currentValue, setCurrentValue] = useState(kr.current_value.toString());
  const [confidence, setConfidence] = useState<Confidence>('medium');
  const [blockers, setBlockers] = useState('');
  const [comments, setComments] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCheckin = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('okr_checkins')
        .insert({
          kr_id: kr.id,
          current_value: parseFloat(currentValue),
          previous_value: kr.current_value,
          confidence,
          blockers: blockers.trim() || null,
          comments: comments.trim() || null,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-team-key-results'] });
      queryClient.invalidateQueries({ queryKey: ['okr-checkins', kr.id] });
      toast({
        title: 'Check-in registrado',
        description: 'O progresso do KR foi atualizado com sucesso.',
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao registrar check-in',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setCurrentValue(kr.current_value.toString());
    setConfidence('medium');
    setBlockers('');
    setComments('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const value = parseFloat(currentValue);
    if (isNaN(value)) {
      toast({
        title: 'Valor inválido',
        description: 'Por favor, insira um número válido.',
        variant: 'destructive',
      });
      return;
    }

    createCheckin.mutate();
  };

  // Calculate preview progress
  const previewValue = parseFloat(currentValue) || kr.current_value;
  const valueDiff = previewValue - kr.current_value;
  const isPositiveChange = kr.direction === 'up' ? valueDiff >= 0 : valueDiff <= 0;

  const getConfidenceLabel = (conf: Confidence) => {
    switch (conf) {
      case 'high': return 'Alta - No caminho certo';
      case 'medium': return 'Média - Alguns riscos';
      case 'low': return 'Baixa - Precisa de atenção';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Check-in de Progresso</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {kr.title}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Current progress preview */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Progresso atual
              </p>
              <OkrProgressBar
                baseline={kr.baseline}
                current={kr.current_value}
                target={kr.target}
                direction={kr.direction}
                status={kr.status}
                unit={kr.unit}
                size="md"
              />
            </div>

            {/* New value input */}
            <div className="grid gap-2">
              <Label htmlFor="currentValue">Novo valor atual</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="currentValue"
                  type="number"
                  step="any"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  className="flex-1"
                  required
                />
                <span className="text-sm text-muted-foreground w-12">{kr.unit}</span>
              </div>
              {valueDiff !== 0 && (
                <div className={`flex items-center gap-1 text-xs ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositiveChange ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {valueDiff > 0 ? '+' : ''}{valueDiff.toFixed(2)} {kr.unit}
                  </span>
                </div>
              )}
            </div>

            {/* Confidence select */}
            <div className="grid gap-2">
              <Label htmlFor="confidence">Nível de confiança</Label>
              <Select value={confidence} onValueChange={(v) => setConfidence(v as Confidence)}>
                <SelectTrigger id="confidence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      {getConfidenceLabel('high')}
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      {getConfidenceLabel('medium')}
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {getConfidenceLabel('low')}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Blockers */}
            <div className="grid gap-2">
              <Label htmlFor="blockers" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Bloqueadores (opcional)
              </Label>
              <Textarea
                id="blockers"
                placeholder="Descreva impedimentos ou riscos que podem afetar o progresso..."
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                rows={2}
              />
            </div>

            {/* Comments */}
            <div className="grid gap-2">
              <Label htmlFor="comments">Comentários (opcional)</Label>
              <Textarea
                id="comments"
                placeholder="Adicione observações sobre o progresso, próximos passos..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createCheckin.isPending}>
              {createCheckin.isPending ? 'Salvando...' : 'Registrar Check-in'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
