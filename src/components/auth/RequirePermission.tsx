import { Navigate, useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { LoadingState } from "@/components/ui/loading-state";
import { VicAccessDenied } from "@/modules/vic/components/VicAccessDenied";

interface RequirePermissionProps {
  children: React.ReactNode;
  /** Array de permissões - usuário precisa ter PELO MENOS UMA */
  anyOf: string[];
  /** Se true, redireciona para home ao invés de mostrar tela de acesso negado */
  redirectOnDeny?: boolean;
  /** Rota de fallback (default: /) */
  fallbackRoute?: string;
}

/**
 * Guard que verifica se o usuário tem pelo menos uma das permissões especificadas.
 * 
 * Uso:
 * <RequirePermission anyOf={['okrs.manage', 'okrs.view']}>
 *   <OkrsPage />
 * </RequirePermission>
 */
export function RequirePermission({
  children,
  anyOf,
  redirectOnDeny = false,
  fallbackRoute = "/",
}: RequirePermissionProps) {
  const { hasAny, isLoading, isWildcard } = usePermissions();
  const navigate = useNavigate();

  if (isLoading) {
    return <LoadingState fullPage text="Verificando permissões..." />;
  }

  // Wildcard (admin) sempre passa
  if (isWildcard) {
    return <>{children}</>;
  }

  // Verificar se tem pelo menos uma das permissões
  const hasPermission = hasAny(anyOf);

  if (!hasPermission) {
    if (redirectOnDeny) {
      return <Navigate to={fallbackRoute} replace />;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <VicAccessDenied />
      </div>
    );
  }

  return <>{children}</>;
}
