import { useMemo, useCallback, useEffect, useRef } from "react";
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
 * Semântica importante:
 * - canEditProject / canDeleteProject => permissão estrutural ampla (BU/wildcard)
 * - canEditOwnProject / canDeleteOwnProject => permissão `self_or_owner` (precisa
 *   ser combinada com `owner_id === actorProfileId` antes de liberar CTA).
 * - canEditProjectRecord(ownerId, actorProfileId) / canDeleteProjectRecord(...)
 *   => helpers row-aware. SEMPRE preferir esses para gating de UI por registro.
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
  // Permissão estrutural ampla (BU/wildcard) — pode editar/arquivar projeto de qualquer owner na BU
  const canEditProject = hasFullAccess || has("projects.project.update:bu");
  // Permissão restrita ao próprio recurso — precisa de `owner_id === actorProfileId`
  const canEditOwnProject = hasFullAccess || has("projects.project.update:self_or_owner");
  const canDeleteOwnProject = hasFullAccess || has("projects.project.delete:self_or_owner");
  // Compat: nome legado mantido para evitar quebra. NÃO usar para gating de delete por registro.
  const canDeleteProject = canDeleteOwnProject;

  // === Milestone permissions ===
  const canViewMilestones = hasFullAccess || has("projects.milestone.read:bu");
  const canCreateMilestone = hasFullAccess || has("projects.milestone.create:bu");
  // Permissão estrutural ampla (BU/wildcard) — pode editar qualquer milestone na BU
  const canEditMilestone = hasFullAccess || has("projects.milestone.update:bu");
  // Permissão estrutural ampla para deletar qualquer milestone na BU
  const canDeleteMilestone = hasFullAccess || has("projects.milestone.delete:bu");

  // === Row-aware helpers (preferidos para gating de UI por registro) ===
  const canEditProjectRecord = useCallback(
    (ownerId: string | null | undefined, actorProfileId: string | null | undefined) => {
      if (canEditProject) return true;
      if (!canEditOwnProject) return false;
      return !!actorProfileId && !!ownerId && ownerId === actorProfileId;
    },
    [canEditProject, canEditOwnProject],
  );

  const canDeleteProjectRecord = useCallback(
    (ownerId: string | null | undefined, actorProfileId: string | null | undefined) => {
      if (hasFullAccess) return true;
      if (!canDeleteOwnProject) return false;
      return !!actorProfileId && !!ownerId && ownerId === actorProfileId;
    },
    [hasFullAccess, canDeleteOwnProject],
  );

  // Observabilidade: snapshot das permissões efetivas do módulo Projects.
  // TEMP: ajuda a distinguir bundle stale vs gating real no live.
  const lastSnapshotRef = useRef<string>("");
  useEffect(() => {
    if (isLoading) return;
    const snapshot = JSON.stringify({
      isWildcard,
      isImpersonating,
      hasFullAccess,
      canViewProjects,
      canCreateProject,
      canEditProject,
      canEditOwnProject,
      canDeleteOwnProject,
      canViewMilestones,
      canCreateMilestone,
      canEditMilestone,
    });
    if (snapshot === lastSnapshotRef.current) return;
    lastSnapshotRef.current = snapshot;
    console.info("[useProjectPermissionsV2] effective permissions", JSON.parse(snapshot));
  }, [
    isLoading,
    isWildcard,
    isImpersonating,
    hasFullAccess,
    canViewProjects,
    canCreateProject,
    canEditProject,
    canEditOwnProject,
    canDeleteOwnProject,
    canViewMilestones,
    canCreateMilestone,
    canEditMilestone,
  ]);

  return useMemo(() => ({
    isLoading,
    hasFullAccess,
    canViewProjects,
    canCreateProject,
    canEditProject,
    canEditOwnProject,
    canDeleteProject,
    canDeleteOwnProject,
    canViewMilestones,
    canCreateMilestone,
    canEditMilestone,
    canEditProjectRecord,
    canDeleteProjectRecord,
  }), [
    isLoading,
    hasFullAccess,
    canViewProjects,
    canCreateProject,
    canEditProject,
    canEditOwnProject,
    canDeleteProject,
    canDeleteOwnProject,
    canViewMilestones,
    canCreateMilestone,
    canEditMilestone,
    canEditProjectRecord,
    canDeleteProjectRecord,
  ]);
}
