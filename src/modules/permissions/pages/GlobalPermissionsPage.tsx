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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  Shield, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Users, 
  Key, 
  Pencil, 
  Settings,
  AlertTriangle,
  ClipboardCheck,
  Link2,
  Layers,
  FileStack
} from "lucide-react";
import { usePermissionCatalog } from "../hooks/usePermissionCatalog";
import { usePermissionGroups } from "../hooks/usePermissionGroups";
import { PermissionDialog } from "../components/PermissionDialog";
import { GroupDialog } from "../components/GroupDialog";
import { TemplateEditorSheet } from "../components/TemplateEditorSheet";
import { AuditDashboard } from "../components/AuditDashboard";
import { AliasesTab } from "../components/AliasesTab";
import { SurfacesTab } from "../components/SurfacesTab";
import { TemplatesV2Tab } from "../components/TemplatesV2Tab";
import type { Permission, PermissionGroup, PermissionScope } from "../types";

type GlobalPermissionTab = "catalog" | "templates" | "templates-v2" | "aliases" | "surfaces" | "groups" | "audit";

/**
 * GlobalPermissionsPage - Gerenciamento do catálogo global de permissões do Hub
 * 
 * Esta página é acessível apenas por super_admin e admin global.
 * Gerencia o catálogo único de permissões compartilhado por todas as BUs.
 * 
 * Rota: /settings/permissions
 */
