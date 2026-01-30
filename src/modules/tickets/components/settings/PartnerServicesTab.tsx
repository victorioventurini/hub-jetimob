import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Settings, Save, AlertCircle, CheckCircle2, Layers } from "lucide-react";
import { useTicketCategories, usePartnerServiceMappings, useSavePartnerServices } from "../../hooks";
import type { PartnerCompany, TicketCategory } from "../../types";

interface PartnerServicesTabProps {
  partner: PartnerCompany;
}

interface ServiceSelection {
  categoryId: string;
  isGeneralist: boolean;
  subcategoryIds: string[];
}

export function PartnerServicesTab({ partner }: PartnerServicesTabProps) {
  const { data: categories = [], isLoading: loadingCategories } = useTicketCategories("external");
  const { data: existingMappings = [], isLoading: loadingMappings } = usePartnerServiceMappings(partner.id);
  const { mutate: saveServices, isPending: isSaving } = useSavePartnerServices();

  const [selections, setSelections] = useState<ServiceSelection[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Inicializar seleções a partir dos mapeamentos existentes
  useEffect(() => {
    if (loadingMappings || loadingCategories) return;

    const initialSelections: ServiceSelection[] = [];

    // Agrupar mapeamentos por categoria
    const mappingsByCategory = existingMappings.reduce((acc, m) => {
      if (!acc[m.category_id]) {
        acc[m.category_id] = { isGeneralist: false, subcategoryIds: [] };
      }
      if (m.subcategory_id === null) {
        acc[m.category_id].isGeneralist = true;
      } else {
        acc[m.category_id].subcategoryIds.push(m.subcategory_id);
      }
      return acc;
    }, {} as Record<string, { isGeneralist: boolean; subcategoryIds: string[] }>);

    for (const [categoryId, data] of Object.entries(mappingsByCategory)) {
      initialSelections.push({
        categoryId,
        isGeneralist: data.isGeneralist,
        subcategoryIds: data.subcategoryIds,
      });
    }

    setSelections(initialSelections);
    setHasChanges(false);
  }, [existingMappings, loadingMappings, loadingCategories]);

  // Verificar se categoria está selecionada
  const isCategorySelected = (categoryId: string) => {
    return selections.some((s) => s.categoryId === categoryId);
  };

  // Verificar se é generalista
  const isGeneralist = (categoryId: string) => {
    return selections.find((s) => s.categoryId === categoryId)?.isGeneralist ?? false;
  };

  // Obter subcategorias selecionadas
  const getSelectedSubcategories = (categoryId: string) => {
    return selections.find((s) => s.categoryId === categoryId)?.subcategoryIds ?? [];
  };

  // Toggle categoria
  const toggleCategory = (categoryId: string) => {
    setHasChanges(true);
    setSelections((prev) => {
      const exists = prev.find((s) => s.categoryId === categoryId);
      if (exists) {
        return prev.filter((s) => s.categoryId !== categoryId);
      }
      return [...prev, { categoryId, isGeneralist: true, subcategoryIds: [] }];
    });
  };

  // Toggle generalista
  const toggleGeneralist = (categoryId: string, value: boolean) => {
    setHasChanges(true);
    setSelections((prev) =>
      prev.map((s) =>
        s.categoryId === categoryId
          ? { ...s, isGeneralist: value, subcategoryIds: value ? [] : s.subcategoryIds }
          : s
      )
    );
  };

  // Toggle subcategoria
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

  // Converter seleções para formato de salvamento
  const getServicesToSave = () => {
    const services: Array<{ category_id: string; subcategory_id: string | null }> = [];

    for (const selection of selections) {
      if (selection.isGeneralist) {
        services.push({ category_id: selection.categoryId, subcategory_id: null });
      } else {
        for (const subcatId of selection.subcategoryIds) {
          services.push({ category_id: selection.categoryId, subcategory_id: subcatId });
        }
      }
    }

    return services;
  };

  // Salvar
  const handleSave = () => {
    const services = getServicesToSave();
    saveServices(
      { external_company_id: partner.id, services },
      {
        onSuccess: () => {
          toast.success("Serviços salvos com sucesso");
          setHasChanges(false);
        },
        onError: (error) => {
          toast.error("Erro ao salvar serviços: " + (error as Error).message);
        },
      }
    );
  };

  // Contagem de serviços
  const servicesCount = useMemo(() => {
    return getServicesToSave().length;
  }, [selections]);

  if (loadingCategories || loadingMappings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const externalCategories = categories.filter(
    (c) => c.scope === "external" || c.scope === "both"
  );

  if (externalCategories.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma categoria de ticket externo cadastrada. Configure as categorias primeiro na aba
          "Categorias".
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Serviços configurados: <strong>{servicesCount}</strong>
          </span>
        </div>

        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>

      {hasChanges && (
        <Alert variant="default" className="border-warning/50 bg-warning-muted">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-muted-foreground">
            Você tem alterações não salvas.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de Categorias */}
      <div className="space-y-3">
        {externalCategories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            isSelected={isCategorySelected(category.id)}
            isGeneralist={isGeneralist(category.id)}
            selectedSubcategories={getSelectedSubcategories(category.id)}
            onToggleCategory={() => toggleCategory(category.id)}
            onToggleGeneralist={(value) => toggleGeneralist(category.id, value)}
            onToggleSubcategory={(subcatId) => toggleSubcategory(category.id, subcatId)}
          />
        ))}
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: TicketCategory;
  isSelected: boolean;
  isGeneralist: boolean;
  selectedSubcategories: string[];
  onToggleCategory: () => void;
  onToggleGeneralist: (value: boolean) => void;
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Este parceiro pode atender qualquer subcategoria de {category.name}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {isSelected && !hasSubcategories && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="ml-7 flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Esta categoria não possui subcategorias
          </div>
        </CardContent>
      )}
    </Card>
  );
}
