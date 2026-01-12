import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BuLocationSelect } from "@/components/selects/BuLocationSelect";
import { useKeys } from "../../hooks/useKeys";
import type { AssetClaviculary } from "../../types";

const createSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  hooks_count: z.coerce.number().min(1, "Mínimo de 1 gancho").max(100, "Máximo de 100 ganchos"),
  location_id: z.string().optional(),
  notes: z.string().optional(),
});

const editSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  location_id: z.string().optional(),
  notes: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface ClavicularyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Claviculário para edição (se undefined, é criação) */
  claviculary?: AssetClaviculary;
}

export function ClavicularyDialog({ open, onOpenChange, claviculary }: ClavicularyDialogProps) {
  const { createClaviculary, updateClaviculary, createHooks, isCreatingClaviculary, isUpdatingClaviculary, isCreatingHook } = useKeys();
  const isEditing = !!claviculary;

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      hooks_count: 10,
      location_id: undefined,
      notes: "",
    },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      location_id: undefined,
      notes: "",
    },
  });

  const form = isEditing ? editForm : createForm;

  useEffect(() => {
    if (open) {
      if (isEditing && claviculary) {
        editForm.reset({
          name: claviculary.name,
          location_id: claviculary.location_id || undefined,
          notes: claviculary.notes || "",
        });
      } else {
        createForm.reset({
          name: "",
          hooks_count: 10,
          location_id: undefined,
          notes: "",
        });
      }
    }
  }, [open, isEditing, claviculary, editForm, createForm]);

  const onSubmitCreate = async (data: CreateFormData) => {
    createClaviculary(
      { 
        name: data.name, 
        location_id: data.location_id || undefined,
        notes: data.notes || undefined 
      },
      {
        onSuccess: (newClaviculary) => {
          if (data.hooks_count > 0) {
            createHooks({ clavicularyId: newClaviculary.id, count: data.hooks_count });
          }
          onOpenChange(false);
        },
      }
    );
  };

  const onSubmitEdit = async (data: EditFormData) => {
    if (!claviculary) return;
    
    updateClaviculary(
      { 
        id: claviculary.id,
        name: data.name, 
        location_id: data.location_id || null,
        notes: data.notes || undefined 
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const isLoading = isCreatingClaviculary || isUpdatingClaviculary || isCreatingHook;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Claviculário" : "Novo Claviculário"}</DialogTitle>
        </DialogHeader>

        {isEditing ? (
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Claviculário Recepção" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização</FormLabel>
                    <FormControl>
                      <BuLocationSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione a localização"
                        includeNone
                        noneLabel="Sem localização"
                        triggerClassName="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Claviculário Recepção" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="hooks_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de Ganchos *</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização</FormLabel>
                    <FormControl>
                      <BuLocationSelect
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Selecione a localização"
                        includeNone
                        noneLabel="Sem localização"
                        triggerClassName="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
