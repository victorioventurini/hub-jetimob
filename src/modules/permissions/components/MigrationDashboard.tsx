import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Shield
} from "lucide-react";
import { useBuMigrationStatus } from "../hooks/useMigrationTracking";
import { LoadingState } from "@/components/ui/loading-state";

interface MigrationDashboardProps {
  compact?: boolean;
}

export function MigrationDashboard({ compact = false }: MigrationDashboardProps) {
  const { status, isLoading } = useBuMigrationStatus();

  const migrationStats = useMemo(() => {
    if (!status) return null;

    const isComplete = status.migration_percentage === 100;
    const isStarted = status.migrated_users > 0;

    return {
      ...status,
      isComplete,
      isStarted,
      pendingUsers: status.total_users - status.migrated_users,
    };
  }, [status]);

  if (isLoading) {
    return <LoadingState text="Carregando status..." />;
  }

  if (!status || status.total_users === 0) {
    return (
      <Alert>
        <AlertDescription>
          Nenhum usuário para migrar nesta BU.
        </AlertDescription>
      </Alert>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Migração v1 → v2</span>
            {migrationStats?.isComplete ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Completa
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Em progresso
              </Badge>
            )}
          </div>
          <Progress value={status.migration_percentage} className="h-2" />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{status.migrated_users} de {status.total_users} migrados</span>
            <span>{status.verified_users} verificados</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert variant="default" className="border-blue-500/50 bg-blue-500/10">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          <strong>Migração de Permissões v1 → v2</strong><br />
          Migre usuários para o novo sistema de templates v2 para melhor controle granular.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Usuários</CardDescription>
            <CardTitle className="text-2xl">{status.total_users}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              na BU
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Migrados</CardDescription>
            <CardTitle className="text-2xl text-primary">{status.migrated_users}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowRight className="h-3 w-3" />
              com templates v2
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verificados</CardDescription>
            <CardTitle className="text-2xl text-green-600">{status.verified_users}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              confirmados OK
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{status.not_started_users}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3" />
              aguardando migração
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso da Migração</CardTitle>
          <CardDescription>
            {migrationStats?.isComplete 
              ? "Migração completa! Todos os usuários foram migrados."
              : `${status.migration_percentage.toFixed(0)}% dos usuários migrados`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={status.migration_percentage} className="h-3" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>v1 (legado)</span>
            <span>{status.migration_percentage.toFixed(1)}%</span>
            <span>v2 (atual)</span>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como migrar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-1">
            <li>Clique em um usuário na tab <strong>Usuários</strong></li>
            <li>Na aba <strong>v1</strong>, veja os templates legados (read-only)</li>
            <li>Na aba <strong>v2</strong>, selecione os templates equivalentes</li>
            <li>Use a aba <strong>Preview</strong> para ver o diff de permissões</li>
            <li>Clique em <strong>Aplicar v2</strong> para salvar</li>
            <li>Volte aqui e verifique o progresso</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
