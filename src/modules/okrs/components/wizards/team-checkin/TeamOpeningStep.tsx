/**
 * TeamOpeningStep - Etapa 1 do Wizard Check-in do Time
 * 
 * Abertura da reunião:
 * - Resumo do status do time
 * - Itens marcados para discussão (do leader-prep)
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Target, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardFirstStepFooter } from '../shared';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';

// ============================================================
// TYPES
// ============================================================

export interface TeamOpeningStepProps {
  teamName: string;
  cycleName?: string;
  krs: WizardKr[];
  markedForDiscussion: string[];
  isLoading?: boolean;
  onContinue: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamOpeningStep({
  teamName,
  cycleName,
  krs,
  markedForDiscussion,
  isLoading,
  onContinue,
}: TeamOpeningStepProps) {
  // Calculate stats
  const stats = useMemo(() => {
    if (krs.length === 0) return { onTrack: 0, atRisk: 0, offTrack: 0, avgProgress: 0 };
    
    const onTrack = krs.filter(kr => kr.status === 'green').length;
    const atRisk = krs.filter(kr => kr.status === 'yellow').length;
    const offTrack = krs.filter(kr => kr.status === 'red' || kr.status === 'not_started').length;
    const avgProgress = Math.round(krs.reduce((sum, kr) => sum + kr.progress, 0) / krs.length);
    
    return { onTrack, atRisk, offTrack, avgProgress };
  }, [krs]);

  const discussionKrs = useMemo(() => 
    krs.filter(kr => markedForDiscussion.includes(kr.id)),
    [krs, markedForDiscussion]
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={Users}
        title={`Check-in: ${teamName}`}
        description={cycleName}
        variant="primary"
        rightContent={
          <div className="text-right">
            <p className="text-2xl font-bold">{stats.avgProgress}%</p>
            <p className="text-xs text-muted-foreground">progresso médio</p>
          </div>
        }
      />

      {/* Status Summary */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-green" />
            <span className="text-sm">{stats.onTrack} no caminho</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-yellow" />
            <span className="text-sm">{stats.atRisk} em atenção</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-status-red" />
            <span className="text-sm">{stats.offTrack} em risco</span>
          </div>
        </div>
        <Progress value={stats.avgProgress} className="h-2 mt-3" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Marked for discussion */}
        {discussionKrs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-orange" />
              Marcados para discussão ({discussionKrs.length})
            </h4>
            {discussionKrs.map((kr) => (
              <Card key={kr.id} className="border-orange-200 dark:border-orange-800/50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{kr.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {kr.owner_name || 'Sem responsável'}
                      </p>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        kr.status === 'green' && "bg-status-green-muted text-status-green",
                        kr.status === 'yellow' && "bg-status-yellow-muted text-status-yellow",
                        kr.status === 'red' && "bg-status-red-muted text-status-red"
                      )}
                    >
                      {Math.round(kr.progress)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* All KRs summary */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Todos os KRs ({krs.length})
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {krs.slice(0, 6).map((kr) => (
              <div 
                key={kr.id}
                className="p-2 rounded-lg bg-muted/50 text-sm"
              >
                <p className="truncate font-medium">{kr.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{Math.round(kr.progress)}%</span>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    kr.status === 'green' && "bg-status-green",
                    kr.status === 'yellow' && "bg-status-yellow",
                    kr.status === 'red' && "bg-status-red",
                    kr.status === 'not_started' && "bg-muted-foreground"
                  )} />
                </div>
              </div>
            ))}
          </div>
          {krs.length > 6 && (
            <p className="text-xs text-muted-foreground text-center">
              +{krs.length - 6} outros KRs
            </p>
          )}
        </div>
      </div>

      <WizardFirstStepFooter
        primaryLabel="Revisar KRs"
        onPrimary={onContinue}
      />
    </div>
  );
}
