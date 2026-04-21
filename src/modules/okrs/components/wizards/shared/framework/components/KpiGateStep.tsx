/**
 * KpiGateStep — Step genérico de KPIs (com ou sem gate obrigatório).
 */

import { memo } from 'react';
import { Activity } from 'lucide-react';
import { WizardStepScaffold } from '../../WizardStepScaffold';
import { WizardStepHeader } from '../../WizardStepHeader';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getStepLabel, type StructureVersion } from '@/modules/okrs/constants/ritualLabels';
import type { WizardPersona, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
import type { KpiGateStepConfig } from '../types';
import type { KpiGateItem } from '../config/stepContentAdapters';
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
}

const STATUS_STYLES: Record<KpiGateItem['status'], string> = {
  green: 'bg-status-green-muted text-status-green border-status-green/30',
  amber: 'bg-status-amber-muted text-status-amber border-status-amber/30',
  red: 'bg-status-red-muted text-status-red border-status-red/30',
  unknown: 'bg-muted text-muted-foreground border-border',
};

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
}: KpiGateStepProps) {
  const label = getStepLabel(persona, stepId, version);
  const atRisk = data.filter((k) => k.requiresDecision && !k.resolved);

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
      <div className="p-4 md:p-6 space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum KPI registrado para este escopo.</p>
        ) : (
          data.map((kpi) => (
            <Card key={kpi.id} className={cn('p-4 border', STATUS_STYLES[kpi.status])}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{kpi.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpi.currentValue ?? '—'} {kpi.target && <>/ meta: {kpi.target}</>}
                  </p>
                </div>
                {kpi.requiresDecision && (
                  <Badge variant={kpi.resolved ? 'secondary' : 'destructive'} className="text-xs shrink-0">
                    {kpi.resolved ? 'Endereçado' : 'Requer decisão'}
                  </Badge>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </WizardStepScaffold>
  );
});
