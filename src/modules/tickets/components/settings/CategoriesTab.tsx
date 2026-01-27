import { useState, useMemo } from "react";
import { FolderTree, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useTicketCategories, useDeleteTicketCategory, useDeleteTicketSubcategory } from "../../hooks";
import { CategoryDialog } from "./CategoryDialog";
import { SubcategoryDialog } from "./SubcategoryDialog";
import { TicketCategory, TicketSubcategory } from "../../types";
import { useLocalSearch } from "@/shared/url/useLocalSearch";
import { UrlSearchInput } from "@/shared/filters/UrlSearchInput";

const SCOPE_LABELS: Record<string, string> = {
  internal: "Interno",
  external: "Externo",
  both: "Ambos",
};

export function CategoriesTab() {
  const { data: categories = [], isLoading } = useTicketCategories();
  const { mutate: deleteCategory, isPending: isDeletingCategory } = useDeleteTicketCategory();
  const { mutate: deleteSubcategory, isPending: isDeletingSubcategory } = useDeleteTicketSubcategory();
  
  const { value: search, setValue: setSearch } = useLocalSearch("categorySearch", 300);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<TicketSubcategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "subcategory"; id: string } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Filter categories by search term (also searches in subcategories)
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(term) ||
      cat.subcategories?.some((sub) => sub.name.toLowerCase().includes(term))
    );
  }, [categories, search]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleEditCategory = (category: TicketCategory) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditSubcategory = (subcategory: TicketSubcategory, categoryId: string) => {
    setEditingSubcategory(subcategory);
    setSelectedCategoryId(categoryId);
    setSubcategoryDialogOpen(true);
  };

  const handleCreateSubcategory = (categoryId: string) => {
    setEditingSubcategory(null);
    setSelectedCategoryId(categoryId);
    setSubcategoryDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    
    if (deleteTarget.type === "category") {
      deleteCategory(deleteTarget.id);
    } else {
      deleteSubcategory(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Categorias e Subcategorias</CardTitle>
            <CardDescription>
              Organize os tickets por categoria para facilitar o roteamento e filtros
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <UrlSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar categoria..."
              className="w-[200px]"
            />
            <Button onClick={handleCreateCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCategories.length === 0 ? (
            <EmptyState
              icon={FolderTree}
              title={search ? "Nenhuma categoria encontrada" : "Nenhuma categoria"}
              description={search ? "Tente outro termo de busca." : "Crie categorias para organizar os tickets."}
              compact
            />
          ) : (
            <div className="space-y-2">
              {filteredCategories.map((category) => (
                <Collapsible
                  key={category.id}
                  open={expandedCategories.has(category.id)}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {SCOPE_LABELS[category.scope]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({category.subcategories?.length || 0} subcategorias)
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateSubcategory(category.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Subcategoria
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditCategory(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget({ type: "category", id: category.id })}
                        disabled={isDeletingCategory}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="ml-8 mt-1 space-y-1">
                      {category.subcategories?.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-md border p-2 pl-4"
                        >
                          <span className="text-sm">{sub.name}</span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditSubcategory(sub, category.id)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDeleteTarget({ type: "subcategory", id: sub.id })}
                              disabled={isDeletingSubcategory}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(!category.subcategories || category.subcategories.length === 0) && (
                        <p className="text-sm text-muted-foreground p-2">
                          Nenhuma subcategoria
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />

      <SubcategoryDialog
        open={subcategoryDialogOpen}
        onOpenChange={setSubcategoryDialogOpen}
        subcategory={editingSubcategory}
        categoryId={selectedCategoryId}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === "category" ? "Remover categoria?" : "Remover subcategoria?"}
        description="Tickets existentes serão mantidos, mas novos tickets não poderão usar esta opção."
      />
    </>
  );
}
