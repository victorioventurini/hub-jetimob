/**
 * MbrPreProjectsStep — Step 3 do Pré-MBR (Projetos do Time)
 *
 * Rito reflexivo: NÃO atualiza status de projeto/milestone. O líder olha
 * projetos atrasados (projeto OU algum milestone) e justifica o desvio.
 *
 * Composição (sem duplicação):
 * - WizardStepScaffold/Header/Footer
 * - ProjectHealthBadge, ProjectProgressBar do módulo /projects
 * - useMbrPreTeamProjects (BU-scoped, soft-delete aware)
 * - JustificationField (shared)
 */

import { memo, useMemo } from 'react';
import { FolderKanban, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProjectHealthBadge } from '@/modules/projects/components/ProjectHealthBadge';
import { ProjectProgressBar } from '@/modules/projects/components/ProjectProgressBar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import {
  WizardStepHeader,
  WizardStepFooter,
  WizardStepScaffold,
  JustificationField,
} from '../shared';
import { useMbrPreTeamProjects, type MbrPreProjectRow } from '@/modules/okrs/hooks';
import type { RitualAgendaSuggestion } from '@/modules/okrs/types/wizard';

const AGENDA_SOURCE_STEP = 'mbr-pre-highlights';

// ============================================================
// TYPES
// ============================================================

export interface MbrPreProjectsStepProps {
  teamId: string | null | undefined;
  /** Mês alvo do rito (`YYYY-MM`). Ancora o cut-off de "atrasado". */
  referenceMonth?: string | null;
  projectJustifications: {
    projects: Record<string, string>;
    milestones: Record<string, string>;
  };
  onProjectJustificationChange: (projectId: string, value: string) => void;
  onMilestoneJustificationChange: (milestoneId: string, value: string) => void;
  onContinue: () => void;
  onBack: () => void;
  agendaSuggestions?: RitualAgendaSuggestion[];
  onAgendaSuggestionsChange?: (next: RitualAgendaSuggestion[]) => void;
  agendaTriggerLabel?: string;
}

// ============================================================
// CARD (memoizado — lista densa)
// ============================================================

interface ProjectCardProps {
  project: MbrPreProjectRow;
  projectJustification: string;
  milestoneJustifications: Record<string, string>;
  onProjectJustificationChange: (projectId: string, value: string) => void;
  onMilestoneJustificationChange: (milestoneId: string, value: string) => void;
}

const ProjectCardImpl = ({
  project,
  projectJustification,
  milestoneJustifications,
  onProjectJustificationChange,
  onMilestoneJustificationChange,
}: ProjectCardProps) => {
  const overdueMilestones = project.milestones.filter((m) => m.isOverdue);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <h3 className="text-sm font-semibold text-foreground truncate flex-1 min-w-0">
          {project.name}
        </h3>
        <ProjectHealthBadge health={project.health} />
        {project.isOverdue && (
          <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive gap-1">
            <AlertTriangle className="h-3 w-3" /> Projeto atrasado
          </Badge>
        )}
      </div>

      {/* Progress */}
      <ProjectProgressBar
        total={project.milestonesTotal}
        done={project.milestonesDone}
        pct={project.completionPct}
        showPct
      />

      {/* Project-level justification */}
      {project.isOverdue && (
        <JustificationField
          id={`mbr-pre-project-just-${project.id}`}
          label="Justifique o atraso do projeto"
          hint="Obrigatório — explique o desvio e o plano de ação."
          required
          value={projectJustification}
          onChange={(v) => onProjectJustificationChange(project.id, v)}
        />
      )}

      {/* Overdue milestones */}
      {overdueMilestones.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Marcos atrasados ({overdueMilestones.length})
          </p>
          {overdueMilestones.map((m) => (
            <div
              key={m.id}
              className="rounded-md border border-destructive/20 bg-destructive/5 p-3 space-y-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
                  {m.name}
                </span>
                {m.due_date && (
                  <span className="text-xs text-destructive shrink-0">
                    Venceu em{' '}
                    {new Date(m.due_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                )}
              </div>
              <JustificationField
                id={`mbr-pre-milestone-just-${m.id}`}
                label="Justifique o atraso do marco"
                hint="Obrigatório — explique o motivo e o que será feito."
                required
                value={milestoneJustifications[m.id] ?? ''}
                onChange={(v) => onMilestoneJustificationChange(m.id, v)}
              />
            </div>
          ))}
        </div>
      ) : !project.isOverdue ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-status-green" />
          Nenhum item atrasado neste projeto.
        </div>
      ) : null}
    </div>
  );
};

