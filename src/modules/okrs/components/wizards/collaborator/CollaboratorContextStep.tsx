/**
 * CollaboratorContextStep - Etapa 1 do Wizard Colaborador
 * 
 * Mostra o contexto da semana:
 * - OKRs do time
 * - KRs individuais do colaborador
 * - Indicador visual de progresso
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Target,
  ArrowRight,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import { WizardTooltipInline, WizardTipCard } from '../shared/WizardTooltips';
import { RAG_STATUS_COLORS } from '@/lib/colors';

// ============================================================
// TYPES
// ============================================================

export interface CollaboratorContextStepProps {
  krs: WizardKr[];
  isLoading?: boolean;
  cycleName?: string;
  onContinue: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function groupKrsByObjective(krs: WizardKr[]): Map<string, { title: string; teamName: string; krs: WizardKr[] }> {
  const grouped = new Map<string, { title: string; teamName: string; krs: WizardKr[] }>();
  
  for (const kr of krs) {
    const existing = grouped.get(kr.objective_id);
    if (existing) {
      existing.krs.push(kr);
    } else {
      grouped.set(kr.objective_id, {
        title: kr.objective_title,
        teamName: kr.team_name,
        krs: [kr],
      });
    }
  }
  
  return grouped;
}

const STATUS_CONFIG = {
  green: { label: 'No caminho', className: RAG_STATUS_COLORS.green.badge },
  yellow: { label: 'Em risco', className: RAG_STATUS_COLORS.yellow.badge },
  red: { label: 'Em perigo', className: RAG_STATUS_COLORS.red.badge },
  not_started: { label: 'Não iniciado', className: RAG_STATUS_COLORS.not_started.badge },
};

// ============================================================
// COMPONENT
// ============================================================

export function CollaboratorContextStep({
  krs,
  isLoading,
  cycleName,
  onContinue,
}: CollaboratorContextStepProps) {
  const groupedKrs = useMemo(() => groupKrsByObjective(krs), [krs]);
  
  const stats = useMemo(() => {
    const total = krs.length;
    const pending = krs.filter(kr => kr.is_pending).length;
    const atRisk = krs.filter(kr => kr.is_at_risk).length;
    const avgProgress = total > 0 
      ? Math.round(krs.reduce((sum, kr) => sum + kr.progress, 0) / total)
      : 0;
    
    return { total, pending, atRisk, avgProgress };
  }, [krs]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header message */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Esta é sua atualização semanal de OKRs</h3>
              <AskToVicStepHelper
                context={{
                  module: 'okrs',
                  wizard: 'collaborator',
                  step: 'collaborator-context',
                  userRole: 'colaborador',
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ela ajuda você, seu líder e seu time a manter foco no que realmente importa.
            </p>
            {cycleName && (
              <Badge variant="outline" className="mt-2">
                {cycleName}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="px-6 py-4 grid grid-cols-4 gap-4 border-b bg-muted/20">
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">KRs atribuídos</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{stats.avgProgress}%</p>
          <p className="text-xs text-muted-foreground">Progresso médio</p>
        </div>
        <div className="text-center">
          <p className={cn("text-2xl font-bold", stats.pending > 0 && "text-status-orange")}>
            {stats.pending}
          </p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
        <div className="text-center">
          <p className={cn("text-2xl font-bold", stats.atRisk > 0 && "text-destructive")}>
            {stats.atRisk}
          </p>
          <p className="text-xs text-muted-foreground">Em risco</p>
        </div>
      </div>

      {/* KRs by objective */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {Array.from(groupedKrs.entries()).map(([objectiveId, group]) => (
            <div key={objectiveId} className="space-y-3">
              {/* Objective header */}
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-sm">{group.title}</h4>
                  <p className="text-xs text-muted-foreground">{group.teamName}</p>
                </div>
              </div>

              {/* KRs list */}
              <div className="ml-6 space-y-2">
                {group.krs.map(kr => {
                  const statusConfig = STATUS_CONFIG[kr.status];
                  
                  return (
                    <div 
                      key={kr.id}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        kr.is_at_risk && "border-destructive/30 bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{kr.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="secondary" 
                              className={cn("text-xs", statusConfig.className)}
                            >
                              {statusConfig.label}
                            </Badge>
                            {kr.is_pending && (
                              <span className="flex items-center gap-1 text-xs text-status-orange">
                                <Clock className="h-3 w-3" />
                                {kr.days_since_checkin}d sem update
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold">{Math.round(kr.progress)}%</p>
                          <p className="text-xs text-muted-foreground">
                            {kr.current_value} / {kr.target} {kr.unit}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-2">
                        <Progress 
                          value={kr.progress} 
                          className={cn(
                            "h-1.5",
                            kr.status === 'red' && "[&>div]:bg-status-red",
                            kr.status === 'yellow' && "[&>div]:bg-status-yellow"
                          )} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {krs.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h4 className="font-medium">Nenhum KR atribuído a você</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Você não possui KRs para atualizar neste ciclo.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with action */}
      <div className="px-6 py-4 border-t bg-background">
        <Button 
          onClick={onContinue}
          className="w-full"
          size="lg"
          disabled={krs.length === 0}
        >
          {stats.pending > 0 
            ? `Atualizar ${stats.pending} KR${stats.pending > 1 ? 's' : ''} pendente${stats.pending > 1 ? 's' : ''}`
            : 'Continuar'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
