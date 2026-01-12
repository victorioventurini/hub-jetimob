import { useMemo } from "react";
import { useManageableTeams } from "./useManageableTeams";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Hook para verificar se o usuário atual pode gerenciar OKRs de um time específico.
 * 
 * Regras:
 * - Admin/Super Admin: pode gerenciar qualquer time (EXCETO durante impersonação)
 * - Líder: pode gerenciar apenas seu time e descendentes
 * - Colaborador: não pode gerenciar nenhum time (mesmo que seja membro)
 * 
 * IMPORTANTE: Durante impersonação, isWildcard retorna false (via usePermissions),
 * então o hook usa corretamente as permissões do usuário impersonado.
 * 
 * @param teamId - ID do time a verificar
 * @returns { canManage, isLoading } - Se pode gerenciar e estado de loading
 */
export function useCanManageTeamOkr(teamId: string | undefined | null) {
  const { teams, isLoading } = useManageableTeams();
  const { isWildcard } = usePermissions();
  
  const canManage = useMemo(() => {
    // Admins podem gerenciar tudo (isWildcard já respeita impersonação)
    if (isWildcard) return true;
    
    // Se não tem teamId, não pode gerenciar
    if (!teamId) return false;
    
    // Verifica se o time está na lista de times gerenciáveis
    return teams.some(t => t.id === teamId);
  }, [isWildcard, teamId, teams]);
  
  return {
    canManage,
    isLoading,
  };
}

/**
 * Hook para verificar se o usuário pode gerenciar OKRs organizacionais.
 * 
 * Regras baseadas em permission keys:
 * - Requer 'okrs.org_objective.update:bu' ou isWildcard
 */
export function useCanManageOrgOkr() {
  const { has, isWildcard, isLoading } = usePermissions();
  
  const canManage = useMemo(() => {
    if (isWildcard) return true;
    return has('okrs.org_objective.update:bu');
  }, [isWildcard, has]);
  
  return {
    canManage,
    isLoading,
  };
}