const ProjectCard = memo(ProjectCardImpl);

// ============================================================
// COMPONENT
// ============================================================

export function MbrPreProjectsStep({
  teamId,
  projectJustifications,
  onProjectJustificationChange,
  onMilestoneJustificationChange,
  onContinue,
  onBack,
}: MbrPreProjectsStepProps) {
  const { projects, isLoading, overdueProjectIds, overdueMilestoneIds } =
    useMbrPreTeamProjects(teamId);

  // Bloqueia avanço se houver atrasado sem justificativa preenchida.
  const blockingItems = useMemo(() => {
    const missingProjects = overdueProjectIds.filter(
      (id) => !(projectJustifications.projects[id] ?? '').trim(),
    );
    const missingMilestones = overdueMilestoneIds.filter(
      (id) => !(projectJustifications.milestones[id] ?? '').trim(),
    );
    return missingProjects.length + missingMilestones.length;
  }, [overdueProjectIds, overdueMilestoneIds, projectJustifications]);

  const overdueCount = overdueProjectIds.length + overdueMilestoneIds.length;

  return (
    <WizardStepScaffold
      header={
        <WizardStepHeader
          icon={FolderKanban}
          title="Projetos do Time"
          tooltip="mbr-pre-highlights"
          description="Reflita sobre projetos e marcos atrasados — justifique cada desvio"
          variant="purple"
          badge={
            !isLoading && projects.length > 0
              ? `${overdueCount} atrasado${overdueCount !== 1 ? 's' : ''}`
              : undefined
          }
        />
      }
      footer={
        <WizardStepFooter
          onBack={onBack}
          onPrimary={onContinue}
          primaryDisabled={blockingItems > 0}
        />
      }
    >
      <div className="p-4 md:p-6 space-y-4 min-w-0 max-w-full">
        {blockingItems > 0 && (
          <div
            className={cn(
              'rounded-md border border-warning/40 bg-warning/10 p-3',
              'text-xs text-warning-foreground flex items-start gap-2',
            )}
          >
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p>
              <strong>{blockingItems}</strong> item
              {blockingItems > 1 ? 's' : ''} atrasado
              {blockingItems > 1 ? 's' : ''} sem justificativa. Preencha para
              avançar.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-border p-4 space-y-3"
              >
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-6 min-h-[320px]">
            <EmptyState
              icon={FolderKanban}
              title="Nenhum projeto vinculado"
              description="Este time não possui projetos ativos no momento."
            />
          </div>
        ) : overdueCount === 0 ? (
          <div className="space-y-4">
            <div
              className={cn(
                'rounded-md border border-status-green/30 bg-status-green/5 p-3',
                'text-sm text-foreground flex items-start gap-2',
              )}
            >
              <CheckCircle2 className="h-4 w-4 text-status-green shrink-0 mt-0.5" />
              Nenhum projeto ou marco atrasado. Você pode avançar.
            </div>
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                projectJustification={
                  projectJustifications.projects[p.id] ?? ''
                }
                milestoneJustifications={projectJustifications.milestones}
                onProjectJustificationChange={onProjectJustificationChange}
                onMilestoneJustificationChange={onMilestoneJustificationChange}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                projectJustification={
                  projectJustifications.projects[p.id] ?? ''
                }
                milestoneJustifications={projectJustifications.milestones}
                onProjectJustificationChange={onProjectJustificationChange}
                onMilestoneJustificationChange={onMilestoneJustificationChange}
              />
            ))}
          </div>
        )}
      </div>
    </WizardStepScaffold>
  );
}
