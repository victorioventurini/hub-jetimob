/**
 * TeamKrReviewStep - Etapa 2 do Wizard Check-in do Time
 * 
 * Revisão dos KRs em grupo:
 * - Foco nos marcados para discussão
 * - Navegação rápida entre KRs
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
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';

// ============================================================
// TYPES
// ============================================================

export interface TeamKrReviewStepProps {
  krs: WizardKr[];
  markedForDiscussion: string[];
  reviewedKrs: Set<string>;
  onMarkReviewed: (krId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamKrReviewStep({
  krs,
  markedForDiscussion,
  reviewedKrs,
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

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (currentIndex < sortedKrs.length - 1) setCurrentIndex(currentIndex + 1);
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
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
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
        <div className="p-6">
          <Card className={cn(
            "transition-colors",
            isMarked && "border-orange-300 dark:border-orange-700",
            isReviewed && "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20"
          )}>
            <CardContent className="p-5 space-y-4">
              {/* Status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {isMarked && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Para discussão
                  </Badge>
                )}
                {isReviewed && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Revisado
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    currentKr.status === 'green' && "bg-green-100 text-green-700",
                    currentKr.status === 'yellow' && "bg-yellow-100 text-yellow-700",
                    currentKr.status === 'red' && "bg-red-100 text-red-700"
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
                  <span className="font-bold">{Math.round(currentKr.progress)}%</span>
                </div>
                <Progress 
                  value={currentKr.progress} 
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
