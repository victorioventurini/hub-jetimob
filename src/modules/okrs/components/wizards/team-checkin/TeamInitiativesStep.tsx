/**
 * TeamInitiativesStep - Etapa 3 do Wizard Check-in do Time
 * 
 * Revisão das iniciativas e projetos, agrupados por KR.
 * Projetos sem KR ficam em bloco separado "Projetos sem OKR".
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, AlertTriangle, CheckCircle2, Clock, Target, FolderKanban } from 'lucide-react';
import { ProjectsSummary } from '@/modules/projects/components/ProjectsSummary';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { useProjectsForKr } from '@/modules/projects/hooks/useProjectsForKr';
import { cn } from '@/lib/utils';
import { WizardStepHeader, WizardStepFooter, InlineDecisionInput } from '../shared';
import type { TeamCheckinDecision } from '@/modules/okrs/types/wizard';

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
  teamId?: string;
  decisions?: TeamCheckinDecision[];
  onDecisionsChange?: (decisions: TeamCheckinDecision[]) => void;
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
// KR Projects Sub-component (fetches projects for a single KR)
// ============================================================

function KrProjectsList({ krId }: { krId: string }) {
  const { data: projects, isLoading } = useProjectsForKr(krId);
  if (isLoading || !projects || projects.length === 0) return null;

  return (
    <div className="space-y-1 mt-2">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        <FolderKanban className="h-3 w-3" /> Projetos vinculados ({projects.length})
      </p>
      <ul className="space-y-1 pl-1">
        {projects.map(proj => (
          <li key={proj.id} className="flex items-center gap-2 text-xs">
            <ProjectHealthBadge health={proj.health} dotOnly />
            <span className="truncate">{proj.name}</span>
            <span className="text-muted-foreground shrink-0">{proj.completion_pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function TeamInitiativesStep({
  initiatives,
  teamId,
  decisions = [],
  onDecisionsChange,
  onContinue,
  onBack,
}: TeamInitiativesStepProps) {
  // Group initiatives by KR
  const groupedByKr = useMemo(() => {
    const groups = new Map<string, { krId: string; krTitle: string; initiatives: Initiative[] }>();
    for (const init of initiatives) {
      const existing = groups.get(init.krId);
      if (existing) {
        existing.initiatives.push(init);
      } else {
        groups.set(init.krId, { krId: init.krId, krTitle: init.krTitle, initiatives: [init] });
      }
    }
    // Sort initiatives within each group: blocked first
    const statusOrder = { blocked: 0, in_progress: 1, not_started: 2, completed: 3 };
    for (const group of groups.values()) {
      group.initiatives.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
    }
    return Array.from(groups.values());
  }, [initiatives]);

  const blockedCount = initiatives.filter(i => i.status === 'blocked').length;
  const inProgressCount = initiatives.filter(i => i.status === 'in_progress').length;
  const hasContent = initiatives.length > 0;

  return (
    <div className="flex flex-col h-full">
      <WizardStepHeader
        icon={Zap}
        title="Iniciativas Relevantes"
        tooltip="team-initiatives"
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
        <div className="p-6 space-y-4">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mb-4" />
              <h4 className="font-medium text-lg">Nenhuma iniciativa crítica</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Todas as iniciativas estão em bom estado.
              </p>
            </div>
          ) : (
            groupedByKr.map(group => (
              <div key={group.krId} className="space-y-2">
                {/* KR header */}
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                  <h4 className="text-sm font-medium text-muted-foreground truncate">
                    {group.krTitle}
                  </h4>
                </div>

                {/* Initiatives for this KR */}
                {group.initiatives.map(initiative => {
                  const config = STATUS_CONFIG[initiative.status];
                  const Icon = config.icon;

                  return (
                    <Card
                      key={initiative.id}
                      className={cn(
                        "transition-colors",
                        initiative.status === 'blocked' && "border-danger/50"
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
                            {initiative.ownerName && (
                              <p className="text-xs text-muted-foreground">
                                Responsável: {initiative.ownerName}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Projects linked to this KR */}
                <KrProjectsList krId={group.krId} />
              </div>
            ))
          )}

          {/* Projetos do time sem OKR — bloco aditivo */}
          {teamId && (
            <ProjectsSummary teamId={teamId} mode="detail" className="mt-4" />
          )}
        </div>
      </ScrollArea>

      {/* Inline decision input */}
      {onDecisionsChange && (
        <div className="border-t">
          <InlineDecisionInput
            decisions={decisions}
            onDecisionsChange={onDecisionsChange}
            sourceStep="initiatives"
            placeholder="Alguma decisão sobre iniciativas?"
          />
        </div>
      )}

      <WizardStepFooter
        onBack={onBack}
        primaryLabel="Registrar decisões"
        onPrimary={onContinue}
      />
    </div>
  );
}
