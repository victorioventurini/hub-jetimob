/**
 * useCollaboratorOpeningSignals — Sinais agregados (read-only) usados no
 * Step 1 do Check-in Individual: total/saudáveis de projetos e bloqueios
 * abertos do usuário em check-ins anteriores.
 *
 * Mantém-se enxuto: usa projection mínima e não invalida caches de outras
 * queries. As queries pesadas (de fato editáveis) seguem nos steps de
 * execução.
 */

import { useQuery } from '@tanstack/react-query';
import { useBuScopedSupabase } from '@/integrations/supabase/useBuScopedSupabase';
import { useBu } from '@/contexts/BuContext';
import { projectsKeys } from '@/lib/queryKeys/projects';
import { computeHealth } from '@/modules/projects/utils/projectHealth';
import type { ProjectHealth, ProjectStatus } from '@/modules/projects/types';

export interface CollaboratorOpeningSignals {
  projectsTotal: number;
  projectsHealthy: number;
  openBlocksCount: number;
  isLoading: boolean;
}

export function useCollaboratorOpeningSignals(
  effectiveUserId: string | null,
): CollaboratorOpeningSignals {
  const supabase = useBuScopedSupabase();
  const { currentBu } = useBu();
  const buId = currentBu?.id ?? null;

  // Projetos onde o usuário é owner — usado para calcular health.
  const projectsQuery = useQuery({
    queryKey: [...projectsKeys.myProjects(buId, effectiveUserId), 'opening-signals'] as const,
    enabled: !!buId && !!effectiveUserId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, status, due_date, project_milestones!left(id, status, deleted_at)')
        .eq('owner_id', effectiveUserId!)
        .is('deleted_at', null);
      if (error) throw error;
      return data ?? [];
    },
  });

  const projectsTotal = projectsQuery.data?.length ?? 0;
  const projectsHealthy = (projectsQuery.data ?? []).filter((p) => {
    const milestones = (p.project_milestones ?? []).filter((m: { deleted_at: string | null }) => !m.deleted_at);
    const total = milestones.length;
    const completed = milestones.filter((m: { status: string }) => m.status === 'completed').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const health: ProjectHealth = computeHealth(p.status as ProjectStatus, p.due_date, pct);
    return health === 'on_track';
  }).length;

  // Bloqueios abertos do usuário — derivados de check-ins (campo blockers != null).
  // Heurística: contagem de check-ins recentes do usuário que tenham `blockers`.
  const blocksQuery = useQuery({
    queryKey: ['collaborator-open-blocks', buId, effectiveUserId] as const,
    enabled: !!buId && !!effectiveUserId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('okr_checkins')
        .select('id, blockers, date')
        .eq('user_id', effectiveUserId!)
        .not('blockers', 'is', null)
        .gte('date', isoDaysAgo(30));
      if (error) throw error;
      return (data ?? []).filter((c) => (c.blockers ?? '').trim().length > 0).length;
    },
  });

  return {
    projectsTotal,
    projectsHealthy,
    openBlocksCount: blocksQuery.data ?? 0,
    isLoading: projectsQuery.isLoading || blocksQuery.isLoading,
  };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
