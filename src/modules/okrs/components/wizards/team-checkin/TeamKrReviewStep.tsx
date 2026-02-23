/**
 * TeamKrReviewStep - Etapa 2 do Wizard Check-in do Time
 * 
 * v2.83.0: KPI Gate - KPIs só aparecem quando relevantes:
 * - Primary KPI de KR em risco
 * - Guardrails violados
 * - Marcados pelo líder para discussão
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, CheckCircle2, MessageSquare, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter } from '../shared';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import { KrLinkedKpiCard, type KpiLinkReason } from './KrLinkedKpiCard';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';
import type { KpiForWizardV2 } from '@/modules/kpis/types';
import { RAG_STATUS_COLORS } from '@/lib/colors';

// ============================================================
// TYPES
// ============================================================

export interface TeamKrReviewStepProps {
  krs: WizardKr[];
  markedForDiscussion: string[];
  reviewedKrs: Set<string>;
  /** v2.83.0: KPIs linked to KRs (primary or guardrail) */
  linkedKpis?: KpiForWizardV2[];
  /** v2.83.0: KPI IDs marked for discussion by leader */
  kpisMarkedForDiscussion?: string[];
  onMarkReviewed: (krId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * v2.83.0: Determine why a KPI should be shown (KPI Gate logic)
 */
function determineKpiLinkReason(
  kpi: KpiForWizardV2,
  kr: WizardKr,
  kpisMarkedForDiscussion: string[]
): KpiLinkReason | null {
  // Priority 1: Leader marked for discussion
  if (kpisMarkedForDiscussion.includes(kpi.id)) {
    return 'leader_marked';
  }
  
  // Priority 2: Primary KPI of KR at risk
  const isPrimary = kpi.linkedKrIds?.includes(kr.id);
  const isKrAtRisk = kr.status === 'red' || kr.status === 'yellow';
  if (isPrimary && isKrAtRisk) {
    return 'primary_at_risk';
  }
  
  // Priority 3: Guardrail violated
  if (kpi.isGuardrailAtRisk) {
    return 'guardrail_violated';
  }
  
  return null;
}

/**
 * v2.83.0: Filter KPIs that should be shown for a specific KR
 */
function filterKpisForKr(
  allKpis: KpiForWizardV2[],
  kr: WizardKr,
  kpisMarkedForDiscussion: string[]
): Array<{ kpi: KpiForWizardV2; reason: KpiLinkReason }> {
  const result: Array<{ kpi: KpiForWizardV2; reason: KpiLinkReason }> = [];
  
  for (const kpi of allKpis) {
    const reason = determineKpiLinkReason(kpi, kr, kpisMarkedForDiscussion);
    if (reason) {
      result.push({ kpi, reason });
    }
  }
  
  return result;
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamKrReviewStep({
  krs,
  markedForDiscussion,
  reviewedKrs,
  linkedKpis = [],
  kpisMarkedForDiscussion = [],
  onMarkReviewed,
  onContinue,
  onBack,
}: TeamKrReviewStepProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Prioritize marked KRs first
  const sortedKrs = useMemo(() => {
    return [...krs].sort((a, b) => {
      const aMarked = markedForDiscussion.includes(a.id);
      const bMarked = markedForDiscussion.includes(b.id);
      if (aMarked && !bMarked) return -1;
      if (!aMarked && bMarked) return 1;
      // Then by risk
      if (a.is_at_risk && !b.is_at_risk) return -1;
      if (!a.is_at_risk && b.is_at_risk) return 1;
      return 0;
    });
  }, [krs, markedForDiscussion]);

  const currentKr = sortedKrs[currentIndex];
  const isMarked = currentKr && markedForDiscussion.includes(currentKr.id);
  const isReviewed = currentKr && reviewedKrs.has(currentKr.id);

  // v2.83.0: Get relevant KPIs for current KR (KPI Gate)
  const relevantKpis = useMemo(() => {
    if (!currentKr || linkedKpis.length === 0) return [];
    return filterKpisForKr(linkedKpis, currentKr, kpisMarkedForDiscussion);
  }, [currentKr, linkedKpis, kpisMarkedForDiscussion]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      // Auto-mark current KR as reviewed when navigating away
      if (currentKr && !reviewedKrs.has(currentKr.id)) {
        onMarkReviewed(currentKr.id);
      }
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < sortedKrs.length - 1) {
      // Auto-mark current KR as reviewed when navigating away
      if (currentKr && !reviewedKrs.has(currentKr.id)) {
        onMarkReviewed(currentKr.id);
      }
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleMarkReviewed = () => {
    if (currentKr) {
      onMarkReviewed(currentKr.id);
      if (currentIndex < sortedKrs.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  };

  const reviewedCount = reviewedKrs.size;
  const totalCount = sortedKrs.length;

  if (!currentKr) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <CheckCircle2 className="h-12 w-12 text-success mb-4" />
        <h3 className="font-semibold text-lg">Nenhum KR para revisar</h3>
        <Button onClick={onContinue} className="mt-4">
          Continuar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={Target}
        title="Revisão dos KRs"
        description={`${reviewedCount} de ${totalCount} revisados`}
        variant="primary"
        rightContent={
          <div className="flex items-center gap-2">
            <AskToVicStepHelper
              context={{
                module: 'okrs',
                wizard: 'team-checkin',
                step: 'kr-review',
                userRole: 'lider',
                krTitle: currentKr?.title,
                objectiveTitle: currentKr?.objective_title,
                progress: currentKr?.progress,
                teamName: currentKr?.team_name,
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center">
              {currentIndex + 1}/{totalCount}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === sortedKrs.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <Progress 
        value={(reviewedCount / totalCount) * 100} 
        className="h-1" 
      />

      {/* KR Card */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          <Card className={cn(
            "transition-colors",
            isMarked && "border-status-yellow/50 dark:border-status-yellow/50",
            isReviewed && "border-status-green/50 dark:border-status-green/50 bg-status-green-muted/50 dark:bg-status-green-muted/20"
          )}>
            <CardContent className="p-5 space-y-4">
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {isMarked && (
                  <Badge variant="secondary" className="bg-status-yellow-muted text-status-yellow-muted-foreground dark:bg-status-yellow-muted/30">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Para discussão
                  </Badge>
                )}
                {isReviewed && (
                  <Badge variant="secondary" className={RAG_STATUS_COLORS.green.badge}>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Revisado
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    currentKr.status === 'green' && RAG_STATUS_COLORS.green.badge,
                    currentKr.status === 'yellow' && RAG_STATUS_COLORS.yellow.badge,
                    currentKr.status === 'red' && RAG_STATUS_COLORS.red.badge
                  )}
                >
                  {currentKr.status === 'green' && 'No caminho'}
                  {currentKr.status === 'yellow' && 'Atenção'}
                  {currentKr.status === 'red' && 'Em risco'}
                  {currentKr.status === 'not_started' && 'Não iniciado'}
                </Badge>
              </div>

              {/* Title */}
              <h4 className="font-semibold text-lg">{currentKr.title}</h4>
              
              {/* Objective */}
              <p className="text-sm text-muted-foreground">
                Objetivo: {currentKr.objective_title}
              </p>

              {/* Owner */}
              <p className="text-sm">
                <span className="text-muted-foreground">Responsável:</span>{' '}
                <span className="font-medium">{currentKr.owner_name || 'Não atribuído'}</span>
              </p>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
                  <span className={cn("font-bold", currentKr.progress > 100 && "text-status-green")}>{Math.round(currentKr.progress)}%{currentKr.progress > 100 && ' 🚀'}</span>
                </div>
                <Progress 
                  value={Math.min(100, currentKr.progress)} 
                  className={cn(
                    "h-2",
                    currentKr.status === 'green' && "[&>div]:bg-status-green",
                    currentKr.status === 'yellow' && "[&>div]:bg-status-yellow",
                    currentKr.status === 'red' && "[&>div]:bg-status-red"
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Base: {currentKr.baseline}</span>
                  <span>Atual: {currentKr.current_value}</span>
                  <span>Meta: {currentKr.target}</span>
                </div>
              </div>

              {/* Last check-in */}
              <p className="text-xs text-muted-foreground">
                Último check-in: {currentKr.last_checkin_at 
                  ? `há ${currentKr.days_since_checkin} dias`
                  : 'Nunca'
                }
              </p>
            </CardContent>
          </Card>

          {/* v2.83.0: KPI Gate - Show linked KPIs only when relevant */}
          {relevantKpis.length > 0 && (
            <KrLinkedKpiCard
              kr={currentKr}
              linkedKpis={relevantKpis.map(r => r.kpi)}
              showReason={relevantKpis[0].reason}
            />
          )}

          {/* Mark as reviewed button */}
          {!isReviewed && (
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={handleMarkReviewed}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Marcar como revisado
            </Button>
          )}
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Ver iniciativas"
        onPrimary={onContinue}
      />
    </div>
  );
}
