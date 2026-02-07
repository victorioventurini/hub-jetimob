import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { X, Lightbulb } from "lucide-react";
import { InventoryFormFields, useInventoryForm } from "./form";
import { RecommendationSelectStep } from "../recommendations";
import type { AssetInventory, AssetRecommendation } from "../../types";

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: AssetInventory | null;
  /** When true, clones the item instead of editing (leaves code blank) */
  cloneMode?: boolean;
  /** Pre-selected recommendation (from RecommendationsPage "Criar Item") */
  preSelectedRecommendation?: AssetRecommendation | null;
}

export function InventoryFormDialog({ open, onOpenChange, item, cloneMode = false, preSelectedRecommendation }: InventoryFormDialogProps) {
  const {
    form,
    isEditing,
    isCloning,
    isInventoryAdmin,
    canManageInventory,
    isCreatingItem,
    isUpdatingItem,
    subcategories,
    groupedSubcategories,
    itemHasParentCategory,
    rootLocations,
    availableRooms,
    brands,
    duplicateError,
    onSubmit,
    handleCodeChange,
    // Recommendation step
    showRecommendationStep,
    selectedRecommendation,
    handleRecommendationSelect,
    handleSkipRecommendation,
    handleClearRecommendation,
  } = useInventoryForm({ open, item, cloneMode, onOpenChange, preSelectedRecommendation });

  // Defense in depth: don't render edit/create dialog if user can't manage inventory
  if (!canManageInventory) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Item" : isCloning ? "Clonar Item" : "Novo Item de Inventário"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações do item" 
              : isCloning 
                ? "Preencha o código interno do novo item (baseado no original)"
                : showRecommendationStep
                  ? "Comece selecionando uma recomendação ou pule para cadastrar manualmente"
                  : "Preencha os dados do novo item"}
          </DialogDescription>
        </DialogHeader>

        {/* Recommendation Step (only for new items) */}
        {showRecommendationStep && !isEditing && !isCloning ? (
          <RecommendationSelectStep
            onSelect={handleRecommendationSelect}
            onSkip={handleSkipRecommendation}
          />
        ) : (
          <>
            {/* Selected Recommendation Badge */}
            {selectedRecommendation && !isEditing && (
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4">
                <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Baseado em: {selectedRecommendation.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedRecommendation.brand}
                    {selectedRecommendation.model && ` • ${selectedRecommendation.model}`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearRecommendation}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remover recomendação</span>
                </Button>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <InventoryFormFields
                  form={form}
                  isEditing={isEditing}
                  isInventoryAdmin={isInventoryAdmin}
                  subcategories={subcategories}
                  groupedSubcategories={groupedSubcategories}
                  itemHasParentCategory={itemHasParentCategory}
                  rootLocations={rootLocations}
                  availableRooms={availableRooms}
                  brands={brands}
                  duplicateError={duplicateError}
                  onCodeChange={handleCodeChange}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" isLoading={isCreatingItem || isUpdatingItem} loadingText="Salvando...">
                    {isEditing ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
