import { useState } from "react";
import { Settings, UserPlus, Trash2, Shield, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAssetPermissions } from "../hooks/useAssetPermissions";
import { AddPermissionDialog } from "../components/settings/AddPermissionDialog";
import { CategoriesTab } from "../components/settings/CategoriesTab";
import { PERMISSION_ROLE_LABELS } from "../types";

export default function AssetsSettingsPage() {
  const {
    allPermissions,
    isAssetsAdmin,
    isLoading,
    removePermission,
    isRemovingPermission,
  } = useAssetPermissions();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!isAssetsAdmin) {
    return (
      <EmptyState
        icon={Settings}
        title="Acesso restrito"
        description="Apenas administradores do módulo podem acessar as configurações."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleDelete = () => {
    if (deleteId) {
      removePermission(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="permissions" className="w-full">
        <TabsList>
          <TabsTrigger value="permissions" className="gap-2">
            <Shield className="h-4 w-4" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Categorias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="mt-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Permissões</CardTitle>
                <CardDescription>
                  Gerencie quem pode acessar e gerenciar cada sub-módulo de Assets
                </CardDescription>
              </div>
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Permissão
              </Button>
            </CardHeader>
            <CardContent>
              {allPermissions.length === 0 ? (
                <EmptyState
                  icon={Settings}
                  title="Nenhuma permissão configurada"
                  description="Adicione usuários para gerenciar os assets."
                  compact
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allPermissions.map((permission) => (
                      <TableRow key={permission.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={permission.user?.avatar_url || undefined} />
                              <AvatarFallback>
                                {permission.user?.full_name?.slice(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{permission.user?.full_name || "Usuário"}</p>
                              <p className="text-sm text-muted-foreground">
                                {permission.user?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {PERMISSION_ROLE_LABELS[permission.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(permission.id)}
                            disabled={isRemovingPermission}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <CategoriesTab />
        </TabsContent>
      </Tabs>

      {/* Dialog de adicionar permissão */}
      <AddPermissionDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover permissão?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário perderá acesso ao módulo de Assets. Esta ação pode ser revertida
              adicionando a permissão novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
