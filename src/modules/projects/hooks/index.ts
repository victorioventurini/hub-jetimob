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
export { useMilestonesForKr } from './useMilestonesForKr';
export type { MilestoneForKr } from './useMilestonesForKr';

// Mutations
export { useCreateProject, useUpdateProject, useSoftDeleteProject } from './useProjectMutations';
export { useCreateMilestone, useUpdateMilestone, useSoftDeleteMilestone } from './useMilestoneMutations';
export { useAddProjectKrLink, useRemoveProjectKrLink } from './useProjectKrLinks';
export { useAddMilestoneKrLink, useRemoveMilestoneKrLink } from './useMilestoneKrLinks';
export { useMilestoneKrs } from './useMilestoneKrs';
export type { MilestoneKrLink } from './useMilestoneKrs';

// Permissions
export { useProjectPermissionsV2 } from './useProjectPermissionsV2';

// Data transforms
export { useGanttData } from './useGanttData';
