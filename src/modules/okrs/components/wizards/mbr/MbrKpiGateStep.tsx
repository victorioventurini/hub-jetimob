/**
 * MbrKpiGateStep - Etapa 2: KPI Gate Estratégico
 * 
 * Exibe apenas KPIs amarelos/vermelhos.
 * Gate: não permite avançar se algum KPI marcado como "exige decisão" não tem decisão registrada.
 */

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import type { MbrKpiSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrKpiGateStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  onKpiSnapshotsChange: (snapshots: MbrKpiSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrKpiGateStep({
  kpiSnapshots,
  onKpiSnapshotsChange,
  decisions,
  onDecisionsChange,
  onContinue,
  onBack,
}: MbrKpiGateStepProps) {
  const criticalKpis = useMemo(
    () => kpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow'),
    [kpiSnapshots]
  );

  // Gate: KPIs that require decision but have none
  const kpisRequiringDecisionWithout = useMemo(() => {
    return criticalKpis.filter(k => {
      if (!k.requiresStrategicDecision) return false;
      // Check if there's at least one decision for this KPI from this step
      return !decisions.some(
        d => d.sourceStep === 'kpi-gate' && d.text.toLowerCase().includes(k.name.toLowerCase())
      );
    });
  }, [criticalKpis, decisions]);

  const canProceed = kpisRequiringDecisionWithout.length === 0;

  const handleToggleRequiresDecision = (kpiId: string, value: boolean) => {
    onKpiSnapshotsChange(
      kpiSnapshots.map(k => k.kpiId === kpiId ? { ...k, requiresStrategicDecision: value } : k)
    );
  };

  const handleImpactChange = (kpiId: string, text: string) => {
    onKpiSnapshotsChange(
      kpiSnapshots.map(k => k.kpiId === kpiId ? { ...k, impactAssessment: text } : k)
    );
  };

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={ShieldAlert}
        title="KPI Gate Estratégico"
        description={`${criticalKpis.length} KPI${criticalKpis.length !== 1 ? 's' : ''} em atenção`}
        variant="amber"
      />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {criticalKpis.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                Nenhum KPI em risco neste momento. 🎉
              </p>
              <p className="text-xs text-muted-foreground">
                Todos os indicadores estão saudáveis.
              </p>
            </div>
          ) : (
            criticalKpis.map((kpi) => (
              <Card
                key={kpi.kpiId}
                className={cn(
                  'transition-colors',
                  kpi.ragStatus === 'red' && 'border-status-red/40',
                  kpi.ragStatus === 'yellow' && 'border-status-amber/40',
                )}
              >
                <CardContent className="p-4 space-y-4">
                  {/* KPI header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={cn(
                        'h-4 w-4',
                        kpi.ragStatus === 'red' ? 'text-status-red' : 'text-status-amber'
                      )} />
                      <p className="font-medium text-sm">{kpi.name}</p>
                    </div>
                    <Badge variant="secondary" className={cn(
                      'text-xs',
                      kpi.ragStatus === 'red' ? 'bg-status-red-muted text-status-red' : 'bg-status-yellow-muted text-status-yellow'
                    )}>
                      {kpi.currentValue ?? '—'} / {kpi.target ?? '—'}
                    </Badge>
                  </div>

                  {/* Impact assessment */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Se ignorarmos por 30 dias, o que acontece?
                    </Label>
                    <Textarea
                      value={kpi.impactAssessment || ''}
                      onChange={(e) => handleImpactChange(kpi.kpiId, e.target.value)}
                      placeholder="Descreva o impacto potencial..."
                      className="text-sm min-h-[60px]"
                    />
                  </div>

                  {/* Requires strategic decision toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <Label className="text-sm cursor-pointer">
                      Exige decisão estratégica?
                    </Label>
                    <Switch
                      checked={kpi.requiresStrategicDecision}
                      onCheckedChange={(val) => handleToggleRequiresDecision(kpi.kpiId, val)}
                    />
                  </div>

                  {/* Inline decision when required */}
                  {kpi.requiresStrategicDecision && (
                    <div className="border rounded-lg">
                      <InlineDecisionInput
                        decisions={decisions}
                        onDecisionsChange={onDecisionsChange}
                        sourceStep="kpi-gate"
                        placeholder={`Decisão sobre ${kpi.name}...`}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        onPrimary={onContinue}
        primaryLabel="Revisar OKRs Organizacionais"
        primaryDisabled={!canProceed}
      />
      {!canProceed && (
        <p className="text-xs text-status-amber text-center pb-2">
          Registre decisões para todos os KPIs marcados como "exige decisão"
        </p>
      )}
    </div>
  );
}
