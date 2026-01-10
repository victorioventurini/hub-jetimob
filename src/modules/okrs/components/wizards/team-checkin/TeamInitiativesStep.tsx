/**
 * TeamInitiativesStep - Etapa 3 do Wizard Check-in do Time
 * 
 * Revisão das iniciativas relevantes:
 * - Bloqueadas ou em risco
 * - Impactando múltiplos KRs
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowRight,
  ArrowLeft,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  in_progress: { label: 'Em andamento', icon: Zap, className: 'text-blue-600' },
  blocked: { label: 'Bloqueada', icon: AlertTriangle, className: 'text-red-600' },
  completed: { label: 'Concluída', icon: CheckCircle2, className: 'text-green-600' },
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
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Iniciativas Relevantes</h3>
            <p className="text-sm text-muted-foreground">
              {initiatives.length} iniciativas no ciclo
            </p>
          </div>
        </div>
        
        {hasContent && (
          <div className="flex items-center gap-3 mt-3">
            {blockedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {blockedCount} bloqueada{blockedCount > 1 ? 's' : ''}
              </Badge>
            )}
            {inProgressCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {inProgressCount} em andamento
              </Badge>
            )}
          </div>
        )}
      </div>

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

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <Button onClick={onContinue} className="flex-1">
            Registrar decisões
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
