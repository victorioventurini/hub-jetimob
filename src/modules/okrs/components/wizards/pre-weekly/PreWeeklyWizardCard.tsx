/**
 * PreWeeklyWizardCard — Card de entrada para o Pré-Weekly v2
 */

import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, Play, Clock, Calendar } from 'lucide-react';

interface PreWeeklyWizardCardProps {
  isLoading?: boolean;
}

export function PreWeeklyWizardCard({ isLoading = false }: PreWeeklyWizardCardProps) {
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
    <Card className="border-l-4 border-l-status-blue">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-status-blue" />
            <CardTitle className="text-lg">Pré-Weekly</CardTitle>
          </div>
          <Badge variant="outline">Semanal</Badge>
        </div>
        <CardDescription>
          Destile sua semana antes da Weekly da BU
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>~5 min</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Sexta ou segunda</span>
          </div>
        </div>
        <Button asChild className="w-full gap-2">
          <Link to="/rituals/pre-weekly">
            <Play className="h-4 w-4" />
            Iniciar Pré-Weekly
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
