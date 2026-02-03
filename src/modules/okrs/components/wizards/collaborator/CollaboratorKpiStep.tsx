/**
 * CollaboratorKpiStep - Etapa de Preenchimento de KPIs no Wizard Colaborador
 * 
 * Permite ao colaborador registrar valores para os KPIs que ele é responsável.
 * Segue o padrão fail-safe: erros no módulo KPI não bloqueiam o wizard.
 * 
 * Regra de negócio: Data de referência deve ser consolidada (dia anterior a hoje).
 */

import { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, subDays, startOfDay, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ArrowRight,
  SkipForward,
  BarChart3,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validation } from '@/lib/validationMessages';
import { RAG_STATUS_COLORS, CONFIDENCE_COLORS } from '@/lib/colors';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import type { KpiForWizard } from '@/modules/kpis/hooks';
import type { KpiConfidenceLevel, KpiRagStatus } from '@/modules/kpis/types';
import type { KpiCheckinResult } from '@/modules/okrs/types/wizard';

// Re-export for convenience
export type { KpiCheckinResult };

export interface CollaboratorKpiStepProps {
  kpi: KpiForWizard;
  currentIndex: number;
  totalCount: number;
  onComplete: (result: KpiCheckinResult) => void;
  onSkip: () => void;
  onBack: () => void;
}

// ============================================================
// FORM SCHEMA
// ============================================================

