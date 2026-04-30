/**
 * CollaboratorKpiStep — Etapa de Atualização de KPIs (rito Colaborador)
 *
 * v3 (2026-04-30): migrado para `KpiValueEntryForm` (SSOT compartilhado com
 * `AddKpiValueDialog`). O step agora reaproveita 100% dos campos canônicos
 * (Valor, Data, **Tipo do input**, Confiança, Observações) — eliminando
 * divergência com o módulo /kpis. A moldura do wizard (header com KPI/RAG,
 * footer Voltar/Pular/Próximo, regra de notes obrigatórias quando RAG≠verde)
 * permanece local.
 */

import { useCallback, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
import { KpiValueEntryForm } from '@/modules/kpis/components/shared';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import type { KpiForWizard } from '@/modules/kpis/hooks';
import type { KpiInputType, KpiRagStatus } from '@/modules/kpis/types';
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
// HELPERS
// ============================================================

const RAG_CONFIG: Record<KpiRagStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  on_track: { label: 'No caminho', className: RAG_STATUS_COLORS.green.badge, icon: CheckCircle2 },
  at_risk: { label: 'Em risco', className: RAG_STATUS_COLORS.yellow.badge, icon: AlertTriangle },
  off_track: { label: 'Fora da meta', className: RAG_STATUS_COLORS.red.badge, icon: AlertTriangle },
  no_data: { label: 'Sem dados', className: 'bg-muted text-muted-foreground', icon: BarChart3 },
};

// v3.0.0: labels alinhados a KpiFrequencyValue (split consolidation × update).
const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  biweekly: 'Quinzenal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

const FORM_ID = 'collaborator-kpi-form';

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
  const [currentValue, setCurrentValue] = useState<number | undefined>(undefined);
  const [currentInputType, setCurrentInputType] = useState<KpiInputType>('consolidated');

  // Estimar RAG status baseado no valor inserido
  const estimatedRag = useMemo((): KpiRagStatus | null => {
    if (currentValue === undefined || currentValue === null || kpi.target_value === null) {
      return null;
    }

    const target = kpi.target_value;
    const value = currentValue;
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
  }, [currentValue, kpi.target_value, kpi.direction]);

  // Notes obrigatórias para RAG amarelo/vermelho
  const notesRequired = !!estimatedRag && estimatedRag !== 'on_track';

  // Calcular variação se houver valor anterior
  const valueChange = useMemo(() => {
    if (currentValue === undefined || kpi.latest_value === null) return null;
    return currentValue - kpi.latest_value;
  }, [currentValue, kpi.latest_value]);

  const handleValidSubmit = useCallback(
    async (values: { value: number; reference_date: string; input_type: KpiInputType; notes?: string; confidence?: 'high' | 'medium' | 'low' }) => {
      // Validação extra de rito: notes obrigatória quando RAG ≠ verde
      if (notesRequired && (!values.notes || values.notes.trim().length === 0)) {
        // Sinaliza visualmente — o KpiValueEntryForm já aplica border-warning + asterisco.
        // Aqui apenas bloqueamos o avanço.
        return;
      }

      setIsSubmitting(true);
      try {
        onComplete({
          kpiId: kpi.id,
          // Onda 4 Fase 3: kpiName não é mais gravado — readers resolvem via lookup por kpiId.
          previousValue: kpi.latest_value,
          newValue: values.value,
          referenceDate: values.reference_date,
          inputType: values.input_type,
          confidence: values.confidence ?? 'medium',
          notes: values.notes,
          skipped: false,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [onComplete, kpi, notesRequired],
  );

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  const ragConfig = RAG_CONFIG[kpi.latest_rag_status];
  const RagIcon = ragConfig.icon;

  // v2.83.0: Get owner name for contributor clarity message
  const ownerName = (kpi as { owner_name?: string | null }).owner_name || null;
  const isContributor = (kpi as { userRole?: string }).userRole === 'contributor';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
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
            {kpi.update_frequency ? (FREQUENCY_LABELS[kpi.update_frequency] ?? kpi.update_frequency) : '—'}
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
            <KpiNameLink kpiId={kpi.id} name={kpi.name} className="font-medium text-base" />
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

      {/* Form (SSOT compartilhado com /kpis) */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <KpiValueEntryForm
          unit={kpi.unit}
          consolidationFrequency={kpi.consolidation_frequency ?? null}
          updateFrequency={kpi.update_frequency ?? null}
          placeholderValue={kpi.target_value ?? 100}
          confidenceMode="always-visible"
          defaultConfidence="medium"
          formId={FORM_ID}
          notesRequired={notesRequired}
          notesPlaceholder={
            notesRequired
              ? 'Explique o desvio da meta (obrigatório para indicadores amarelo/vermelho)'
              : 'Contexto adicional sobre este valor...'
          }
          notesHeaderSlot={
            notesRequired ? (
              <p className="text-xs text-warning">
                Justificativa obrigatória para indicadores fora da meta
              </p>
            ) : null
          }
          valueAdornmentSlot={
            <div className="flex items-center justify-between gap-2 mt-1">
              {valueChange !== null && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-sm font-medium',
                    valueChange > 0
                      ? 'text-success'
                      : valueChange < 0
                        ? 'text-destructive'
                        : 'text-muted-foreground',
                  )}
                >
                  {valueChange > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : valueChange < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : null}
                  {valueChange > 0 ? '+' : ''}
                  {valueChange.toFixed(2)}
                </span>
              )}
              {estimatedRag && (
                <span
                  className={cn(
                    'text-xs ml-auto',
                    estimatedRag === 'on_track'
                      ? 'text-success'
                      : estimatedRag === 'at_risk'
                        ? 'text-warning'
                        : 'text-destructive',
                  )}
                >
                  Status estimado: {RAG_CONFIG[estimatedRag].label}
                </span>
              )}
            </div>
          }
          onValueChange={setCurrentValue}
          onInputTypeChange={setCurrentInputType}
          onValidSubmit={handleValidSubmit}
        />
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
            form={FORM_ID}
            className="flex-1"
            disabled={isSubmitting}
            data-input-type={currentInputType}
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
