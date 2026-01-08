import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { usePermissionAudit } from "../hooks/usePermissionAudit";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function StatusBadge({ status }: { status: 'PASS' | 'FAIL' | 'PARTIAL' }) {
  const variants = {
    PASS: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle2 },
    FAIL: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: XCircle },
    PARTIAL: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: AlertCircle },
  };
  const { className, icon: Icon } = variants[status];
  
  return (
    <Badge variant="outline" className={className}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </Badge>
  );
}

function FunctionStatusIcon({ exists }: { exists: boolean }) {
  return exists ? (
    <CheckCircle2 className="w-4 h-4 text-green-600" />
  ) : (
    <XCircle className="w-4 h-4 text-red-600" />
  );
}

export function AuditDashboard() {
  const { data: audit, isLoading, error, refetch, isFetching } = usePermissionAudit();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            <span>Erro ao carregar auditoria: {error.message}</span>
          </div>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!audit) return null;

  const migrationProgress = audit.migrationStatus.totalUsers > 0 
    ? (audit.migrationStatus.migratedUsers / audit.migrationStatus.totalUsers) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>
            Gerado em: {format(new Date(audit.generatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Reexecutar Auditoria
        </Button>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Executivo - Sistema V2</CardTitle>
          <CardDescription>Status geral do sistema de permissões V2</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Critério</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(audit.executiveSummary).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell className="font-medium">{key}</TableCell>
                  <TableCell><StatusBadge status={value.status} /></TableCell>
                  <TableCell className="text-muted-foreground">{value.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{audit.catalogStats.totalKeys}</CardTitle>
            <CardDescription>Permission Keys no Catálogo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {Object.entries(audit.catalogStats.keysByModule).slice(0, 5).map(([mod, count]) => (
                <div key={mod} className="flex justify-between">
                  <span>{mod}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{audit.templates.length}</CardTitle>
            <CardDescription>Templates V2</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Sistema</span>
                <span>{audit.templates.filter(t => t.isSystem).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Customizados</span>
                <span>{audit.templates.filter(t => !t.isSystem).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-2xl">
                {audit.migrationStatus.migratedUsers}/{audit.migrationStatus.totalUsers}
              </CardTitle>
            </div>
            <CardDescription>Migração V1 → V2</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={migrationProgress} className="h-2 mb-2" />
            <div className="text-xs text-muted-foreground">
              {audit.migrationStatus.pendingUsers === 0 ? (
                <span className="text-green-600">Migração completa!</span>
              ) : (
                <span className="text-yellow-600">
                  {audit.migrationStatus.pendingUsers} usuários pendentes
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SQL Functions */}
      <Card>
        <CardHeader>
          <CardTitle>Funções SQL</CardTitle>
          <CardDescription>Funções críticas para controle de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(audit.sqlFunctions).map(([fn, exists]) => (
              <div key={fn} className="flex items-center gap-2 p-3 border rounded-lg">
                <FunctionStatusIcon exists={exists} />
                <span className="text-sm font-mono">{fn}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Templates Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Templates V2</CardTitle>
          <CardDescription>Lista completa de templates de permissão no sistema V2</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Superfície</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.templates.map((template) => (
                <TableRow key={template.slug || template.name}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.module || 'global'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{template.surface || '-'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.isSystem ? "secondary" : "outline"}>
                      {template.isSystem ? 'Sistema' : 'Customizado'}
                    </Badge>
                  </TableCell>
                  <TableCell>{template.permissionCount}</TableCell>
                  <TableCell>
                    <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                      {template.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
