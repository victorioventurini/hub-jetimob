import { useState } from "react";
import { Plus, Pencil, Trash2, FolderTree, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";

import { useCategories } from "../../hooks/useCategories";
import { CategoryFormDialog } from "./CategoryFormDialog";
import type { AssetCategory } from "../../types";

export function CategoriesTab() {
  const {
    categories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCategories();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingCategory(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (category: AssetCategory) => {
    setEditingCategory(category);
    setFormDialogOpen(true);
  };

  const handleSubmit = async (data: {
    name: string;
    parent_id?: string;
    description?: string;
  }) => {
    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, ...data });
        toast.success("Categoria atualizada!");
      } else {
        await createCategory(data);
        toast.success("Categoria criada!");
      }
    } catch (error) {
      toast.error("Erro ao salvar categoria");
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCategory(deleteId);
      toast.success("Categoria removida!");
    } catch (error) {
      toast.error("Erro ao remover categoria");
    } finally {
      setDeleteId(null);
    }
  };

  // Build a map of parent names
  const parentMap = new Map(categories.map((c) => [c.id, c.name]));

  // Count items per category (would need actual data from inventory)
  const getChildCount = (categoryId: string) =>
    categories.filter((c) => c.parent_id === categoryId).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Categorias do Inventário</CardTitle>
          <CardDescription>
            Organize os itens do inventário em categorias hierárquicas
          </CardDescription>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="Nenhuma categoria cadastrada"
            description="Crie categorias para organizar os itens do inventário."
            compact
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria Pai</TableHead>
                <TableHead>Subcategorias</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{category.name}</p>
                        {category.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {category.parent_id ? (
                      <Badge variant="secondary">
                        {parentMap.get(category.parent_id) || "—"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Raiz</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getChildCount(category.id) > 0 ? (
                      <Badge variant="outline">
                        {getChildCount(category.id)} subcategoria(s)
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(category.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Form Dialog */}
      <CategoryFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        category={editingCategory}
        categories={categories}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a categoria. Itens associados a ela ficarão
              sem categoria. Subcategorias também serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
