/**
 * KpiGateStep — Step genérico de KPIs (com ou sem gate obrigatório).
 *
 * v3.0.0: passa a aceitar `buckets` opcional (6 grupos ordenados, ver
 * `classifyKpiGateBuckets`). Quando `buckets` é fornecido, a UI renderiza
 * os blocos colapsáveis com badges (`Parcial`/`Consolidado` + Confidence).
 * Quando ausente, mantém o comportamento legacy de listar `data` chapado.
 */

import { memo, useState } from 'react';
import { Activity, ChevronDown, ChevronRight } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
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
}

const STATUS_STYLES: Record<KpiGateItem['status'], string> = {
  green: 'bg-status-green-muted text-status-green border-status-green/30',
  amber: 'bg-status-amber-muted text-status-amber border-status-amber/30',
  red: 'bg-status-red-muted text-status-red border-status-red/30',
  unknown: 'bg-muted text-muted-foreground border-border',
};

const COLLAPSED_BY_DEFAULT: ReadonlySet<KpiGateBucketId> = new Set(['teamContext']);

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

function BucketSection({ bucket }: { bucket: KpiGateBucket }) {
  const [open, setOpen] = useState(!COLLAPSED_BY_DEFAULT.has(bucket.id));
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
        <div className="space-y-2 pl-2">
          {bucket.items.map((kpi) => (
            <KpiCardItem key={kpi.id} kpi={kpi} />
          ))}
        </div>
      )}
    </section>
  );
}

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
}: KpiGateStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const allItems = buckets ? buckets.flatMap((b) => b.items) : data;
  const atRisk = allItems.filter((k) => k.requiresDecision && !k.resolved);
  const isEmpty = allItems.length === 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Activity}
          title={label.title}
          description={label.subtitle}
          variant={config.requireResolution && atRisk.length > 0 ? 'amber' : 'primary'}
          badge={config.requireResolution && atRisk.length > 0 ? `${atRisk.length} em alerta` : undefined}
          badgeVariant="destructive"
        />
      }
      bottomFixed={
        suppressInlineDecisions ? undefined : (
          <InlineDecisionsSlot
            stepId={stepId}
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
          />
        )
      }
      footer={footer}
    >
      <div className="p-4 md:p-6 space-y-4">
        {isEmpty ? (
          <p className="text-sm text-muted-foreground italic">Nenhum KPI registrado para este escopo.</p>
        ) : buckets ? (
          buckets.map((bucket) => <BucketSection key={bucket.id} bucket={bucket} />)
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
