/**
 * LeaderPrepWizardCard - Card de entrada para o Wizard de Preparação do Líder
 * 
 * Navega para a página fullpage do wizard em /okrs/leader-prep
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users,
  ArrowRight, 
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeaderPrepWizardCardProps {
  teamId: string;
  teamName: string;
  pendingCount?: number;
  atRiskCount?: number;
  isLoading?: boolean;
  className?: string;
}

export function LeaderPrepWizardCard({ 
  teamId,
  teamName,
  pendingCount = 0,
  atRiskCount = 0,
  isLoading = false,
  className 
}: LeaderPrepWizardCardProps) {
  const navigate = useNavigate();

  // Determine if it's Monday (1)
  const today = new Date();
  const isMonday = today.getDay() === 1;

  const hasIssues = atRiskCount > 0;
  const totalIssues = pendingCount + atRiskCount;

  const handleClick = () => {
    navigate(`/okrs/leader-prep?team=${teamId}`);
  };

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
    <Card 
      className={cn(
        "animate-fade-in overflow-hidden transition-all hover:shadow-md cursor-pointer group",
        hasIssues 
          ? "border-orange-200 dark:border-orange-800/50 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20"
          : "border-blue-200 dark:border-blue-800/50 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "p-3 rounded-xl transition-transform group-hover:scale-105",
            hasIssues 
              ? "bg-orange-100 dark:bg-orange-900/30"
              : "bg-blue-100 dark:bg-blue-900/30"
          )}>
            {hasIssues ? (
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            ) : (
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base">
                Preparar Check-in do Time
              </h3>
              {hasIssues && (
                <Badge variant="destructive" className="text-xs">
                  {totalIssues} alerta{totalIssues > 1 ? 's' : ''}
                </Badge>
              )}
              {isMonday && !hasIssues && (
                <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                  <Calendar className="h-3 w-3 mr-1" />
                  Segunda
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {hasIssues 
                ? `${teamName} tem ${atRiskCount} KR${atRiskCount > 1 ? 's' : ''} em risco para revisar`
                : `Revise o progresso do ${teamName} antes do check-in`
              }
            </p>
          </div>

          {/* Action */}
          <Button 
            size="sm" 
            className="shrink-0 gap-1"
            variant={hasIssues ? "default" : "outline"}
          >
            Preparar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
