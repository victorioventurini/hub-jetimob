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
import { usePartnerContacts, useTicketCategories, useCreateContactCapability } from "../../hooks";
import { toast } from "sonner";

interface ContactCapabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
}

export function ContactCapabilityDialog({
  open,
  onOpenChange,
  companyId,
}: ContactCapabilityDialogProps) {
  const [contactId, setContactId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("__all__");

  const { data: contacts = [] } = usePartnerContacts(companyId);
  const { data: categories = [] } = useTicketCategories();
  const createCapability = useCreateContactCapability();

  const activeContacts = contacts.filter((c) => c.status === "active");
  const externalCategories = categories.filter(
    (c) => c.scope === "external" || c.scope === "both"
  );
  
  // Get subcategories from the selected category (embedded in category data)
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setContactId("");
      setCategoryId("");
      setSubcategoryId("__all__");
    }
  }, [open]);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategoryId("__all__");
  }, [categoryId]);

  const handleSubmit = async () => {
    if (!contactId || !categoryId) {
      toast.error("Selecione contato e categoria");
      return;
    }

    try {
      await createCapability.mutateAsync({
        contact_id: contactId,
        external_company_id: companyId,
        category_id: categoryId,
        subcategory_id: subcategoryId === "__all__" ? null : subcategoryId,
      });
      toast.success("Capacidade adicionada");
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes("duplicate key")) {
        toast.error("Esta capacidade já existe para o contato");
      } else {
        toast.error("Erro ao adicionar capacidade");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Capacidade</DialogTitle>
          <DialogDescription>
            Configure quais categorias este contato pode atender automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Contact Select */}
          <div className="space-y-2">
            <Label>Contato *</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o contato..." />
              </SelectTrigger>
              <SelectContent>
                {activeContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    <span>{contact.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {contact.email}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
                    <span className="ml-2 text-xs text-muted-foreground">
                      Atende qualquer subcategoria
                    </span>
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
          <Button
            onClick={handleSubmit}
            disabled={!contactId || !categoryId || createCapability.isPending}
          >
            {createCapability.isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
