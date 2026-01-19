/**
 * ManagersCrossIssuesStep - Etapa 2 do Wizard Check-in de Gestores
 * 
 * Pontos de atenção cruzados:
 * - Dependências entre áreas
 * - Bloqueios que afetam múltiplos times
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardTooltipInline } from '../shared/WizardTooltips';
import { AskToVicStepHelper } from '@/modules/vic/components/AskToVic';
import type { CrossDependency } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface ManagersCrossIssuesStepProps {
  dependencies: CrossDependency[];
  onContinue: () => void;
  onBack: () => void;
}

const STATUS_CONFIG = {
  healthy: { 
    label: 'Saudável', 
    icon: CheckCircle2, 
    className: 'text-status-green',
    badgeClass: 'bg-status-green-muted text-status-green',
  },
  at_risk: { 
    label: 'Em Risco', 
    icon: Clock, 
    className: 'text-status-yellow',
    badgeClass: 'bg-status-yellow-muted text-status-yellow',
  },
  blocked: { 
    label: 'Bloqueado', 
    icon: AlertTriangle, 
    className: 'text-status-red',
    badgeClass: 'bg-status-red-muted text-status-red',
  },
};

// ============================================================
// COMPONENT
// ============================================================

export function ManagersCrossIssuesStep({
  dependencies,
  onContinue,
  onBack,
}: ManagersCrossIssuesStepProps) {
  // Sort by status (blocked first)
  const sortedDependencies = useMemo(() => {
    const statusOrder = { blocked: 0, at_risk: 1, healthy: 2 };
    return [...dependencies].sort((a, b) => 
      statusOrder[a.status] - statusOrder[b.status]
    );
  }, [dependencies]);

  const blockedCount = dependencies.filter(d => d.status === 'blocked').length;
  const atRiskCount = dependencies.filter(d => d.status === 'at_risk').length;
  const hasIssues = blockedCount > 0 || atRiskCount > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Dependências entre Áreas</h3>
              <WizardTooltipInline tooltipKey="managers-cross-issues" />
              <AskToVicStepHelper
                context={{
                  module: 'okrs',
                  wizard: 'managers-checkin',
                  step: 'cross-issues',
                  userRole: 'gestor',
                  additionalData: {
                    dependenciesCount: dependencies.length,
                    blockedCount,
                    atRiskCount,
                  },
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {dependencies.length} dependências mapeadas
            </p>
          </div>
        </div>
        
        {hasIssues && (
          <div className="flex items-center gap-2 mt-3">
            {blockedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {blockedCount} bloqueada{blockedCount > 1 ? 's' : ''}
              </Badge>
            )}
            {atRiskCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-warning-muted text-warning-muted-foreground">
                {atRiskCount} em risco
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-3">
          {sortedDependencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h4 className="font-medium text-lg">Sem dependências críticas</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Todas as dependências entre áreas estão saudáveis.
              </p>
            </div>
          ) : (
            sortedDependencies.map((dep) => {
              const config = STATUS_CONFIG[dep.status];
              const Icon = config.icon;

              return (
                <Card 
                  key={dep.id}
                  className={cn(
                    "transition-colors",
                    dep.status === 'blocked' && "border-red-200 dark:border-red-800/50",
                    dep.status === 'at_risk' && "border-yellow-200 dark:border-yellow-800/50"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.className)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm mb-2">{dep.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium">{dep.fromTeam.name}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium">{dep.toTeam.name}</span>
                        </div>
                        <Badge variant="secondary" className={cn("text-xs mt-2", config.badgeClass)}>
                          {config.label}
                        </Badge>
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
          <Button onClick={onContinue} className="flex-1" size="lg">
            Definir ajustes
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
