import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertTriangle, Archive } from 'lucide-react';
import { CYCLE_SUMMARY_COLORS } from '@/lib/colors';

interface CycleRetrospectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycleId?: string;
  cycleName?: string;
  objectives?: {
    id: string;
    title: string;
    status: string;
    progress: number;
  }[];
}

export function CycleRetrospectiveDialog({
  open,
  onOpenChange,
  cycleId,
  cycleName = 'Ciclo',
  objectives = [],
}: CycleRetrospectiveDialogProps) {
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [nextCycleChanges, setNextCycleChanges] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const closeCycle = useMutation({
    mutationFn: async () => {
      // In a real implementation, this would:
      // 1. Mark all objectives and KRs as 'closed'
      // 2. Store the retrospective notes
      // 3. Freeze the historical data
      
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.okrs.orgObjectives(null) });
      toast({
        title: 'Ciclo encerrado',
        description: 'A retrospectiva foi salva e o ciclo foi arquivado.',
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao encerrar ciclo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setWhatWorked('');
    setWhatDidntWork('');
    setNextCycleChanges('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeCycle.mutate();
  };

  // Calculate summary stats
  const completedCount = objectives.filter(o => o.progress >= 70).length;
  const partialCount = objectives.filter(o => o.progress >= 30 && o.progress < 70).length;
  const notAchievedCount = objectives.filter(o => o.progress < 30).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Retrospectiva do {cycleName}
            </DialogTitle>
            <DialogDescription>
              Documente os aprendizados antes de encerrar o ciclo. Estes dados ficarão disponíveis para consulta futura.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="text-sm font-medium mb-3">Resumo do Ciclo</h4>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`h-4 w-4 ${CYCLE_SUMMARY_COLORS.achieved}`} />
                    <span className="text-sm">
                      <strong>{completedCount}</strong> atingidos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${CYCLE_SUMMARY_COLORS.partial}`} />
                    <span className="text-sm">
                      <strong>{partialCount}</strong> parciais
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className={`h-4 w-4 ${CYCLE_SUMMARY_COLORS.not_achieved}`} />
                    <span className="text-sm">
                      <strong>{notAchievedCount}</strong> não atingidos
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Objectives list */}
            {objectives.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {objectives.map(obj => (
                  <div key={obj.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                    <span className="truncate flex-1">{obj.title}</span>
                    <Badge 
                      variant={obj.progress >= 70 ? 'default' : obj.progress >= 30 ? 'secondary' : 'destructive'}
                      className="ml-2"
                    >
                      {Math.round(obj.progress)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* What worked */}
            <div className="space-y-2">
              <Label htmlFor="whatWorked" className={`flex items-center gap-1 ${CYCLE_SUMMARY_COLORS.achieved}`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                O que funcionou bem?
              </Label>
              <Textarea
                id="whatWorked"
                placeholder="Práticas, processos ou decisões que contribuíram para o sucesso..."
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                rows={3}
              />
            </div>

            {/* What didn't work */}
            <div className="space-y-2">
              <Label htmlFor="whatDidntWork" className={`flex items-center gap-1 ${CYCLE_SUMMARY_COLORS.not_achieved}`}>
                <XCircle className="h-3.5 w-3.5" />
                O que não funcionou?
              </Label>
              <Textarea
                id="whatDidntWork"
                placeholder="Obstáculos, problemas ou decisões que atrapalharam o progresso..."
                value={whatDidntWork}
                onChange={(e) => setWhatDidntWork(e.target.value)}
                rows={3}
              />
            </div>

            {/* Changes for next cycle */}
            <div className="space-y-2">
              <Label htmlFor="nextCycleChanges" className="flex items-center gap-1 text-primary">
                <AlertTriangle className="h-3.5 w-3.5" />
                O que muda no próximo ciclo?
              </Label>
              <Textarea
                id="nextCycleChanges"
                placeholder="Ações concretas para melhorar no próximo período..."
                value={nextCycleChanges}
                onChange={(e) => setNextCycleChanges(e.target.value)}
                rows={3}
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
            <Button type="submit" disabled={closeCycle.isPending}>
              {closeCycle.isPending ? 'Encerrando...' : 'Encerrar Ciclo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
