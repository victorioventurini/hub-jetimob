/**
 * LeaderAlignmentStep - Etapa 4 do Wizard Líder Prep
 * 
 * Alinhamento com OKRs da área:
 * - OKRs do time vs OKRs da área/pai
 * - Pergunta: Este time está contribuindo claramente?
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Play,
  Target,
  ArrowUpRight,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MicrocopyQuestion } from '../shared/ReflectionQuestions';
import type { WizardKr } from '@/modules/okrs/hooks/useTeamPendingKrs';

// ============================================================
// TYPES
// ============================================================

export interface ParentObjective {
  id: string;
  title: string;
  progress: number;
  status: 'green' | 'yellow' | 'red' | 'not_started';
  teamName: string;
}

export interface LeaderAlignmentStepProps {
  teamName: string;
  teamKrs: WizardKr[];
  parentObjectives: ParentObjective[];
  onStartCheckin: () => void;
  onBack: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function getStatusColor(status: string) {
  switch (status) {
    case 'green':
      return 'bg-green-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'red':
      return 'bg-red-500';
    default:
      return 'bg-muted';
  }
}

// ============================================================
// COMPONENT
// ============================================================

export function LeaderAlignmentStep({
  teamName,
  teamKrs,
  parentObjectives,
  onStartCheckin,
  onBack,
}: LeaderAlignmentStepProps) {
  // Calculate team average progress
  const teamProgress = useMemo(() => {
    if (teamKrs.length === 0) return 0;
    const total = teamKrs.reduce((sum, kr) => sum + kr.progress, 0);
    return Math.round(total / teamKrs.length);
  }, [teamKrs]);

  // Calculate parent average progress
  const parentProgress = useMemo(() => {
    if (parentObjectives.length === 0) return 0;
    const total = parentObjectives.reduce((sum, obj) => sum + obj.progress, 0);
    return Math.round(total / parentObjectives.length);
  }, [parentObjectives]);

  // Alignment assessment
  const alignmentStatus = useMemo(() => {
    if (parentObjectives.length === 0) return 'no_parent';
    const diff = Math.abs(teamProgress - parentProgress);
    if (diff <= 10) return 'aligned';
    if (teamProgress > parentProgress) return 'team_ahead';
    return 'team_behind';
  }, [teamProgress, parentProgress, parentObjectives.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ArrowUpRight className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Alinhamento com a Área</h3>
            <p className="text-sm text-muted-foreground">
              Compare o progresso do seu time com os OKRs superiores
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Team Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {teamName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {teamKrs.length} KRs no ciclo
                </span>
                <span className="font-bold">{teamProgress}%</span>
              </div>
              <Progress value={teamProgress} className="h-2" />
            </CardContent>
          </Card>

          {/* Parent Objectives */}
          {parentObjectives.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                OKRs da Área / Time Pai
              </h4>
              {parentObjectives.map((obj) => (
                <Card key={obj.id} className="border-muted">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{obj.title}</p>
                        <p className="text-xs text-muted-foreground">{obj.teamName}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          obj.status === 'green' && "bg-green-100 text-green-700",
                          obj.status === 'yellow' && "bg-yellow-100 text-yellow-700",
                          obj.status === 'red' && "bg-red-100 text-red-700"
                        )}
                      >
                        {obj.progress}%
                      </Badge>
                    </div>
                    <Progress
                      value={obj.progress}
                      className={cn(
                        "h-1.5",
                        obj.status === 'green' && "[&>div]:bg-green-500",
                        obj.status === 'yellow' && "[&>div]:bg-yellow-500",
                        obj.status === 'red' && "[&>div]:bg-red-500"
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum OKR de área/time pai encontrado para comparação.
              </p>
            </div>
          )}

          {/* Alignment Status */}
          {parentObjectives.length > 0 && (
            <Card
              className={cn(
                alignmentStatus === 'aligned' && "border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-950/20",
                alignmentStatus === 'team_ahead' && "border-blue-200 bg-blue-50/50 dark:border-blue-800/50 dark:bg-blue-950/20",
                alignmentStatus === 'team_behind' && "border-orange-200 bg-orange-50/50 dark:border-orange-800/50 dark:bg-orange-950/20"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {alignmentStatus === 'aligned' && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {alignmentStatus === 'team_ahead' && (
                    <ArrowUpRight className="h-5 w-5 text-blue-600" />
                  )}
                  {alignmentStatus === 'team_behind' && (
                    <HelpCircle className="h-5 w-5 text-orange-600" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {alignmentStatus === 'aligned' && 'Time alinhado com a área'}
                      {alignmentStatus === 'team_ahead' && 'Time à frente da área'}
                      {alignmentStatus === 'team_behind' && 'Time atrás da área'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {alignmentStatus === 'aligned' && 'Progresso similar entre time e área.'}
                      {alignmentStatus === 'team_ahead' && `Seu time está ${teamProgress - parentProgress}% à frente.`}
                      {alignmentStatus === 'team_behind' && `Seu time está ${parentProgress - teamProgress}% atrás.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Reflection question */}
          <MicrocopyQuestion
            question="Este time está claramente contribuindo para os OKRs da área?"
            variant="highlight"
          />
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button onClick={onStartCheckin} className="flex-1" size="lg">
            <Play className="h-4 w-4 mr-2" />
            Iniciar Check-in do Time
          </Button>
        </div>
      </div>
    </div>
  );
}
