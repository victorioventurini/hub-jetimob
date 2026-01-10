/**
 * TeamCheckinWizardCard - Entry point for Team Check-in Wizard
 * Shows for leaders to start a team ritual meeting
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Play, Calendar, Clock } from 'lucide-react';
import { TeamCheckinWizard } from './TeamCheckinWizard';

interface TeamCheckinWizardCardProps {
  teamId: string;
  teamName: string;
  pendingKrsCount?: number;
  lastCheckinDate?: string | null;
  isLoading?: boolean;
}

export function TeamCheckinWizardCard({
  teamId,
  teamName,
  pendingKrsCount = 0,
  lastCheckinDate,
  isLoading = false,
}: TeamCheckinWizardCardProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

  const formatLastCheckin = () => {
    if (!lastCheckinDate) return 'Nenhum ritual realizado';
    const date = new Date(lastCheckinDate);
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
    <>
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Ritual de Check-in do Time</CardTitle>
            </div>
            {pendingKrsCount > 0 && (
              <Badge variant="secondary">
                {pendingKrsCount} KRs pendentes
              </Badge>
            )}
          </div>
          <CardDescription>
            Conduza o check-in semanal com {teamName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>~30 min</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatLastCheckin()}</span>
            </div>
          </div>
          <Button 
            onClick={() => setWizardOpen(true)} 
            className="w-full gap-2"
          >
            <Play className="h-4 w-4" />
            Iniciar Ritual
          </Button>
        </CardContent>
      </Card>

      <TeamCheckinWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        teamId={teamId}
        teamName={teamName}
      />
    </>
  );
}
