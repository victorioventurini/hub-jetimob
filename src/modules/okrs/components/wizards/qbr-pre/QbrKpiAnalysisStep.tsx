/**
 * QbrKpiAnalysisStep - Step 2: Análise de KPIs e Métricas
 *
 * Carrega KPIs do escopo do líder com valor atual, RAG status e variação.
 *
 * Modos:
 *  - Lista (default): renderiza alert / outdated / no_data / healthy em blocos.
 *    Usado por QBR-Pré.
 *  - Paginado (`paginated=true`): renderiza UM KPI por página, exigindo a ação
 *    obrigatória de cada bucket (justify / update-value / explain-no-data).
 *    Usado por Pré-MBR.
 */

import { memo, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Activity, AlertTriangle, Target, Users, Clock, BarChart3, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
import { KpiScopeBadge } from '@/modules/kpis/components/KpiScopeBadge';
import { KpiSparkline, KpiValueEntryForm } from '@/modules/kpis/components/shared';
import { KpiDetailContent } from '@/modules/kpis/components/KpiDetailContent';
import { AreaBadge } from '@/components/ui/area-badge';
import { useBu } from '@/contexts/BuContext';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,

  KpiStatusBlocks,
  useKpiStatusClassification,
  getKpiActionBucket,
  InlineAgendaSuggestionInput,
  JustificationField,
} from '../shared';
import type { KpiActionBucket } from '../shared';
import type { KpiInputType } from '@/modules/kpis/types';
import type {
  MbrKpiSnapshot,
  TeamCheckinDecision,
  RitualAgendaSuggestion,
} from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface QbrKpiAnalysisStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  agendaTriggerLabel?: string;
  /**
   * Quando passado, exibe um campo de justificativa obrigatório por KPI em
   * alerta (yellow/red). Usado pelo Pré-MBR (rito reflexivo) — bloqueia o
   * avanço enquanto houver justificativa pendente.
   */
  kpiJustifications?: Record<string, string>;
  onKpiJustificationChange?: (kpiId: string, value: string) => void;
  /** Quando true, bloqueia o "Continuar" se faltar justificativa em algum alerta. */
  requireJustifications?: boolean;
  /**
   * Quando true, oculta o seletor de categorias (Performance/Projetos/Pessoas)
   * no input de sugestão de pauta. Usado pelo MBR-Pré para alinhar com o
   * padrão do Check-in Individual.
   */
  agendaCategoryless?: boolean;

  // ─── Modo paginado (rito reflexivo Pré-MBR) ──────────────────────
  /**
   * Quando true, renderiza UM KPI por página exigindo a ação obrigatória
   * de cada bucket (justify / update-value / explain-no-data).
   * KPIs verdes em dia (`view`) ficam num bloco-resumo após o último.
   */
  paginated?: boolean;
  /** Índice atual da paginação (controlado pelo consumidor). */
  currentKpiIndex?: number;
  onKpiIndexChange?: (next: number) => void;
  /** Razões de "sem dados" (chave: kpiId). */
  kpiNoDataReasons?: Record<string, string>;
  onKpiNoDataReasonChange?: (kpiId: string, value: string) => void;
  /**
   * Marca, na sessão, KPIs que já tiveram valor atualizado durante o rito
   * (chave: kpiId). Usado para liberar o avanço sem refetch imediato.
   */
  kpiUpdatedInSession?: Record<string, boolean>;
  /**
   * Submit do valor para um KPI desatualizado. Consumidor deve persistir
   * em `kpi_values` (canon: `useKpiData().addKpiValue`) e marcar
   * `kpiUpdatedInSession[kpiId] = true` em sucesso.
   */
  onKpiValueSubmit?: (
    kpiId: string,
    values: { value: number; reference_date: string; input_type: KpiInputType; notes?: string },
  ) => Promise<void> | void;
}

// ============================================================
// HELPERS
// ============================================================

const RAG_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  green: { label: 'Na meta', color: 'text-status-green', bg: 'bg-status-green-muted' },
  yellow: { label: 'Atenção', color: 'text-status-amber', bg: 'bg-status-amber-muted' },
  red: { label: 'Crítico', color: 'text-status-red', bg: 'bg-status-red-muted' },
  no_data: { label: 'Sem dados', color: 'text-muted-foreground', bg: 'bg-muted' },
};

