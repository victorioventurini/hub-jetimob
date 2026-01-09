import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGuardProps {
  children: React.ReactNode;
  /** Permissão única requerida */
  permission?: string;
  /** Array de permissões - usuário precisa ter PELO MENOS UMA */
  anyOf?: string[];
  /** Array de permissões - usuário precisa ter TODAS */
  allOf?: string[];
  /** Conteúdo alternativo quando sem permissão (opcional) */
  fallback?: React.ReactNode;
}

/**
 * Guard visual que renderiza children apenas se o usuário tiver a permissão.
 * 
 * Uso:
 * <PermissionGuard permission="okrs.team_objective.cancel:team">
 *   <Button>Cancelar</Button>
 * </PermissionGuard>
 * 
 * <PermissionGuard anyOf={['okrs.manage', 'okrs.view']}>
 *   <OkrActions />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  anyOf,
  allOf,
  fallback = null,
}: PermissionGuardProps) {
  const { has, hasAny, hasAll, isLoading, isWildcard } = usePermissions();

  // Enquanto carrega, evita "flash" de conteúdo (renderiza fallback, por padrão null)
  if (isLoading) return <>{fallback}</>;

  // Wildcard (admin) sempre passa
  if (isWildcard) return <>{children}</>;

  // Verificar permissão única
  if (permission && !has(permission)) {
    return <>{fallback}</>;
  }

  // Verificar anyOf
  if (anyOf && anyOf.length > 0 && !hasAny(anyOf)) {
    return <>{fallback}</>;
  }

  // Verificar allOf
  if (allOf && allOf.length > 0 && !hasAll(allOf)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
