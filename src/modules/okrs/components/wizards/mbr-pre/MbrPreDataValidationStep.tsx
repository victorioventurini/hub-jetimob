/**
 * MbrPreDataValidationStep — Gate inicial do Pré-MBR.
 *
 * Bloqueia o avanço enquanto o time tiver KPIs sem atualização/consolidação
 * pendentes ou KRs sem check-in dentro do mês de referência. O líder pode
 * resolver tudo aqui mesmo:
 *   - KPIs → reusa `AddKpiValueDialog` (canônico, com `KpiValueEntryForm`).
 *   - KRs  → reusa `CheckinDialog` (canônico, com primary KPI auto-lock).
 *
 * Reusa exclusivamente componentes shared (`WizardStepScaffold`,
 * `WizardStepHeader`, `WizardStepFooter`). Nenhum form é duplicado aqui.
 */

import { useMemo, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Target,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import {
  WizardStepScaffold,
  WizardStepHeader,
  WizardStepFooter,
} from '../shared';
import { AddKpiValueDialog } from '@/modules/kpis/components/AddKpiValueDialog';
import { CheckinDialog } from '@/modules/okrs/components/CheckinDialog';
import {
  useMbrPreValidationData,
  type KpiPendingItem,
  type KrPendingItem,
  type KrItem,
} from '@/modules/okrs/hooks/useMbrPreValidationData';
import type { KpiForWizardV2 } from '@/modules/kpis/types';
import { getFrequencyLabel } from '@/modules/kpis/utils/frequency';
import { kpisKeys, mbrKeys } from '@/lib/queryKeys/okrs';
import { useBu } from '@/contexts/BuContext';
import { useAuth } from '@/hooks/useAuth';

// ============================================================
// Types
// ============================================================

export interface MbrPreDataValidationStepProps {
  teamId: string;
  teamName: string | null;
  referenceMonth: string;
  cycleId: string | null;
  /** Objetivos do time já carregados pela página (com KRs e check-ins). */
  teamObjectives: Array<{
    id: string;
    title: string;
    key_results?: Array<{
      id: string;
      title: string;
      status: string;
      current_value: number | null;
      baseline: number | null;
      target: number | null;
      direction: 'up' | 'down' | 'maintain' | null;
      unit: string | null;
      last_checkin_at: string | null;
    }>;
    _isContributed?: boolean;
  }>;
  isLoadingObjectives: boolean;
  onContinue: () => void;
  onBack?: () => void;
}

// ============================================================
// Helpers visuais
// ============================================================

function kpiReasonLabel(
  reason: KpiPendingItem['reason'],
  kpi: KpiForWizardV2,
  referenceMonth: string,
): string {
  const updateLabel = kpi.update_frequency
    ? getFrequencyLabel(kpi.update_frequency).toLowerCase()
    : 'definida';
  switch (reason) {
    case 'overdue':
      return `Atualização atrasada (cadência ${updateLabel})`;
    case 'pending_consolidation':
      return `Sem valor consolidado para ${referenceMonth}`;
    case 'both':
      return `Atualização atrasada e sem consolidado de ${referenceMonth}`;
  }
}

function krReasonLabel(reason: KrPendingItem['reason'], referenceMonth: string): string {
  if (reason === 'never') return 'Nunca recebeu check-in';
  return `Sem check-in dentro de ${referenceMonth}`;
}

// ============================================================
// Component
// ============================================================

export function MbrPreDataValidationStep({
  teamId,
  teamName,
  referenceMonth,
  cycleId,
  teamObjectives,
  isLoadingObjectives,
  onContinue,
  onBack,
}: MbrPreDataValidationStepProps) {
  const queryClient = useQueryClient();
  const { currentBuId } = useBu();
  const { role } = useAuth();
  const isSuperAdmin = role === 'super_admin';

  const {
    kpisPending,
    kpisOk,
    krsPending,
    krsOk,
    totalPending,
    isLoading: isLoadingKpis,
  } = useMbrPreValidationData({
    teamId,
    referenceMonth,
    teamObjectives,
  });

  // Dialog state
  const [activeKpi, setActiveKpi] = useState<KpiForWizardV2 | null>(null);
  const [activeKr, setActiveKr] = useState<KrItem | null>(null);

  const handleKpiDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setActiveKpi(null);
        // Invalida wizardV2 para reclassificar pendências.
        queryClient.invalidateQueries({ queryKey: ['kpis', 'wizard-v2'] });
      }
    },
    [queryClient],
  );

  const handleKrDialogChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setActiveKr(null);
        // Invalida a query de KRs do Pré-MBR para reclassificar.
        queryClient.invalidateQueries({
          queryKey: mbrKeys.preTeamKrs(currentBuId, teamId, cycleId, referenceMonth),
        });
      }
    },
    [queryClient, currentBuId, teamId, cycleId, referenceMonth],
  );

  const isLoading = isLoadingKpis || isLoadingObjectives;

  const primaryLabel = useMemo(() => {
    if (totalPending === 0) return 'Iniciar Pré-MBR';
    return `Resolver pendências (${totalPending})`;
  }, [totalPending]);

  return (
    <>
      <WizardStepScaffold
        header={
          <WizardStepHeader
            icon={ShieldCheck}
            title="Validação de Dados"
            description={`Atualize KPIs e check-ins do time${teamName ? ` ${teamName}` : ''} antes de iniciar o Pré-MBR de ${referenceMonth}.`}
            variant="primary"
          />
        }
        footer={
          <WizardStepFooter
            showBack={!!onBack}
            onBack={onBack}
            primaryLabel={primaryLabel}
            onPrimary={onContinue}
            primaryDisabled={totalPending > 0 || isLoading}
            showSkip={isSuperAdmin && totalPending > 0}
            skipLabel="Pular validação (super admin)"
            onSkip={onContinue}
          />
        }
      >
        <div className="p-6 space-y-6">
          {isLoading && <LoadingState text="Verificando dados do time..." />}

          {!isLoading && (
            <>
              {/* Resumo */}
              <div className="flex flex-wrap gap-2">
                <Badge variant={kpisPending.length > 0 ? 'destructive' : 'secondary'}>
                  {kpisPending.length} KPI(s) pendente(s)
                </Badge>
                <Badge variant={krsPending.length > 0 ? 'destructive' : 'secondary'}>
                  {krsPending.length} KR(s) sem check-in no mês
                </Badge>
                {totalPending === 0 && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Tudo em dia
                  </Badge>
                )}
              </div>

              {/* KPIs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4" />
                    Indicadores (KPIs)
                    <Badge variant="outline" className="ml-2">
                      {kpisPending.length} pendente(s) / {kpisOk.length + kpisPending.length} no time
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {kpisPending.length === 0 && kpisOk.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum KPI sob responsabilidade deste time.
                    </p>
                  )}

                  {kpisPending.map((item) => (
                    <KpiPendingRow
                      key={item.kpi.id}
                      item={item}
                      referenceMonth={referenceMonth}
                      onResolve={() => setActiveKpi(item.kpi)}
                    />
                  ))}

                  {kpisOk.length > 0 && (
                    <details className="pt-2">
                      <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                        {kpisOk.length} KPI(s) em dia
                      </summary>
                      <div className="mt-2 space-y-1 pl-4">
                        {kpisOk.map((kpi) => (
                          <div
                            key={kpi.id}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span>{kpi.name}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>

              {/* KRs */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="w-4 h-4" />
                    Resultados-Chave (KRs)
                    <Badge variant="outline" className="ml-2">
                      {krsPending.length} pendente(s) / {krsOk.length + krsPending.length} no time
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {krsPending.length === 0 && krsOk.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum KR ativo encontrado para este time no ciclo.
                    </p>
                  )}

                  {krsPending.map((item) => (
                    <KrPendingRow
                      key={item.kr.krId}
                      item={item}
                      referenceMonth={referenceMonth}
                      onResolve={() => setActiveKr(item.kr)}
                    />
                  ))}

                  {krsOk.length > 0 && (
                    <details className="pt-2">
                      <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                        {krsOk.length} KR(s) com check-in no mês
                      </summary>
                      <div className="mt-2 space-y-1 pl-4">
                        {krsOk.map((kr) => (
                          <div
                            key={kr.krId}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span>{kr.title}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </WizardStepScaffold>

      {/* KPI input dialog (canônico) */}
      {activeKpi && (
        <AddKpiValueDialog
          kpiId={activeKpi.id}
          kpiName={activeKpi.name}
          unit={activeKpi.unit}
          consolidationFrequency={activeKpi.consolidation_frequency}
          updateFrequency={activeKpi.update_frequency}
          targetValue={activeKpi.target_value}
          direction={activeKpi.direction}
          open={!!activeKpi}
          onOpenChange={handleKpiDialogChange}
        />
      )}

      {/* KR check-in dialog (canônico) */}
      {activeKr && (
        <CheckinDialog
          open={!!activeKr}
          onOpenChange={handleKrDialogChange}
          kr={{
            id: activeKr.krId,
            title: activeKr.title,
            baseline: activeKr.baseline,
            current_value: activeKr.current_value,
            target: activeKr.target,
            direction: activeKr.direction,
            unit: activeKr.unit,
            status: activeKr.status,
            team_id: activeKr.team_id,
            last_checkin_at: activeKr.last_checkin_at,
            team_objective: { title: activeKr.objectiveTitle, cycle_id: cycleId },
          }}
        />
      )}
    </>
  );
}

// ============================================================
// Sub-rows
// ============================================================

function KpiPendingRow({
  item,
  referenceMonth,
  onResolve,
}: {
  item: KpiPendingItem;
  referenceMonth: string;
  onResolve: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/5 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span className="font-medium text-sm truncate">{item.kpi.name}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-6">
          {kpiReasonLabel(item.reason, item.kpi, referenceMonth)}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onResolve}>
        <Plus className="w-3 h-3 mr-1" />
        Registrar
      </Button>
    </div>
  );
}

function KrPendingRow({
  item,
  referenceMonth,
  onResolve,
}: {
  item: KrPendingItem;
  referenceMonth: string;
  onResolve: () => void;
}) {
  const isContributed = !!item.kr.isContributed;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/5 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <span className="font-medium text-sm truncate">{item.kr.title}</span>
          {isContributed && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              contribuído
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 ml-6">
          {krReasonLabel(item.reason, referenceMonth)}
          {' · '}
          <span className="opacity-70">{item.kr.objectiveTitle}</span>
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onResolve}
        disabled={isContributed}
        title={isContributed ? 'Solicite ao time dono atualizar este KR' : undefined}
      >
        Fazer check-in
      </Button>
    </div>
  );
}
