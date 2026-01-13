/**
 * KrReviewStep - Step 8: Revisão Final
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepFooter } from '../shared';
import type { DraftTeamKr, DraftTeamDependency, DraftTeamInitiative } from '@/modules/okrs/types/wizard';

export interface KrReviewStepProps {
  objectiveTitle: string;
  teamName: string;
  draftKrs: DraftTeamKr[];
  dependencies: DraftTeamDependency[];
  initiatives: DraftTeamInitiative[];
  teamMembers: Array<{ id: string; fullName: string }>;
  isSharedObjective: boolean;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

const TYPE_LABELS = {
  foundational: 'Fundacional',
  contribution: 'Contribuição',
  enabler: 'Habilitador',
};

const TYPE_COLORS = {
  foundational: 'bg-status-green-muted text-status-green-muted-foreground',
  contribution: 'bg-info-muted text-info-muted-foreground',
  enabler: 'bg-status-yellow-muted text-status-yellow-muted-foreground',
};

export function KrReviewStep({
  objectiveTitle,
  teamName,
  draftKrs,
  dependencies,
  initiatives,
  teamMembers,
  isSharedObjective,
  onConfirm,
  onBack,
  isSubmitting = false,
}: KrReviewStepProps) {
  const getOwnerName = (userId: string | null) => {
    if (!userId) return 'Não definido';
    const member = teamMembers.find(m => m.id === userId);
    return member?.fullName || 'Desconhecido';
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Revisão Final</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Confirme os Key Results antes de criar.
            </p>
          </div>

          {/* Objective Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Objetivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{objectiveTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {teamName}
                {isSharedObjective && (
                  <Badge variant="outline" className="ml-2">Compartilhado</Badge>
                )}
              </p>
            </CardContent>
          </Card>

          {/* KRs List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Key Results ({draftKrs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {draftKrs.map((kr, index) => (
                <div 
                  key={kr.id}
                  className="p-3 border rounded-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn("text-xs", TYPE_COLORS[kr.type])}>
                          {TYPE_LABELS[kr.type]}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{kr.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kr.direction === 'up' ? 'Aumentar' : 'Diminuir'} de {kr.baseline} para {kr.target} {kr.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {getOwnerName(kr.owner_user_id)}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Dependencies */}
          {dependencies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Dependências ({dependencies.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {dependencies.map((dep, i) => (
                    <li key={i} className="text-muted-foreground">
                      • {dep.description}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Initiatives */}
          {initiatives.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  Iniciativas ({initiatives.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {initiatives.map((init, i) => (
                    <li key={i} className="text-muted-foreground">
                      • {init.name}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Coach Question */}
          <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Pergunta do Coach</p>
                <p className="text-sm text-muted-foreground italic">
                  "Se esses KRs baterem, você diria que o objetivo foi um sucesso?"
                </p>
              </div>
            </div>
          </div>

          {/* Cultural Message */}
          <div className="p-4 border-l-4 border-primary bg-muted/50 rounded-r-lg">
            <p className="text-sm italic">
              "Foco não é fazer mais. É provar que o que importa aconteceu."
            </p>
          </div>
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Criar KRs e iniciar acompanhamento"
        onPrimary={onConfirm}
        primaryLoading={isSubmitting}
        primaryVariant="success"
      />
    </div>
  );
}
