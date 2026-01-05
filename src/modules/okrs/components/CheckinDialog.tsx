import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDialogFormReset } from '@/hooks/useDialogFormReset';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { OkrProgressBar } from './OkrProgressBar';
import { 
  Target, 
  User, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  ArrowRight,
  Lock,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { OkrRagStatus, calculateProgress } from '../types';

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
    status: OkrRagStatus;
    team_id: string;
    owner?: {
      display_name: string;
      photo_url?: string | null;
    };
    team_objective?: {
      title: string;
      cycle_id?: string | null;
    };
    last_checkin_at?: string | null;
    metric_id?: string | null; // If linked to KPI, it's automatic
  };
}

type Status = 'green' | 'yellow' | 'red';

const statusConfig: Record<Status, { 
  label: string; 
  description: string; 
  icon: typeof CheckCircle2; 
  colorClass: string;
  bgClass: string;
}> = {
  green: {
    label: 'On Track',
    description: 'Progresso conforme esperado',
    icon: CheckCircle2,
    colorClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
  },
  yellow: {
    label: 'At Risk',
    description: 'Risco de não atingir a meta',
    icon: AlertTriangle,
    colorClass: 'text-yellow-600 dark:text-yellow-400',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
  },
  red: {
    label: 'Off Track',
    description: 'Meta não será atingida sem mudança clara',
    icon: XCircle,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
  },
};

