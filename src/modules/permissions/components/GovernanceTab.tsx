import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  AlertTriangle, 
  Shield, 
  Users, 
  FileText, 
  Search,
  Download,
  CheckCircle2,
  Clock
} from "lucide-react";
import { 
  usePermissionRiskReport, 
  usePermissionAuditLogs, 
  useUsersWithoutTemplates 
} from "../hooks/usePermissionGovernance";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function GovernanceTab() {
  const [auditSearch, setAuditSearch] = useState("");
  
  const { reports: riskReports, highRisk, mediumRisk, isLoading: riskLoading } = usePermissionRiskReport();
  const { logs: auditLogs, isLoading: logsLoading } = usePermissionAuditLogs(100);
  const { users: usersWithoutTemplates, count: noTemplateCount, isLoading: usersLoading } = useUsersWithoutTemplates();

  const filteredLogs = auditSearch
    ? auditLogs.filter(log => 
        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.entity_name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
        log.reason.toLowerCase().includes(auditSearch.toLowerCase())
      )
    : auditLogs;

  const handleExportCSV = () => {
    const headers = ["Data", "Ação", "Entidade", "Tipo", "Motivo"];
    const rows = auditLogs.map(log => [
      new Date(log.created_at).toISOString(),
      log.action,
      log.entity_name || "",
      log.entity_type,
      log.reason
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `permission-audit-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Usuários em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {riskLoading ? "..." : riskReports.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {highRisk.length} alto • {mediumRisk.length} médio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              Sem Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usersLoading ? "..." : noTemplateCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Usuários ativos sem permissões configuradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Logs de Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logsLoading ? "..." : auditLogs.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimas alterações registradas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="risk">
        <TabsList>
          <TabsTrigger value="risk" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Análise de Risco
          </TabsTrigger>
          <TabsTrigger value="orphans" className="gap-2">
            <Users className="h-4 w-4" />
            Sem Template
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            Logs de Auditoria
          </TabsTrigger>
        </TabsList>

        {/* Risk Report */}
        <TabsContent value="risk" className="mt-4">
          {riskLoading ? (
            <LoadingState text="Analisando riscos..." />
          ) : riskReports.length === 0 ? (
            <EmptyState 
              icon={CheckCircle2} 
              title="Nenhum risco detectado" 
              description="Todos os usuários estão com permissões adequadas."
            />
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Templates</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead>Risco</TableHead>
                    <TableHead>Motivos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {riskReports.map((report) => (
                    <TableRow key={report.user_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{report.user_name}</div>
                          <div className="text-xs text-muted-foreground">{report.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{report.template_count}</TableCell>
                      <TableCell>{report.permission_count}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={report.risk_level === "high" ? "destructive" : "default"}
                          className={report.risk_level === "medium" ? "bg-amber-500/20 text-amber-700" : ""}
                        >
                          {report.risk_level === "high" ? "Alto" : "Médio"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {report.risk_reasons.map((reason, i) => (
                            <li key={i}>{reason}</li>
                          ))}
                        </ul>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Users Without Templates */}
        <TabsContent value="orphans" className="mt-4">
          {usersLoading ? (
            <LoadingState text="Buscando usuários..." />
          ) : usersWithoutTemplates.length === 0 ? (
            <EmptyState 
              icon={CheckCircle2} 
              title="Todos configurados" 
              description="Todos os usuários ativos possuem ao menos um template atribuído."
            />
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Desde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {usersWithoutTemplates.map((user) => (
                    <TableRow key={user.profile_id}>
                      <TableCell className="font-medium">{user.display_name}</TableCell>
                      <TableCell className="text-muted-foreground">{user.work_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role_in_bu || "member"}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(user.membership_created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Audit Logs */}
        <TabsContent value="audit" className="mt-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar logs..." 
                value={auditSearch} 
                onChange={e => setAuditSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {logsLoading ? (
            <LoadingState text="Carregando logs..." />
          ) : filteredLogs.length === 0 ? (
            <EmptyState 
              icon={FileText} 
              title="Nenhum log encontrado" 
              description={auditSearch ? "Tente ajustar a busca" : "As alterações de permissão serão registradas aqui."}
            />
          ) : (
            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {log.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entity_name || log.entity_type}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {log.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
