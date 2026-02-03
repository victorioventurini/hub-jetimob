/**
 * LeaderKpiAlertStep - Indicadores em Atenção
 * 
 * v2.83.0: Nova seção do Leader Prep wizard mostrando:
 * - KPIs do time/área em alerta (amarelo/vermelho)
 * - KPIs desatualizados além do período esperado
 * - Guardrails violados vinculados a KRs em risco
 * 
 * Permite ao líder marcar KPIs para discussão ou follow-up.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Clock,
  TrendingDown,
  Shield,
  MessageSquare,
  Calendar,
  Activity,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardTooltipInline } from '../shared/WizardTooltips';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import type { KpiForWizardV2, KpiAlertReason } from '@/modules/kpis/types';
import { ALERT_REASON_LABELS, RAG_STATUS_CONFIG } from '@/modules/kpis/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================================
// TYPES
// ============================================================

export interface LeaderKpiAlertStepProps {
  kpisInAlert: KpiForWizardV2[];
  guardrailsViolated: KpiForWizardV2[];
  teamName: string;
  isLoading?: boolean;
  markedForDiscussion: string[];
  markedForFollowup: string[];
  onMarkForDiscussion: (kpiId: string, marked: boolean) => void;
  onMarkForFollowup: (kpiId: string, marked: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface KpiAlertItemProps {
  kpi: KpiForWizardV2;
  markedForDiscussion: boolean;
  markedForFollowup: boolean;
  onMarkDiscussion: (marked: boolean) => void;
  onMarkFollowup: (marked: boolean) => void;
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

function KpiAlertItem({
  kpi,
  markedForDiscussion,
  markedForFollowup,
  onMarkDiscussion,
  onMarkFollowup,
}: KpiAlertItemProps) {
  const ragConfig = RAG_STATUS_CONFIG[kpi.latest_rag_status];
  
  // Determine icon based on alert reason
  const AlertIcon = useMemo(() => {
    switch (kpi.alertReason) {
      case 'off_track': return TrendingDown;
      case 'at_risk': return AlertTriangle;
      case 'outdated': return Clock;
      case 'guardrail_violated': return Shield;
      default: return Activity;
    }
  }, [kpi.alertReason]);

  return (
    <Card className={cn(
      "transition-all",
      kpi.alertReason === 'off_track' && "border-destructive/50 bg-destructive/5",
      kpi.alertReason === 'at_risk' && "border-warning/50 bg-warning/5",
      kpi.alertReason === 'guardrail_violated' && "border-destructive/50 bg-destructive/5",
      kpi.alertReason === 'outdated' && "border-muted-foreground/30 bg-muted/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "p-2 rounded-lg flex-shrink-0",
            kpi.alertReason === 'off_track' && "bg-destructive/10",
            kpi.alertReason === 'at_risk' && "bg-warning/10",
            kpi.alertReason === 'guardrail_violated' && "bg-destructive/10",
            kpi.alertReason === 'outdated' && "bg-muted"
          )}>
            <AlertIcon className={cn(
              "h-5 w-5",
              kpi.alertReason === 'off_track' && "text-destructive",
              kpi.alertReason === 'at_risk' && "text-warning",
              kpi.alertReason === 'guardrail_violated' && "text-destructive",
              kpi.alertReason === 'outdated' && "text-muted-foreground"
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium truncate">{kpi.name}</span>
              <Badge variant="outline" className={cn("text-xs", ragConfig.bgColor, ragConfig.color)}>
                {ragConfig.label}
              </Badge>
              {kpi.isGuardrailAtRisk && (
                <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                  <Shield className="h-3 w-3 mr-1" />
                  Guardrail
                </Badge>
              )}
            </div>

            {/* Value info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
              <span>
                Valor: {kpi.latest_value !== null ? `${kpi.latest_value} ${kpi.unit}` : 'Sem dados'}
              </span>
              {kpi.target_value !== null && (
                <span>Meta: {kpi.target_value} {kpi.unit}</span>
              )}
              {kpi.alertReason && (
                <span className="text-xs">
                  {ALERT_REASON_LABELS[kpi.alertReason]}
                </span>
              )}
            </div>

            {/* Owner */}
            {kpi.owner && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={kpi.owner.photo_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {kpi.owner.display_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span>{kpi.owner.display_name}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={markedForDiscussion}
                  onCheckedChange={(checked) => onMarkDiscussion(!!checked)}
                />
                <span className="text-sm flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Discutir em grupo
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={markedForFollowup}
                  onCheckedChange={(checked) => onMarkFollowup(!!checked)}
                />
                <span className="text-sm flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Follow-up
                </span>
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function LeaderKpiAlertStep({
  kpisInAlert,
  guardrailsViolated,
  teamName,
  isLoading,
  markedForDiscussion,
  markedForFollowup,
  onMarkForDiscussion,
  onMarkForFollowup,
  onContinue,
  onBack,
}: LeaderKpiAlertStepProps) {
  // Combine and deduplicate KPIs
  const allAlertKpis = useMemo(() => {
    const seen = new Set<string>();
    const result: KpiForWizardV2[] = [];
    
    // Guardrails first (higher priority)
    for (const kpi of guardrailsViolated) {
      if (!seen.has(kpi.id)) {
        seen.add(kpi.id);
        result.push(kpi);
      }
    }
    
    // Then other alerts
    for (const kpi of kpisInAlert) {
      if (!seen.has(kpi.id)) {
        seen.add(kpi.id);
        result.push(kpi);
      }
    }
    
    return result;
  }, [kpisInAlert, guardrailsViolated]);

  const hasNoAlerts = allAlertKpis.length === 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-warning/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Indicadores em Atenção</h3>
              <p className="text-sm text-muted-foreground">
                KPIs que precisam de ação ou discussão
              </p>
            </div>
            <WizardTooltipInline tooltipKey="leader-kpi-alerts" />
            <AskToVicStepHelper
              context={{
                module: 'okrs',
                wizard: 'leader-prep',
                step: 'kpi-alerts',
                userRole: 'lider',
                teamName,
                additionalData: {
                  totalAlerts: allAlertKpis.length,
                  guardrailsViolated: guardrailsViolated.length,
                },
              }}
            />
          </div>
          {!hasNoAlerts && (
            <Badge variant="secondary" className="text-base">
              {allAlertKpis.length} {allAlertKpis.length === 1 ? 'indicador' : 'indicadores'}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {hasNoAlerts ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-success/10 mb-4">
                <Activity className="h-8 w-8 text-success" />
              </div>
              <h4 className="font-medium text-lg">Tudo em ordem!</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Nenhum indicador do time está em situação de alerta. Continue acompanhando regularmente.
              </p>
            </div>
          ) : (
            <>
              {/* Guardrails section */}
              {guardrailsViolated.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <Shield className="h-4 w-4" />
                    Guardrails Violados ({guardrailsViolated.length})
                  </div>
                  {guardrailsViolated.map(kpi => (
                    <KpiAlertItem
                      key={kpi.id}
                      kpi={kpi}
                      markedForDiscussion={markedForDiscussion.includes(kpi.id)}
                      markedForFollowup={markedForFollowup.includes(kpi.id)}
                      onMarkDiscussion={(m) => onMarkForDiscussion(kpi.id, m)}
                      onMarkFollowup={(m) => onMarkForFollowup(kpi.id, m)}
                    />
                  ))}
                </div>
              )}

              {/* Other alerts */}
              {kpisInAlert.filter(k => !guardrailsViolated.some(g => g.id === k.id)).length > 0 && (
                <div className="space-y-3">
                  {guardrailsViolated.length > 0 && (
                    <div className="flex items-center gap-2 text-sm font-medium text-warning mt-6">
                      <AlertTriangle className="h-4 w-4" />
                      Outros Indicadores em Alerta
                    </div>
                  )}
                  {kpisInAlert
                    .filter(k => !guardrailsViolated.some(g => g.id === k.id))
                    .map(kpi => (
                      <KpiAlertItem
                        key={kpi.id}
                        kpi={kpi}
                        markedForDiscussion={markedForDiscussion.includes(kpi.id)}
                        markedForFollowup={markedForFollowup.includes(kpi.id)}
                        onMarkDiscussion={(m) => onMarkForDiscussion(kpi.id, m)}
                        onMarkFollowup={(m) => onMarkForFollowup(kpi.id, m)}
                      />
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>

          <Button onClick={onContinue} className="flex-1" size="lg">
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