// ============================================================
// MEMOIZED CARD (Mandatory React.memo for list cards)
// ============================================================

interface KpiAnalysisCardProps {
  kpi: MbrKpiSnapshot;
  buName?: string | null;
  tone?: 'alert' | 'healthy' | 'muted';
  /**
   * Modo de ação obrigatória do líder. Default `view` (sem campo).
   * Mantemos `showJustification` por retro-compat: equivale a `mode='justify'`.
   */
  mode?: KpiActionBucket;
  showJustification?: boolean;
  justificationValue?: string;
  onJustificationChange?: (kpiId: string, value: string) => void;
  // Modo `explain-no-data`
  noDataReasonValue?: string;
  onNoDataReasonChange?: (kpiId: string, value: string) => void;
  // Modo `update-value`
  onValueSubmit?: (
    kpiId: string,
    values: { value: number; reference_date: string; input_type: KpiInputType; notes?: string },
  ) => Promise<void> | void;
  /** Marca quando o KPI já foi atualizado nesta sessão (libera "Próximo"). */
  alreadyUpdated?: boolean;
}

const FORM_ID_PREFIX = 'mbr-pre-kpi-update';

const KpiAnalysisCard = memo(function KpiAnalysisCard({
  kpi,
  buName,
  tone,
  mode,
  showJustification,
  justificationValue,
  onJustificationChange,
  noDataReasonValue,
  onNoDataReasonChange,
  onValueSubmit,
  alreadyUpdated,
}: KpiAnalysisCardProps) {
  // Retro-compat: showJustification (forma antiga em QBR-Pré) → mode='justify'
  const effectiveMode: KpiActionBucket =
    mode ?? (showJustification ? 'justify' : 'view');

  const rag = RAG_STYLES[kpi.ragStatus] || RAG_STYLES.no_data;
  const cardBorder =
    tone === 'healthy'
      ? 'border-status-green/20'
      : tone === 'muted'
        ? 'border-muted'
        : '';

  const handleJustificationChange = useCallback(
    (v: string) => onJustificationChange?.(kpi.kpiId, v),
    [kpi.kpiId, onJustificationChange],
  );
  const handleNoDataReasonChange = useCallback(
    (v: string) => onNoDataReasonChange?.(kpi.kpiId, v),
    [kpi.kpiId, onNoDataReasonChange],
  );
  const handleValueSubmit = useCallback(
    async (values: { value: number; reference_date: string; input_type: KpiInputType; notes?: string }) => {
      await onValueSubmit?.(kpi.kpiId, values);
    },
    [kpi.kpiId, onValueSubmit],
  );

  return (
    <Card className={cardBorder}>
      <CardContent className="p-4 space-y-3">
        {/* Header row: name + badges (left) | meta + value + last date (right) */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <KpiNameLink
              kpiId={kpi.kpiId}
              name={kpi.name}
              className="text-sm font-medium"
            />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">KPI</Badge>
              <Badge variant="secondary" className={cn('text-xs gap-1', rag.bg, rag.color)}>
                {kpi.ragStatus === 'red' || kpi.ragStatus === 'yellow' ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : null}
                {rag.label}
              </Badge>
              {effectiveMode === 'update-value' && (
                <Badge variant="outline" className="text-xs gap-1 text-status-amber border-status-amber/40">
                  <Clock className="h-3 w-3" />
                  Desatualizado
                </Badge>
              )}
              {effectiveMode === 'explain-no-data' && (
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                  <BarChart3 className="h-3 w-3" />
                  Sem dados
                </Badge>
              )}
              {alreadyUpdated && (
                <Badge variant="outline" className="text-xs gap-1 text-status-green border-status-green/40">
                  <CheckCircle2 className="h-3 w-3" />
                  Atualizado nesta sessão
                </Badge>
              )}
              {kpi.areaName && (
                <AreaBadge area={{ name: kpi.areaName, color: kpi.areaColor ?? null }} />
              )}
              {kpi.teamName && (
                <Badge variant="outline" className="text-xs whitespace-nowrap gap-1">
                  <Users className="h-3 w-3" />
                  {kpi.teamName}
                </Badge>
              )}
              {kpi.scope && (
                <KpiScopeBadge scope={kpi.scope} buName={buName ?? undefined} />
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            {kpi.target != null && (
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Meta: {kpi.target} {kpi.unit ?? ''}
              </div>
            )}
            {kpi.currentValue != null ? (
              <p className="text-lg font-bold mt-1 leading-tight">
                {kpi.currentValue} {kpi.unit ?? ''}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Sem dados</p>
            )}
            {kpi.lastValueAt && (
              <p className="text-[11px] text-muted-foreground">
                Último: {format(new Date(kpi.lastValueAt), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Sparkline */}
        {kpi.ragStatus !== 'no_data' && (
          <div className="rounded-md border bg-background/40 px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-muted-foreground">Evolução recente</span>
              <span className="text-[10px] text-muted-foreground">últimos 12 registros</span>
            </div>
            <KpiSparkline
              kpiId={kpi.kpiId}
              unit={kpi.unit ?? ''}
              target={kpi.target}
              height={64}
              pointsLimit={12}
            />
          </div>
        )}

        {/* Ação obrigatória — varia por bucket */}
        {effectiveMode === 'justify' && onJustificationChange && (
          <JustificationField
            id={`kpi-just-${kpi.kpiId}`}
            label="Justifique o desvio do KPI"
            hint="Obrigatório — explique por que está fora da meta e o plano de ação."
            required
            value={justificationValue ?? ''}
            onChange={handleJustificationChange}
          />
        )}

        {effectiveMode === 'explain-no-data' && onNoDataReasonChange && (
          <JustificationField
            id={`kpi-nodata-${kpi.kpiId}`}
            label="Por que este KPI está sem dados?"
            hint="Obrigatório — explique a ausência de registros e o plano para sanar."
            required
            value={noDataReasonValue ?? ''}
            onChange={handleNoDataReasonChange}
          />
        )}

        {effectiveMode === 'update-value' && onValueSubmit && !alreadyUpdated && (
          <div className="rounded-md border bg-warning-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium text-warning-foreground">
              Registre o valor atualizado deste KPI antes de continuar.
            </p>
            <KpiValueEntryForm
              unit={kpi.unit ?? ''}
              consolidationFrequency={kpi.consolidationFrequency ?? null}
              updateFrequency={kpi.updateFrequency ?? null}
              placeholderValue={kpi.target ?? undefined}
              formId={`${FORM_ID_PREFIX}-${kpi.kpiId}`}
              onValidSubmit={handleValueSubmit}
            />
            <Button
              type="submit"
              form={`${FORM_ID_PREFIX}-${kpi.kpiId}`}
              size="sm"
              className="w-full"
            >
              Registrar valor
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================
// COMPONENT
// ============================================================

export function QbrKpiAnalysisStep({
  kpiSnapshots,
  onContinue,
  onBack,
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
  kpiJustifications,
  onKpiJustificationChange,
  requireJustifications,
  agendaCategoryless = false,
  paginated = false,
  currentKpiIndex = 0,
  onKpiIndexChange,
  kpiNoDataReasons,
  onKpiNoDataReasonChange,
  kpiUpdatedInSession,
  onKpiValueSubmit,
}: QbrKpiAnalysisStepProps) {
  const { currentBu } = useBu();

  const uniqueKpiSnapshots = useMemo(() => {
    const seen = new Set<string>();
    return kpiSnapshots.filter((kpi) => {
      if (seen.has(kpi.kpiId)) return false;
      seen.add(kpi.kpiId);
      return true;
    });
  }, [kpiSnapshots]);

  const { outdated, pending } = useKpiStatusClassification(uniqueKpiSnapshots);
  const statusBlockKpiIds = useMemo(
    () => new Set([...outdated, ...pending].map((kpi) => kpi.kpiId)),
    [outdated, pending],
  );

  const alertKpis = uniqueKpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow');
  const healthyKpis = uniqueKpiSnapshots.filter(
    k => k.ragStatus === 'green' && !statusBlockKpiIds.has(k.kpiId),
  );
  const noDataKpis = uniqueKpiSnapshots.filter(
    k => k.ragStatus === 'no_data' && !statusBlockKpiIds.has(k.kpiId),
  );

  const handleJustificationChange = useCallback(
    (kpiId: string, value: string) => onKpiJustificationChange?.(kpiId, value),
    [onKpiJustificationChange],
  );
  const handleNoDataReasonChange = useCallback(
    (kpiId: string, value: string) => onKpiNoDataReasonChange?.(kpiId, value),
    [onKpiNoDataReasonChange],
  );

  // ─── Lista ordenada de KPIs que exigem ação (modo paginado) ────────
  // Ordem: alert → outdated → no_data. KPIs verdes em dia ficam num
  // bloco-resumo após o último KPI acionável.
  const actionableKpis = useMemo(
    () => paginated ? [...alertKpis, ...outdated, ...noDataKpis] : [],
    [paginated, alertKpis, outdated, noDataKpis],
  );

  const safeIndex = Math.min(Math.max(currentKpiIndex, 0), Math.max(actionableKpis.length, 1) - 1);
  const currentKpi = paginated ? actionableKpis[safeIndex] : null;
  const currentBucket: KpiActionBucket | null = currentKpi ? getKpiActionBucket(currentKpi) : null;

  const isCurrentSatisfied = useMemo(() => {
    if (!currentKpi || !currentBucket) return true;
    if (currentBucket === 'justify') {
      return ((kpiJustifications?.[currentKpi.kpiId] ?? '').trim().length > 0);
    }
    if (currentBucket === 'explain-no-data') {
      return ((kpiNoDataReasons?.[currentKpi.kpiId] ?? '').trim().length > 0);
    }
    if (currentBucket === 'update-value') {
      return Boolean(kpiUpdatedInSession?.[currentKpi.kpiId]);
    }
    return true;
  }, [currentKpi, currentBucket, kpiJustifications, kpiNoDataReasons, kpiUpdatedInSession]);

  const missingJustifications = requireJustifications
    ? alertKpis.filter((k) => !((kpiJustifications?.[k.kpiId] ?? '').trim())).length
    : 0;

  // Soma global do "missing" para liberar avanço final no modo paginado.
  const totalMissing = useMemo(() => {
    if (!paginated) return missingJustifications;
    let n = 0;
    for (const k of alertKpis) {
      if (!((kpiJustifications?.[k.kpiId] ?? '').trim())) n++;
    }
    for (const k of outdated) {
      if (!kpiUpdatedInSession?.[k.kpiId]) n++;
    }
    for (const k of noDataKpis) {
      if (!((kpiNoDataReasons?.[k.kpiId] ?? '').trim())) n++;
    }
    return n;
  }, [paginated, missingJustifications, alertKpis, outdated, noDataKpis, kpiJustifications, kpiNoDataReasons, kpiUpdatedInSession]);

  // ────────────────────────────────────────────────────────────────────
  // MODO PAGINADO (Pré-MBR)
  // ────────────────────────────────────────────────────────────────────
  if (paginated) {
    const isLast = safeIndex >= actionableKpis.length - 1;
    const goPrev = () => {
      if (safeIndex === 0) {
        onBack();
      } else {
        onKpiIndexChange?.(safeIndex - 1);
      }
    };
    const goNext = () => {
      if (isLast) {
        onContinue();
      } else {
        onKpiIndexChange?.(safeIndex + 1);
      }
    };

    return (
      <WizardStepScaffold
        header={
          <WizardStepHeader
            icon={Activity}
            title="Análise de KPIs"
            tooltip="qbr-kpi-analysis"
            description={
              actionableKpis.length > 0
                ? `KPI ${safeIndex + 1} de ${actionableKpis.length} — ação obrigatória`
                : 'Todos os indicadores estão na meta'
            }
            variant="amber"
            badge={`${uniqueKpiSnapshots.length} KPIs`}
          />
        }
        footer={
          <WizardStepFooter
            onBack={goPrev}
            onPrimary={goNext}
            primaryLabel={isLast ? 'Concluir KPIs' : 'Próximo'}
            primaryDisabled={!isCurrentSatisfied || (isLast && totalMissing > 0)}
          />
        }
        bottomFixed={
          agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
            <InlineAgendaSuggestionInput
              suggestions={agendaSuggestions}
              onSuggestionsChange={onAgendaSuggestionsChange}
              sourceStep="qbr-kpi-analysis"
              triggerLabel={agendaTriggerLabel}
              categoryless={agendaCategoryless}
            />
          ) : undefined
        }
      >
        <div className="p-6 space-y-4">
          {actionableKpis.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progresso</span>
                <span>{safeIndex + 1} de {actionableKpis.length}</span>
              </div>
              <Progress value={((safeIndex + 1) / actionableKpis.length) * 100} className="h-1.5" />
            </div>
          )}

          {currentKpi && currentBucket && (
            <KpiAnalysisCard
              key={currentKpi.kpiId}
              kpi={currentKpi}
              buName={currentBu?.name}
              tone={
                currentBucket === 'justify' ? 'alert'
                : currentBucket === 'update-value' ? undefined
                : currentBucket === 'explain-no-data' ? 'muted'
                : 'healthy'
              }
              mode={currentBucket}
              justificationValue={kpiJustifications?.[currentKpi.kpiId]}
              onJustificationChange={handleJustificationChange}
              noDataReasonValue={kpiNoDataReasons?.[currentKpi.kpiId]}
              onNoDataReasonChange={handleNoDataReasonChange}
              onValueSubmit={onKpiValueSubmit}
              alreadyUpdated={Boolean(kpiUpdatedInSession?.[currentKpi.kpiId])}
            />
          )}

          {/* Bloco-resumo de KPIs verdes em dia (não exigem ação) */}
          {isLast && healthyKpis.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium text-status-green flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                KPIs na meta ({healthyKpis.length})
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {healthyKpis.map((k) => (
                  <li key={k.kpiId} className="flex items-center justify-between gap-2">
                    <span className="truncate">{k.name}</span>
                    <span className="shrink-0">
                      {k.currentValue ?? '—'} {k.unit ?? ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {actionableKpis.length === 0 && (
            <div className="rounded-md border border-status-green/30 bg-status-green-muted/20 p-4 text-sm text-status-green flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Todos os indicadores do time estão na meta e em dia.
            </div>
          )}
        </div>
      </WizardStepScaffold>
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // MODO LISTA (QBR-Pré e fallback)
  // ────────────────────────────────────────────────────────────────────
  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Activity}
          title="Análise de KPIs"
          tooltip="qbr-kpi-analysis"
          description="Revise a saúde dos indicadores"
          variant="amber"
          badge={`${uniqueKpiSnapshots.length} KPIs`}
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={missingJustifications > 0}
        />
      }
      bottomFixed={
        agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
          <InlineAgendaSuggestionInput
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            sourceStep="qbr-kpi-analysis"
            triggerLabel={agendaTriggerLabel}
            categoryless={agendaCategoryless}
          />
        ) : undefined
      }
    >
      <div className="p-6 space-y-6">
        {/* KPIs in alert */}
        {alertKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-amber" />
              KPIs em alerta ({alertKpis.length})
            </h4>
            {alertKpis.map((kpi) => (
              <KpiAnalysisCard
                key={kpi.kpiId}
                kpi={kpi}
                buName={currentBu?.name}
                tone="alert"
                showJustification={requireJustifications}
                justificationValue={kpiJustifications?.[kpi.kpiId]}
                onJustificationChange={handleJustificationChange}
              />
            ))}
          </div>
        )}

        {/* KPIs desatualizados e pendentes */}
        <KpiStatusBlocks kpiSnapshots={uniqueKpiSnapshots} />

        {/* Healthy KPIs */}
        {healthyKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-status-green">
              KPIs na meta ({healthyKpis.length})
            </h4>
            {healthyKpis.map((kpi) => (
              <KpiAnalysisCard key={kpi.kpiId} kpi={kpi} buName={currentBu?.name} tone="healthy" />
            ))}
          </div>
        )}

        {/* No data KPIs */}
        {noDataKpis.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Sem dados ({noDataKpis.length})
            </h4>
            {noDataKpis.map((kpi) => (
              <KpiAnalysisCard key={kpi.kpiId} kpi={kpi} buName={currentBu?.name} tone="muted" />
            ))}
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
