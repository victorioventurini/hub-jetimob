/**
 * useQbrPreTeamProjects — Wrapper QBR-pré sobre `useProjectsForWizard`.
 *
 * Aplica o mesmo filtro de responsabilidade do Pré-MBR:
 *   - mostra apenas projetos cujo owner é membro do time/subtimes OU que
 *     têm pelo menos um milestone com owner membro;
 *   - dentro do projeto, esconde milestones de não-membros.
 *
 * Outros consumidores de `useProjectsForWizard` (KR detail, ProjectsSummary,
 * leader-prep, team-okr-creation, mbr-pre/NextStepsStep) seguem inalterados.
 */

import { useMemo } from 'react';
import { useProjectsForWizard } from '@/modules/projects/hooks/useProjectsForWizard';
import { useTeamResponsibilityScope } from '@/modules/teams/hooks/useTeamResponsibilityScope';
import type { ProjectForWizard } from '@/modules/projects/types';

export function useQbrPreTeamProjects(teamId: string | undefined) {
  const wizardQuery = useProjectsForWizard(teamId);
  const scope = useTeamResponsibilityScope(teamId);

  const data = useMemo<ProjectForWizard[] | undefined>(() => {
    if (!wizardQuery.data) return wizardQuery.data;
    const members = scope.memberProfileIds;

    return wizardQuery.data
      .map((p): ProjectForWizard | null => {
        const filteredMilestones = (p.milestones || []).filter(
          (m) => m.owner_id && members.has(m.owner_id),
        );
        const ownerIsMember = !!(p as any).owner_id
          ? members.has((p as any).owner_id)
          : false;

        if (!ownerIsMember && filteredMilestones.length === 0) return null;

        const total = filteredMilestones.length;
        const done = filteredMilestones.filter((m) => m.status === 'done').length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return {
          ...p,
          milestones: filteredMilestones,
          milestones_total: total,
          milestones_done: done,
          completion_pct: pct,
        };
      })
      .filter((p): p is ProjectForWizard => p !== null);
  }, [wizardQuery.data, scope.memberProfileIds]);

  return {
    ...wizardQuery,
    data,
    isLoading: wizardQuery.isLoading || scope.isLoading,
  };
}