const formSchema = z.object({
  value: z.coerce.number({ required_error: validation.required('Valor') }),
  reference_date: z.string()
    .min(1, validation.required('Data de referência'))
    .refine((date) => {
      const selectedDate = startOfDay(new Date(date));
      const today = startOfDay(new Date());
      return isBefore(selectedDate, today);
    }, { message: validation.consolidatedDate('Data de referência') }),
  confidence: z.enum(['high', 'medium', 'low'], {
    required_error: validation.requiredSelect('Confiança'),
  }),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ============================================================
// HELPERS
// ============================================================

const RAG_CONFIG: Record<KpiRagStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  on_track: { label: 'No caminho', className: RAG_STATUS_COLORS.green.badge, icon: CheckCircle2 },
  at_risk: { label: 'Em risco', className: RAG_STATUS_COLORS.yellow.badge, icon: AlertTriangle },
  off_track: { label: 'Fora da meta', className: RAG_STATUS_COLORS.red.badge, icon: AlertTriangle },
  no_data: { label: 'Sem dados', className: 'bg-muted text-muted-foreground', icon: BarChart3 },
};

const CONFIDENCE_CONFIG: Record<KpiConfidenceLevel, { label: string; emoji: string }> = {
  high: { label: 'Alta', emoji: '🟢' },
  medium: { label: 'Média', emoji: '🟡' },
  low: { label: 'Baixa', emoji: '🔴' },
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  manual: 'Manual',
};

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorKpiStep({
  kpi,
  currentIndex,
  totalCount,
  onComplete,
  onSkip,
  onBack,
}: CollaboratorKpiStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data máxima permitida: ontem (dados consolidados)
  const maxDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: undefined,
      reference_date: maxDate,
      confidence: 'medium',
      notes: '',
    },
  });
  
  const watchedValue = form.watch('value');
  
  // Estimar RAG status baseado no valor inserido
  const estimatedRag = useMemo((): KpiRagStatus | null => {
    if (watchedValue === undefined || watchedValue === null || kpi.target_value === null) {
      return null;
    }
    
    const target = kpi.target_value;
    const value = watchedValue;
    const direction = kpi.direction;
    
    let percentOfTarget: number;
    if (direction === 'up') {
      percentOfTarget = target > 0 ? (value / target) * 100 : 0;
    } else if (direction === 'down') {
      percentOfTarget = target > 0 ? ((target - value + target) / target) * 100 : 0;
    } else {
      // maintain
      const diff = Math.abs(value - target);
      percentOfTarget = target > 0 ? ((target - diff) / target) * 100 : 100;
    }
    
    if (percentOfTarget >= 70) return 'on_track';
    if (percentOfTarget >= 40) return 'at_risk';
    return 'off_track';
  }, [watchedValue, kpi.target_value, kpi.direction]);
  
  // Notes obrigatórias para RAG amarelo/vermelho
  const notesRequired = estimatedRag && estimatedRag !== 'on_track';
  
  const onSubmit = useCallback(async (values: FormValues) => {
    // Validar notes se RAG não é verde
    if (notesRequired && (!values.notes || values.notes.trim().length === 0)) {
      form.setError('notes', {
        type: 'manual',
        message: 'Justificativa obrigatória para indicadores fora da meta',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      onComplete({
        kpiId: kpi.id,
        kpiName: kpi.name,
        previousValue: kpi.latest_value,
        newValue: values.value,
        referenceDate: values.reference_date,
        confidence: values.confidence,
        notes: values.notes,
        skipped: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [onComplete, kpi, notesRequired, form]);
  
  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);
  
  const ragConfig = RAG_CONFIG[kpi.latest_rag_status];
  const RagIcon = ragConfig.icon;
  
  // Calcular variação se houver valor anterior
  const valueChange = useMemo(() => {
    if (watchedValue === undefined || kpi.latest_value === null) return null;
    return watchedValue - kpi.latest_value;
  }, [watchedValue, kpi.latest_value]);

  // v2.83.0: Get owner name for contributor clarity message
  const ownerName = (kpi as any).owner_name || null;
  const isContributor = (kpi as any).userRole === 'contributor';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">Atualizar Indicador</h3>
                <AskToVicStepHelper
                  context={{
                    module: 'kpis',
                    wizard: 'collaborator',
                    step: 'kpi-checkin',
                    userRole: 'colaborador',
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                KPI {currentIndex + 1} de {totalCount}
              </p>
            </div>
          </div>
          
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            {FREQUENCY_LABELS[kpi.frequency] || kpi.frequency}
          </Badge>
        </div>
        
        {/* v2.83.0: Contributor clarity message */}
        {isContributor && ownerName && (
          <div className="mt-3 p-3 rounded-lg bg-info-muted border border-info/30">
            <p className="text-xs text-info-muted-foreground">
              <strong>Você é contribuidor de dados.</strong> Você está atualizando este indicador 
              porque contribui com os dados operacionais. O responsável final por este KPI é{' '}
              <span className="font-medium">{ownerName}</span>.
            </p>
          </div>
        )}
      </div>

      {/* KPI Info Card */}
      <div className="px-6 py-4 border-b bg-muted/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-base">{kpi.name}</h4>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className={cn('text-xs', ragConfig.className)}>
                <RagIcon className="h-3 w-3 mr-1" />
                {ragConfig.label}
              </Badge>
              {kpi.needs_update && (
                <Badge variant="outline" className="text-xs text-status-orange border-status-orange/30">
                  Precisa atualização
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-right flex-shrink-0">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Meta: {kpi.target_value} {kpi.unit}
            </div>
            {kpi.latest_value !== null && (
              <p className="text-lg font-bold mt-1">
                {kpi.latest_value} {kpi.unit}
              </p>
            )}
            {kpi.latest_reference_date && (
              <p className="text-xs text-muted-foreground">
                Último: {format(new Date(kpi.latest_reference_date), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
        </div>
        
        {/* Recovery Protocol (se existir) */}
        {kpi.recovery_protocol && kpi.latest_rag_status !== 'on_track' && (
          <div className="mt-3 p-2 rounded bg-warning-muted border border-warning/30">
            <p className="text-xs font-medium text-warning-muted-foreground">
              Protocolo de Recuperação:
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {kpi.recovery_protocol}
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <Form {...form}>
          <form id="kpi-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Value Input */}
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo Valor ({kpi.unit})</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={`Ex: ${kpi.target_value || 100}`}
                        className="pr-20"
                        {...field}
                      />
                      {valueChange !== null && (
                        <div className={cn(
                          'absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm font-medium',
                          valueChange > 0 ? 'text-success' : valueChange < 0 ? 'text-destructive' : 'text-muted-foreground'
                        )}>
                          {valueChange > 0 ? <TrendingUp className="h-4 w-4" /> : valueChange < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                          {valueChange > 0 ? '+' : ''}{valueChange.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  {estimatedRag && (
                    <p className={cn(
                      'text-xs',
                      estimatedRag === 'on_track' ? 'text-success' : 
                      estimatedRag === 'at_risk' ? 'text-warning' : 'text-destructive'
                    )}>
                      Status estimado: {RAG_CONFIG[estimatedRag].label}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Reference Date */}
            <FormField
              control={form.control}
              name="reference_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Referência</FormLabel>
                  <FormControl>
                    <Input type="date" max={maxDate} {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Informe o último dia do período consolidado (até ontem)
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Confidence */}
            <FormField
              control={form.control}
              name="confidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confiança no Valor</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a confiança" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(CONFIDENCE_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.emoji} {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Observações {notesRequired && <span className="text-destructive">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={
                        notesRequired
                          ? 'Explique o desvio da meta (obrigatório para indicadores amarelo/vermelho)'
                          : 'Contexto adicional sobre este valor...'
                      }
                      className={cn(notesRequired && 'border-warning')}
                      {...field}
                    />
                  </FormControl>
                  {notesRequired && (
                    <p className="text-xs text-warning">
                      Justificativa obrigatória para indicadores fora da meta
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso</span>
            <span>{currentIndex + 1} de {totalCount}</span>
          </div>
          <Progress value={((currentIndex + 1) / totalCount) * 100} className="h-1.5" />
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onBack} size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleSkip}
            size="sm"
            className="text-muted-foreground"
          >
            <SkipForward className="h-4 w-4 mr-1" />
            Pular
          </Button>
          
          <Button
            type="submit"
            form="kpi-form"
            className="flex-1"
            disabled={isSubmitting}
          >
            {currentIndex < totalCount - 1 ? (
              <>
                Próximo
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Concluir KPIs
                <CheckCircle2 className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
