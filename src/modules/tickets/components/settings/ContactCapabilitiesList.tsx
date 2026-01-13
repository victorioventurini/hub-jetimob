import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Save, Layers, FolderTree, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  useContactCapabilities,
  useSaveContactCapabilities,
} from "../../hooks/useContactCapabilities";
import { useTicketCategories } from "../../hooks/useTicketCategories";
import type { TicketCategory } from "../../types";

interface ContactCapabilitiesListProps {
  contactId: string;
  companyId: string;
}

interface ServiceSelection {
  categoryId: string;
  isGeneralist: boolean;
  subcategoryIds: string[];
}

export function ContactCapabilitiesList({
  contactId,
  companyId,
}: ContactCapabilitiesListProps) {
  const [selections, setSelections] = useState<ServiceSelection[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: capabilities = [], isLoading: loadingCapabilities } = useContactCapabilities(contactId);
  const { data: categories = [], isLoading: loadingCategories } = useTicketCategories("external");
  const saveCapabilities = useSaveContactCapabilities();

  // External categories only (scope = external or both)
  const externalCategories = useMemo(() => 
    categories.filter((c) => c.scope === "external" || c.scope === "both"),
    [categories]
  );

  // Initialize selections from existing capabilities
  useEffect(() => {
    if (!loadingCapabilities && !loadingCategories && externalCategories.length > 0) {
      const newSelections: ServiceSelection[] = externalCategories.map((cat) => {
        const categoryCapabilities = capabilities.filter((c) => c.category_id === cat.id);
        
        if (categoryCapabilities.length === 0) {
          return { categoryId: cat.id, isGeneralist: false, subcategoryIds: [] };
        }

        // If any has null subcategory_id, it's a generalist
        const hasGeneralist = categoryCapabilities.some((c) => !c.subcategory_id);
        if (hasGeneralist) {
          return { categoryId: cat.id, isGeneralist: true, subcategoryIds: [] };
        }

        // Otherwise, collect specific subcategory IDs
        const subcategoryIds = categoryCapabilities
          .filter((c) => c.subcategory_id)
          .map((c) => c.subcategory_id as string);

        return { categoryId: cat.id, isGeneralist: false, subcategoryIds };
      });

      setSelections(newSelections);
      setHasChanges(false);
    }
  }, [capabilities, externalCategories, loadingCapabilities, loadingCategories]);

  const toggleCategory = (categoryId: string) => {
    setHasChanges(true);
    setSelections((prev) => {
      const existing = prev.find((s) => s.categoryId === categoryId);
      if (existing) {
        // If already has selections, remove entirely
        if (existing.isGeneralist || existing.subcategoryIds.length > 0) {
          return prev.map((s) =>
            s.categoryId === categoryId
              ? { ...s, isGeneralist: false, subcategoryIds: [] }
              : s
          );
        }
        // If empty, enable as generalist by default
        return prev.map((s) =>
          s.categoryId === categoryId
            ? { ...s, isGeneralist: true, subcategoryIds: [] }
            : s
        );
      }
      return [...prev, { categoryId, isGeneralist: true, subcategoryIds: [] }];
    });
  };

  const toggleGeneralist = (categoryId: string, isGeneralist: boolean) => {
    setHasChanges(true);
    setSelections((prev) =>
      prev.map((s) =>
        s.categoryId === categoryId
          ? { ...s, isGeneralist, subcategoryIds: isGeneralist ? [] : s.subcategoryIds }
          : s
      )
    );
  };

  const toggleSubcategory = (categoryId: string, subcategoryId: string) => {
    setHasChanges(true);
    setSelections((prev) =>
      prev.map((s) => {
        if (s.categoryId !== categoryId) return s;
        const hasSubcat = s.subcategoryIds.includes(subcategoryId);
        return {
          ...s,
          isGeneralist: false,
          subcategoryIds: hasSubcat
            ? s.subcategoryIds.filter((id) => id !== subcategoryId)
            : [...s.subcategoryIds, subcategoryId],
        };
      })
    );
  };

  const getSelection = (categoryId: string) => {
    return selections.find((s) => s.categoryId === categoryId) || {
      categoryId,
      isGeneralist: false,
      subcategoryIds: [],
    };
  };

  const isSelected = (categoryId: string) => {
    const sel = getSelection(categoryId);
    return sel.isGeneralist || sel.subcategoryIds.length > 0;
  };

  const totalServicesCount = useMemo(() => {
    return selections.reduce((acc, s) => {
      if (s.isGeneralist) return acc + 1;
      return acc + s.subcategoryIds.length;
    }, 0);
  }, [selections]);

  const handleSave = async () => {
    try {
      const activeSelections = selections.filter(
        (s) => s.isGeneralist || s.subcategoryIds.length > 0
      );

      await saveCapabilities.mutateAsync({
        contactId,
        companyId,
        selections: activeSelections,
      });

      toast.success("Capacidades salvas com sucesso");
      setHasChanges(false);
    } catch (error) {
      toast.error("Erro ao salvar capacidades");
    }
  };

  if (loadingCapabilities || loadingCategories) {
    return <LoadingState text="Carregando capacidades..." />;
  }

  if (externalCategories.length === 0) {
    return (
      <EmptyState
        icon={FolderTree}
        title="Nenhuma categoria externa"
        description="Cadastre categorias com escopo 'externo' para configurar capacidades."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Settings className="h-4 w-4" />
          <span>Serviços configurados: {totalServicesCount}</span>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || saveCapabilities.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveCapabilities.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {hasChanges && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <span>Você tem alterações não salvas.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Category Cards */}
      <div className="space-y-3">
        {externalCategories.map((category) => {
          const sel = getSelection(category.id);
          const selected = isSelected(category.id);

          return (
            <CategoryCard
              key={category.id}
              category={category}
              isSelected={selected}
              isGeneralist={sel.isGeneralist}
              selectedSubcategories={sel.subcategoryIds}
              onToggleCategory={() => toggleCategory(category.id)}
              onToggleGeneralist={(val) => toggleGeneralist(category.id, val)}
              onToggleSubcategory={(subId) => toggleSubcategory(category.id, subId)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ====================
// CategoryCard Component
// ====================

interface CategoryCardProps {
  category: TicketCategory;
  isSelected: boolean;
  isGeneralist: boolean;
  selectedSubcategories: string[];
  onToggleCategory: () => void;
  onToggleGeneralist: (val: boolean) => void;
  onToggleSubcategory: (subcategoryId: string) => void;
}

function CategoryCard({
  category,
  isSelected,
  isGeneralist,
  selectedSubcategories,
  onToggleCategory,
  onToggleGeneralist,
  onToggleSubcategory,
}: CategoryCardProps) {
  const subcategories = category.subcategories || [];
  const hasSubcategories = subcategories.length > 0;

  return (
    <Card className={isSelected ? "border-primary/50 bg-primary/5" : ""}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Checkbox
            id={`cat-${category.id}`}
            checked={isSelected}
            onCheckedChange={onToggleCategory}
          />
          <label
            htmlFor={`cat-${category.id}`}
            className="flex-1 cursor-pointer font-medium"
          >
            {category.name}
          </label>

          {isSelected && (
            <Badge variant={isGeneralist ? "default" : "secondary"} className="text-xs">
              {isGeneralist
                ? "Atende geral"
                : `${selectedSubcategories.length} subcategoria(s)`}
            </Badge>
          )}
        </div>

        {category.description && (
          <CardDescription className="ml-7 mt-1">{category.description}</CardDescription>
        )}
      </CardHeader>

      {isSelected && hasSubcategories && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="ml-7 space-y-3">
            {/* Opção Generalista */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`gen-${category.id}`}
                checked={isGeneralist}
                onCheckedChange={(checked) => onToggleGeneralist(!!checked)}
              />
              <label
                htmlFor={`gen-${category.id}`}
                className="text-sm cursor-pointer flex items-center gap-2"
              >
                <Layers className="h-4 w-4 text-muted-foreground" />
                Atende todas as subcategorias (generalista)
              </label>
            </div>

            {/* Lista de Subcategorias */}
            {!isGeneralist && (
              <div className="border-t pt-3 mt-2">
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione subcategorias específicas:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {subcategories.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`sub-${sub.id}`}
                        checked={selectedSubcategories.includes(sub.id)}
                        onCheckedChange={() => onToggleSubcategory(sub.id)}
                      />
                      <label htmlFor={`sub-${sub.id}`} className="text-sm cursor-pointer">
                        {sub.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isGeneralist && (
              <div className="flex items-center gap-2 text-xs text-status-green mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Este contato receberá tickets de qualquer subcategoria desta categoria.
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
