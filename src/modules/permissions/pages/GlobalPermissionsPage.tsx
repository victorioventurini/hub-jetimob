import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useUrlTab, useUrlSearch } from "@/shared/url";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Search, Plus, MoreHorizontal, Key, Pencil, AlertTriangle, ClipboardCheck, Layers, FileStack
} from "lucide-react";
import { usePermissionCatalog } from "../hooks/usePermissionCatalog";
import { PermissionDialog } from "../components/PermissionDialog";
import { AuditDashboard } from "../components/AuditDashboard";
import { SurfacesTab } from "../components/SurfacesTab";
import { TemplatesV2Tab } from "../components/TemplatesV2Tab";
import type { Permission, PermissionScope } from "../types";

type GlobalPermissionTab = "catalog" | "templates-v2" | "surfaces" | "audit";

/**
 * GlobalPermissionsPage - Gerenciamento do catálogo global de permissões do Hub
 */
export default function GlobalPermissionsPage() {
  usePageTitle("Permissões Globais");

  const [activeTab, setActiveTab] = useUrlTab<GlobalPermissionTab>("catalog");
  const { value: search, set: setSearch } = useUrlSearch("q");

  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);

  const {
    permissions, permissionsByModule, isLoading: catalogLoading,
    createPermission, updatePermission, togglePermissionStatus,
  } = usePermissionCatalog();

  const filteredPermissions = search
    ? permissions.filter((p) =>
        p.key.toLowerCase().includes(search.toLowerCase()) ||
        p.module.toLowerCase().includes(search.toLowerCase()) ||
        p.resource.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      )
    : permissions;

  const handleCreatePermission = (data: { key: string; module: string; resource: string; action: string; scope: PermissionScope; description?: string }) => {
    createPermission.mutate(data, { onSuccess: () => { setPermissionDialogOpen(false); setEditingPermission(null); } });
  };

  const handleUpdatePermission = (data: { key: string; module: string; resource: string; action: string; scope: PermissionScope; description?: string }) => {
    if (!editingPermission) return;
    updatePermission.mutate({ id: editingPermission.id, description: data.description }, { onSuccess: () => { setPermissionDialogOpen(false); setEditingPermission(null); } });
  };

  const permissionsByModuleFiltered = search ? { "Resultados": filteredPermissions } : permissionsByModule;

  return (
    <div className="space-y-6">
      <PageHeader title="Permissões Globais" description="Gerencie o catálogo de permissões e templates globais do Hub" />

      <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Alterações nesta página afetam <strong>todas as Business Units</strong>.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="catalog" className="gap-2"><Key className="h-4 w-4" />Catálogo</TabsTrigger>
            <TabsTrigger value="templates-v2" className="gap-2"><FileStack className="h-4 w-4" />Templates</TabsTrigger>
            <TabsTrigger value="surfaces" className="gap-2"><Layers className="h-4 w-4" />Surfaces</TabsTrigger>
            <TabsTrigger value="audit" className="gap-2"><ClipboardCheck className="h-4 w-4" />Auditoria</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "catalog" && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-64" />
                </div>
                <Button onClick={() => setPermissionDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova Permissão</Button>
              </>
            )}
          </div>
        </div>

        <TabsContent value="catalog" className="mt-6">
          {catalogLoading ? (
            <LoadingState text="Carregando catálogo..." />
          ) : filteredPermissions.length === 0 ? (
            <EmptyState icon={Key} title="Nenhuma permissão encontrada" description={search ? "Tente ajustar a busca" : "Crie a primeira permissão do catálogo"} />
          ) : (
            <div className="space-y-6">
              {Object.entries(permissionsByModuleFiltered).map(([module, perms]) => (
                <div key={module} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{module}</h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Recurso</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead>Escopo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perms.map((perm) => (
                          <TableRow key={perm.id}>
                            <TableCell><code className="text-xs bg-muted px-2 py-1 rounded font-mono">{perm.key}</code></TableCell>
                            <TableCell>{perm.resource}</TableCell>
                            <TableCell>{perm.action}</TableCell>
                            <TableCell><Badge variant="outline">{perm.scope}</Badge></TableCell>
                            <TableCell>
                              <Switch checked={perm.status === "active"} onCheckedChange={(checked) => togglePermissionStatus.mutate({ id: perm.id, status: checked ? "active" : "inactive" })} />
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingPermission(perm); setPermissionDialogOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Editar Descrição</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates-v2" className="mt-6"><TemplatesV2Tab /></TabsContent>
        <TabsContent value="surfaces" className="mt-6"><SurfacesTab /></TabsContent>
        <TabsContent value="audit" className="mt-6"><AuditDashboard /></TabsContent>
      </Tabs>

      <PermissionDialog
        open={permissionDialogOpen}
        onOpenChange={(open) => { setPermissionDialogOpen(open); if (!open) setEditingPermission(null); }}
        permission={editingPermission}
        onSave={editingPermission ? handleUpdatePermission : handleCreatePermission}
        isPending={createPermission.isPending || updatePermission.isPending}
      />
    </div>
  );
}
