import { Navigate, Link, useNavigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { LoadingState } from "@/components/ui/loading-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft } from "lucide-react";

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
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldX className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Entre em contato com o administrador da sua BU para solicitar acesso.
            </p>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao início
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
