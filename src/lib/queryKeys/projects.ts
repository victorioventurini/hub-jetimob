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
  detail: (id: string, buId?: string | null) =>
    ['projects', 'detail', id, buId ?? null] as const,
  byKr: (krId: string) => ['projects', 'by-kr', krId] as const,
  forWizard: (buId: string | null, teamId: string) =>
    ['projects', 'wizard', buId, teamId] as const,
  milestones: (projectId: string, buId?: string | null) =>
    ['projects', 'milestones', projectId, buId ?? null] as const,
  milestonesPrefix: () => ['projects', 'milestones'] as const,
  /** Invalidate detail across all BU variants for a given project */
  detailPrefix: () => ['projects', 'detail'] as const,
  /** Invalidate detail for one project across all BU variants */
  detailFor: (id: string) => ['projects', 'detail', id] as const,
  /** Invalidate milestones across all BU variants for a given project */
  milestonesAllPrefix: () => ['projects', 'milestones'] as const,
  /** Invalidate milestones for one project across all BU variants */
  milestonesFor: (projectId: string) => ['projects', 'milestones', projectId] as const,
  gantt: (buId: string | null, filters?: ProjectFilters) =>
    ['projects', 'gantt', buId, filters] as const,
  myProjects: (buId: string | null, profileId: string | null) =>
    ['projects', 'my', buId, profileId] as const,
  krsForLinking: (buId: string | null) =>
    ['projects', 'krs-for-linking', buId] as const,
  projectsForLinking: (buId: string | null) =>
    ['projects', 'projects-for-linking', buId] as const,
  milestoneKrs: (milestoneId: string) =>
    ['projects', 'milestone-krs', milestoneId] as const,
  milestoneKrsByKr: (krId: string) =>
    ['projects', 'milestone-krs-by-kr', krId] as const,
  myMilestones: (buId: string | null, profileId: string | null) =>
    ['projects', 'my-milestones', buId, profileId] as const,
  comments: (projectId: string) =>
    ['projects', 'comments', projectId] as const,
  commentAttachments: (projectId: string) =>
    ['projects', 'comment-attachments', projectId] as const,
};
