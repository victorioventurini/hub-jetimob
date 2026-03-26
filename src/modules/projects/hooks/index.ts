/**
 * Projects Hooks — Barrel Export
 */

// Queries
export { useProjects } from './useProjects';
export { useProject } from './useProject';
export { useMilestones } from './useMilestones';
export { useProjectsForWizard } from './useProjectsForWizard';
export { useProjectsForKr } from './useProjectsForKr';
export type { ProjectForKr } from './useProjectsForKr';

// Mutations
export { useCreateProject, useUpdateProject, useSoftDeleteProject } from './useProjectMutations';
export { useCreateMilestone, useUpdateMilestone, useSoftDeleteMilestone } from './useMilestoneMutations';
export { useAddProjectKrLink, useRemoveProjectKrLink } from './useProjectKrLinks';

// Permissions
export { useProjectPermissionsV2 } from './useProjectPermissionsV2';
