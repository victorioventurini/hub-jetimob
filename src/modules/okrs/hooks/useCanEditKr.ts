import { useMemo } from "react";
import { useProfileId } from "@/hooks/useIdentity";
import { useCanManageTeamOkr } from "./useCanManageTeamOkr";

/**
 * Interface mínima de KR necessária para verificação de permissão.
 * Permite reutilização com diferentes representações de KR.
 */
interface KrForPermission {
  team_id: string;
  owner_user_id?: string | null;
  co_responsibles?: string[] | null;
}

/**
 * Hook para verificar se o usuário atual pode editar um KR específico.
 * 
 * Regras de permissão (qualquer uma):
 * 1. É owner do KR
 * 2. É co-responsável do KR
 * 3. É líder do time (ou time pai) do KR
 * 
 * @param kr - O KR a verificar (pode ser null/undefined durante loading)
 * @returns { canEdit, isLoading }
 * 
 * @example
 * ```tsx
 * function KrActions({ kr }) {
 *   const { canEdit, isLoading } = useCanEditKr(kr);
 *   
 *   if (isLoading) return <Skeleton />;
 *   if (!canEdit) return null;
 *   
 *   return <Button onClick={handleEdit}>Editar</Button>;
 * }
 * ```
 */
export function useCanEditKr(kr: KrForPermission | null | undefined) {
  const profileId = useProfileId();
  const { canManage, isLoading } = useCanManageTeamOkr(kr?.team_id);
  
  const canEdit = useMemo(() => {
    if (!kr || !profileId) return false;
    
    // Owner pode editar
    if (kr.owner_user_id === profileId) return true;
    
    // Co-responsável pode editar
    if (kr.co_responsibles?.includes(profileId)) return true;
    
    // Líder do time pode editar
    if (canManage) return true;
    
    return false;
  }, [kr, profileId, canManage]);
  
  return { canEdit, isLoading };
}
