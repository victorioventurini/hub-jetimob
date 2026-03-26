import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";
import { useOptionalImpersonation } from "@/contexts/ImpersonationContext";

/**
 * Hook de permissões do módulo Projects usando sistema V2.
 * 
 * Segue o padrão do useAssetPermissionsV2:
 * - hasFullAccess respeita impersonação
 * - Flags granulares por recurso (project, milestone)
 * 
 * @returns Objeto com flags de permissão para o módulo Projects
 */
export function useProjectPermissionsV2() {
  const { has, isWildcard, isLoading: permissionsLoading } = usePermissions();
  const { isAdmin } = useAuth();
  const { userRole, isLoading: buLoading } = useBu();
  const { isImpersonating } = useOptionalImpersonation();

  const isLoading = permissionsLoading || buLoading;

  const hasFullAccess = isImpersonating
    ? isWildcard
    : (isAdmin || userRole === "admin" || isWildcard);

  // === Project permissions ===
  const canViewProjects = hasFullAccess || has("projects.project.read:bu");
  const canCreateProject = hasFullAccess || has("projects.project.create:bu");
  const canEditProject = hasFullAccess || has("projects.project.update:bu");
  const canEditOwnProject = hasFullAccess || has("projects.project.update:self_or_owner");
  const canDeleteProject = hasFullAccess || has("projects.project.delete:self_or_owner");

  // === Milestone permissions ===
  const canViewMilestones = hasFullAccess || has("projects.milestone.read:bu");
  const canCreateMilestone = hasFullAccess || has("projects.milestone.create:bu");
  const canEditMilestone = hasFullAccess || has("projects.milestone.update:bu");

  return useMemo(() => ({
    isLoading,
    hasFullAccess,
    canViewProjects,
    canCreateProject,
    canEditProject,
    canEditOwnProject,
    canDeleteProject,
    canViewMilestones,
    canCreateMilestone,
    canEditMilestone,
  }), [
    isLoading,
    hasFullAccess,
    canViewProjects,
    canCreateProject,
    canEditProject,
    canEditOwnProject,
    canDeleteProject,
    canViewMilestones,
    canCreateMilestone,
    canEditMilestone,
  ]);
}
