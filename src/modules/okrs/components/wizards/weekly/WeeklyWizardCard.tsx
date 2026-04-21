/**
 * WeeklyWizardCard — Card de entrada para a Weekly v2 (rito coletivo da BU)
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
import { Sparkles, Play, Clock, Calendar } from 'lucide-react';

interface WeeklyWizardCardProps {
  isLoading?: boolean;
}

export function WeeklyWizardCard({ isLoading = false }: WeeklyWizardCardProps) {
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
            <Sparkles className="h-5 w-5 text-status-purple" />
            <CardTitle className="text-lg">Weekly</CardTitle>
          </div>
          <Badge variant="outline">Terça-feira</Badge>
        </div>
        <CardDescription>
          Rito executivo da BU com curadoria do agente orquestrador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>~45–60 min</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Semanal</span>
          </div>
        </div>
        <Button asChild className="w-full gap-2">
          <Link to="/rituals/weekly">
            <Play className="h-4 w-4" />
            Iniciar Weekly
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
