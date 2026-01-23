/**
 * KrContextStep - Step 1: Contexto do Objetivo
 * 
 * Exibe informações do objetivo para o qual os KRs serão criados
 * Garantir que o usuário sabe exatamente PARA QUAL objetivo está criando KRs
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, Users, Share2, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepFooter } from '../shared';
import { AskToVicInline } from '@/modules/vic/components/AskToVic';

// ============================================================
// TYPES
// ============================================================

export interface ObjectiveContext {
  id: string;
  title: string;
  description?: string | null;
  teamName: string;
  teamId: string;
  orgObjectiveTitle?: string | null;
  isShared: boolean;
  responsibilityModel?: 'collaborative' | 'primary_led' | null;
  primaryTeamName?: string | null;
  contributingTeams?: Array<{ id: string; name: string }>;
  cycleName?: string | null;
  year?: number;
}

export interface KrContextStepProps {
  objective: ObjectiveContext;
  onContinue: () => void;
  onClose: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function KrContextStep({
  objective,
  onContinue,
  onClose,
}: KrContextStepProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Contexto do Objetivo</h2>
              <AskToVicInline
                context={{
                  module: 'okrs',
                  wizard: 'creation',
                  step: 'context',
                  objectiveTitle: objective.title,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Revise o objetivo antes de definir como medir o sucesso.
            </p>
          </div>

          {/* Vic Quote */}
          <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Vic</p>
                <p className="text-sm text-muted-foreground">
                  "Antes de falar de números, vamos alinhar o porquê. 
                  Key Results existem para provar que esse objetivo aconteceu."
                </p>
              </div>
            </div>
          </div>

          {/* Objective Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{objective.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {objective.teamName}
                      {objective.cycleName && ` • ${objective.cycleName}`}
                      {objective.year && ` ${objective.year}`}
                    </p>
                  </div>
                </div>
                {objective.isShared && (
                  <Badge variant="outline" className="gap-1">
                    <Share2 className="h-3 w-3" />
                    Compartilhado
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {objective.description && (
                <p className="text-sm text-muted-foreground">
                  {objective.description}
                </p>
              )}

              {/* Org Objective Link */}
              {objective.orgObjectiveTitle && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Vinculado a
                  </p>
                  <p className="text-sm font-medium">
                    {objective.orgObjectiveTitle}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shared OKR Info */}
          {objective.isShared && (
            <Card className="border-info/30 dark:border-info/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-info" />
                  Informações de Compartilhamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Responsibility Model */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Modelo:</span>
                  <Badge variant="outline">
                    {objective.responsibilityModel === 'primary_led' 
                      ? 'Liderado por time principal' 
                      : 'Colaborativo'}
                  </Badge>
                </div>

                {/* Primary Team */}
                {objective.primaryTeamName && (
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-warning" />
                    <span className="text-sm">
                      <span className="text-muted-foreground">Time Principal: </span>
                      <span className="font-medium">{objective.primaryTeamName}</span>
                    </span>
                  </div>
                )}

                {/* Contributing Teams */}
                {objective.contributingTeams && objective.contributingTeams.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Times Contribuidores:</p>
                    <div className="flex flex-wrap gap-2">
                      {objective.contributingTeams.map(team => (
                        <Badge key={team.id} variant="secondary">
                          {team.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ask to Vic prompts */}
          <div className="p-4 border rounded-lg border-dashed">
            <p className="text-sm font-medium mb-2">Pergunte ao Vic:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• "O que faz um bom objetivo para OKRs?"</li>
              <li>• "Qual a diferença entre objetivo e KR?"</li>
            </ul>
          </div>
        </div>
      </ScrollArea>

      <WizardStepFooter
        showBack={false}
        primaryLabel="Definir como medir o sucesso"
        onPrimary={onContinue}
      />
    </div>
  );
}
