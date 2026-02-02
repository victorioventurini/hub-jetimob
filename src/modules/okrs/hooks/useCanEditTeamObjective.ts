import { useMemo } from "react";
import { useProfileId } from "@/hooks/useIdentity";
import { useCanManageTeamOkr } from "./useCanManageTeamOkr";

/**
 * Interface mínima de Objetivo de Time necessária para verificação de permissão.
 */
interface TeamObjectiveForPermission {
  team_id: string;
  owner_user_id?: string | null;
}

/**
 * Hook para verificar se o usuário atual pode editar um objetivo de time específico.
 * 
 * Regras de permissão (qualquer uma):
 * 1. É owner do objetivo
 * 2. É líder do time (ou time pai) do objetivo
 * 
 * @param objective - O objetivo a verificar (pode ser null/undefined durante loading)
 * @returns { canEdit, isLoading }
 * 
 * @example
 * ```tsx
 * function ObjectiveActions({ objective }) {
 *   const { canEdit, isLoading } = useCanEditTeamObjective(objective);
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (!canEdit) return null;
 *   
 *   return <Button onClick={handleEdit}>Editar</Button>;
 * }
 * ```
 */
export function useCanEditTeamObjective(objective: TeamObjectiveForPermission | null | undefined) {
  const profileId = useProfileId();
  const { canManage, isLoading } = useCanManageTeamOkr(objective?.team_id);
  
  const canEdit = useMemo(() => {
    if (!objective || !profileId) return false;
    
    // Owner pode editar
    if (objective.owner_user_id === profileId) return true;
    
    // Líder do time pode editar
    if (canManage) return true;
    
    return false;
  }, [objective, profileId, canManage]);
  
  return { canEdit, isLoading };
}
