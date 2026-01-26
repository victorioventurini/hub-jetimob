import { useMemo } from "react";
import { useProfileId } from "@/hooks/useIdentity";
import { useCanManageTeamOkr } from "./useCanManageTeamOkr";

/**
 * Interface mínima de Iniciativa necessária para verificação de permissão.
 */
interface InitiativeForPermission {
  owner_user_id: string;
  contributors?: string[] | null;
}

/**
 * Hook para verificar se o usuário atual pode editar uma iniciativa específica.
 * 
 * Regras de permissão (qualquer uma):
 * 1. É owner da iniciativa
 * 2. É contributor da iniciativa
 * 3. É líder do time do KR vinculado (ou time pai)
 * 
 * @param initiative - A iniciativa a verificar (pode ser null/undefined durante loading)
 * @param krTeamId - ID do time do KR vinculado à iniciativa
 * @returns { canEdit, isLoading }
 * 
 * @example
 * ```tsx
 * function InitiativeActions({ initiative, krTeamId }) {
 *   const { canEdit, isLoading } = useCanEditInitiative(initiative, krTeamId);
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (!canEdit) return null;
 *   
 *   return <Button onClick={handleEdit}>Editar</Button>;
 * }
 * ```
 */
export function useCanEditInitiative(
  initiative: InitiativeForPermission | null | undefined,
  krTeamId: string | null | undefined
) {
  const profileId = useProfileId();
  const { canManage, isLoading } = useCanManageTeamOkr(krTeamId);
  
  const canEdit = useMemo(() => {
    if (!initiative || !profileId) return false;
    
    // Owner pode editar
    if (initiative.owner_user_id === profileId) return true;
    
    // Contributor pode editar
    if (initiative.contributors?.includes(profileId)) return true;
    
    // Líder do time do KR pode editar
    if (canManage) return true;
    
    return false;
  }, [initiative, profileId, canManage]);
  
  return { canEdit, isLoading };
}
