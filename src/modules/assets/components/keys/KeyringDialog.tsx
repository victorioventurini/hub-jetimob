import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClavicularySelect } from "@/components/selects";
import { useKeys } from "../../hooks";
import type { AssetHook, AssetKeyring } from "../../types";

const createSchema = z.object({
  tag_number: z.string().min(1, "Número do chaveiro obrigatório"),
  claviculary_id: z.string().min(1, "Claviculário obrigatório"),
  hook_id: z.string().min(1, "Gancho obrigatório"),
  notes: z.string().optional(),
});

const editSchema = z.object({
  tag_number: z.string().min(1, "Número do chaveiro obrigatório"),
  notes: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface KeyringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyring?: AssetKeyring | null;
}

export function KeyringDialog({ open, onOpenChange, keyring }: KeyringDialogProps) {
  const isEditMode = !!keyring;
  const { clavicularies, getHooks, createKeyring, updateKeyring, isCreatingKeyring, isUpdatingKeyring } = useKeys();
  const [availableHooks, setAvailableHooks] = useState<AssetHook[]>([]);
  const [loadingHooks, setLoadingHooks] = useState(false);

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      tag_number: "",
      claviculary_id: undefined,
      hook_id: undefined,
      notes: "",
    },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      tag_number: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && keyring) {
        editForm.reset({
          tag_number: keyring.tag_number,
          notes: keyring.notes || "",
        });
      } else {
        createForm.reset();
        setAvailableHooks([]);
        // Auto-select if only one claviculary exists
        if (clavicularies.length === 1) {
          createForm.setValue("claviculary_id", clavicularies[0].id);
        }
      }
    }
  }, [open, keyring, isEditMode, createForm, editForm, clavicularies]);

  const selectedClavicularyId = createForm.watch("claviculary_id");

  useEffect(() => {
    if (!isEditMode && selectedClavicularyId) {
      setLoadingHooks(true);
      getHooks(selectedClavicularyId).then((hooks) => {
        setAvailableHooks(hooks.filter((h) => !h.occupied));
        setLoadingHooks(false);
      });
    } else if (!isEditMode) {
      setAvailableHooks([]);
    }
    if (!isEditMode) {
      createForm.setValue("hook_id", undefined);
    }
  }, [selectedClavicularyId, getHooks, createForm, isEditMode]);

  const onCreateSubmit = (data: CreateFormData) => {
    createKeyring({
      tag_number: data.tag_number,
      claviculary_id: data.claviculary_id,
      hook_id: data.hook_id,
      notes: data.notes || undefined,
    });
    onOpenChange(false);
  };

  const onEditSubmit = (data: EditFormData) => {
    if (!keyring) return;
    updateKeyring({
      id: keyring.id,
      tag_number: data.tag_number,
      notes: data.notes || undefined,
    });
    onOpenChange(false);
  };

  const isLoading = isCreatingKeyring || isUpdatingKeyring;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar Chaveiro" : "Novo Chaveiro"}</DialogTitle>
        </DialogHeader>

        {isEditMode ? (
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="tag_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Chaveiro *</FormLabel>
                    <FormControl>
                      <Input placeholder="001" {...field} />
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
                      <Textarea placeholder="Descreva quantas chaves e controles têm no chaveiro e o que eles abrem" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isLoading} loadingText="Salvando...">
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="tag_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Chaveiro *</FormLabel>
                    <FormControl>
                      <Input placeholder="001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="claviculary_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Claviculário *</FormLabel>
                    <FormControl>
                      <ClavicularySelect
                        value={field.value}
                        onValueChange={(val) => field.onChange(val)}
                        placeholder="Selecione..."
                        triggerClassName="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedClavicularyId && (
                <FormField
                  control={createForm.control}
                  name="hook_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gancho *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingHooks || availableHooks.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingHooks
                                  ? "Carregando..."
                                  : availableHooks.length === 0
                                  ? "Sem ganchos disponíveis"
                                  : "Selecione..."
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableHooks.map((hook) => (
                            <SelectItem key={hook.id} value={hook.id}>
                              Gancho {hook.hook_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva quantas chaves e controles têm no chaveiro e o que eles abrem" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" isLoading={isLoading} loadingText="Salvando...">
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