export default function GlobalPermissionsPage() {
  usePageTitle("Permissões Globais");

  // URL State for tab and search
  const [activeTab, setActiveTab] = useUrlTab<GlobalPermissionTab>("catalog");
  const { value: search, set: setSearch } = useUrlSearch("q");

  // Catalog state
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);

  // Groups state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [permissionsSheetGroup, setPermissionsSheetGroup] = useState<PermissionGroup | null>(null);

  const {
    permissions,
    permissionsByModule,
    modules,
    isLoading: catalogLoading,
    createPermission,
    updatePermission,
    togglePermissionStatus,
  } = usePermissionCatalog();

  const {
    groups,
    isLoading: groupsLoading,
    createGroup,
    updateGroup,
    toggleGroupStatus,
  } = usePermissionGroups();

  const filteredPermissions = search
    ? permissions.filter(
        (p) =>
          p.key.toLowerCase().includes(search.toLowerCase()) ||
          p.module.toLowerCase().includes(search.toLowerCase()) ||
          p.resource.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase())
      )
    : permissions;

  const filteredGroups = search
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.description?.toLowerCase().includes(search.toLowerCase())
      )
    : groups;

  const handleCreatePermission = (data: {
    key: string;
    module: string;
    resource: string;
    action: string;
    scope: PermissionScope;
    description?: string;
  }) => {
    createPermission.mutate(data, {
      onSuccess: () => {
        setPermissionDialogOpen(false);
        setEditingPermission(null);
      },
    });
  };

  const handleUpdatePermission = (data: {
    key: string;
    module: string;
    resource: string;
    action: string;
    scope: PermissionScope;
    description?: string;
  }) => {
    if (!editingPermission) return;
    updatePermission.mutate(
      { id: editingPermission.id, description: data.description },
      {
        onSuccess: () => {
          setPermissionDialogOpen(false);
          setEditingPermission(null);
        },
      }
    );
  };

  const handleCreateGroup = (data: { name: string; description?: string }) => {
    createGroup.mutate(data, {
      onSuccess: () => {
        setGroupDialogOpen(false);
        setEditingGroup(null);
      },
    });
  };

  const handleUpdateGroup = (data: { name: string; description?: string }) => {
    if (!editingGroup) return;
    updateGroup.mutate(
      { id: editingGroup.id, ...data },
      {
        onSuccess: () => {
          setGroupDialogOpen(false);
          setEditingGroup(null);
        },
      }
    );
  };

  // Group permissions by module for display
  const permissionsByModuleFiltered = search
    ? { "Resultados": filteredPermissions }
    : permissionsByModule;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissões Globais"
        description="Gerencie o catálogo de permissões e grupos globais do Hub"
      />

      <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Alterações nesta página afetam <strong>todas as Business Units</strong>. 
          Permissões e grupos aqui definidos são compartilhados globalmente.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="catalog" className="gap-2">
              <Key className="h-4 w-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Shield className="h-4 w-4" />
              Templates v1
            </TabsTrigger>
            <TabsTrigger value="templates-v2" className="gap-2">
              <FileStack className="h-4 w-4" />
              Templates v2
              <Badge variant="secondary" className="ml-1 text-xs">Novo</Badge>
            </TabsTrigger>
            <TabsTrigger value="surfaces" className="gap-2">
              <Layers className="h-4 w-4" />
              Surfaces
            </TabsTrigger>
            <TabsTrigger value="aliases" className="gap-2">
              <Link2 className="h-4 w-4" />
              Aliases
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              Grupos
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {(activeTab === "catalog" || activeTab === "templates" || activeTab === "groups") && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            )}
            {activeTab === "catalog" && (
              <Button onClick={() => setPermissionDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Permissão
              </Button>
            )}
            {activeTab === "groups" && (
              <Button onClick={() => setGroupDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Grupo
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="catalog" className="mt-6">
          {catalogLoading ? (
            <LoadingState text="Carregando catálogo..." />
          ) : filteredPermissions.length === 0 ? (
            <EmptyState
              icon={Key}
              title="Nenhuma permissão encontrada"
              description={search ? "Tente ajustar a busca" : "Crie a primeira permissão do catálogo"}
            />
          ) : (
            <div className="space-y-6">
              {Object.entries(permissionsByModuleFiltered).map(([module, perms]) => (
                <div key={module} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {module}
                  </h3>
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
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {perm.key}
                              </code>
                            </TableCell>
                            <TableCell>{perm.resource}</TableCell>
                            <TableCell>{perm.action}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{perm.scope}</Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={perm.status === "active"}
                                onCheckedChange={(checked) =>
                                  togglePermissionStatus.mutate({
                                    id: perm.id,
                                    status: checked ? "active" : "inactive",
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingPermission(perm);
                                      setPermissionDialogOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar Descrição
                                  </DropdownMenuItem>
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

        <TabsContent value="templates" className="mt-6">
          {groupsLoading ? (
            <LoadingState text="Carregando templates..." />
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Templates v1 (legado). Novos usuários devem usar <strong>Templates v2</strong> para melhor organização por módulo e surface.
                </AlertDescription>
              </Alert>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups
                      .filter((g) => g.is_system)
                      .filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase()))
                      .map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{template.name}</span>
                              <Badge variant="secondary" className="text-xs">v1</Badge>
                            </div>
                            {template.slug && (
                              <code className="text-xs text-muted-foreground font-mono">{template.slug}</code>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {template.description || "—"}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={template.status === "active"}
                              onCheckedChange={(checked) =>
                                toggleGroupStatus.mutate({
                                  id: template.id,
                                  status: checked ? "active" : "inactive",
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPermissionsSheetGroup(template)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Templates V2 Tab */}
        <TabsContent value="templates-v2" className="mt-6">
          <TemplatesV2Tab />
        </TabsContent>

        {/* Surfaces Tab */}
        <TabsContent value="surfaces" className="mt-6">
          <SurfacesTab />
        </TabsContent>

        {/* Aliases Tab */}
        <TabsContent value="aliases" className="mt-6">
          <AliasesTab />
        </TabsContent>

        <TabsContent value="groups" className="mt-6">
          {groupsLoading ? (
            <LoadingState text="Carregando grupos..." />
          ) : (() => {
            const customGroups = filteredGroups.filter((g) => !g.is_system);
            return customGroups.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum grupo customizado"
                description={search ? "Tente ajustar a busca" : "Crie grupos personalizados para necessidades específicas da organização"}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Grupos customizados permitem criar perfis de permissões específicos além dos templates padrão.
                </p>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customGroups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell>
                            <span className="font-medium">{group.name}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.description || "—"}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={group.status === "active"}
                              onCheckedChange={(checked) =>
                                toggleGroupStatus.mutate({
                                  id: group.id,
                                  status: checked ? "active" : "inactive",
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingGroup(group);
                                    setGroupDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setPermissionsSheetGroup(group)}
                                >
                                  <Settings className="h-4 w-4 mr-2" />
                                  Gerenciar Permissões
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditDashboard />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <PermissionDialog
        open={permissionDialogOpen}
        onOpenChange={(open) => {
          setPermissionDialogOpen(open);
          if (!open) setEditingPermission(null);
        }}
        permission={editingPermission}
        modules={modules}
        onSubmit={editingPermission ? handleUpdatePermission : handleCreatePermission}
        isPending={createPermission.isPending || updatePermission.isPending}
      />

      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={(open) => {
          setGroupDialogOpen(open);
          if (!open) setEditingGroup(null);
        }}
        group={editingGroup}
        onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
        isPending={createGroup.isPending || updateGroup.isPending}
      />

      <TemplateEditorSheet
        open={!!permissionsSheetGroup}
        onOpenChange={(open) => {
          if (!open) setPermissionsSheetGroup(null);
        }}
        group={permissionsSheetGroup}
      />
    </div>
  );
}
