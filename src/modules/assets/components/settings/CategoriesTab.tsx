import { useState } from "react";
import { Plus, Pencil, Trash2, FolderTree, Folder, FolderOpen, ChevronRight, ChevronDown, Upload, Download } from "lucide-react";
import { toast } from "sonner";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import { useAssetCategoriesQuery, useAssetCategoryMutations } from "../../hooks";
import { CategoryFormDialog } from "./CategoryFormDialog";
import { CategoryImportDialog } from "./CategoryImportDialog";
import type { AssetCategory } from "../../types";

interface CategoryNode extends AssetCategory {
  children: CategoryNode[];
}

function buildCategoryTree(categories: AssetCategory[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  // First pass: create nodes
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

interface CategoryRowProps {
  category: CategoryNode;
  level: number;
  onEdit: (category: AssetCategory) => void;
  onDelete: (id: string) => void;
  onAddSubcategory: (parentId: string) => void;
  isDeleting: boolean;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}

function CategoryRow({
  category,
  level,
  onEdit,
  onDelete,
  onAddSubcategory,
  isDeleting,
  expandedIds,
  toggleExpand,
}: CategoryRowProps) {
  const hasChildren = category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-md group",
          level > 0 && "border-l border-border"
        )}
        style={{ marginLeft: level > 0 ? `${level * 24}px` : undefined }}
      >
        {/* Expand/Collapse or spacer */}
        <button
          type="button"
          onClick={() => hasChildren && toggleExpand(category.id)}
          className={cn(
            "w-5 h-5 flex items-center justify-center rounded",
            hasChildren && "hover:bg-muted cursor-pointer"
          )}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
        </button>

        {/* Icon */}
        {hasChildren && isExpanded ? (
          <FolderOpen className="h-4 w-4 text-primary" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Name and description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{category.name}</span>
            {level === 0 && (
              <Badge variant="outline" className="text-xs">
                Categoria
              </Badge>
            )}
            {level > 0 && (
              <Badge variant="secondary" className="text-xs">
                Subcategoria
              </Badge>
            )}
          </div>
          {category.description && (
            <p className="text-sm text-muted-foreground truncate">
              {category.description}
            </p>
          )}
        </div>

        {/* Child count */}
        {hasChildren && (
          <Badge variant="outline" className="text-xs">
            {category.children.length} sub
          </Badge>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onAddSubcategory(category.id)}
            title="Adicionar subcategoria"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(category)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDelete(category.id)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Render children if expanded */}
      {isExpanded &&
        category.children.map((child) => (
          <CategoryRow
            key={child.id}
            category={child}
            level={level + 1}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddSubcategory={onAddSubcategory}
            isDeleting={isDeleting}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
    </>
  );
}

export function CategoriesTab() {
  const { data: categories = [], isLoading } = useAssetCategoriesQuery();
  const {
    createCategoryAsync: createCategory,
    updateCategoryAsync: updateCategory,
    deleteCategoryAsync: deleteCategory,
    isCreatingCategory: isCreating,
    isUpdatingCategory: isUpdating,
    isDeletingCategory: isDeleting,
  } = useAssetCategoryMutations();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null);
  const [parentIdForNew, setParentIdForNew] = useState<string | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setParentIdForNew(undefined);
    setFormDialogOpen(true);
  };

  const handleAddSubcategory = (parentId: string) => {
    setEditingCategory(null);
    setParentIdForNew(parentId);
    setFormDialogOpen(true);
    // Expand the parent to show the new subcategory
    setExpandedIds((prev) => new Set(prev).add(parentId));
  };

  const handleEdit = (category: AssetCategory) => {
    setEditingCategory(category);
    setParentIdForNew(undefined);
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
        toast.success(data.parent_id ? "Subcategoria criada!" : "Categoria criada!");
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

  const handleExport = () => {
    if (categories.length === 0) {
      toast.error("Nenhuma categoria para exportar");
      return;
    }

    // Build parent map for subcategory lookup
    const parentMap = new Map<string, string>();
    categories.forEach((cat) => {
      parentMap.set(cat.id, cat.name);
    });

    // Create CSV rows
    const rows: string[][] = [["category_name", "subcategory_name", "description"]];
    
    categories.forEach((cat) => {
      if (!cat.parent_id) {
        // It's a parent category
        rows.push([cat.name, "", cat.description || ""]);
      } else {
        // It's a subcategory
        const parentName = parentMap.get(cat.parent_id) || "";
        rows.push([parentName, cat.name, cat.description || ""]);
      }
    });

    // Convert to CSV string
    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "categorias-assets.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Categorias exportadas com sucesso!");
  };

  const categoryTree = buildCategoryTree(categories);

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
            Organize os itens em categorias e subcategorias hierárquicas
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={categories.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar CSV
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
        </div>
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
          <div className="space-y-1">
            {categoryTree.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                level={0}
                onEdit={handleEdit}
                onDelete={setDeleteId}
                onAddSubcategory={handleAddSubcategory}
                isDeleting={isDeleting}
                expandedIds={expandedIds}
                toggleExpand={toggleExpand}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Form Dialog */}
      <CategoryFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        category={editingCategory}
        categories={categories}
        defaultParentId={parentIdForNew}
        onSubmit={handleSubmit}
        isLoading={isCreating || isUpdating}
      />

      {/* Import Dialog */}
      <CategoryImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a categoria. Itens associados a ela ficarão
              sem categoria. Subcategorias também serão removidas.
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
