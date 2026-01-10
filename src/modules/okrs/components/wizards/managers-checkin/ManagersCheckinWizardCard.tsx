/**
 * ManagersCheckinWizardCard - Entry point for Managers Check-in Wizard
 * Shows for BU admins to conduct cross-area alignment
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Play, ArrowLeftRight, AlertTriangle } from 'lucide-react';
import { ManagersCheckinWizard } from './ManagersCheckinWizard';

interface ManagersCheckinWizardCardProps {
  areaCount?: number;
  crossDependenciesCount?: number;
  blockedItemsCount?: number;
  isLoading?: boolean;
}

export function ManagersCheckinWizardCard({
  areaCount = 0,
  crossDependenciesCount = 0,
  blockedItemsCount = 0,
  isLoading = false,
}: ManagersCheckinWizardCardProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

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

  const hasIssues = crossDependenciesCount > 0 || blockedItemsCount > 0;

  return (
    <>
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Check-in de Gestores</CardTitle>
            </div>
            {hasIssues && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Requer atenção
              </Badge>
            )}
          </div>
          <CardDescription>
            Alinhe prioridades entre as {areaCount} áreas da BU
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {crossDependenciesCount > 0 && (
              <div className="flex items-center gap-1">
                <ArrowLeftRight className="h-4 w-4" />
                <span>{crossDependenciesCount} dependências</span>
              </div>
            )}
            {blockedItemsCount > 0 && (
              <div className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>{blockedItemsCount} bloqueios</span>
              </div>
            )}
          </div>
          <Button 
            onClick={() => setWizardOpen(true)} 
            className="w-full gap-2"
            variant="secondary"
          >
            <Play className="h-4 w-4" />
            Iniciar Alinhamento
          </Button>
        </CardContent>
      </Card>

      <ManagersCheckinWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />
    </>
  );
}
