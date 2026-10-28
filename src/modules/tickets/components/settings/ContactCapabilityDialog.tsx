import { useState, useEffect, useMemo } from "react";
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
import { usePartnerServiceMappings } from "../../hooks/usePartnerServices";
import { toast } from "sonner";

interface ContactCapabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  initialContactId?: string;
  /** Restringe as opções (ex.: gestor externo só vê o que a empresa atende). */
  categoryOptions?: { id: string; name: string; subcategories: { id: string; name: string }[] }[];
}

export function ContactCapabilityDialog({
  open,
  onOpenChange,
  companyId,
  initialContactId,
  categoryOptions,
}: ContactCapabilityDialogProps) {
  const [contactId, setContactId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("__all__");

  const { data: contacts = [] } = usePartnerContacts(companyId);
  const { data: categories = [] } = useTicketCategories();
  const createCapability = useCreateContactCapability();

  const { data: mappings = [], isLoading: mappingsLoading } = usePartnerServiceMappings(
    categoryOptions ? undefined : companyId
  );

  const activeContacts = contacts.filter((c) => c.status === "active");

  // Only categories/subcategories the partner company actually serves in this BU
  const externalCategories = useMemo(() => {
    if (categoryOptions) return categoryOptions;
    const active = mappings.filter((m) => m.status === "active");
    return categories
      .filter((c) => active.some((m) => m.category_id === c.id))
      .map((c) => {
        const forCat = active.filter((m) => m.category_id === c.id);
        const whole = forCat.some((m) => !m.subcategory_id);
        const allowed = new Set(forCat.map((m) => m.subcategory_id));
        return {
          id: c.id,
          name: c.name,
          wholeCategory: whole,
          subcategories: (c.subcategories || []).filter((s: { id: string }) => whole || allowed.has(s.id)),
        };
      });
  }, [categoryOptions, categories, mappings]);

  const selectedCategory = externalCategories.find((c) => c.id === categoryId) as
    | { subcategories?: { id: string; name: string }[]; wholeCategory?: boolean }
    | undefined;
  const subcategories = selectedCategory?.subcategories || [];
  const allowWhole = selectedCategory?.wholeCategory !== false;
  const noServices = !categoryOptions && !mappingsLoading && externalCategories.length === 0;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setContactId(initialContactId ?? "");
      setCategoryId("");
      setSubcategoryId("__all__");
    }
  }, [open, initialContactId]);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategoryId(allowWhole ? "__all__" : subcategories[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

          {noServices && (
            <p className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
              Esta empresa ainda não tem categorias atendidas — configure os serviços do parceiro.
            </p>
          )}

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
                  {allowWhole && (
                    <SelectItem value="__all__">
                      <span className="font-medium">Toda a categoria</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        Atende qualquer subcategoria
                      </span>
                    </SelectItem>
                  )}
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
            disabled={!contactId || !categoryId || !subcategoryId || noServices || createCapability.isPending}
          >
            {createCapability.isPending ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
