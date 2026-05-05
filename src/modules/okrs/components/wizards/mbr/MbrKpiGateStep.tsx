/**
 * MbrKpiGateStep - Etapa 2: KPI Gate Estratégico (MBR Executivo)
 *
 * Exibe apenas KPIs amarelos/vermelhos.
 * Gate: não permite avançar se algum KPI marcado como "exige decisão" não tem decisão registrada.
 *
 * @deprecated Para uso APENAS no MBR Executivo. Demais ritos (mbr-pre, qbr-pre)
 * devem consumir o `KpiGateStep` canônico do framework
 * (`@/wizards-framework`) com `config.cardVariant: 'rich'`.
 * Ver TCR §4.8.1 (Princípio #4 — variação por config) e
 * `mem://architecture/wizards/wizards-master-standard`.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiNameLink } from '@/modules/kpis/components/KpiNameLink';
import {
  WizardStepHeader,
  WizardStepFooter,
  InlineDecisionInput,
  KpiMonthlyComparisonCard,
} from '../shared';
import { WizardStepScaffold } from '../shared/WizardStepScaffold';
import { useMbrMonthlyKpisByScope, type MbrMonthlyKpiSnapshot } from '@/modules/okrs/hooks/useMbrMonthlyKpisByScope';
import { formatMonthLabel } from '@/modules/okrs/utils/mbr/referenceMonth';
import type { MbrKpiSnapshot, TeamCheckinDecision } from '@/modules/okrs/types/wizard';
// ============================================================
// TYPES
// ============================================================

export interface MbrKpiGateStepProps {
  kpiSnapshots: MbrKpiSnapshot[];
  onKpiSnapshotsChange: (snapshots: MbrKpiSnapshot[]) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** Mapa teamId → nome para exibir origem das sinalizações */
  teamNamesById?: Record<string, string>;
  /** KPIs propostos pelos líderes no MBR-PRE */
  proposedKpis?: Array<{
    teamId: string;
    description: string;
    suggestedScope?: string;
    relatedKrTitle?: string;
    submittedByName?: string;
  }>;
  onContinue: () => void;
  onBack: () => void;
  /**
   * Quando `false`, oculta o toggle "Exige decisão estratégica?" e trata
   * `requiresStrategicDecision` como derivado do bucket canônico (read-only).
   * Default: `true` (preserva comportamento do MBR executivo).
   */
  showStrategicDecisionToggle?: boolean;
  /**
   * Quando `true`, o gate exige ≥1 decisão por KPI obrigatório (matching por
   * `metadata.kpi_id`), em vez de uma contagem agregada de decisões em
   * `sourceStep='kpi-gate'`. Mensagem de pendência lista os KPIs faltantes.
   * Default: `false`.
   */
  requirePlanForCriticalKpis?: boolean;
  /**
   * Quando `false`, oculta o `InlineDecisionInput` dentro de cada KPI.
   * Útil para fluxos (ex: MBR-Pré) que delegam o registro de plano a outro
   * step e querem manter o card apenas como leitura/justificativa.
   * Default: `true` (preserva MBR executivo).
   */
  showInlineDecisionInput?: boolean;
  /**
   * Mês de referência (`YYYY-MM`) para o overview comparativo de KPIs
   * globais e de área. Obrigatório quando `showMonthlyOverview = true`.
   */
  referenceMonth?: string | null;
  /**
   * Quando `true`, renderiza acima dos KPIs em atenção um overview
   * comparativo (mês de referência vs anterior) dos KPIs `org` e `area`,
   * agrupados por área e/ou time. Default: `false`.
   */
  showMonthlyOverview?: boolean;
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
  showStrategicDecisionToggle = true,
  requirePlanForCriticalKpis = false,
  showInlineDecisionInput = true,
}: MbrKpiGateStepProps) {
  const criticalKpis = useMemo(
    () => kpiSnapshots.filter(k => k.ragStatus === 'red' || k.ragStatus === 'yellow'),
    [kpiSnapshots]
  );

  const mandatoryKpis = useMemo(
    () => criticalKpis.filter(k => k.requiresStrategicDecision),
    [criticalKpis]
  );

  // Mapa kpi_id → tem decisão registrada (texto não vazio)
  const decisionByKpiId = useMemo(() => {
    const set = new Set<string>();
    for (const d of decisions) {
      if (d.sourceStep !== 'kpi-gate') continue;
      if (!d.text || d.text.trim().length === 0) continue;
      const kpiId = (d.metadata as { kpi_id?: string } | undefined)?.kpi_id;
      if (kpiId) set.add(kpiId);
    }
    return set;
  }, [decisions]);

  // Gate por-KPI (novo): cada KPI obrigatório precisa de plano com kpi_id matching.
  const missingKpis = useMemo(
    () => (requirePlanForCriticalKpis
      ? mandatoryKpis.filter(k => !decisionByKpiId.has(k.kpiId))
      : []),
    [requirePlanForCriticalKpis, mandatoryKpis, decisionByKpiId]
  );

  // Gate agregado (legado): conta decisões totais com sourceStep='kpi-gate'.
  const kpiGateDecisionsCount = useMemo(
    () => decisions.filter(d => d.sourceStep === 'kpi-gate' && d.text.trim().length > 0).length,
    [decisions]
  );
  const aggregateMissing = Math.max(0, mandatoryKpis.length - kpiGateDecisionsCount);

  const canProceed = requirePlanForCriticalKpis
    ? missingKpis.length === 0
    : aggregateMissing === 0;

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
        tooltip="mbr-kpi-gate"
          description={`${criticalKpis.length} KPI${criticalKpis.length !== 1 ? 's' : ''} em atenção`}
          variant="amber"
        />
      }
      bottomFixed={
        !canProceed ? (
          <p className="text-xs text-status-amber text-center pb-2 px-4">
            {requirePlanForCriticalKpis
              ? `Registre um plano para: ${missingKpis.map(k => k.name).join(', ')}`
              : `Registre decisões (faltam ${aggregateMissing}) para continuar`}
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
                    <KpiNameLink kpiId={kpi.kpiId} name={kpi.name} className="font-medium text-sm" />
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

                {/* v3.0.0 — Badge Parcial/Consolidado */}
                {kpi.latestInputType && (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge
                      variant={kpi.latestInputType === 'partial' ? 'outline' : 'secondary'}
                      className={cn(
                        'text-[10px] h-5',
                        kpi.latestInputType === 'partial' && 'border-dashed',
                      )}
                    >
                      {kpi.latestInputType === 'partial' ? 'Parcial' : 'Consolidado'}
                    </Badge>
                  </div>
                )}

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

                {/* Requires strategic decision toggle (oculto quando o gate canônico já decide) */}
                {showStrategicDecisionToggle && (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 min-w-0">
                    <Label className="text-sm cursor-pointer truncate">
                      Exige decisão estratégica?
                    </Label>
                    <Switch
                      checked={kpi.requiresStrategicDecision}
                      onCheckedChange={(val) => handleToggleRequiresDecision(kpi.kpiId, val)}
                    />
                  </div>
                )}

                {/* Inline decision when required */}
                {showInlineDecisionInput && kpi.requiresStrategicDecision && (
                  <div className="border rounded-lg min-w-0 max-w-full">
                    <InlineDecisionInput
                      decisions={decisions}
                      onDecisionsChange={onDecisionsChange}
                      sourceStep="kpi-gate"
                      placeholder={`Decisão sobre ${kpi.name}...`}
                      metadataFactory={() => ({
                        source: 'kpi_gate',
                        kpi_id: kpi.kpiId,
                        kpi_rag_status: kpi.ragStatus,
                        ...(kpi.latestInputType ? { kpi_input_type: kpi.latestInputType } : {}),
                      })}
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
