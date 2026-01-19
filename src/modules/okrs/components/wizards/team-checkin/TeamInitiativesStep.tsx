/**
 * TeamInitiativesStep - Etapa 3 do Wizard Check-in do Time
 * 
 * Revisão das iniciativas relevantes:
 * - Bloqueadas ou em risco
 * - Impactando múltiplos KRs
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter } from '../shared';

// ============================================================
// TYPES
// ============================================================

interface Initiative {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  krId: string;
  krTitle: string;
  ownerName?: string;
}

export interface TeamInitiativesStepProps {
  initiatives: Initiative[];
  onContinue: () => void;
  onBack: () => void;
}

const STATUS_CONFIG = {
  not_started: { label: 'Não iniciada', icon: Clock, className: 'text-muted-foreground' },
  in_progress: { label: 'Em andamento', icon: Zap, className: 'text-info' },
  blocked: { label: 'Bloqueada', icon: AlertTriangle, className: 'text-danger' },
  completed: { label: 'Concluída', icon: CheckCircle2, className: 'text-success' },
};

// ============================================================
// COMPONENT
// ============================================================

export function TeamInitiativesStep({
  initiatives,
  onContinue,
  onBack,
}: TeamInitiativesStepProps) {
  // Group by status, prioritize blocked
  const sortedInitiatives = useMemo(() => {
    const statusOrder = { blocked: 0, in_progress: 1, not_started: 2, completed: 3 };
    return [...initiatives].sort((a, b) => 
      statusOrder[a.status] - statusOrder[b.status]
    );
  }, [initiatives]);

  const blockedCount = initiatives.filter(i => i.status === 'blocked').length;
  const inProgressCount = initiatives.filter(i => i.status === 'in_progress').length;

  const hasContent = initiatives.length > 0;

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={Zap}
        title="Iniciativas Relevantes"
        description={`${initiatives.length} iniciativas no ciclo`}
        variant="primary"
        rightContent={
          hasContent && (
            <div className="flex items-center gap-2">
              {blockedCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {blockedCount} bloqueada{blockedCount > 1 ? 's' : ''}
                </Badge>
              )}
              {inProgressCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-info-muted text-info-muted-foreground">
                  {inProgressCount} em andamento
                </Badge>
              )}
            </div>
          )
        }
      />

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h4 className="font-medium text-lg">Nenhuma iniciativa crítica</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Todas as iniciativas estão em bom estado.
              </p>
            </div>
          ) : (
            sortedInitiatives.map((initiative) => {
              const config = STATUS_CONFIG[initiative.status];
              const Icon = config.icon;

              return (
                <Card 
                  key={initiative.id}
                  className={cn(
                    "transition-colors",
                    initiative.status === 'blocked' && "border-red-200 dark:border-red-800/50"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.className)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{initiative.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          KR: {initiative.krTitle}
                        </p>
                        {initiative.ownerName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Responsável: {initiative.ownerName}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Registrar decisões"
        onPrimary={onContinue}
      />
    </div>
  );
}
