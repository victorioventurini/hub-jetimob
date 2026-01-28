import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { InventoryFormFields, useInventoryForm } from "./form";
import type { AssetInventory } from "../../types";

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: AssetInventory | null;
  /** When true, clones the item instead of editing (leaves code blank) */
  cloneMode?: boolean;
}

export function InventoryFormDialog({ open, onOpenChange, item, cloneMode = false }: InventoryFormDialogProps) {
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
  } = useInventoryForm({ open, item, cloneMode, onOpenChange });

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
                : "Preencha os dados do novo item"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <InventoryFormFields
              form={form}
              isEditing={isEditing}
              isInventoryAdmin={isInventoryAdmin}
              canManageInventory={canManageInventory}
              subcategories={subcategories}
              groupedSubcategories={groupedSubcategories}
              itemHasParentCategory={itemHasParentCategory}
              rootLocations={rootLocations}
              availableRooms={availableRooms}
              brands={brands}
              duplicateError={duplicateError}
              onCodeChange={handleCodeChange}
              itemId={item?.id}
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
      </DialogContent>
    </Dialog>
  );
}
