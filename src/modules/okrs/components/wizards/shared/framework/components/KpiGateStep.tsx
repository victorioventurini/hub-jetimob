/**
 * KpiGateStep — Step genérico de KPIs (com ou sem gate obrigatório).
 *
 * v3.0.0: passa a aceitar `buckets` opcional (6 grupos ordenados, ver
 * `classifyKpiGateBuckets`). Quando `buckets` é fornecido, a UI renderiza
 * os blocos colapsáveis com badges (`Parcial`/`Consolidado` + Confidence).
 * Quando ausente, mantém o comportamento legacy de listar `data` chapado.
 *
 * v3.30.0 (Onda KPI Rich Card):
 * - Suporte a `config.cardVariant: 'rich' | 'compact'` (default `compact`).
 *   Em `rich`, cada KPI ganha sparkline canônica (`KpiSparkline`) + bloco
 *   de "Ação do líder" condicionado pelo bucket (justify / explain-no-data /
 *   opcional / read-only). Persistência via props `justifications` +
 *   `onJustificationChange`.
 * - Mantém o componente AGNÓSTICO de `wizardType` (Princípio canônico #4
 *   do Framework Unificado, TCR §4.8.1) — toda variação vive em `config`
 *   ou em props injetadas pelo container (consumidor).
 */

import { memo, useMemo, useState } from 'react';
import { Activity, ChevronDown, ChevronRight, AlertTriangle, ShieldAlert } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import { KpiSparkline } from '@/modules/kpis/components/shared/KpiSparkline';
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
import { formatValueWithUnit } from '@/shared/constants/units';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { KpiGateStepConfig } from '../types';
import type { KpiGateBucket, KpiGateBucketId, KpiGateItem } from '../config/stepContentAdapters';
import { InlineDecisionsSlot } from './_InlineDecisionsSlot';
import { cn } from '@/lib/utils';

