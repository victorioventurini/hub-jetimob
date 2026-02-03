/**
 * KrLinkedKpiCard - Exibe KPIs vinculados a um KR no Team Check-in
 * 
 * v2.83.0: KPI Gate - KPIs só aparecem quando relevantes
 * - São primary de um KR em risco
 * - São guardrails violados
 * - Foram marcados pelo líder na prep
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  AlertTriangle,
  Target,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RAG_STATUS_COLORS } from '@/lib/colors';
import type { KpiForWizardV2 } from '@/modules/kpis/types';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';

// ============================================================
// TYPES
// ============================================================

export type KpiLinkReason = 'primary_at_risk' | 'guardrail_violated' | 'leader_marked';

export interface KrLinkedKpiCardProps {
  kr: WizardKr;
  linkedKpis: KpiForWizardV2[];
  showReason: KpiLinkReason;
  className?: string;
}

// ============================================================
// HELPERS
// ============================================================

const REASON_CONFIG: Record<KpiLinkReason, {
  label: string;
  description: string;
  icon: typeof AlertTriangle;
  className: string;
}> = {
  primary_at_risk: {
    label: 'Indicador Primary',
    description: 'Este KPI é o indicador principal do KR e está em risco',
    icon: Target,
    className: 'bg-status-orange-muted text-status-orange-muted-foreground border-status-orange/30',
  },
  guardrail_violated: {
    label: 'Guardrail Violado',
    description: 'Este guardrail ultrapassou os limites aceitáveis',
    icon: AlertTriangle,
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  leader_marked: {
    label: 'Marcado para Discussão',
    description: 'O líder marcou este indicador para discussão em grupo',
    icon: MessageSquare,
    className: 'bg-status-yellow-muted text-status-yellow-muted-foreground border-status-yellow/30',
  },
};

const RAG_CONFIG = {
  on_track: { label: 'No caminho', className: RAG_STATUS_COLORS.green.badge },
  at_risk: { label: 'Em risco', className: RAG_STATUS_COLORS.yellow.badge },
  off_track: { label: 'Fora da meta', className: RAG_STATUS_COLORS.red.badge },
  no_data: { label: 'Sem dados', className: 'bg-muted text-muted-foreground' },
};

function getTrendIcon(kpi: KpiForWizardV2) {
  if (kpi.latest_value === null || kpi.target_value === null) {
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
  const percentOfTarget = (kpi.latest_value / kpi.target_value) * 100;
  if (percentOfTarget >= 100) {
    return <TrendingUp className="h-3 w-3 text-success" />;
  }
  if (percentOfTarget < 70) {
    return <TrendingDown className="h-3 w-3 text-destructive" />;
  }
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

// ============================================================
// COMPONENT
// ============================================================

export function KrLinkedKpiCard({
  kr,
  linkedKpis,
  showReason,
  className,
}: KrLinkedKpiCardProps) {
  const reasonConfig = REASON_CONFIG[showReason];
  const ReasonIcon = reasonConfig.icon;

  if (linkedKpis.length === 0) {
    return null;
  }

  return (
    <Card className={cn('mt-4', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Indicadores Vinculados
          </CardTitle>
          <Badge variant="outline" className={cn('text-xs gap-1', reasonConfig.className)}>
            <ReasonIcon className="h-3 w-3" />
            {reasonConfig.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {reasonConfig.description}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {linkedKpis.map((kpi) => {
          const ragConfig = RAG_CONFIG[kpi.latest_rag_status];
          const progress = kpi.target_value && kpi.latest_value !== null
            ? Math.min((kpi.latest_value / kpi.target_value) * 100, 100)
            : 0;

          return (
            <div
              key={kpi.id}
              className={cn(
                'p-3 rounded-lg border transition-colors',
                kpi.isGuardrailAtRisk && 'border-destructive/30 bg-destructive/5',
                !kpi.isGuardrailAtRisk && 'border-muted-foreground/20 bg-muted/30'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{kpi.name}</p>
                  
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className={cn('text-xs', ragConfig.className)}>
                      {ragConfig.label}
                    </Badge>
                    
                    {kpi.isGuardrailAtRisk && (
                      <Badge variant="destructive" className="text-[10px] gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Violado
                      </Badge>
                    )}
                    
                    {kpi.isStrategic && (
                      <Badge variant="outline" className="text-[10px] border-status-purple/30 text-status-purple">
                        Estratégico
                      </Badge>
                    )}
                  </div>

                  {/* Owner info */}
                  {kpi.owner?.display_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Responsável: {kpi.owner.display_name}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  {kpi.latest_value !== null ? (
                    <>
                      <div className="flex items-center gap-1 justify-end">
                        <p className="text-lg font-bold">
                          {kpi.latest_value} {kpi.unit}
                        </p>
                        {getTrendIcon(kpi)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Meta: {kpi.target_value} {kpi.unit}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem dados</p>
                  )}
                </div>
              </div>

              {/* Progress */}
              {kpi.target_value && kpi.latest_value !== null && (
                <div className="mt-2">
                  <Progress
                    value={progress}
                    className={cn(
                      'h-1.5',
                      kpi.latest_rag_status === 'off_track' && '[&>div]:bg-status-red',
                      kpi.latest_rag_status === 'at_risk' && '[&>div]:bg-status-yellow'
                    )}
                  />
                </div>
              )}

              {/* Recovery protocol hint */}
              {kpi.isGuardrailAtRisk && (
                <p className="text-xs text-destructive mt-2">
                  ⚠️ Este guardrail requer atenção imediata. Discuta as ações de recuperação.
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Determina a razão de exibição do KPI baseado no contexto
 */
export function determineKpiLinkReason(
  kpi: KpiForWizardV2,
  kr: WizardKr,
  leaderMarkedKpiIds: string[] = []
): KpiLinkReason | null {
  // Prioridade: guardrail violado > primary at risk > leader marked
  if (kpi.isGuardrailAtRisk) {
    return 'guardrail_violated';
  }
  
  if (kpi.userRole === 'owner' && kpi.latest_rag_status !== 'on_track') {
    return 'primary_at_risk';
  }
  
  if (leaderMarkedKpiIds.includes(kpi.id)) {
    return 'leader_marked';
  }
  
  return null;
}

/**
 * Filtra KPIs que devem ser exibidos no Team Check-in
 */
export function filterKpisForTeamCheckin(
  kpis: KpiForWizardV2[],
  kr: WizardKr,
  leaderMarkedKpiIds: string[] = []
): KpiForWizardV2[] {
  return kpis.filter((kpi) => {
    // KR está em risco e KPI é primary
    const krAtRisk = kr.status === 'yellow' || kr.status === 'red';
    const isPrimaryKpi = kpi.linkedKrIds.includes(kr.id);
    
    if (krAtRisk && isPrimaryKpi) {
      return true;
    }
    
    // Guardrail violado
    if (kpi.isGuardrailAtRisk && kpi.linkedKrIds.includes(kr.id)) {
      return true;
    }
    
    // Marcado pelo líder
    if (leaderMarkedKpiIds.includes(kpi.id)) {
      return true;
    }
    
    return false;
  });
}
