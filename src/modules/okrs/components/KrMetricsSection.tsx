/**
 * KrMetricsSection - Seção para vincular KPIs a Key Results
 * 
 * Permite associar:
 * - 1 KPI Primário (alimenta o progresso do KR)
 * - N Guardrails (monitoram limites operacionais)
 * 
 * Utiliza os hooks existentes: useOkrKrMetrics, useCreateKrMetric, useDeleteKrMetric
 * 
 * Referência: Plano UI Vinculação KPI ↔ KR
 */

import { useState } from 'react';
import { Activity, AlertTriangle, Plus, Trash2, Info, Gauge, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiSelect } from '@/components/selects/KpiSelect';
import {
  usePrimaryKrMetric,
  useGuardrailKrMetrics,
  useCreateKrMetric,
  useDeleteKrMetric,
} from '../hooks/useOkrKrMetrics';
import type { OkrMetricRole } from '../types';

interface KrMetricsSectionProps {
  krId: string;
  krType: 'org' | 'team';
  teamId?: string;
  disabled?: boolean;
}

export function KrMetricsSection({
  krId,
  krType,
  teamId,
  disabled = false,
}: KrMetricsSectionProps) {
  const [showGuardrailSelect, setShowGuardrailSelect] = useState(false);

  // Queries
  const { 
    data: primaryMetric, 
    isLoading: isLoadingPrimary,
    isPending: isPendingPrimary,
  } = usePrimaryKrMetric(krId, krType);
  const { 
    data: guardrails = [], 
    isLoading: isLoadingGuardrails,
    isPending: isPendingGuardrails,
  } = useGuardrailKrMetrics(krId, krType);

  // Mutations
  const createMutation = useCreateKrMetric();
  const deleteMutation = useDeleteKrMetric();

  // isPending = true when query has never fetched (including when disabled)
  // isLoading = true when actively fetching for first time
  const isLoading = isLoadingPrimary || isLoadingGuardrails || isPendingPrimary || isPendingGuardrails;

  // IDs já vinculados (para excluir do select)
  const excludeIds = [
    ...(primaryMetric?.kpi_id ? [primaryMetric.kpi_id] : []),
    ...guardrails.map((g) => g.kpi_id),
  ];

  const handleAddMetric = (kpiId: string | null, role: OkrMetricRole) => {
    if (!kpiId) return;

    createMutation.mutate({
      kr_id: krId,
      kr_type: krType,
      kpi_id: kpiId,
      role,
    });
    
    if (role === 'guardrail') {
      setShowGuardrailSelect(false);
    }
  };

  const handleRemoveMetric = (metricId: string) => {
    deleteMutation.mutate(metricId);
  };

  const handleChangePrimary = (kpiId: string | null) => {
    // Se já tem primary, remove primeiro
    if (primaryMetric) {
      deleteMutation.mutate(primaryMetric.id, {
        onSuccess: () => {
          if (kpiId) {
            handleAddMetric(kpiId, 'primary');
          }
        },
      });
    } else if (kpiId) {
      handleAddMetric(kpiId, 'primary');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Separator />
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Separator />
      
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Métricas Vinculadas</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Vincule indicadores (KPIs) para monitorar o progresso deste Key Result.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* KPI Primário */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-primary" />
          <Label htmlFor="primary-kpi" className="text-xs font-medium">
            KPI Primário
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  O KPI primário alimenta automaticamente o progresso do KR.
                  Apenas 1 por KR.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <KpiSelect
          value={primaryMetric?.kpi_id}
          onValueChange={handleChangePrimary}
          placeholder="Selecione o KPI primário"
          excludeIds={guardrails.map((g) => g.kpi_id)}
          teamId={teamId}
          allowNone={true}
          noneLabel="Nenhum"
          disabled={disabled || createMutation.isPending || deleteMutation.isPending}
        />
        
        {primaryMetric?.kpi && (
          <p className="text-xs text-muted-foreground">
            {primaryMetric.kpi.direction === 'up' ? '↑' : primaryMetric.kpi.direction === 'down' ? '↓' : '='}{' '}
            Meta: {primaryMetric.kpi.target_value ?? '—'} {primaryMetric.kpi.unit}
          </p>
        )}
      </div>

      {/* Guardrails */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5 text-warning" />
            <Label className="text-xs font-medium">Guardrails</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Guardrails monitoram limites operacionais. Alertam quando ultrapassados.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {!showGuardrailSelect && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowGuardrailSelect(true)}
              disabled={disabled || createMutation.isPending}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Lista de guardrails existentes */}
        {guardrails.length > 0 && (
          <div className="space-y-1.5">
            {guardrails.map((guardrail) => (
              <div
                key={guardrail.id}
                className="flex items-center justify-between p-2 rounded-md bg-muted/50 border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                  <span className="text-sm truncate">
                    {guardrail.kpi?.name ?? 'KPI não encontrado'}
                  </span>
                  {guardrail.kpi?.unit && (
                    <span className="text-xs text-muted-foreground">
                      ({guardrail.kpi.unit})
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveMetric(guardrail.id)}
                  disabled={disabled || deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Select para adicionar novo guardrail */}
        {showGuardrailSelect && (
          <div className="flex gap-2">
            <div className="flex-1">
              <KpiSelect
                onValueChange={(kpiId) => handleAddMetric(kpiId, 'guardrail')}
                placeholder="Selecione um indicador"
                excludeIds={excludeIds}
                teamId={teamId}
                disabled={disabled || createMutation.isPending}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowGuardrailSelect(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        )}

        {guardrails.length === 0 && !showGuardrailSelect && (
          <p className="text-xs text-muted-foreground">
            Nenhum guardrail configurado
          </p>
        )}
      </div>
    </div>
  );
}