export interface KpiGateStepProps {
  persona: WizardPersona;
  version: StructureVersion;
  stepId: string;
  config: KpiGateStepConfig;
  data: KpiGateItem[];
  onDataChange: (next: KpiGateItem[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (next: TeamCheckinDecision[]) => void;
  footer: React.ReactNode;
  suppressInlineDecisions?: boolean;
  /** v3.0.0 — quando fornecido, renderiza 6 blocos ordenados ao invés de `data` chapado. */
  buckets?: KpiGateBucket[];
  /**
   * v3.30.0 (rich) — mapa kpiId → texto da justificativa/plano do líder.
   * Apenas usado quando `config.cardVariant === 'rich' | 'rich-paginated'`.
   */
  justifications?: Record<string, string>;
  /**
   * v3.30.0 (rich) — callback de mudança da justificativa de um KPI.
   * Apenas usado quando `config.cardVariant === 'rich' | 'rich-paginated'`.
   */
  onJustificationChange?: (kpiId: string, value: string) => void;
  /**
   * v3.31.0 (rich-paginated) — índice do KPI atualmente visível
   * (controlado pelo container, mesmo padrão do `MbrPreKrAnalysisStep`).
   */
  currentKpiIndex?: number;
  /** v3.31.0 (rich-paginated) — callback ao mudar de KPI via Anterior/Próximo. */
  onKpiIndexChange?: (next: number) => void;
  /**
   * v3.31.1 — mapa kpiId → "Por que está sem dados" (causa).
   * Apenas usado quando `config.splitNoDataReason === true`.
   */
  noDataReasons?: Record<string, string>;
  /** v3.31.1 — callback de mudança da razão de ausência de dados. */
  onNoDataReasonChange?: (kpiId: string, value: string) => void;
  /**
   * v3.33.0 — quando `true`, desabilita os textareas de justificativa/razão.
   * Use em ritos de leitura (ex: MBR Deep Dive) que apenas reapresentam o
   * que o líder respondeu no Pré-MBR.
   */
  readOnlyJustification?: boolean;
  /**
   * v3.33.0 — slot opcional renderizado abaixo do card no modo
   * `rich-paginated`. Usado para anexar painéis derivados (ex: insights do
   * líder, addendums) sem duplicar o card. Agnóstico de wizardType.
   */
  extraContentForCurrentKpi?: (kpi: KpiGateItem) => React.ReactNode;
}

const STATUS_STYLES: Record<KpiGateItem['status'], string> = {
  green: 'bg-status-green-muted text-status-green border-status-green/30',
  amber: 'bg-status-amber-muted text-status-amber border-status-amber/30',
  red: 'bg-status-red-muted text-status-red border-status-red/30',
  unknown: 'bg-muted text-muted-foreground border-border',
};

const COLLAPSED_BY_DEFAULT: ReadonlySet<KpiGateBucketId> = new Set(['teamContext']);

// ────────────────────────────────────────────────────────────────────
// COMPACT CARD (legado v3.0.0)
// ────────────────────────────────────────────────────────────────────

function KpiCardItem({ kpi }: { kpi: KpiGateItem }) {
  const isPartial = kpi.lastInputType === 'partial';
  return (
    <Card className={cn('p-4 border', STATUS_STYLES[kpi.status])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{kpi.name}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {kpi.currentValue ?? '—'} {kpi.target && <>/ meta: {kpi.target}</>}
          </p>
          {kpi.lastInputType && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge
                variant={isPartial ? 'outline' : 'secondary'}
                className={cn('text-[10px] h-5', isPartial && 'border-dashed')}
              >
                {isPartial ? 'Parcial' : 'Consolidado'}
              </Badge>
            </div>
          )}
        </div>
        {kpi.requiresDecision && (
          <Badge variant={kpi.resolved ? 'secondary' : 'destructive'} className="text-xs shrink-0">
            {kpi.resolved ? 'Endereçado' : 'Requer decisão'}
          </Badge>
        )}
      </div>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────
// RICH CARD (v3.30.0)
// ────────────────────────────────────────────────────────────────────

/** Modo de ação do líder por bucket (decide o bloco "Ação do líder"). */
export type ActionMode = 'explain-no-data' | 'justify-required' | 'justify-optional' | 'view';

/**
 * Decide o modo de ação considerando bucket + status do KPI.
 *
 * `teamContext` agrupa KPIs sob responsabilidade operacional do time
 * (via `responsible_team_id`), incluindo KPIs de área (`scope=area`).
 * Quando esses KPIs estão em alerta, o líder do time deve apresentar plano
 * de ação — equiparando-os aos KPIs estratégicos em `critical`/`attention`.
 */
export function actionModeForKpi(bucketId: KpiGateBucketId, kpi: KpiGateItem): ActionMode {
  // Regras canônicas (SSOT mem://features/kpis/kpis-master-standard §4):
  // - bucket MANDATORY → sempre obrigatório
  // - teamContext red → obrigatório; amber → opcional
  // - teamContext unknown (sem dados) → obrigatório (explain-no-data)
  // - target ausente (sem meta cadastrada) → obrigatório em qualquer bucket
  //   (exceto buckets cujo modo já é mais restritivo)
  const noTarget = kpi.target == null || (kpi.target as unknown as string) === '';
  switch (bucketId) {
    case 'overdue':
      return 'explain-no-data';
    case 'critical':
    case 'guardrailViolated':
      return 'justify-required';
    case 'attention':
      return noTarget ? 'justify-required' : 'justify-optional';
    case 'teamContext':
      if (kpi.status === 'unknown') return 'explain-no-data';
      if (noTarget) return 'justify-required';
      if (kpi.status === 'red') return 'justify-required';
      if (kpi.status === 'amber') return 'justify-optional';
      return 'view';
    case 'healthy':
    default:
      return noTarget ? 'justify-required' : 'view';
  }
}

const SCOPE_LABEL: Record<string, string> = {
  global: 'Global',
  area: 'Área',
  team: 'Time',
  individual: 'Individual',
};

function statusBadgeFor(kpi: KpiGateItem) {
  switch (kpi.status) {
    case 'red':
      return { label: 'Crítico', className: 'bg-status-red-muted text-status-red border-status-red/30' };
    case 'amber':
      return { label: 'Em alerta', className: 'bg-status-amber-muted text-status-amber border-status-amber/30' };
    case 'green':
      return { label: 'Saudável', className: 'bg-status-green-muted text-status-green border-status-green/30' };
    case 'unknown':
    default:
      return { label: 'Sem dados', className: 'bg-muted text-muted-foreground border-border' };
  }
}

function formatRefDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface RichKpiCardProps {
  kpi: KpiGateItem;
  bucketId: KpiGateBucketId;
  justification: string;
  onJustificationChange?: (kpiId: string, value: string) => void;
  /** v3.31.1 — quando true, separa "razão de ausência" do "plano de ação". */
  splitNoDataReason?: boolean;
  noDataReason?: string;
  onNoDataReasonChange?: (kpiId: string, value: string) => void;
  /** v3.33.0 — desabilita os textareas (modo leitura). */
  readOnly?: boolean;
}

const RichKpiCard = memo(function RichKpiCard({
  kpi,
  bucketId,
  justification,
  onJustificationChange,
  splitNoDataReason,
  noDataReason,
  onNoDataReasonChange,
  readOnly,
}: RichKpiCardProps) {
  const mode = actionModeForKpi(bucketId, kpi);
  const statusBadge = statusBadgeFor(kpi);
  const isPartial = kpi.lastInputType === 'partial';
  const refDate = formatRefDate(kpi.latestReferenceDate);
  const numericTarget = kpi.target != null ? Number(kpi.target) : null;
  const numericValue = kpi.currentValue != null ? Number(kpi.currentValue) : null;
  const unit = kpi.unit ?? '';
  const scopeLabel = kpi.scope ? SCOPE_LABEL[kpi.scope] ?? kpi.scope : null;

  const showAction = mode !== 'view';
  const isRequired = mode === 'justify-required' || mode === 'explain-no-data';

  const isSplitNoData = !!splitNoDataReason && mode === 'explain-no-data';

  const actionLabel =
    mode === 'explain-no-data'
      ? isSplitNoData
        ? 'Plano para destravar a coleta'
        : 'Por que está sem dados? Plano para destravar'
      : mode === 'justify-required'
        ? 'Justificativa e plano de ação'
        : mode === 'justify-optional'
          ? 'Justificativa (opcional)'
          : null;

  const actionHint =
    mode === 'explain-no-data'
      ? isSplitNoData
        ? 'Obrigatório — descreva o plano e prazo para coletar e disponibilizar o dado.'
        : 'Obrigatório — explique a ausência de registros e descreva o plano para coletar e disponibilizar.'
      : mode === 'justify-required'
        ? 'Obrigatório — explique o motivo do desvio e descreva as próximas ações para corrigir a rota.'
        : mode === 'justify-optional'
          ? 'Opcional — registre observações relevantes para a discussão do rito.'
          : null;

  return (
    <Card
      className={cn(
        'transition-colors min-w-0 max-w-full',
        kpi.status === 'red' && 'border-status-red/40',
        kpi.status === 'amber' && 'border-status-amber/40',
      )}
    >
      <CardContent className="p-4 space-y-4 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2 min-w-0">
              {kpi.status === 'red' && (
                <AlertTriangle className="h-4 w-4 shrink-0 text-status-red" />
              )}
              {kpi.status === 'amber' && (
                <AlertTriangle className="h-4 w-4 shrink-0 text-status-amber" />
              )}
              {bucketId === 'guardrailViolated' && (
                <ShieldAlert className="h-4 w-4 shrink-0 text-status-red" />
              )}
              <KpiNameLink kpiId={kpi.id} name={kpi.name} className="font-medium text-sm" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] h-5">
                KPI
              </Badge>
              <Badge variant="secondary" className={cn('text-[10px] h-5 border', statusBadge.className)}>
                {statusBadge.label}
              </Badge>
              {scopeLabel && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {scopeLabel}
                </Badge>
              )}
              {kpi.lastInputType && (
                <Badge
                  variant={isPartial ? 'outline' : 'secondary'}
                  className={cn('text-[10px] h-5', isPartial && 'border-dashed')}
                >
                  {isPartial ? 'Parcial' : 'Consolidado'}
                </Badge>
              )}
              {kpi.resolved && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  Endereçado
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            {numericTarget != null && (
              <p className="text-[11px] text-muted-foreground">
                Meta: <span className="font-medium">{formatValueWithUnit(numericTarget, unit)}</span>
              </p>
            )}
            <p className="text-base font-semibold text-foreground">
              {numericValue != null ? formatValueWithUnit(numericValue, unit) : '—'}
            </p>
            {refDate && (
              <p className="text-[11px] text-muted-foreground">Último: {refDate}</p>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-foreground">Evolução recente</span>
            <span className="text-[10px] text-muted-foreground">últimos 12 registros</span>
          </div>
          <KpiSparkline kpiId={kpi.id} unit={unit} target={numericTarget} height={80} />
        </div>

        {/* Bloco de ação do líder */}
        {showAction && actionLabel && (
          <div
            className={cn(
              'rounded-lg border p-3 space-y-2',
              mode === 'explain-no-data' && 'bg-muted/40 border-border',
              mode === 'justify-required' && 'bg-status-amber-muted/30 border-status-amber/30',
              mode === 'justify-optional' && 'bg-muted/20 border-border',
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={cn(
                  'h-4 w-4 shrink-0',
                  mode === 'justify-required' && 'text-status-amber',
                  mode === 'explain-no-data' && 'text-muted-foreground',
                  mode === 'justify-optional' && 'text-muted-foreground',
                )}
              />
              <Label className="text-sm font-medium">
                Plano de ação do líder
              </Label>
            </div>
            <Label className="text-xs text-muted-foreground block">
              {actionLabel}{isRequired && <span className="text-status-amber"> *</span>}
            </Label>
            {actionHint && (
              <p className="text-[11px] text-muted-foreground">{actionHint}</p>
            )}
            {isSplitNoData && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground block">
                  Por que está sem dados?<span className="text-status-amber"> *</span>
                </Label>
                <Textarea
                  value={noDataReason ?? ''}
                  onChange={(e) => onNoDataReasonChange?.(kpi.id, e.target.value)}
                  placeholder="Ex.: integração indisponível, fonte ainda não definida, responsável de fora..."
                  className="text-sm min-h-[64px] max-w-full"
                  aria-required
                  disabled={readOnly}
                  readOnly={readOnly}
                />
              </div>
            )}
            <Textarea
              value={justification}
              onChange={(e) => onJustificationChange?.(kpi.id, e.target.value)}
              placeholder={
                mode === 'explain-no-data'
                  ? isSplitNoData
                    ? 'Plano e prazo para destravar a coleta...'
                    : 'Descreva a causa da ausência de dados e o plano para sanar...'
                  : 'Descreva o motivo do desvio e as próximas ações...'
              }
              className="text-sm min-h-[80px] max-w-full"
              aria-required={isRequired}
              disabled={readOnly}
              readOnly={readOnly}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// ────────────────────────────────────────────────────────────────────
// BUCKET SECTION
// ────────────────────────────────────────────────────────────────────

function BucketSection({
  bucket,
  variant,
  justifications,
  onJustificationChange,
  splitNoDataReason,
  noDataReasons,
  onNoDataReasonChange,
}: {
  bucket: KpiGateBucket;
  variant: 'compact' | 'rich';
  justifications: Record<string, string>;
  onJustificationChange?: (kpiId: string, value: string) => void;
  splitNoDataReason?: boolean;
  noDataReasons?: Record<string, string>;
  onNoDataReasonChange?: (kpiId: string, value: string) => void;
}) {
  const hasAlert = bucket.items.some((k) => k.status === 'red' || k.status === 'amber');
  const initiallyOpen = !COLLAPSED_BY_DEFAULT.has(bucket.id) || hasAlert;
  const [open, setOpen] = useState(initiallyOpen);
  if (bucket.items.length === 0) return null;
  return (
    <section className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="w-full justify-between px-2 h-auto py-2"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-sm">{bucket.label}</span>
          <Badge variant="outline" className="text-[10px] h-5">
            {bucket.items.length}
          </Badge>
        </span>
        {bucket.description && (
          <span className="text-xs text-muted-foreground hidden md:inline">
            {bucket.description}
          </span>
        )}
      </Button>
      {open && (
        <div className={cn('space-y-2', variant === 'compact' && 'pl-2')}>
          {bucket.items.map((kpi) =>
            variant === 'rich' ? (
              <RichKpiCard
                key={kpi.id}
                kpi={kpi}
                bucketId={bucket.id}
                justification={justifications[kpi.id] ?? ''}
                onJustificationChange={onJustificationChange}
                splitNoDataReason={splitNoDataReason}
                noDataReason={noDataReasons?.[kpi.id]}
                onNoDataReasonChange={onNoDataReasonChange}
              />
            ) : (
              <KpiCardItem key={kpi.id} kpi={kpi} />
            ),
          )}
        </div>
      )}
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// PAGINATED FLATTENING — para `rich-paginated`
// ────────────────────────────────────────────────────────────────────

/**
 * Achata os buckets em uma lista única preservando a precedência canônica
 * (overdue → critical → guardrailViolated → attention → teamContext em
 * alerta → healthy → teamContext restante). Cada item carrega o `bucketId`
 * de origem para o `RichKpiCard` decidir o modo de ação.
 */
export function flattenBucketsForPagination(buckets: KpiGateBucket[]): Array<{
  kpi: KpiGateItem;
  bucketId: KpiGateBucketId;
  bucketLabel: string;
}> {
  const ordered: Array<{ kpi: KpiGateItem; bucketId: KpiGateBucketId; bucketLabel: string }> = [];
  // Primeiro: todos os buckets exceto teamContext (já vêm em ordem canônica).
  for (const b of buckets) {
    if (b.id === 'teamContext') continue;
    for (const kpi of b.items) {
      ordered.push({ kpi, bucketId: b.id, bucketLabel: b.label });
    }
  }
  // Depois: teamContext em alerta (red → amber) antes do verde/sem dados.
  const teamContext = buckets.find((b) => b.id === 'teamContext');
  if (teamContext) {
    const alerts = teamContext.items.filter((k) => k.status === 'red' || k.status === 'amber');
    const rest = teamContext.items.filter((k) => k.status !== 'red' && k.status !== 'amber');
    for (const kpi of [...alerts, ...rest]) {
      ordered.push({ kpi, bucketId: 'teamContext', bucketLabel: teamContext.label });
    }
  }
  return ordered;
}

// ────────────────────────────────────────────────────────────────────
// MAIN
// ────────────────────────────────────────────────────────────────────

/** Buckets cujos KPIs precisam de plano de ação obrigatório quando `requireResolution`. */
const MANDATORY_BUCKET_IDS: ReadonlySet<KpiGateBucketId> = new Set([
  'overdue',
  'critical',
  'guardrailViolated',
]);

export const KpiGateStep = memo(function KpiGateStep({
  persona,
  version,
  stepId,
  config,
  data,
  decisions,
  onDecisionsChange,
  footer,
  suppressInlineDecisions,
  buckets,
  justifications,
  onJustificationChange,
  currentKpiIndex,
  onKpiIndexChange,
  noDataReasons,
  onNoDataReasonChange,
  readOnlyJustification,
  extraContentForCurrentKpi,
}: KpiGateStepProps) {
  const splitNoDataReason = !!config.splitNoDataReason;
  const label = getStepLabel(persona, stepId, version);
  const variant: 'compact' | 'rich' | 'rich-paginated' = config.cardVariant ?? 'compact';
  const isRichLike = variant === 'rich' || variant === 'rich-paginated';
  const isPaginated = variant === 'rich-paginated';
  const allItems = useMemo(
    () => (buckets ? buckets.flatMap((b) => b.items) : data),
    [buckets, data],
  );
  const isEmpty = allItems.length === 0;

  // KPIs em alerta (legado) — usado para badge do header.
  const atRisk = useMemo(
    () => allItems.filter((k) => k.requiresDecision && !k.resolved),
    [allItems],
  );

  // Achata buckets para modo paginado (ordem canônica).
  const flat = useMemo(
    () => (isPaginated && buckets ? flattenBucketsForPagination(buckets) : []),
    [isPaginated, buckets],
  );
  const totalCount = flat.length;
  const safeIndex = totalCount > 0 ? Math.min(Math.max(currentKpiIndex ?? 0, 0), totalCount - 1) : 0;
  const currentEntry = isPaginated ? flat[safeIndex] : null;

  // KPIs obrigatórios sem plano (variant rich + buckets) — usado para gate
  // local quando `config.requireResolution`. Espelha `actionModeForKpi`:
  //   - buckets MANDATORY (overdue/critical/guardrailViolated)
  //   - teamContext em RED ou UNKNOWN (sem dados)
  //   - qualquer KPI sem meta cadastrada (target nulo) — exceto buckets
  //     puramente "view" (none hoje, mas mantém safety com !== 'healthy' check
  //     desnecessário pois healthy+noTarget também é justify-required).
  const mandatoryUnaddressed = useMemo(() => {
    if (!isRichLike || !buckets) return [] as KpiGateItem[];
    const list: KpiGateItem[] = [];
    for (const bucket of buckets) {
      for (const item of bucket.items) {
        const noTarget = item.target == null || (item.target as unknown as string) === '';
        const requiresPlan =
          MANDATORY_BUCKET_IDS.has(bucket.id) ||
          (bucket.id === 'teamContext' && (item.status === 'red' || item.status === 'unknown')) ||
          noTarget;
        if (!requiresPlan) continue;
        const text = (justifications?.[item.id] ?? '').trim();
        // Quando split: explain-no-data exige TANTO razão quanto plano.
        const isExplainNoData =
          bucket.id === 'overdue' ||
          (bucket.id === 'teamContext' && item.status === 'unknown');
        if (splitNoDataReason && isExplainNoData) {
          const reason = (noDataReasons?.[item.id] ?? '').trim();
          if (text.length === 0 || reason.length === 0) list.push(item);
        } else if (text.length === 0) {
          list.push(item);
        }
      }
    }
    return list;
  }, [isRichLike, buckets, justifications, splitNoDataReason, noDataReasons]);

  const showGate = !!config.requireResolution && isRichLike;
  const hasGateBlock = showGate && mandatoryUnaddressed.length > 0;

  const headerBadge =
    showGate && mandatoryUnaddressed.length > 0
      ? `${mandatoryUnaddressed.length} pendente${mandatoryUnaddressed.length !== 1 ? 's' : ''}`
      : config.requireResolution && atRisk.length > 0
        ? `${atRisk.length} em alerta`
        : undefined;

  // ── Top-fixed bar para modo paginado (paridade com MbrPreKrAnalysisStep) ──
  const paginatedTopBar = isPaginated && totalCount > 0 ? (
    <div className="px-6 py-3 border-b bg-muted/20">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">
            Análise de KPI — {safeIndex + 1} de {totalCount}
          </span>
          {currentEntry && (
            <Badge variant="outline" className="text-[10px] h-5 shrink-0">
              {currentEntry.bucketLabel}
            </Badge>
          )}
        </span>
        <Badge variant="outline" className="shrink-0">
          {Math.round(((safeIndex + 1) / totalCount) * 100)}% concluído
        </Badge>
      </div>
    </div>
  ) : null;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Activity}
          title={label.title}
          description={label.subtitle}
          variant={hasGateBlock || (config.requireResolution && atRisk.length > 0) ? 'amber' : 'primary'}
          badge={headerBadge}
          badgeVariant="destructive"
        />
      }
      topFixed={paginatedTopBar ?? undefined}
      bottomFixed={
        <>
          {hasGateBlock && !isPaginated && (
            <p className="text-xs text-status-amber text-center pb-2 px-4">
              Registre o plano de ação para: {mandatoryUnaddressed.map((k) => k.name).join(', ')}
            </p>
          )}
          {isPaginated && currentEntry && mandatoryUnaddressed.some((k) => k.id === currentEntry.kpi.id) && (
            <p className="text-xs text-status-amber text-center pb-2 px-4">
              Registre o plano de ação deste KPI para avançar.
            </p>
          )}
          {!suppressInlineDecisions && (
            <InlineDecisionsSlot
              stepId={stepId}
              decisions={decisions}
              onDecisionsChange={onDecisionsChange}
            />
          )}
        </>
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-4">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground italic">
            Nenhum KPI registrado para este escopo.
          </p>
        ) : isPaginated && currentEntry ? (
          <RichKpiCard
            key={currentEntry.kpi.id}
            kpi={currentEntry.kpi}
            bucketId={currentEntry.bucketId}
            justification={justifications?.[currentEntry.kpi.id] ?? ''}
            onJustificationChange={onJustificationChange}
            splitNoDataReason={splitNoDataReason}
            noDataReason={noDataReasons?.[currentEntry.kpi.id]}
            onNoDataReasonChange={onNoDataReasonChange}
          />
        ) : buckets ? (
          buckets.map((bucket) => (
            <BucketSection
              key={bucket.id}
              bucket={bucket}
              variant={variant === 'rich-paginated' ? 'rich' : variant}
              justifications={justifications ?? {}}
              onJustificationChange={onJustificationChange}
              splitNoDataReason={splitNoDataReason}
              noDataReasons={noDataReasons}
              onNoDataReasonChange={onNoDataReasonChange}
            />
          ))
        ) : (
          <div className="space-y-3">
            {data.map((kpi) => (
              <KpiCardItem key={kpi.id} kpi={kpi} />
            ))}
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
});
