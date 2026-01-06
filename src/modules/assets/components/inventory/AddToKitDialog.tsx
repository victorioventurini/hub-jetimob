import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";
import { useInventory } from "../../hooks/useInventory";
import { useAssetGroups } from "../../hooks/useAssetGroups";
import type { AssetGroup, AssetInventory } from "../../types";
import { INVENTORY_STATUS_LABELS } from "../../types";
import { useDialogFormReset } from "@/hooks/useDialogFormReset";

const schema = z.object({
  search: z.string().min(1, "Digite o código ou nome do item"),
  is_required: z.boolean(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddToKitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: AssetGroup;
  onSuccess?: () => void;
}

export function AddToKitDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: AddToKitDialogProps) {
  const { items } = useInventory();
  const { addItemToGroup, getGroupByAssetId, isAddingItem } = useAssetGroups();

  const [searchResult, setSearchResult] = useState<AssetInventory | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      search: "",
      is_required: false,
      notes: "",
    },
  });

  useDialogFormReset(open, () => {
    form.reset({
      search: "",
      is_required: false,
      notes: "",
    });
    setSearchResult(null);
    setSearchError(null);
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSearchResult(null);
      setSearchError(null);
    }
    onOpenChange(isOpen);
  };

  const handleSearch = async () => {
    const searchTerm = form.getValues("search").trim();
    if (!searchTerm) {
      setSearchError("Digite o código ou nome do item");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      // Buscar nos items em cache primeiro
      const found = items.find(
        (i) =>
          i.internal_code.toLowerCase() === searchTerm.toLowerCase() ||
          i.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (!found) {
        setSearchError("Item não encontrado");
        return;
      }

      // Verificar se já está em algum kit
      const existingGroup = await getGroupByAssetId(found.id);
      if (existingGroup) {
        setSearchError(`Este item já pertence ao kit "${existingGroup.name}"`);
        return;
      }

      // Verificar se já está neste kit
      const alreadyInKit = group.items?.some((i) => i.asset_id === found.id);
      if (alreadyInKit) {
        setSearchError("Este item já está neste kit");
        return;
      }

      setSearchResult(found);
    } catch (error) {
      setSearchError("Erro ao buscar item");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = () => {
    if (!searchResult) return;

    addItemToGroup(
      {
        group_id: group.id,
        asset_id: searchResult.id,
        role: "accessory",
        is_required: form.getValues("is_required"),
        notes: form.getValues("notes") || undefined,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Adicionar Item ao Kit
          </DialogTitle>
          <DialogDescription>
            Busque um item pelo código interno ou nome para adicionar ao kit <strong>{group.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="search"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Buscar Item *</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Código interno ou nome..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSearch();
                          }
                        }}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSearch}
                      disabled={isSearching}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {searchError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            )}

            {searchResult && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{searchResult.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {searchResult.internal_code}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      status={searchResult.status}
                      customLabel={INVENTORY_STATUS_LABELS[searchResult.status]}
                    />
                  </div>

                  <div className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="is_required"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Acessório obrigatório</FormLabel>
                            <FormDescription>
                              Se marcado, este item deverá ser emprestado junto com o item principal.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="Notas opcionais..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAdd}
                disabled={!searchResult || isAddingItem}
              >
                {isAddingItem ? "Adicionando..." : "Adicionar ao Kit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
