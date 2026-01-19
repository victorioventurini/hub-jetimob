/**
 * CLevelCheckinWizardCard - Entry point for C-Level Check-in Wizard
 * Navega para a página fullpage /okrs/clevel-checkin
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Play, Target, TrendingUp } from 'lucide-react';

interface CLevelCheckinWizardCardProps {
  companyOkrCount?: number;
  overallProgress?: number;
  atRiskCount?: number;
  isLoading?: boolean;
}

export function CLevelCheckinWizardCard({
  companyOkrCount = 0,
  overallProgress = 0,
  atRiskCount = 0,
  isLoading = false,
}: CLevelCheckinWizardCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/okrs/clevel-checkin');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-status-purple">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-status-purple" />
            <CardTitle className="text-lg">Check-in Estratégico</CardTitle>
          </div>
          {atRiskCount > 0 && (
            <Badge variant="destructive">
              {atRiskCount} OKRs em risco
            </Badge>
          )}
        </div>
        <CardDescription>
          Revisão mensal dos OKRs de empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Target className="h-4 w-4" />
            <span>{companyOkrCount} Objetivos</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>{overallProgress.toFixed(0)}% progresso</span>
          </div>
        </div>
        <Button 
          onClick={handleClick} 
          className="w-full gap-2 bg-status-purple hover:bg-status-purple/90"
        >
          <Play className="h-4 w-4" />
          Iniciar Revisão Estratégica
        </Button>
      </CardContent>
    </Card>
  );
}
