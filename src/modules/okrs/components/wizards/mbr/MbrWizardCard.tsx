/**
 * MbrWizardCard - Card de entrada para o wizard MBR
 */

import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Play, Calendar, Clock } from 'lucide-react';

interface MbrWizardCardProps {
  lastMbrDate?: string | null;
  isLoading?: boolean;
}

export function MbrWizardCard({
  lastMbrDate,
  isLoading = false,
}: MbrWizardCardProps) {
  const formatLastMbr = () => {
    if (!lastMbrDate) return 'Nenhum MBR realizado';
    const date = new Date(lastMbrDate);
    return `Último: ${date.toLocaleDateString('pt-BR')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 mt-2" />
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
            <BarChart3 className="h-5 w-5 text-status-purple" />
            <CardTitle className="text-lg">Monthly Business Review</CardTitle>
          </div>
          <Badge variant="secondary">Mensal</Badge>
        </div>
        <CardDescription>
          Rito decisório mensal — saúde estratégica do negócio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>~60 min</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{formatLastMbr()}</span>
          </div>
        </div>
        <Button asChild className="w-full gap-2">
          <Link to="/okrs/mbr">
            <Play className="h-4 w-4" />
            Iniciar MBR
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
