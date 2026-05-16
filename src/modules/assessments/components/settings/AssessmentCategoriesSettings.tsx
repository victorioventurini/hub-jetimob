/**
 * Aba "Categorias" do módulo Assessments — gerencia categorias e subcategorias.
 * Padrão visual alinhado ao /tickets/settings (categorias com lista expandida).
 *
 * Permissão: requer `assessments.category.manage:bu` para mutar.
 * Leitura: respeita `assessments.assessment.view:bu` via RLS.
 */
import { memo, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useHasPermission } from "@/hooks/usePermissions";
import { ConfirmActionDialog } from "../ConfirmActionDialog";
import { AssessmentCategoryDialog } from "./AssessmentCategoryDialog";
import { AssessmentSubcategoryDialog } from "./AssessmentSubcategoryDialog";
import {
  AssessmentCategory,
  AssessmentSubcategory,
  useAllAssessmentSubcategories,
  useAssessmentCategories,
  useDeleteAssessmentCategory,
  useDeleteAssessmentSubcategory,
} from "../../hooks/useAssessmentCategoriesData";

export function AssessmentCategoriesSettings() {
  const { data: categories = [], isLoading } = useAssessmentCategories();
  const { data: allSubs = [] } = useAllAssessmentSubcategories();
  const canManage = useHasPermission("assessments.category.manage:bu");

  const [search, setSearch] = useState("");
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AssessmentCategory | null>(null);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<AssessmentSubcategory | null>(null);
  const [subDialogCategory, setSubDialogCategory] = useState<AssessmentCategory | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<AssessmentCategory | null>(null);
  const [deleteSubcategoryTarget, setDeleteSubcategoryTarget] = useState<AssessmentSubcategory | null>(null);

  const deleteCategory = useDeleteAssessmentCategory();
  const deleteSubcategory = useDeleteAssessmentSubcategory();

  // Agrupa subcategorias por categoria
  const subsByCategory = useMemo(() => {
    const map = new Map<string, AssessmentSubcategory[]>();
    for (const sub of allSubs) {
      const list = map.get(sub.category_id) ?? [];
      list.push(sub);
      map.set(sub.category_id, list);
    }
    return map;
  }, [allSubs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.description ?? "").toLowerCase().includes(term) ||
        (subsByCategory.get(c.id) ?? []).some((s) => s.name.toLowerCase().includes(term)),
    );
  }, [categories, search, subsByCategory]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Buscar categorias ou subcategorias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <Button
          onClick={() => {
            setEditingCategory(null);
            setCategoryDialogOpen(true);
          }}
          disabled={!canManage}
          title={canManage ? undefined : "Você não tem permissão para gerenciar categorias"}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? "Nenhuma categoria encontrada" : "Sem categorias cadastradas"}
          description={
            search
              ? "Tente outro termo de busca."
              : "Crie categorias para organizar suas provas por tema, trilha ou domínio."
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              subcategories={subsByCategory.get(category.id) ?? []}
              canManage={canManage}
              onEdit={() => {
                setEditingCategory(category);
                setCategoryDialogOpen(true);
              }}
              onDelete={() => setDeleteCategoryTarget(category)}
              onAddSubcategory={() => {
                setEditingSubcategory(null);
                setSubDialogCategory(category);
                setSubcategoryDialogOpen(true);
              }}
              onEditSubcategory={(sub) => {
                setEditingSubcategory(sub);
                setSubDialogCategory(category);
                setSubcategoryDialogOpen(true);
              }}
              onDeleteSubcategory={(sub) => setDeleteSubcategoryTarget(sub)}
            />
          ))}
        </div>
      )}

      <AssessmentCategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />
      <AssessmentSubcategoryDialog
        open={subcategoryDialogOpen}
        onOpenChange={setSubcategoryDialogOpen}
        subcategory={editingSubcategory}
        categoryId={subDialogCategory?.id ?? null}
        categoryName={subDialogCategory?.name}
      />
      <ConfirmActionDialog
        open={!!deleteCategoryTarget}
        onOpenChange={(o) => !o && setDeleteCategoryTarget(null)}
        title="Excluir categoria"
        description={
          deleteCategoryTarget
            ? `A categoria "${deleteCategoryTarget.name}" e todas as suas subcategorias serão excluídas. Provas vinculadas precisam ser desvinculadas antes.`
            : ""
        }
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={async () => {
          if (deleteCategoryTarget) {
            await deleteCategory.mutateAsync(deleteCategoryTarget.id);
            setDeleteCategoryTarget(null);
          }
        }}
      />
      <ConfirmActionDialog
        open={!!deleteSubcategoryTarget}
        onOpenChange={(o) => !o && setDeleteSubcategoryTarget(null)}
        title="Excluir subcategoria"
        description={
          deleteSubcategoryTarget
            ? `A subcategoria "${deleteSubcategoryTarget.name}" será excluída. Provas vinculadas precisam ser desvinculadas antes.`
            : ""
        }
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={async () => {
          if (deleteSubcategoryTarget) {
            await deleteSubcategory.mutateAsync(deleteSubcategoryTarget.id);
            setDeleteSubcategoryTarget(null);
          }
        }}
      />
    </div>
  );
}

interface CategoryRowProps {
  category: AssessmentCategory;
  subcategories: AssessmentSubcategory[];
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddSubcategory: () => void;
  onEditSubcategory: (sub: AssessmentSubcategory) => void;
  onDeleteSubcategory: (sub: AssessmentSubcategory) => void;
}

const CategoryRow = memo(function CategoryRow({
  category,
  subcategories,
  canManage,
  onEdit,
  onDelete,
  onAddSubcategory,
  onEditSubcategory,
  onDeleteSubcategory,
}: CategoryRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="flex flex-1 items-start gap-2 text-left"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{category.name}</span>
                {category.status === "inactive" && (
                  <Badge variant="secondary" className="text-xs">
                    Inativa
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {subcategories.length} {subcategories.length === 1 ? "subcategoria" : "subcategorias"}
                </Badge>
              </div>
              {category.description && (
                <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
              )}
            </div>
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} disabled={!canManage} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={!canManage}
              title="Excluir"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {open && (
          <div className="mt-4 space-y-2 border-t pt-4">
            {subcategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma subcategoria cadastrada.</p>
            ) : (
              <ul className="space-y-1">
                {subcategories.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{sub.name}</span>
                      {sub.status === "inactive" && (
                        <Badge variant="secondary" className="text-xs">
                          Inativa
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditSubcategory(sub)}
                        disabled={!canManage}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteSubcategory(sub)}
                        disabled={!canManage}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" onClick={onAddSubcategory} disabled={!canManage} className="mt-2">
              <Plus className="mr-2 h-3.5 w-3.5" />
              Adicionar subcategoria
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
