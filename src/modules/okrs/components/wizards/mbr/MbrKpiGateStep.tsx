/**
 * MbrKpiGateStep - Etapa 2: KPI Gate Estratégico
 * 
 * Exibe apenas KPIs amarelos/vermelhos.
 * Gate: não permite avançar se algum KPI marcado como "exige decisão" não tem decisão registrada.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
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

  // Gate: precisa ter pelo menos 1 decisão por KPI marcado como "exige decisão"
  const requiredDecisionCount = useMemo(
    () => criticalKpis.filter(k => k.requiresStrategicDecision).length,
    [criticalKpis]
  );

  const kpiGateDecisionsCount = useMemo(
    () => decisions.filter(d => d.sourceStep === 'kpi-gate' && d.text.trim().length > 0).length,
    [decisions]
  );

  const missingDecisionCount = Math.max(0, requiredDecisionCount - kpiGateDecisionsCount);
  const canProceed = missingDecisionCount === 0;

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
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={ShieldAlert}
          title="KPI Gate Estratégico"
          description={`${criticalKpis.length} KPI${criticalKpis.length !== 1 ? 's' : ''} em atenção`}
          variant="amber"
        />
      }
      bottomFixed={
        !canProceed ? (
          <p className="text-xs text-status-amber text-center pb-2 px-4">
            Registre decisões (faltam {missingDecisionCount}) para continuar
          </p>
        ) : undefined
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryLabel="Revisar OKRs Organizacionais"
          primaryDisabled={!canProceed}
        />
      }
    >
      <div className="p-6 space-y-4 min-w-0 max-w-full">
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
                'transition-colors min-w-0 max-w-full',
                kpi.ragStatus === 'red' && 'border-status-red/40',
                kpi.ragStatus === 'yellow' && 'border-status-amber/40',
              )}
            >
              <CardContent className="p-4 space-y-4 min-w-0">
                {/* KPI header */}
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <AlertTriangle
                      className={cn(
                        'h-4 w-4 shrink-0',
                        kpi.ragStatus === 'red' ? 'text-status-red' : 'text-status-amber'
                      )}
                    />
                    <p className="font-medium text-sm truncate">{kpi.name}</p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs shrink-0',
                      kpi.ragStatus === 'red'
                        ? 'bg-status-red-muted text-status-red'
                        : 'bg-status-yellow-muted text-status-yellow'
                    )}
                  >
                    {kpi.currentValue ?? '—'} / {kpi.target ?? '—'}
                  </Badge>
                </div>

                {/* Impact assessment */}
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs text-muted-foreground">
                    Se ignorarmos por 30 dias, o que acontece?
                  </Label>
                  <Textarea
                    value={kpi.impactAssessment || ''}
                    onChange={(e) => handleImpactChange(kpi.kpiId, e.target.value)}
                    placeholder="Descreva o impacto potencial..."
                    className="text-sm min-h-[60px] max-w-full"
                  />
                </div>

                {/* Requires strategic decision toggle */}
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 min-w-0">
                  <Label className="text-sm cursor-pointer truncate">
                    Exige decisão estratégica?
                  </Label>
                  <Switch
                    checked={kpi.requiresStrategicDecision}
                    onCheckedChange={(val) => handleToggleRequiresDecision(kpi.kpiId, val)}
                  />
                </div>

                {/* Inline decision when required */}
                {kpi.requiresStrategicDecision && (
                  <div className="border rounded-lg min-w-0 max-w-full">
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
    </WizardStepScaffold>
  );
}
