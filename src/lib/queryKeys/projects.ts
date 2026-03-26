/**
 * Projects Query Keys
 */
import type { ProjectFilters } from '@/modules/projects/types';

export const projectsKeys = {
  // ── Prefix helpers for broad invalidation ──
  /** Invalidate all projects queries */
  allPrefix: () => ['projects'] as const,
  /** Invalidate all project list queries */
  listPrefix: () => ['projects', 'list'] as const,

  // ── Specific keys ──
  list: (buId: string | null, filters?: ProjectFilters) =>
    ['projects', 'list', buId, filters] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  byKr: (krId: string) => ['projects', 'by-kr', krId] as const,
  forWizard: (buId: string | null, teamId: string) =>
    ['projects', 'wizard', buId, teamId] as const,
  milestones: (projectId: string) =>
    ['projects', 'milestones', projectId] as const,
  milestonesPrefix: () => ['projects', 'milestones'] as const,
  gantt: (buId: string | null, filters?: ProjectFilters) =>
    ['projects', 'gantt', buId, filters] as const,
  myProjects: (buId: string | null, profileId: string | null) =>
    ['projects', 'my', buId, profileId] as const,
};
