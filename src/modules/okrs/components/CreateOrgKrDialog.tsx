import { useState, useMemo, useEffect } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Loader2, HelpCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { KrUnitSelect } from './KrUnitSelect';
import { KrProgressPreview } from './KrProgressPreview';
import {
  validateOrgKr,
  getRandomPlaceholder,
} from '../utils/krValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreateOrgKrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectiveId: string;
}

export function CreateOrgKrDialog({
  open,
  onOpenChange,
  objectiveId,
}: CreateOrgKrDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [baseline, setBaseline] = useState('0');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('%');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [placeholder] = useState(() => getRandomPlaceholder(true));

  // Real-time validation
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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
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
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr-org-key-results', objectiveId] });
      queryClient.invalidateQueries({ queryKey: ['okr-org-objectives'] });
      toast.success('Key Result criado com sucesso!');
      handleClose();
    },
    onError: (error) => {
      console.error('Error creating KR:', error);
      toast.error('Erro ao criar Key Result. Tente novamente.');
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
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
    
    // Check for blocking errors
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }
    
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Novo Key Result Organizacional</DialogTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    <strong>KR Organizacional</strong> define metas de alto nível para toda a empresa. 
                    Não precisa estar vinculado a um time específico e serve como norte para os times.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <DialogDescription>
            Defina um resultado-chave mensurável para este objetivo organizacional.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder={placeholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>

            {/* Description (optional) */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Descrição / Critério de sucesso
                <span className="text-muted-foreground ml-1 font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Descreva como esse resultado será medido e o que significa atingir a meta"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={createMutation.isPending}
                rows={2}
              />
            </div>

            {/* Baseline and Target */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="baseline">Valor inicial</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">
                          O valor atual antes de iniciar o trabalho no KR. 
                          Para KRs organizacionais, pode ser deixado em 0.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
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
                  placeholder="75"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
            </div>

            {/* Unit and Direction */}
            <div className="grid grid-cols-2 gap-4">
              <KrUnitSelect
                value={unit}
                onChange={setUnit}
                disabled={createMutation.isPending}
              />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="direction">Direção *</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          <strong>Crescente (↑):</strong> Receita, NPS, MRR, conversão.
                          <br />
                          <strong>Decrescente (↓):</strong> Churn, tempo, bugs, custo.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select
                  value={direction}
                  onValueChange={(v) => setDirection(v as 'up' | 'down')}
                  disabled={createMutation.isPending}
                >
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

            {/* Validation warnings */}
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

            {/* Validation errors */}
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

            {/* Preview */}
            {title.trim() && target && (
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
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !validation.isValid}
            >
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