export function CheckinDialog({ open, onOpenChange, kr }: CheckinDialogProps) {
  const [currentValue, setCurrentValue] = useState(kr.current_value.toString());
  const [status, setStatus] = useState<Status>(kr.status === 'not_started' ? 'green' : kr.status as Status);
  const [reflection, setReflection] = useState('');
  const [nextStep, setNextStep] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAutomatic = !!kr.metric_id;

  // Só reseta o form quando o dialog abre, não quando os dados mudam
  useDialogFormReset(open, useCallback(() => {
    setCurrentValue(kr.current_value.toString());
    setStatus(kr.status === 'not_started' ? 'green' : kr.status as Status);
    setReflection('');
    setNextStep('');
  }, [kr.current_value, kr.status]));

  const createCheckin = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Map status to confidence for database compatibility
      const confidenceMap: Record<Status, 'high' | 'medium' | 'low'> = {
        green: 'high',
        yellow: 'medium',
        red: 'low',
      };

      // Combine reflection and next step for comments
      const comments = nextStep.trim() 
        ? `${reflection.trim()}\n\n📌 Próximo passo: ${nextStep.trim()}`
        : reflection.trim();

      const { error } = await supabase
        .from('okr_checkins')
        .insert({
          kr_id: kr.id,
          current_value: isAutomatic ? kr.current_value : parseFloat(currentValue),
          previous_value: kr.current_value,
          confidence: confidenceMap[status],
          blockers: null, // Not using blockers separately anymore
          comments,
          user_id: user.id,
        });

      if (error) throw error;

      // Update KR status
      const { error: updateError } = await supabase
        .from('okr_team_key_results')
        .update({ 
          status,
          current_value: isAutomatic ? kr.current_value : parseFloat(currentValue),
        })
        .eq('id', kr.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-team-key-results'] });
      queryClient.invalidateQueries({ queryKey: ['okr-checkins', kr.id] });
      queryClient.invalidateQueries({ queryKey: ['pending-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['checkin-summary'] });
      
      toast({
        title: '✓ Check-in registrado',
        description: 'O progresso foi atualizado com sucesso.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao registrar check-in',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate value
    if (!isAutomatic) {
      const value = parseFloat(currentValue);
      if (isNaN(value)) {
        toast({
          title: 'Valor inválido',
          description: 'Por favor, insira um número válido.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate reflection (required)
    if (!reflection.trim()) {
      toast({
        title: 'Reflexão obrigatória',
        description: 'Por favor, descreva o que avançou ou merece atenção.',
        variant: 'destructive',
      });
      return;
    }

    if (reflection.trim().length < 10) {
      toast({
        title: 'Reflexão muito curta',
        description: 'Por favor, adicione mais contexto sobre o progresso.',
        variant: 'destructive',
      });
      return;
    }

    createCheckin.mutate();
  };

  // Calculate preview progress
  const previewValue = isAutomatic ? kr.current_value : (parseFloat(currentValue) || kr.current_value);
  const valueDiff = previewValue - kr.current_value;
  const isPositiveChange = kr.direction === 'up' ? valueDiff >= 0 : valueDiff <= 0;
  const newProgress = calculateProgress(kr.baseline, previewValue, kr.target, kr.direction);

  const getStatusLabel = (s: OkrRagStatus) => {
    switch (s) {
      case 'green': return 'On Track';
      case 'yellow': return 'At Risk';
      case 'red': return 'Off Track';
      default: return 'Não iniciado';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-primary" />
              Check-in de Progresso
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* BLOCO 1 — CONTEXTO (READ-ONLY) */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              {/* Objective */}
              {kr.team_objective && (
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Objetivo</p>
                    <p className="text-sm font-medium line-clamp-1">{kr.team_objective.title}</p>
                  </div>
                </div>
              )}

              {/* KR Title */}
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Key Result</p>
                  <p className="text-sm font-medium">{kr.title}</p>
                </div>
              </div>

              {/* Meta info row */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                {kr.owner && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <span>{kr.owner.display_name}</span>
                  </div>
                )}
                {kr.last_checkin_at && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>Último: {format(new Date(kr.last_checkin_at), "dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                )}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs px-1.5 py-0",
                    kr.status === 'green' && 'border-green-300 text-green-700 dark:text-green-400',
                    kr.status === 'yellow' && 'border-yellow-300 text-yellow-700 dark:text-yellow-400',
                    kr.status === 'red' && 'border-red-300 text-red-700 dark:text-red-400',
                    kr.status === 'not_started' && 'border-muted-foreground/30'
                  )}
                >
                  {getStatusLabel(kr.status)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* BLOCO 2 — PROGRESSO */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Progresso
              </Label>

              {/* Progress bar preview */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <OkrProgressBar
                  baseline={kr.baseline}
                  current={previewValue}
                  target={kr.target}
                  direction={kr.direction}
                  status={status}
                  unit={kr.unit}
                  size="md"
                />
              </div>

              {/* Value comparison */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">Anterior</p>
                  <p className="font-semibold text-sm">{kr.current_value} {kr.unit}</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground">Meta</p>
                  <p className="font-semibold text-sm text-primary">{kr.target} {kr.unit}</p>
                </div>
              </div>

              {/* Value input */}
              {isAutomatic ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Este KR é atualizado automaticamente pela KPI vinculada
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Valor atual *</Label>
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
                    <span className="text-sm text-muted-foreground font-medium w-16">{kr.unit}</span>
                  </div>
                  {valueDiff !== 0 && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      isPositiveChange ? 'text-green-600' : 'text-red-600'
                    )}>
                      {isPositiveChange ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>
                        {valueDiff > 0 ? '+' : ''}{valueDiff.toFixed(2)} {kr.unit} ({newProgress.toFixed(0)}% da meta)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* BLOCO 3 — STATUS */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Status atual *</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['green', 'yellow', 'red'] as Status[]).map((s) => {
                  const config = statusConfig[s];
                  const Icon = config.icon;
                  const isSelected = status === s;
                  
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        "p-3 rounded-lg border-2 transition-all text-left",
                        isSelected 
                          ? cn(config.bgClass, 'border-current', config.colorClass)
                          : 'border-border hover:border-muted-foreground/50 bg-background'
                      )}
                    >
                      <Icon className={cn("w-5 h-5 mb-1", isSelected && config.colorClass)} />
                      <p className={cn("text-sm font-medium", isSelected && config.colorClass)}>
                        {config.label}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {config.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* BLOCO 4 — REFLEXÃO (OBRIGATÓRIO) */}
            <div className="space-y-2">
              <Label htmlFor="reflection" className="text-sm font-semibold">
                O que avançou e o que merece atenção? *
              </Label>
              <Textarea
                id="reflection"
                placeholder="Avançamos em X, mas estamos travados em Y. O próximo passo é Z."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={3}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Foco em fatos, não justificativas longas. 1 a 3 frases.
              </p>
            </div>

            {/* BLOCO 5 — PRÓXIMO PASSO (OPCIONAL) */}
            <div className="space-y-2">
              <Label htmlFor="nextStep" className="text-sm font-medium text-muted-foreground">
                Próximo passo concreto (recomendado)
              </Label>
              <Input
                id="nextStep"
                placeholder="Ex: Reunir com time de vendas para alinhar..."
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
              />
            </div>
          </div>

          {/* BLOCO 6 — CONFIRMAÇÃO */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createCheckin.isPending || !reflection.trim()}
            >
              {createCheckin.isPending ? 'Salvando...' : 'Salvar check-in'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
