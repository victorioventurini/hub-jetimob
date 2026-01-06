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
import { useKeys } from "../../hooks/useKeys";
import type { AssetHook } from "../../types";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  tag_number: z.string().min(1, "Número da tag obrigatório"),
  claviculary_id: z.string().optional(),
  hook_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface KeyringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyringDialog({ open, onOpenChange }: KeyringDialogProps) {
  const { clavicularies, getHooks, createKeyring, isCreatingKeyring } = useKeys();
  const [availableHooks, setAvailableHooks] = useState<AssetHook[]>([]);
  const [loadingHooks, setLoadingHooks] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      tag_number: "",
      claviculary_id: undefined,
      hook_id: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
      setAvailableHooks([]);
    }
  }, [open, form]);

  const selectedClavicularyId = form.watch("claviculary_id");

  useEffect(() => {
    if (selectedClavicularyId) {
      setLoadingHooks(true);
      getHooks(selectedClavicularyId).then((hooks) => {
        setAvailableHooks(hooks.filter((h) => !h.occupied));
        setLoadingHooks(false);
      });
    } else {
      setAvailableHooks([]);
    }
    form.setValue("hook_id", undefined);
  }, [selectedClavicularyId, getHooks, form]);

  const onSubmit = (data: FormData) => {
    createKeyring({
      name: data.name,
      tag_number: data.tag_number,
      claviculary_id: data.claviculary_id || undefined,
      hook_id: data.hook_id || undefined,
      notes: data.notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Chaveiro</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Chaves Sala 101" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tag_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Tag *</FormLabel>
                  <FormControl>
                    <Input placeholder="KEY-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="claviculary_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Claviculário</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clavicularies.map((clav) => (
                        <SelectItem key={clav.id} value={clav.id}>
                          {clav.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedClavicularyId && (
              <FormField
                control={form.control}
                name="hook_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gancho</FormLabel>
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
              control={form.control}
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
              <Button type="submit" disabled={isCreatingKeyring}>
                {isCreatingKeyring ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
