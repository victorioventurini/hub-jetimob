import { useState, useMemo } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import {
  Loader2,
  HelpCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Link2,
} from 'lucide-react';
import { KrUnitSelect } from './KrUnitSelect';
import { KrProgressPreview } from './KrProgressPreview';
import {
  validateTeamKr,
  getRandomPlaceholder,
} from '../utils/krValidation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { VicActionButton } from '@/modules/vic';

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
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'contribution' | 'enabler' | 'foundational'>('contribution');
  const [baseline, setBaseline] = useState('0');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('%');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [linkedOrgKrId, setLinkedOrgKrId] = useState<string>('');
  const [placeholder] = useState(() => getRandomPlaceholder(false));

  // Fetch org KRs for linking
  const { data: orgObjective } = useQuery({
    queryKey: ['okr-team-objective', objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_team_objectives')
        .select('org_objective_id')
        .eq('id', objectiveId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: orgKrs } = useQuery({
    queryKey: ['okr-org-key-results', orgObjective?.org_objective_id],
    queryFn: async () => {
      if (!orgObjective?.org_objective_id) return [];
      const { data, error } = await supabase
        .from('okr_org_key_results')
        .select('id, title')
        .eq('org_objective_id', orgObjective.org_objective_id)
        .is('deleted_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgObjective?.org_objective_id && open,
  });

  // Real-time validation
  const validation = useMemo(() => {
    if (!title.trim() || !target) {
      return { isValid: true, errors: [], warnings: [] };
    }
    return validateTeamKr(
      title,
      parseFloat(baseline) || 0,
      parseFloat(target) || 0,
      direction,
      true // Team KRs are always linked to an org objective via team objective
    );
  }, [title, baseline, target, direction]);

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
          linked_org_kr_id: linkedOrgKrId || null,
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
    setDescription('');
    setType('contribution');
    setBaseline('0');
    setTarget('');
    setUnit('%');
    setDirection('up');
    setLinkedOrgKrId('');
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

  const getTypeDescription = (krType: string) => {
    switch (krType) {
      case 'contribution':
        return 'Contribui diretamente para o objetivo organizacional.';
      case 'enabler':
        return 'Habilita outros KRs ou remove bloqueios.';
      case 'foundational':
        return 'Base essencial. Não tem barra de progresso automática, mas exige evidência.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Novo Key Result de Time</DialogTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    <strong>KR de Time</strong> contribui para um objetivo organizacional e 
                    deve ter um owner responsável. Cada objetivo pode ter no máximo 3 KRs.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <DialogDescription>
            Defina um resultado-chave mensurável. Cada objetivo pode ter no máximo 3 KRs.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Título *</Label>
                {title.trim() && (
                  <VicActionButton
                    agentSlug="coach-okrs"
                    actionContext="okr-create-kr"
                    context={{
                      type: "Key Result",
                      title,
                      baselineValue: parseFloat(baseline) || 0,
                      targetValue: parseFloat(target) || undefined,
                      unit,
                      additionalData: { direction, type },
                    }}
                    label="Transformar em KR mensurável"
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

            {/* KR Type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="type">Tipo de KR</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm mb-2">
                        <strong>Contribuição:</strong> Impacta diretamente a meta.
                      </p>
                      <p className="text-sm mb-2">
                        <strong>Habilitador:</strong> Cria condições para outros KRs.
                      </p>
                      <p className="text-sm">
                        <strong>Fundacional:</strong> Essencial, mas sem métrica automática.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
                {getTypeDescription(type)}
              </p>
            </div>

            <Separator />

            {/* Baseline and Target */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseline">Valor inicial *</Label>
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

            {/* Link to Org KR (optional) */}
            {orgKrs && orgKrs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="linkedOrgKr">
                    KR Organizacional impactado
                    <span className="text-muted-foreground ml-1 font-normal">(opcional)</span>
                  </Label>
                </div>
                <Select
                  value={linkedOrgKrId}
                  onValueChange={setLinkedOrgKrId}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um KR organizacional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {orgKrs.map((kr) => (
                      <SelectItem key={kr.id} value={kr.id}>
                        {kr.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vincule este KR a um resultado organizacional para rastreamento de impacto.
                </p>
              </div>
            )}

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
            {title.trim() && target && type !== 'foundational' && (
              <KrProgressPreview
                title={title}
                baseline={parseFloat(baseline) || 0}
                currentValue={parseFloat(baseline) || 0}
                target={parseFloat(target) || 0}
                unit={unit}
                direction={direction}
              />
            )}

            {/* Foundational type info */}
            {type === 'foundational' && title.trim() && target && (
              <Alert>
                <AlertDescription className="text-sm">
                  KRs Fundacionais não exibem barra de progresso automática. 
                  O avanço será validado por meio de evidências fornecidas nos check-ins.
                </AlertDescription>
              </Alert>
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
