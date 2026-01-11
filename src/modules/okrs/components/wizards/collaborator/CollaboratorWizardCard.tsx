/**
 * CollaboratorWizardCard - Card de entrada para o Wizard do Colaborador
 * 
 * Navega para a página fullpage /okrs/collaborator-checkin
 */

import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarCheck, 
  ArrowRight, 
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendingCheckins } from '@/modules/okrs/hooks/usePendingCheckins';

export interface CollaboratorWizardCardProps {
  className?: string;
}

export function CollaboratorWizardCard({ className }: CollaboratorWizardCardProps) {
  const navigate = useNavigate();
  const { data: pendingCheckins, isLoading } = usePendingCheckins();

  const overdueCount = pendingCheckins?.filter(c => c.is_overdue).length || 0;
  const totalCount = pendingCheckins?.length || 0;

  // Determine if it's Friday (5)
  const today = new Date();
  const isFriday = today.getDay() === 5;

  // Show the card if user has any pending checkins
  const shouldShow = totalCount > 0;

  const handleClick = () => {
    navigate('/okrs/collaborator-checkin');
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

  if (!shouldShow) {
    return null;
  }

  return (
    <Card 
      className={cn(
        "animate-fade-in overflow-hidden transition-all hover:shadow-md cursor-pointer group",
        overdueCount > 0 
          ? "border-orange-200 dark:border-orange-800/50 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20"
          : "border-primary/20 bg-gradient-to-r from-primary/5 to-transparent",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={cn(
            "p-3 rounded-xl transition-transform group-hover:scale-105",
            overdueCount > 0 
              ? "bg-orange-100 dark:bg-orange-900/30"
              : "bg-primary/10"
          )}>
            {overdueCount > 0 ? (
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            ) : (
              <CalendarCheck className="h-6 w-6 text-primary" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base">
                {isFriday ? 'Check-in Semanal' : 'Atualizar OKRs'}
              </h3>
              {overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {overdueCount} pendente{overdueCount > 1 ? 's' : ''}
                </Badge>
              )}
              {isFriday && overdueCount === 0 && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Sexta
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {overdueCount > 0 
                ? `${overdueCount} de ${totalCount} KRs precisam de atualização`
                : isFriday
                  ? 'Momento de reflexão e atualização dos seus OKRs'
                  : `Você tem ${totalCount} KRs para acompanhar`
              }
            </p>
          </div>

          {/* Action */}
          <Button 
            size="sm" 
            className="shrink-0 gap-1"
            variant={overdueCount > 0 ? "default" : "outline"}
          >
            Iniciar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
