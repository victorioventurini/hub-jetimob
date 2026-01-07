import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTicketCategories, useTicketSubcategories } from "../../hooks/useTicketCategories";
import {
  useCreateContactCapability,
  useUpdateContactCapability,
  type ContactCapability,
} from "../../hooks/useContactCapabilities";
import { toast } from "sonner";

interface CapabilityEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  companyId: string;
  capability: ContactCapability | null; // null = create mode
}

export function CapabilityEditDialog({
  open,
  onOpenChange,
  contactId,
  companyId,
  capability,
}: CapabilityEditDialogProps) {
  const isEditMode = !!capability;

  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("__all__");

  const { data: categories = [] } = useTicketCategories();
  const { data: subcategories = [] } = useTicketSubcategories(categoryId || undefined);
  const createCapability = useCreateContactCapability();
  const updateCapability = useUpdateContactCapability();

  const externalCategories = categories.filter(
    (c) => c.scope === "external" || c.scope === "both"
  );

  // Initialize form when dialog opens or capability changes
  useEffect(() => {
    if (open) {
      if (capability) {
        setCategoryId(capability.category_id);
        setSubcategoryId(capability.subcategory_id || "__all__");
      } else {
        setCategoryId("");
        setSubcategoryId("__all__");
      }
    }
  }, [open, capability]);

  // Reset subcategory when category changes (only in create mode)
  useEffect(() => {
    if (!isEditMode) {
      setSubcategoryId("__all__");
    }
  }, [categoryId, isEditMode]);

  const handleSubmit = async () => {
    if (!categoryId) {
      toast.error("Selecione uma categoria");
      return;
    }

    const subcatValue = subcategoryId === "__all__" ? null : subcategoryId;

    try {
      if (isEditMode && capability) {
        await updateCapability.mutateAsync({
          id: capability.id,
          category_id: categoryId,
          subcategory_id: subcatValue,
        });
        toast.success("Capacidade atualizada");
      } else {
        await createCapability.mutateAsync({
          contact_id: contactId,
          partner_company_id: companyId,
          category_id: categoryId,
          subcategory_id: subcatValue,
        });
        toast.success("Capacidade adicionada");
      }
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes("duplicate key")) {
        toast.error("Esta capacidade já existe para o contato");
      } else {
        toast.error(isEditMode ? "Erro ao atualizar capacidade" : "Erro ao adicionar capacidade");
      }
    }
  };

  const isPending = createCapability.isPending || updateCapability.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar Capacidade" : "Adicionar Capacidade"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Altere a categoria ou subcategoria desta capacidade."
              : "Configure qual categoria este contato pode atender."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category Select */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria..." />
              </SelectTrigger>
              <SelectContent>
                {externalCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory Select */}
          {categoryId && (
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    <span className="font-medium">Toda a categoria</span>
                  </SelectItem>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se "Toda a categoria", o contato receberá tickets de qualquer subcategoria.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!categoryId || isPending}>
            {isPending ? "Salvando..." : isEditMode ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
