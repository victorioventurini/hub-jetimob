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
import { useKeys } from "../../hooks/useKeys";

const schema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  hooks_count: z.coerce.number().min(1, "Mínimo de 1 gancho").max(100, "Máximo de 100 ganchos"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ClavicularyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClavicularyDialog({ open, onOpenChange }: ClavicularyDialogProps) {
  const { createClaviculary, createHooks, isCreatingClaviculary, isCreatingHook } = useKeys();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      hooks_count: 10,
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (data: FormData) => {
    createClaviculary(
      { name: data.name, notes: data.notes || undefined },
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

  const isLoading = isCreatingClaviculary || isCreatingHook;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Claviculário</DialogTitle>
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
                    <Input placeholder="Claviculário Recepção" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
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
              control={form.control}
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
      </DialogContent>
    </Dialog>
  );
}
