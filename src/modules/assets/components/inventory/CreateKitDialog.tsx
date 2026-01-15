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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package } from "lucide-react";
import { useAssetGroups } from "../../hooks";
import type { AssetInventory, AssetGroupType } from "../../types";
import { GROUP_TYPE_LABELS } from "../../types";
import { useDialogFormReset } from "@/hooks/useDialogFormReset";

const schema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  type: z.enum(["kit", "bundle"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateKitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryAsset: AssetInventory;
  onSuccess?: () => void;
}

export function CreateKitDialog({
  open,
  onOpenChange,
  primaryAsset,
  onSuccess,
}: CreateKitDialogProps) {
  const { createGroupAsync, addItemToGroupAsync, isCreatingGroup, isAddingItem } = useAssetGroups();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: `Kit ${primaryAsset.name}`,
      type: "kit",
      notes: "",
    },
  });

  useDialogFormReset(open, () => {
    form.reset({
      name: `Kit ${primaryAsset.name}`,
      type: "kit",
      notes: "",
    });
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Criar o grupo
      const group = await createGroupAsync({
        name: data.name,
        type: data.type as AssetGroupType,
        notes: data.notes || undefined,
        primary_asset_id: primaryAsset.id,
      });

      // Adicionar o item primário
      await addItemToGroupAsync({
        group_id: group.id,
        asset_id: primaryAsset.id,
        role: "primary",
        is_required: true,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating kit:", error);
    }
  };

  const isSubmitting = isCreatingGroup || isAddingItem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Criar Kit
          </DialogTitle>
          <DialogDescription>
            Criar um novo kit a partir de <strong>{primaryAsset.name}</strong> como item principal.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Kit *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Kit Notebook Executivo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Kit: itens relacionados emprestados juntos. Conjunto: agrupamento lógico.
                  </FormDescription>
                  <FormMessage />
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
                    <Textarea {...field} rows={3} placeholder="Notas sobre o kit..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Kit"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
