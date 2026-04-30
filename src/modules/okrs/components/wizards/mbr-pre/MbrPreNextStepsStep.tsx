/**
 * MbrPreNextStepsStep - Step 4: Próximos Passos
 * 
 * O líder declara o foco do time para o próximo mês:
 * - Bloco read-only com projetos em andamento (contexto)
 * - Campo de texto livre para foco principal
 * - Lista dinâmica de itens priorizados (add/remove)
 * - Lista de dependências cross-team (add/remove)
 */

import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Compass, Link2, FolderKanban } from 'lucide-react';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  InlineAgendaSuggestionInput,
  InlineStringListEditor,
} from '../shared';
import { useProjectsForWizard } from '@/modules/projects/hooks/useProjectsForWizard';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import type { TeamCheckinDecision, RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';

// ============================================================
// TYPES
// ============================================================

export interface MbrPreNextSteps {
  focus: string;
  prioritizedItems: string[];
  crossDependencies: string[];
}

export interface MbrPreNextStepsStepProps {
  nextSteps: MbrPreNextSteps;
  onNextStepsChange: (nextSteps: MbrPreNextSteps) => void;
  decisions: TeamCheckinDecision[];
  onDecisionsChange: (decisions: TeamCheckinDecision[]) => void;
  /** Team ID for loading project context */
  teamId?: string;
  onContinue: () => void;
  onBack: () => void;
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  agendaTriggerLabel?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export function MbrPreNextStepsStep({
  nextSteps,
  onNextStepsChange,
  decisions,
  onDecisionsChange,
  teamId,
  onContinue,
  onBack,
  agendaSuggestions,
  onAgendaSuggestionsChange,
  agendaTriggerLabel,
}: MbrPreNextStepsStepProps) {
  // Load team projects for context
  const { data: allProjects, isLoading: loadingProjects } = useProjectsForWizard(teamId);

  // Filter to in_progress or at_risk projects
  const activeProjects = (allProjects || []).filter(
    p => p.status === 'in_progress' || p.health === 'at_risk'
  );

  const hasContent = nextSteps.focus.trim() || nextSteps.prioritizedItems.length > 0;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={Compass}
          title="Próximos Passos"
          tooltip="mbr-pre-next-steps"
          description="O que o time planeja executar nas próximas semanas"
          variant="primary"
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={!hasContent}
        />
      }
      bottomFixed={
        agendaSuggestions && onAgendaSuggestionsChange && agendaTriggerLabel ? (
          <InlineAgendaSuggestionInput
            suggestions={agendaSuggestions}
            onSuggestionsChange={onAgendaSuggestionsChange}
            sourceStep="mbr-pre-next-steps"
            triggerLabel={agendaTriggerLabel}
          />
        ) : undefined
      }
    >
      <div className="p-6 space-y-6">
        {/* Projects in progress — read-only context block */}
        {teamId && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Projetos em andamento do time</Label>
            </div>

            {loadingProjects ? (
              <div className="space-y-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : activeProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6">
                Nenhum projeto em andamento ou em risco.
              </p>
            ) : (
              <div className="space-y-2">
                {activeProjects.map((project) => {
                  const nextMs = (project.milestones || []).find(m => m.status !== 'done');
                  return (
                    <Card key={project.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <ProjectHealthBadge health={project.health} dotOnly />
                          <span className="text-sm font-medium truncate flex-1">{project.name}</span>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {project.completion_pct}%
                          </Badge>
                          {project.due_date && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              até {new Date(project.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                        {nextMs && (
                          <p className="text-xs text-muted-foreground mt-1 pl-5">
                            Próximo marco: {nextMs.name}
                            {nextMs.due_date && ` · ${new Date(nextMs.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Focus */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Foco do próximo mês
          </Label>
          <Textarea
            value={nextSteps.focus}
            onChange={(e) => onNextStepsChange({ ...nextSteps, focus: e.target.value })}
            placeholder="Descreva o foco principal do time para as próximas semanas..."
            className="min-h-[100px] text-sm"
          />
        </div>

        {/* Prioritized items */}
        <InlineStringListEditor
          label="Iniciativas / projetos priorizados"
          items={nextSteps.prioritizedItems}
          onItemsChange={(prioritizedItems) =>
            onNextStepsChange({ ...nextSteps, prioritizedItems })
          }
          placeholder="Adicionar iniciativa ou projeto..."
          marker="numbered"
        />

        {/* Cross-team dependencies */}
        <InlineStringListEditor
          label={
            <span className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Dependências de outros times
            </span>
          }
          items={nextSteps.crossDependencies}
          onItemsChange={(crossDependencies) =>
            onNextStepsChange({ ...nextSteps, crossDependencies })
          }
          placeholder="Ex: Precisamos que o time de Engenharia entregue a API até dia 15..."
          marker="bullet"
        />
      </div>
    </WizardStepScaffold>
  );
}
