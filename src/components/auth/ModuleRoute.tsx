import { ReactNode } from "react";
import { Navigate, Link } from "react-router-dom";
import { useModules } from "@/contexts/ModuleContext";
import { useBu } from "@/contexts/BuContext";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { HubLayout } from "@/components/layout/HubLayout";
import { AlertTriangle, Lock, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ModuleRouteProps {
  children: ReactNode;
  moduleSlug: string;
  requiresBu?: boolean;
  /** Se true, não verifica permissões V2 (para módulos sempre acessíveis) */
  skipPermissionCheck?: boolean;
}

/**
 * Route guard que verifica se um módulo está habilitado para a BU atual
 * E se o usuário tem permissão para acessá-lo (sistema V2).
 * 
 * - Módulos globais (type='global') não requerem BU e estão sempre habilitados
 * - Módulos operacionais (type='operational') requerem BU ativa e config habilitada
 * - Usuários precisam de permissão V2 para acessar o módulo
 */
export function ModuleRoute({ 
  children, 
  moduleSlug, 
  requiresBu = true,
  skipPermissionCheck = false,
}: ModuleRouteProps) {
  const { currentBu, isLoading: buLoading } = useBu();
  const { isModuleEnabled, getModuleBySlug, isLoading: modulesLoading } = useModules();
  const { canAccess, isLoading: permissionsLoading } = useModuleAccess(moduleSlug);

  const isLoading = buLoading || modulesLoading || permissionsLoading;

  if (isLoading) {
    return (
      <HubLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </HubLayout>
    );
  }

  const module = getModuleBySlug(moduleSlug);

  // Módulo não existe no catálogo
  if (!module) {
    return <Navigate to="/" replace />;
  }

  // Módulo global - sempre acessível
  if (module.type === "global") {
    return <>{children}</>;
  }

  // Módulo operacional requer BU ativa
  if (requiresBu && !currentBu) {
    return (
      <HubLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <CardTitle>Nenhuma BU selecionada</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Para acessar <strong>{module.name}</strong>, você precisa selecionar 
                uma Business Unit no menu superior.
              </p>
              <Button asChild variant="outline">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </HubLayout>
    );
  }

  // Módulo operacional desabilitado para esta BU
  if (!isModuleEnabled(moduleSlug)) {
    return (
      <HubLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Módulo não disponível</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                O módulo <strong>{module.name}</strong> não está habilitado 
                para <strong>{currentBu?.name}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Entre em contato com o administrador da sua BU para solicitar acesso.
              </p>
              <Button asChild variant="outline">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </HubLayout>
    );
  }

  // Verificar permissão V2 do usuário (se não for skip)
  if (!skipPermissionCheck && !canAccess) {
    return (
      <HubLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <ShieldX className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Acesso não autorizado</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Você não tem permissão para acessar o módulo <strong>{module.name}</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                Solicite acesso ao administrador da sua BU através do gerenciamento de permissões.
              </p>
              <Button asChild variant="outline">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </HubLayout>
    );
  }

  // Módulo habilitado e usuário tem permissão - renderizar children
  return <>{children}</>;
}
