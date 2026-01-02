import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useModules } from "@/contexts/ModuleContext";
import { useBu } from "@/contexts/BuContext";
import { HubLayout } from "@/components/layout/HubLayout";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ModuleRouteProps {
  children: ReactNode;
  moduleSlug: string;
  requiresBu?: boolean;
}

/**
 * Route guard que verifica se um módulo está habilitado para a BU atual.
 * 
 * - Módulos globais (type='global') não requerem BU e estão sempre habilitados
 * - Módulos operacionais (type='operational') requerem BU ativa e config habilitada
 */
export function ModuleRoute({ 
  children, 
  moduleSlug, 
  requiresBu = true 
}: ModuleRouteProps) {
  const { currentBu, isLoading: buLoading } = useBu();
  const { isModuleEnabled, getModuleBySlug, isLoading: modulesLoading } = useModules();

  const isLoading = buLoading || modulesLoading;

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
              <Button variant="outline" onClick={() => window.location.href = "/"}>
                Voltar ao início
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
              <Button variant="outline" onClick={() => window.location.href = "/"}>
                Voltar ao início
              </Button>
            </CardContent>
          </Card>
        </div>
      </HubLayout>
    );
  }

  // Módulo habilitado - renderizar children
  return <>{children}</>;
}
