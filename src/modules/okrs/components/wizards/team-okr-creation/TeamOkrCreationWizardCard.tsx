/**
 * TeamOkrCreationWizardCard - Card de entrada para o Wizard de Criação de OKRs
 * 
 * Exibido no dashboard do líder:
 * - No início de ciclo
 * - Quando não há OKRs definidos para o time
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target,
  ArrowRight, 
  Sparkles,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TeamOkrCreationWizard } from './TeamOkrCreationWizard';

export interface TeamOkrCreationWizardCardProps {
  teamId: string;
  teamName: string;
  hasActiveOkrs?: boolean;
  cycleStartingSoon?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function TeamOkrCreationWizardCard({ 
  teamId,
  teamName,
  hasActiveOkrs = false,
  cycleStartingSoon = false,
  isLoading = false,
  className 
}: TeamOkrCreationWizardCardProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

  const isUrgent = !hasActiveOkrs || cycleStartingSoon;

  if (isLoading) {
    return (
      <Card className={cn("animate-fade-in", className)}>
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className={cn(
          "animate-fade-in overflow-hidden transition-all hover:shadow-md cursor-pointer group",
          isUrgent 
            ? "border-primary/50 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10"
            : "border-muted bg-gradient-to-r from-muted/50 to-transparent",
          className
        )}
        onClick={() => setWizardOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={cn(
              "p-3 rounded-xl transition-transform group-hover:scale-105",
              isUrgent 
                ? "bg-primary/10"
                : "bg-muted"
            )}>
              <Target className={cn(
                "h-6 w-6",
                isUrgent ? "text-primary" : "text-muted-foreground"
              )} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base">
                  Criar OKRs do Time
                </h3>
                {cycleStartingSoon && (
                  <Badge className="text-xs bg-primary/10 text-primary border-primary/30">
                    <Calendar className="h-3 w-3 mr-1" />
                    Novo ciclo
                  </Badge>
                )}
                {!hasActiveOkrs && !cycleStartingSoon && (
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Começar
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {cycleStartingSoon 
                  ? `Defina os objetivos do ${teamName} para o novo ciclo`
                  : hasActiveOkrs
                    ? `Adicione novos objetivos ao ${teamName}`
                    : `O ${teamName} ainda não tem OKRs definidos`
                }
              </p>
            </div>

            {/* Action */}
            <Button 
              size="sm" 
              className="shrink-0 gap-1"
              variant={isUrgent ? "default" : "outline"}
            >
              {hasActiveOkrs ? 'Adicionar' : 'Começar'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wizard */}
      <TeamOkrCreationWizard 
        open={wizardOpen} 
        onOpenChange={setWizardOpen}
        teamId={teamId}
        teamName={teamName}
      />
    </>
  );
}
