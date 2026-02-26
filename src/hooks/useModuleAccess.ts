import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useBu } from "@/contexts/BuContext";

/**
 * Permission keys que concedem acesso de VIEW a cada módulo.
 * Se o usuário tiver QUALQUER uma dessas keys, pode ver o módulo no sidebar e acessar a rota.
 */
const MODULE_VIEW_PERMISSIONS: Record<string, string[]> = {
  // Assets module
  assets: [
    "assets.view:bu",
    "assets.inventory.view:bu",
    "assets.keys.view:bu",
    "assets.gifts.view:bu",
    "assets.settings.manage",
  ],
  // OKRs module  
  okrs: [
    "okrs.view:bu",
    "okrs.objective.view:bu",
    "okrs.kr.view:bu",
    "okrs.cycle.view:bu",
    "okrs.initiative.view:bu",
  ],
  // KPIs module
  kpis: [
    "kpis.view:bu",
    "kpis.metric.view:bu",
    "kpis.value.view:bu",
  ],
  // Tickets module
  tickets: [
    "tickets.view:bu",
    "tickets.ticket.view:bu",
    "tickets.category.view:bu",
  ],
  // Teams module
  teams: [
    "teams.view:bu",
    "teams.member.view:bu",
    "teams.structure.view:bu",
  ],
  // Users (global module)
  users: [
    "users.view:bu",
    "users.profile.view:bu",
  ],
  // Events (Jet Experience module)
  events: [
    "events.view:bu",
  ],
};

/**
 * Módulos que não requerem verificação de permissão específica.
 * - Módulos globais como 'profile' são sempre acessíveis para usuários autenticados.
 */
const ALWAYS_ACCESSIBLE_MODULES = ["profile"];

export interface ModuleAccessResult {
  /** Se o usuário pode ver e acessar o módulo */
  canAccess: boolean;
  /** Se ainda está carregando permissões */
  isLoading: boolean;
  /** Lista de módulos que o usuário pode acessar */
  accessibleModules: string[];
  /** Verificar acesso a um módulo específico */
  hasModuleAccess: (moduleSlug: string) => boolean;
}

/**
 * Hook para verificar acesso a módulos baseado no sistema de permissões V2.
 * 
 * Regras de acesso:
 * - isWildcard (admin/super_admin): acesso total a todos os módulos
 * - Outros usuários: precisam de pelo menos uma permission key do módulo
 * - Módulos em ALWAYS_ACCESSIBLE_MODULES não requerem verificação
 * - Durante impersonação: isWildcard reflete permissões do usuário impersonado
 * 
 * @param moduleSlug - Slug do módulo para verificar (opcional)
 * @returns Objeto com estado de acesso e helpers
 */
export function useModuleAccess(moduleSlug?: string): ModuleAccessResult {
  const { hasAny, isWildcard, isLoading: permissionsLoading, isImpersonating } = usePermissions();
  const { isAdmin } = useAuth();
  const { userRole, isLoading: buLoading } = useBu();

  const isLoading = permissionsLoading || buLoading;
  
  // Full access: isWildcard já inclui admin/super_admin do usuário atual OU impersonado
  // Durante impersonação, isAdmin e userRole refletem o CALLER, não o impersonado
  // Por isso usamos apenas isWildcard que reflete as permissões buscadas corretamente
  const hasFullAccess = isImpersonating 
    ? isWildcard  // Durante impersonação: só isWildcard (vem das permissões do impersonado)
    : (isAdmin || userRole === "admin" || isWildcard);  // Normal: todas as fontes

  /**
   * Verifica se o usuário pode acessar um módulo específico
   */
  const hasModuleAccess = useMemo(() => {
    return (slug: string): boolean => {
      // Full access = acesso a tudo
      if (hasFullAccess) return true;
      
      // Módulos sempre acessíveis
      if (ALWAYS_ACCESSIBLE_MODULES.includes(slug)) return true;
      
      // Verificar se tem alguma permission do módulo
      const modulePermissions = MODULE_VIEW_PERMISSIONS[slug];
      if (!modulePermissions || modulePermissions.length === 0) {
        // Módulo não mapeado - por segurança, negar acesso
        // (módulos novos devem ser adicionados ao mapa)
        return false;
      }
      
      return hasAny(modulePermissions);
    };
  }, [hasFullAccess, hasAny]);

  /**
   * Lista de todos os módulos que o usuário pode acessar
   */
  const accessibleModules = useMemo(() => {
    if (hasFullAccess) {
      return [...Object.keys(MODULE_VIEW_PERMISSIONS), ...ALWAYS_ACCESSIBLE_MODULES];
    }
    
    return [
      ...ALWAYS_ACCESSIBLE_MODULES,
      ...Object.keys(MODULE_VIEW_PERMISSIONS).filter(slug => hasModuleAccess(slug)),
    ];
  }, [hasFullAccess, hasModuleAccess]);

  /**
   * Se um moduleSlug foi passado, verifica acesso específico
   */
  const canAccess = moduleSlug ? hasModuleAccess(moduleSlug) : true;

  return {
    canAccess,
    isLoading,
    accessibleModules,
    hasModuleAccess,
  };
}

/**
 * Hook simplificado para verificar acesso a um único módulo
 */
export function useCanAccessModule(moduleSlug: string): boolean {
  const { canAccess, isLoading } = useModuleAccess(moduleSlug);
  if (isLoading) return false;
  return canAccess;
}
